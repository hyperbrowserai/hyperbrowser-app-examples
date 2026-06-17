import type OpenAI from "openai";
import { getOpenAI, AGENT_MODEL } from "./openai";
import { getClient, browseWeb, SANDBOX_IMAGE, EXPOSED_PORTS } from "./hyperbrowser";
import { emit } from "./store";

const WORKDIR = "/home/ubuntu/app";
const MAX_STEPS = 25;

const SYSTEM_PROMPT = `You are an autonomous engineering agent operating a real cloud computer (a Hyperbrowser Sandbox running ${SANDBOX_IMAGE}).

You complete the user's task by writing files, running shell commands, and — when the task needs live web data — browsing the real web. Work entirely inside ${WORKDIR}.

Rules:
- The sandbox has Node.js and npm/npx ONLY. There is NO python, so never use "python -m http.server". Use Node for everything, including serving static files.
- Build real, runnable software. Prefer a single self-contained app when possible.
- Use write_file to create every source file. Always pass the FULL file contents.
- Use run_command for installs, builds, tests, and starting servers. Commands run with /bin/sh from a fresh shell, so chain with && or pass absolute paths; the working directory is ${WORKDIR}.
- If the task produces something viewable (a web app, page, game, or HTTP server), serve it on port 3000 bound to 0.0.0.0. For static files (HTML/CSS/JS), run \`npx -y serve -l 3000\` in the directory, or write a tiny Node HTTP server that serves the files. For a Node app, listen on 0.0.0.0:3000. Only these ports are routable: ${EXPOSED_PORTS.join(", ")} — always prefer 3000. ALWAYS start the server in the background by ending the run_command with " &" (e.g. \`npx -y serve -l 3000 &\`), so the command returns instead of blocking. Then call expose_port with that port to get a public live URL.
- Only use browse when the task explicitly needs real, current web data.
- Keep going until the task is fully done, then call done with a short summary. Do not ask the user questions.
- You have at most ${MAX_STEPS} tool steps. Be efficient.`;

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "write_file",
      description:
        "Write a file to the sandbox filesystem. Always provide the complete file contents. Relative paths are resolved against the working directory.",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: `File path, e.g. "index.html" or "${WORKDIR}/server.js".`,
          },
          contents: { type: "string", description: "Full file contents." },
        },
        required: ["path", "contents"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command in the sandbox. Output is streamed live to the user's terminal. Append ' &' to start long-running servers in the background.",
      parameters: {
        type: "object",
        properties: {
          command: { type: "string", description: "The shell command to run." },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "browse",
      description:
        "Fetch a live web page and return its text content (and a screenshot). Use only when the task needs real, current web data.",
      parameters: {
        type: "object",
        properties: {
          url: { type: "string", description: "The URL to fetch." },
          instruction: {
            type: "string",
            description: "What you are looking for on the page.",
          },
        },
        required: ["url", "instruction"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "expose_port",
      description:
        "Expose a port the sandbox is listening on and return a public live URL the user can open. Call this after starting a server.",
      parameters: {
        type: "object",
        properties: {
          port: { type: "number", description: "The port number to expose." },
        },
        required: ["port"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "done",
      description: "Finish the run. Provide a short summary of what was built.",
      parameters: {
        type: "object",
        properties: {
          summary: { type: "string", description: "Short summary for the user." },
        },
        required: ["summary"],
      },
    },
  },
];

function resolvePath(path: string): string {
  if (path.startsWith("/")) return path;
  return `${WORKDIR}/${path}`;
}

function shSingleQuote(s: string): string {
  return "'" + s.replace(/'/g, "'\\''") + "'";
}

// A command the agent intends to leave running (a server) ends with "&".
// If we run it as-is, the spawned server inherits the stdout pipe so the stream
// never sees EOF and hangs — and the server can be reaped when the call returns.
// We detach it: strip the trailing "&", run under setsid with all fds redirected
// to a log file, and background that so it survives for port exposure.
function prepareBackground(command: string): string {
  const base = command.trim().replace(/&\s*$/, "").trim();
  return `setsid sh -c ${shSingleQuote(
    base
  )} </dev/null >>/tmp/hv-server.log 2>&1 & echo "[started in background, pid $!]"`;
}

// Run a command, streaming stdout/stderr to the terminal panel, and return the
// collected output (truncated) to feed back to the model.
async function runCommand(
  sandbox: Awaited<ReturnType<ReturnType<typeof getClient>["sandboxes"]["create"]>>,
  runId: string,
  command: string
): Promise<string> {
  emit(runId, { type: "terminal", command, stream: "system", data: `$ ${command}\n` });

  const isBackground = /&\s*$/.test(command.trim());

  // Background (server) commands produce no meaningful live output — they
  // detach to a log file — so run them with exec(), which returns immediately
  // and avoids the stream-hang that backgrounded processes cause.
  if (isBackground) {
    const res = await sandbox.exec(prepareBackground(command), {
      cwd: WORKDIR,
      timeoutSec: 20,
    });
    const out = (res.stdout || "") + (res.stderr || "");
    if (out) emit(runId, { type: "terminal", stream: "stdout", data: out });
    emit(runId, { type: "terminal", stream: "system", data: `\n[server started]\n` });
    return out.slice(-2000) || "Server command started in the background.";
  }

  const handle = await sandbox.processes.start({
    command,
    cwd: WORKDIR,
    timeoutSec: 120,
  });

  let collected = "";
  try {
    for await (const ev of handle.stream()) {
      if (ev.type === "exit") {
        const code = ev.result.exitCode ?? 0;
        emit(runId, {
          type: "terminal",
          stream: "system",
          data: `\n[exit ${code}]\n`,
        });
        break;
      }
      if (ev.type === "stdout" || ev.type === "stderr") {
        emit(runId, { type: "terminal", stream: ev.type, data: ev.data });
        collected += ev.data;
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : "stream error";
    emit(runId, { type: "terminal", stream: "stderr", data: `\n[stream error: ${msg}]\n` });
  }

  return collected.slice(-6000) || "(no output)";
}

interface ToolOutcome {
  result: string;
  done?: string;
}

// Poll from inside the sandbox until something is actually listening on the
// port (any HTTP response counts, including 404). Returns false after ~12s.
async function waitForPort(
  sandbox: Awaited<ReturnType<ReturnType<typeof getClient>["sandboxes"]["create"]>>,
  port: number
): Promise<boolean> {
  const check = `for i in $(seq 1 12); do curl -s -o /dev/null -m 2 "http://localhost:${port}" && echo HV_UP && exit 0; sleep 1; done; echo HV_DOWN`;
  try {
    const r = await sandbox.exec(check);
    return r.stdout.includes("HV_UP");
  } catch {
    return false;
  }
}

export async function startAgentRun(runId: string, task: string): Promise<void> {
  const hb = getClient();
  let sandbox: Awaited<ReturnType<typeof hb.sandboxes.create>> | null = null;

  try {
    // --- Boot the sandbox and measure startup time ---
    const bootStart = Date.now();
    sandbox = await hb.sandboxes.create({
      imageName: SANDBOX_IMAGE,
      exposedPorts: EXPOSED_PORTS.map((port) => ({ port, auth: false })),
    });
    const bootMs = Date.now() - bootStart;

    emit(runId, {
      type: "status",
      status: "running",
      bootMs,
      image: SANDBOX_IMAGE,
      sandboxId: sandbox.id,
    });

    await sandbox.files.makeDir(WORKDIR, { parents: true }).catch(() => {});

    const openai = getOpenAI();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: `Task: ${task}` },
    ];

    let finished = false;

    for (let step = 0; step < MAX_STEPS && !finished; step++) {
      const completion = await openai.chat.completions.create({
        model: AGENT_MODEL,
        messages,
        tools: TOOLS,
        tool_choice: "auto",
      });

      const choice = completion.choices[0];
      const msg = choice.message;

      if (msg.content && msg.content.trim()) {
        emit(runId, { type: "thinking", text: msg.content.trim() });
      }

      const toolCalls = msg.tool_calls ?? [];

      if (toolCalls.length === 0) {
        // No tool call — treat the text as a final note and stop.
        if (!finished) {
          emit(runId, {
            type: "done",
            summary: msg.content?.trim() || "Run complete.",
          });
          finished = true;
        }
        break;
      }

      // Record the assistant turn (with its tool calls) before answering them.
      messages.push({
        role: "assistant",
        content: msg.content ?? "",
        tool_calls: toolCalls,
      });

      for (const call of toolCalls) {
        if (call.type !== "function") continue;
        const outcome = await executeTool(sandbox, runId, call);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: outcome.result,
        });
        if (outcome.done !== undefined) {
          emit(runId, { type: "done", summary: outcome.done });
          finished = true;
        }
      }
    }

    if (!finished) {
      emit(runId, {
        type: "done",
        summary: "Reached the step limit. The sandbox did its best within the cap.",
      });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    emit(runId, { type: "error", message });
  } finally {
    // Always release the sandbox.
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // ignore
      }
    }
  }
}

async function executeTool(
  sandbox: NonNullable<Awaited<ReturnType<ReturnType<typeof getClient>["sandboxes"]["create"]>>>,
  runId: string,
  call: OpenAI.Chat.Completions.ChatCompletionMessageToolCall
): Promise<ToolOutcome> {
  if (call.type !== "function") return { result: "unsupported tool call" };

  const name = call.function.name;
  let args: Record<string, unknown> = {};
  try {
    args = call.function.arguments ? JSON.parse(call.function.arguments) : {};
  } catch {
    return { result: `Invalid JSON arguments for ${name}.` };
  }

  try {
    switch (name) {
      case "write_file": {
        const path = resolvePath(String(args.path ?? ""));
        const contents = String(args.contents ?? "");
        if (!args.path) return { result: "write_file requires a path." };
        // Ensure parent dir exists, then write.
        const dir = path.slice(0, path.lastIndexOf("/"));
        if (dir) await sandbox.files.makeDir(dir, { parents: true }).catch(() => {});
        await sandbox.files.writeText(path, contents);
        emit(runId, { type: "file", path, contents });
        return { result: `Wrote ${path} (${contents.length} bytes).` };
      }

      case "run_command": {
        const command = String(args.command ?? "");
        if (!command) return { result: "run_command requires a command." };
        const output = await runCommand(sandbox, runId, command);
        return { result: output };
      }

      case "browse": {
        const url = String(args.url ?? "");
        const instruction = String(args.instruction ?? "");
        if (!url) return { result: "browse requires a url." };
        const res = await browseWeb(url);
        emit(runId, {
          type: "browser",
          url,
          instruction,
          text: res.text,
          screenshot: res.screenshot,
        });
        return {
          result: `Fetched ${url}.\n\n${res.text.slice(0, 6000) || "(no text content)"}`,
        };
      }

      case "expose_port": {
        const port = Number(args.port);
        if (!port) return { result: "expose_port requires a port number." };

        // Ports are declared at sandbox creation, so the live URL already
        // exists — read it rather than calling expose() (which 404s for
        // already-declared ports in some cases). Fall back if it's not there.
        const declared = sandbox.exposedPorts.find((e) => e.port === port);
        let url = declared?.browserUrl || declared?.url;
        if (!url) {
          try {
            const exposed = await sandbox.expose({ port });
            url = exposed.browserUrl || exposed.url;
          } catch {
            url = sandbox.getExposedUrl(port);
          }
        }

        // Confirm the server is actually responding before handing back a URL.
        const ready = await waitForPort(sandbox, port);
        if (!ready) {
          return {
            result: `The public URL for port ${port} is ${url}, but nothing is responding there yet. Make sure your server is still running in the background (end the run_command with "&") and bound to 0.0.0.0:${port}. Check /tmp/hv-server.log for crashes, fix it, then call expose_port again. Only ports ${EXPOSED_PORTS.join(
              ", "
            )} are routable.`,
          };
        }

        emit(runId, { type: "preview", url, port });
        return { result: `Port ${port} is live and responding at ${url}` };
      }

      case "done": {
        const summary = String(args.summary ?? "Run complete.");
        return { result: "Run finished.", done: summary };
      }

      default:
        return { result: `Unknown tool: ${name}` };
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : "tool failed";
    if (name === "run_command") {
      emit(runId, { type: "terminal", stream: "stderr", data: `\n[error: ${message}]\n` });
    }
    return { result: `Error running ${name}: ${message}` };
  }
}
