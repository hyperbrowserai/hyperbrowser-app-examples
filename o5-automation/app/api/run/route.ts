import { CONFIG, SANDBOX_PATHS } from "@/lib/config";
import { UsageMeter, callJson, streamScript } from "@/lib/generate";
import { getHyperbrowser } from "@/lib/hyperbrowser";
import { captureCurrentSession, openInspector } from "@/lib/inspect";
import {
  buildGeneratorMessages,
  buildNavRequestMessages,
  buildPlannerMessages,
  buildRepairMessages,
  taskNeedsLogin,
} from "@/lib/prompts";
import { provisionSandbox, runScript, stopSandbox } from "@/lib/sandbox";
import type { Emit, RunRequest } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 300;

const URL_PATTERN = /https?:\/\/[^\s<>"')\]]+/i;

function resolveUrl(task: string, supplied?: string): string | null {
  const raw = supplied?.trim() || task.match(URL_PATTERN)?.[0];
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function messageOf(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(request: Request): Promise<Response> {
  let input: RunRequest;
  try {
    input = (await request.json()) as RunRequest;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const task = input.task?.trim();
  if (!task) return Response.json({ error: "Describe the web task first." }, { status: 400 });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const emit: Emit = (event) => {
        if (!closed) controller.enqueue(encoder.encode(`${JSON.stringify(event)}\n`));
      };

      void (async () => {
        const startedAt = Date.now();
        const meter = new UsageMeter();
        let client: ReturnType<typeof getHyperbrowser> | null = null;
        let inspector: Awaited<ReturnType<typeof openInspector>> | null = null;
        let sandbox: Awaited<ReturnType<typeof provisionSandbox>> | null = null;
        let executionSessionId: string | null = null;

        const retryNotice = (attempt: number, waitMs: number) =>
          emit({ t: "run", msg: `Model API retry ${attempt} in ${(waitMs / 1000).toFixed(1)}s` });

        try {
          emit({ t: "init", startedAt, model: CONFIG.model, task });
          const targetUrl = resolveUrl(task, input.url);
          if (!targetUrl) {
            emit({ t: "need_url" });
            return;
          }
          client = getHyperbrowser();
          const hyperbrowser = client;

          const plan = await callJson<{ allowed: boolean; reason: string; plan: string }>(
            buildPlannerMessages(task, targetUrl),
            meter,
            retryNotice
          );
          if (!plan.allowed) {
            emit({ t: "refused", reason: plan.reason || "This task is not supported." });
            return;
          }
          emit({ t: "plan", url: targetUrl, note: plan.plan });

          emit({ t: "phase", phase: "inspecting", at: Date.now() });
          inspector = await openInspector(hyperbrowser);
          emit({ t: "live", url: inspector.liveUrl, label: "Inspection session" });
          emit({ t: "inspect", msg: "Navigating to the real entry page" });
          const firstCapture = await inspector.capture(targetUrl);
          await inspector.screenshot();
          emit({
            t: "inspect",
            msg: "Captured page structure and screenshot",
            elements: firstCapture.clickables.length + firstCapture.inputs.length,
            links: firstCapture.links.length,
            forms: firstCapture.forms.length,
            chars: firstCapture.textOutline.length,
          });

          const captures = [firstCapture];
          const nav = await callJson<{ navigate: string | null }>(
            buildNavRequestMessages(task, firstCapture, CONFIG.perCaptureCharCap),
            meter,
            retryNotice
          );
          if (nav.navigate && firstCapture.links.some((link) => link.href === nav.navigate)) {
            emit({ t: "inspect", msg: "Inspecting one linked page requested by Claude" });
            captures.push(await inspector.capture(nav.navigate));
            await inspector.screenshot();
          }

          emit({ t: "phase", phase: "writing", at: Date.now() });
          const generatorMessages = buildGeneratorMessages(
            task,
            targetUrl,
            captures,
            CONFIG.perCaptureCharCap,
            taskNeedsLogin(task)
          );
          let generated = await streamScript(generatorMessages, meter, emit, retryNotice);
          emit({ t: "script_done", script: generated.script, phase: "writing" });
          await inspector.close();
          inspector = null;

          sandbox = await provisionSandbox(hyperbrowser);

          const execute = async (script: string) => {
            const session = await hyperbrowser.sessions.create({
              viewOnlyLiveView: true,
              acceptCookies: true,
              timeoutMinutes: 2,
            });
            executionSessionId = session.id;
            emit({ t: "live", url: session.liveUrl ?? null, label: "Execution session" });
            const outcome = await runScript(
              sandbox!,
              script,
              {
                targetUrl,
                cdpUrl: session.wsEndpoint,
                shotPath: SANDBOX_PATHS.screenshotFile,
                username: input.username,
                password: input.password,
              },
              emit
            );
            return { outcome, session };
          };

          emit({ t: "phase", phase: "running", at: Date.now() });
          emit({ t: "run", msg: "Running generated code in an isolated sandbox" });
          let execution = await execute(generated.script);
          let repaired = false;

          if (!execution.outcome.ok) {
            repaired = true;
            emit({ t: "phase", phase: "repairing", at: Date.now() });
            emit({ t: "repair", attempt: 1, reason: execution.outcome.error ?? "No result returned" });
            const freshCapture = await captureCurrentSession(execution.session.wsEndpoint).catch(
              () => captures[captures.length - 1]
            );
            await hyperbrowser.sessions.stop(execution.session.id).catch(() => undefined);
            executionSessionId = null;

            const repairMessages = buildRepairMessages(
              generatorMessages,
              generated.rawContent,
              execution.outcome.error ?? "",
              execution.outcome.result.stdout,
              freshCapture,
              CONFIG.perCaptureCharCap
            );
            generated = await streamScript(repairMessages, meter, emit, retryNotice);
            emit({ t: "script_done", script: generated.script, phase: "repairing" });
            emit({ t: "phase", phase: "running", at: Date.now() });
            execution = await execute(generated.script);
          }

          emit({ t: "result", result: execution.outcome.result, repaired });
          emit({ t: "usage", usage: meter.snapshot() });
          emit({
            t: "done",
            elapsedMs: Date.now() - startedAt,
            repaired,
            ok: execution.outcome.ok,
          });
          if (!execution.outcome.ok) {
            emit({ t: "error", message: execution.outcome.error ?? "The repaired script failed." });
          }
        } catch (error) {
          emit({ t: "usage", usage: meter.snapshot() });
          emit({ t: "error", message: messageOf(error) });
        } finally {
          if (inspector) await inspector.close().catch(() => undefined);
          if (executionSessionId && client) {
            await client.sessions.stop(executionSessionId).catch(() => undefined);
          }
          await stopSandbox(sandbox);
          closed = true;
          controller.close();
        }
      })();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
