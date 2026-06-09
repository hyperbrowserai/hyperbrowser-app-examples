import { Hyperbrowser } from "@hyperbrowser/sdk";
import type OpenAI from "openai";
import { getOpenAI, MODEL } from "./openai";
import { scans } from "./store";
import type { Failure, Scan, ScoreData, TaskResult, TerminalEntry } from "./types";

/** The sandbox handle type, derived from the SDK so it stays accurate. */
type Sandbox = Awaited<ReturnType<Hyperbrowser["sandboxes"]["create"]>>;

const MAX_TOOL_ITERATIONS = 8;
const TOOL_OUTPUT_LIMIT = 4000;
const COMMAND_TIMEOUT_MS = 60_000;
const TERMINAL_MAX_ENTRIES = 60;
const TERMINAL_OUTPUT_LIMIT = 1200;

/** Append a terminal entry to a scan, keeping the buffer bounded. */
function pushTerminal(scan: Scan, entry: TerminalEntry): void {
  const trimmed: TerminalEntry = {
    ...entry,
    output:
      entry.output.length > TERMINAL_OUTPUT_LIMIT
        ? "…\n" + entry.output.slice(-TERMINAL_OUTPUT_LIMIT)
        : entry.output,
  };
  scan.terminal.push(trimmed);
  if (scan.terminal.length > TERMINAL_MAX_ENTRIES) {
    scan.terminal.splice(0, scan.terminal.length - TERMINAL_MAX_ENTRIES);
  }
}

function combineOutput(result: { stdout: string; stderr: string }): string {
  return [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
}

export const TEST_TASKS: string[] = [
  "List all available npm scripts and run the test suite. If tests fail, note exactly what failed and why.",
  "Find the main entry point of the application and explain the project structure. Note any assumptions that turned out wrong.",
  "Add a new API endpoint or function called /api/health that returns { status: 'ok' }. Note every wrong path or file you tried.",
  "Find a bug or potential issue in the codebase and fix it. Note what you assumed vs what was actually true.",
  "Rename the most important utility file and update all imports. Note every import path that broke.",
  "Write a test for the most critical function in the codebase. Note every assumption about the testing framework that was wrong.",
];

function truncate(text: string): string {
  if (text.length <= TOOL_OUTPUT_LIMIT) return text;
  return "...[truncated]...\n" + text.slice(-TOOL_OUTPUT_LIMIT);
}

function resolvePath(repoDir: string, path: string): string {
  return path.startsWith("/") ? path : `${repoDir}/${path.replace(/^\.\//, "")}`;
}

function didCommandFail(result: {
  exitCode?: number | null;
  status?: string;
}): boolean {
  if (result.status === "failed" || result.status === "timed_out" || result.status === "killed") {
    return true;
  }
  return typeof result.exitCode === "number" && result.exitCode !== 0;
}

const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "run_command",
      description:
        "Run a shell command inside the repo directory of the sandbox. Returns stdout, stderr and the exit code.",
      parameters: {
        type: "object",
        properties: {
          command: {
            type: "string",
            description: "The shell command to run, e.g. 'npm test' or 'ls src'.",
          },
        },
        required: ["command"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description:
        "Read a UTF-8 text file. Path may be relative to the repo root or absolute. Returns the file contents or an error if it does not exist.",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string", description: "File path to read." },
        },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_dir",
      description: "List the contents of a directory (relative to repo root or absolute).",
      parameters: {
        type: "object",
        properties: {
          path: {
            type: "string",
            description: "Directory path to list. Defaults to repo root.",
          },
        },
        required: [],
      },
    },
  },
];

const REPORT_INSTRUCTION = `Now stop using tools and report what happened as a single JSON object, nothing else:
{
  "task": "the task you were given",
  "succeeded": true | false,
  "steps_taken": ["step 1", "step 2"],
  "failures": [
    {
      "what_went_wrong": "description",
      "wrong_assumption": "what you assumed",
      "actual_truth": "what was actually true",
      "affected_files": ["path/to/file"],
      "fix": "what the CLAUDE.md should say to prevent this"
    }
  ],
  "commands_that_failed": ["command 1", "command 2"]
}
Be brutally honest about every wrong assumption and failed command. If everything worked, return empty arrays.`;

interface ExecLogEntry {
  command: string;
  failed: boolean;
}

/**
 * Runs a single test task as a real agentic loop inside the sandbox.
 * The agent actually executes commands and reads files; failures are observed.
 */
