import type { Hyperbrowser } from "@hyperbrowser/sdk";
import { CONFIG, SANDBOX_PATHS } from "./config";
import type { Emit, RunResult } from "./types";

type SandboxHandle = Awaited<ReturnType<Hyperbrowser["sandboxes"]["create"]>>;

export interface RunOutcome {
  ok: boolean;
  result: RunResult;
  error: string | null;
  exitCode: number | null;
  status: string;
}

/**
 * Create a fresh sandbox and make the preinstalled playwright-core resolvable
 * via a bare `import "playwright-core"` by symlinking it into the working dir.
 * No npm install — the node-chromium image already ships playwright-core, so
 * provisioning is a second or two.
 */
export async function provisionSandbox(client: Hyperbrowser): Promise<SandboxHandle> {
  const sandbox = await client.sandboxes.create({ imageName: CONFIG.sandboxImage });
  await sandbox.exec(
    `mkdir -p ${SANDBOX_PATHS.workDir}/node_modules && ln -sfn ${SANDBOX_PATHS.playwrightNodePath}/playwright-core ${SANDBOX_PATHS.workDir}/node_modules/playwright-core`
  );
  return sandbox;
}

interface RunOpts {
  targetUrl: string;
  cdpUrl: string;
  shotPath: string;
  username?: string;
  password?: string;
}

const MARK_STEP = "@@STEP@@";
const MARK_RESULT = "@@RESULT@@";
const MARK_ERROR = "@@ERROR@@";

/**
 * Write the generated TypeScript into the sandbox, run it with
 * `node --experimental-strip-types`, and stream its stdout so @@STEP@@ markers
 * surface live. Enforces the 90s cap via the sandbox process timeout. Never
 * throws for a script failure — that's reported honestly in the outcome.
 */
export async function runScript(
  sandbox: SandboxHandle,
  script: string,
  opts: RunOpts,
  emit: Emit
): Promise<RunOutcome> {
  await sandbox.files.writeText(SANDBOX_PATHS.scriptFile, script);

  const env: Record<string, string> = {
    HB_CDP_URL: opts.cdpUrl,
    TARGET_URL: opts.targetUrl,
    HB_SHOT_PATH: opts.shotPath,
  };
  if (opts.username) env.HB_USERNAME = opts.username;
  if (opts.password) env.HB_PASSWORD = opts.password;

  const cmd = `cd ${SANDBOX_PATHS.workDir} && node --experimental-strip-types automation.ts`;

  let stdout = "";
  let stderr = "";
  let exitCode: number | null = null;
  let status = "running";
  const steps: string[] = [];
  let resultRaw: string | null = null;
  let errorMark: string | null = null;

  // Line-buffered marker parsing over the live stream.
  let buf = "";
  const consumeLine = (line: string) => {
    if (line.startsWith(MARK_STEP)) {
      const label = line.slice(MARK_STEP.length).trim();
      steps.push(label);
      emit({ t: "step", label });
    } else if (line.startsWith(MARK_RESULT)) {
      resultRaw = line.slice(MARK_RESULT.length);
    } else if (line.startsWith(MARK_ERROR)) {
      errorMark = line.slice(MARK_ERROR.length).trim();
    }
  };
  const pump = (chunk: string) => {
    buf += chunk;
    let nl: number;
    while ((nl = buf.indexOf("\n")) !== -1) {
      consumeLine(buf.slice(0, nl));
      buf = buf.slice(nl + 1);
    }
  };

  try {
    const proc = await sandbox.processes.start(cmd, { env, timeoutMs: CONFIG.runTimeoutMs });
    for await (const ev of proc.stream()) {
      if (ev.type === "stdout") {
        stdout += ev.data;
        pump(ev.data);
      } else if (ev.type === "stderr") {
        stderr += ev.data;
      } else if (ev.type === "exit") {
        exitCode = ev.result.exitCode ?? null;
        status = ev.result.status;
        // Some runtimes deliver full buffers here rather than incremental
        // stdout events — reconcile so we never miss markers.
        if (ev.result.stdout && ev.result.stdout.length > stdout.length) {
          stdout = ev.result.stdout;
          buf = "";
          for (const line of stdout.split("\n")) consumeLine(line);
        }
        if (ev.result.stderr && ev.result.stderr.length > stderr.length) stderr = ev.result.stderr;
      }
    }
  } catch (err) {
    status = "failed";
    stderr += "\n" + (err instanceof Error ? err.message : String(err));
  }
  if (buf) consumeLine(buf);

  // Download the final-page screenshot the script saved (if any).
  let screenshotB64: string | null = null;
  try {
    const bytes = await sandbox.files.readBytes(opts.shotPath);
    if (bytes && bytes.length) screenshotB64 = Buffer.from(bytes).toString("base64");
  } catch {
    /* no screenshot produced */
  }

  let data: unknown = null;
  if (resultRaw !== null) {
    try {
      data = JSON.parse(resultRaw);
    } catch {
      data = resultRaw;
    }
  }

  const timedOut = status === "timed_out";
  const hasResult = resultRaw !== null && data !== null && data !== "";
  const ok = !timedOut && !errorMark && exitCode === 0 && hasResult;

  let error: string | null = null;
  if (errorMark) error = errorMark;
  else if (timedOut) error = `Execution exceeded the ${CONFIG.runTimeoutMs / 1000}s cap.`;
  else if (!hasResult) error = "Script produced no @@RESULT@@ output.";
  else if (exitCode !== 0) error = `Script exited with code ${exitCode}.` + (stderr ? " " + stderr.slice(-400) : "");

  return {
    ok,
    result: { data, stdout: stdout || stderr, screenshotB64, steps },
    error,
    exitCode,
    status,
  };
}

export async function stopSandbox(sandbox: SandboxHandle | null): Promise<void> {
  if (!sandbox) return;
  try {
    await sandbox.stop();
  } catch {
    /* ignore */
  }
}
