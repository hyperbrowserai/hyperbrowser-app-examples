"use client";

import { useState } from "react";
import { LiveViewPanel } from "@/components/LiveViewPanel";
import { ResultPanel } from "@/components/ResultPanel";
import { ScriptPanel } from "@/components/ScriptPanel";
import { TaskBar } from "@/components/TaskBar";
import { generateScript } from "@/lib/generateScript";
import type { RunStatus, RunStreamEvent } from "@/lib/types";

export default function Home() {
  const [task, setTask] = useState("");
  const [url, setUrl] = useState("");
  const [isRunning, setIsRunning] = useState(false);
  const [liveUrl, setLiveUrl] = useState<string | null>(null);
  const [stepCount, setStepCount] = useState(0);
  const [status, setStatus] = useState<RunStatus | null>(null);
  const [output, setOutput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submittedScript, setSubmittedScript] = useState("");

  async function runTask() {
    setIsRunning(true);
    setLiveUrl(null);
    setStepCount(0);
    setStatus(null);
    setOutput("");
    setError(null);
    setSubmittedScript("");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ task, url }),
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        const message = parseErrorResponse(text);
        throw new Error(message || "The run could not be started.");
      }

      await readRunStream(response.body, (event) => {
        if (event.type === "liveUrl") {
          setLiveUrl(event.liveUrl);
          setSubmittedScript(generateScript(task, url));
        }

        if (event.type === "step") {
          setStepCount(event.count);
        }

        if (event.type === "done") {
          setStatus(event.status);
          setOutput(event.output);
          setStepCount(event.steps);
        }

        if (event.type === "error") {
          setStatus("failed");
          setError(event.message);
        }
      });
    } catch (runError) {
      setStatus("failed");
      setError(
        runError instanceof Error ? runError.message : "The run failed.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <main className="min-h-screen bg-background px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-[1400px] gap-6">
        <header className="grid gap-4 border-b border-border pb-6 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
          <div className="grid gap-3">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em]">
              Hyperbrowser local runner
            </p>
            <h1 className="font-heading text-5xl font-semibold leading-none tracking-[-0.05em] sm:text-6xl">
              HyperScript
            </h1>
          </div>
          <p className="text-base leading-7">
            Enter a web task and starting URL. Watch the real browser run on the
            left, keep the TypeScript script on the right, then read the result
            below.
          </p>
        </header>

        <TaskBar
          isRunning={isRunning}
          onRun={runTask}
          onTaskChange={setTask}
          onUrlChange={setUrl}
          task={task}
          url={url}
        />

        <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
          <LiveViewPanel liveUrl={liveUrl} />
          <ScriptPanel script={submittedScript} />
        </div>

        <ResultPanel
          error={error}
          isRunning={isRunning}
          output={output}
          status={status}
          stepCount={stepCount}
        />
      </div>
    </main>
  );
}

function parseErrorResponse(text: string) {
  try {
    const payload = JSON.parse(text) as { error?: string };
    return payload.error;
  } catch {
    return text;
  }
}

async function readRunStream(
  body: ReadableStream<Uint8Array>,
  onEvent: (event: RunStreamEvent) => void,
) {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) {
        continue;
      }

      onEvent(JSON.parse(line) as RunStreamEvent);
    }
  }

  buffer += decoder.decode();

  if (buffer.trim()) {
    onEvent(JSON.parse(buffer) as RunStreamEvent);
  }
}