export async function runAgentTask(
  sandbox: Sandbox,
  task: string,
  context: string,
  repoDir: string,
  onStart: (command: string) => void,
  onDone: (command: string, output: string, exitCode: number | null) => void
): Promise<TaskResult> {
  const openai = getOpenAI();
  const execLog: ExecLogEntry[] = [];

  const system = `You are a coding agent working inside a Linux sandbox on a freshly cloned repository.
The repository lives at ${repoDir} and that is the working directory for every command you run.

Repository context:
${context}

Use the run_command, read_file and list_dir tools to ACTUALLY attempt the task. Do not pretend.
Try real commands and real paths. When something fails, that failure is valuable — keep going and learn from it.`;

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: system },
    { role: "user", content: task },
  ];

  async function runTool(name: string, input: Record<string, unknown>): Promise<string> {
    if (name === "run_command") {
      const command = String(input.command ?? "");
      onStart(command);
      try {
        const result = await sandbox.exec(`cd ${repoDir} && ${command}`, {
          timeoutMs: COMMAND_TIMEOUT_MS,
        });
        execLog.push({ command, failed: didCommandFail(result) });
        onDone(command, combineOutput(result), result.exitCode ?? null);
        return truncate(
          `exit_code: ${result.exitCode ?? "unknown"}\nstdout:\n${result.stdout}\nstderr:\n${result.stderr}`
        );
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        execLog.push({ command, failed: true });
        onDone(command, msg, null);
        return `command errored: ${msg}`;
      }
    }
    if (name === "read_file") {
      const rawPath = String(input.path ?? "");
      const path = resolvePath(repoDir, rawPath);
      onStart(`cat ${rawPath}`);
      try {
        const content = await sandbox.files.readText(path);
        onDone(`cat ${rawPath}`, content, 0);
        return truncate(content);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onDone(`cat ${rawPath}`, msg, 1);
        return `read error: ${msg}`;
      }
    }
    if (name === "list_dir") {
      const rawPath = String(input.path ?? ".");
      const path = resolvePath(repoDir, rawPath);
      onStart(`ls -la ${rawPath}`);
      try {
        const result = await sandbox.exec(`ls -la ${path}`, { timeoutMs: COMMAND_TIMEOUT_MS });
        onDone(`ls -la ${rawPath}`, combineOutput(result), result.exitCode ?? null);
        return truncate(result.stdout || result.stderr);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        onDone(`ls -la ${rawPath}`, msg, 1);
        return `list error: ${msg}`;
      }
    }
    return `unknown tool: ${name}`;
  }

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await openai.chat.completions.create({
      model: MODEL,
      max_completion_tokens: 4000,
      tools: TOOLS,
      tool_choice: "auto",
      messages,
    });

    const message = response.choices[0]?.message;
    if (!message) break;
    messages.push(message);

    const toolCalls = message.tool_calls ?? [];
    if (toolCalls.length === 0) break;

    for (const call of toolCalls) {
      if (call.type !== "function") continue;
      let input: Record<string, unknown> = {};
      try {
        input = JSON.parse(call.function.arguments || "{}");
      } catch {
        input = {};
      }
      const output = await runTool(call.function.name, input);
      messages.push({ role: "tool", tool_call_id: call.id, content: output });
    }
  }

  // Final pass: ask for the structured report (no tools).
  messages.push({ role: "user", content: REPORT_INSTRUCTION });
  const reportResponse = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: 2000,
    response_format: { type: "json_object" },
    messages,
  });
  const reportText = reportResponse.choices[0]?.message?.content ?? "";

  const realFailedCommands = [
    ...new Set(execLog.filter((e) => e.failed).map((e) => e.command)),
  ];

  let result: TaskResult;
  try {
    const match = reportText.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("no json");
    const parsed = JSON.parse(match[0]) as Partial<TaskResult>;
    const commands = new Set<string>([
      ...(parsed.commands_that_failed ?? []),
      ...realFailedCommands,
    ]);
    result = {
      task,
      succeeded: parsed.succeeded ?? realFailedCommands.length === 0,
      steps_taken: parsed.steps_taken ?? [],
      failures: (parsed.failures ?? []) as Failure[],
      commands_that_failed: [...commands],
    };
  } catch {
    result = {
      task,
      succeeded: realFailedCommands.length === 0,
      steps_taken: [],
      failures: [],
      commands_that_failed: realFailedCommands,
      raw: reportText,
      parseError: true,
    };
  }
  return result;
}

function stripFences(text: string): string {
  return text.replace(/```json/gi, "").replace(/```/g, "").trim();
}

/** Single-shot completion helper for the harness-writing / scoring passes. */
async function complete(
  openai: OpenAI,
  prompt: string,
  opts: { maxTokens: number; json?: boolean }
): Promise<string> {
  const response = await openai.chat.completions.create({
    model: MODEL,
    max_completion_tokens: opts.maxTokens,
    ...(opts.json ? { response_format: { type: "json_object" as const } } : {}),
    messages: [{ role: "user", content: prompt }],
  });
  return response.choices[0]?.message?.content ?? "";
}

/**
 * Orchestrates the whole harness run inside the sandbox, updating scan state
 * as it progresses. Always stops the sandbox at the end.
 */
export async function runHarnessInBackground(
  scanId: string,
  sandbox: Sandbox,
  repoUrl: string
): Promise<void> {
  const scan = scans.get(scanId);
  if (!scan) return;
  const openai = getOpenAI();

  /** Run a setup command (taskIndex 0), mirroring it into the live terminal. */
  async function runSetup(
    label: string,
    command: string,
    timeoutMs: number
  ): Promise<{ stdout: string; stderr: string; exitCode?: number | null } | null> {
    scan!.lastCommand = label;
    try {
      const result = await sandbox.exec(command, { timeoutMs });
      pushTerminal(scan!, {
        command: label,
        output: combineOutput(result),
        exitCode: result.exitCode ?? null,
        taskIndex: 0,
      });
      return result;
    } catch (err) {
      pushTerminal(scan!, {
        command: label,
        output: err instanceof Error ? err.message : String(err),
        exitCode: null,
        taskIndex: 0,
      });
      return null;
    }
  }

  try {
    // 1. Resolve home dir + clone.
    scan.status = "cloning";
    const homeResult = await sandbox.exec("echo $HOME");
    const home = homeResult.stdout.trim() || "/home/ubuntu";
    const repoDir = `${home}/repo`;

    // The base "node" image ships without git; install it on demand (~8s).
    await runSetup(
      "apt-get install -y git",
      "command -v git >/dev/null 2>&1 || (sudo apt-get update -qq && sudo apt-get install -y -qq git >/dev/null 2>&1) && git --version",
      240_000
    );

    const cloneResult = await runSetup(
      `git clone --depth 1 ${repoUrl}`,
      `rm -rf ${repoDir} && git clone --depth 1 ${repoUrl} ${repoDir}`,
      120_000
    );
    if (
      cloneResult &&
      cloneResult.exitCode !== 0 &&
      !(await sandbox.files.exists(repoDir))
    ) {
      throw new Error(
        `Failed to clone repository. Check the URL is a public GitHub repo. ${cloneResult.stderr.slice(0, 200)}`
      );
    }

    // 2. Detect stack + install deps (tolerate failure).
    const hasPackageJson = await sandbox.files.exists(`${repoDir}/package.json`);
    const hasRequirements = await sandbox.files.exists(`${repoDir}/requirements.txt`);
    if (hasPackageJson) {
      scan.status = "installing";
      await runSetup("npm install", `cd ${repoDir} && npm install 2>&1 | tail -8`, 240_000);
    } else if (hasRequirements) {
      scan.status = "installing";
      await runSetup(
        "pip install -r requirements.txt",
        `cd ${repoDir} && pip install -r requirements.txt 2>&1 | tail -8`,
        240_000
      );
    }

    // 3. Analyze structure.
    scan.status = "analyzing";
    const structureResult = await runSetup(
      "find . -type f | head -100",
      `cd ${repoDir} && find . -type f -not -path '*/node_modules/*' -not -path '*/.git/*' | head -100`,
      60_000
    );
    const structure = structureResult?.stdout ?? "";
    const packageJson = hasPackageJson
      ? await sandbox.files.readText(`${repoDir}/package.json`).catch(() => "")
      : "";
    const hasReadme = await sandbox.files.exists(`${repoDir}/README.md`);
    const readme = hasReadme
      ? await sandbox.files.readText(`${repoDir}/README.md`).catch(() => "")
      : "";

    const context = `File structure:
${structure}

package.json:
${packageJson || "(none)"}

README.md (excerpt):
${readme.slice(0, 2000) || "(none)"}`;

    // 4. Run the 6 test tasks as real agentic loops.
    scan.status = "testing";
    const failures: TaskResult[] = [];
    for (let i = 0; i < TEST_TASKS.length; i++) {
      scan.currentTask = i + 1;
      const taskIndex = i + 1;
      const result = await runAgentTask(
        sandbox,
        TEST_TASKS[i],
        context,
        repoDir,
        (command) => {
          scan.lastCommand = command;
        },
        (command, output, exitCode) => {
          pushTerminal(scan, { command, output, exitCode, taskIndex });
        }
      );
      failures.push(result);
      scan.failures = [...failures];
    }

    // 5. Generate CLAUDE.md + AGENTS.md from the observed failures.
    scan.status = "generating";
    scan.lastCommand = "writing CLAUDE.md from observed failures";
    const claudeMd = await complete(
      openai,
      `You are a harness engineer. A coding agent just ran 6 tasks against a real repo and recorded its failures. Generate a CLAUDE.md that prevents these failures from happening again.

Repo: ${repoUrl}
Structure: ${structure}

Agent failure reports:
${JSON.stringify(failures, null, 2)}

Generate ONLY a valid CLAUDE.md file. No explanation. No preamble. Follow this format:

# CLAUDE.md

## Project Overview
[1-2 sentences about what this project is and its stack]

## Critical Rules
[Rules derived from the most common/severe failures. Each rule should reference what went wrong.]

## File Structure
[Key paths the agent got wrong, with corrections]

## Commands
[Correct commands for build, test, lint, dev. Only include commands that actually exist.]

## Common Mistakes
[Specific mistakes the agent made, phrased as "Do NOT" rules]

## Testing
[How tests actually work in this repo, what framework, what commands]

Every rule must trace to an actual failure from the reports above. Do not add generic rules that weren't observed.`,
      { maxTokens: 4000 }
    );

    scan.lastCommand = "writing AGENTS.md";
    const agentsMd = await complete(
      openai,
      `Based on the same failure data, generate an AGENTS.md file for this repo. This is a shorter, more universal file that works across Claude Code, Codex, Cursor, and Grok Build.

Failure data: ${JSON.stringify(failures, null, 2)}
Repo: ${repoUrl}

Generate ONLY the AGENTS.md content. Keep it under 100 lines. Focus on the rules that apply regardless of which coding agent is used.`,
      { maxTokens: 2000 }
    );

    // 6. Calculate HarnessScore.
    scan.status = "scoring";
    scan.lastCommand = "calculating HarnessScore";
    const scoreText = await complete(
      openai,
      `Score this repo's agent-readiness based on the failure data. Return ONLY a JSON object:

{
  "score": <0-100>,
  "breakdown": {
    "discovery": <0-100>,
    "specificity": <0-100>,
    "testability": <0-100>,
    "documentation": <0-100>,
    "structure": <0-100>
  },
  "verdict": "<one sentence>",
  "topIssues": ["issue 1", "issue 2", "issue 3"]
}

Failure data: ${JSON.stringify(failures, null, 2)}
Repo structure: ${structure}

Scoring guide:
- 90-100: Agent completed most tasks without wrong assumptions
- 70-89: Some failures but project is well-structured
- 50-69: Multiple failures, unclear structure or docs
- 30-49: Agent struggled significantly, many wrong assumptions
- 0-29: Agent could barely navigate the repo`,
      { maxTokens: 600, json: true }
    );

    let score: ScoreData;
    try {
      score = JSON.parse(stripFences(scoreText)) as ScoreData;
    } catch {
      const totalFailures = failures.reduce((n, f) => n + f.failures.length, 0);
      const fallback = Math.max(0, 70 - totalFailures * 5);
      score = {
        score: fallback,
        breakdown: {
          discovery: fallback,
          specificity: fallback,
          testability: fallback,
          documentation: fallback,
          structure: fallback,
        },
        verdict: "Score could not be computed precisely; derived from failure count.",
        topIssues: failures
          .flatMap((f) => f.failures.map((x) => x.what_went_wrong))
          .slice(0, 3),
      };
    }

    scan.results = { claudeMd, agentsMd, score, failures };
    scan.status = "complete";
  } catch (err) {
    scan.status = "error";
    scan.error = err instanceof Error ? err.message : "Harness run failed";
  } finally {
    try {
      await sandbox.stop();
    } catch {
      // ignore
    }
  }
}
