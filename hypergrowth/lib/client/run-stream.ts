import type { MineRunEvent } from "@/lib/run-events";
import type { MineRequest } from "@/lib/types";

type StreamMineRunOptions = {
  request: MineRequest;
  signal: AbortSignal;
  onEvent: (event: MineRunEvent) => void;
};

export async function streamMineRun({
  request,
  signal,
  onEvent,
}: StreamMineRunOptions): Promise<void> {
  const response = await fetch("/api/mine/stream", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw new Error(payload?.error ?? "Unable to start streaming run.");
  }

  if (!response.body) {
    throw new Error("Streaming response did not include a readable body.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const frames = buffer.split(/\n\n/);
    buffer = frames.pop() ?? "";

    for (const frame of frames) {
      const event = parseMineEvent(frame);
      if (event) {
        onEvent(event);
      }
    }
  }

  buffer += decoder.decode();
  const event = parseMineEvent(buffer);
  if (event) {
    onEvent(event);
  }
}

function parseMineEvent(frame: string): MineRunEvent | null {
  const data = frame
    .split(/\r?\n/)
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.slice("data:".length).trimStart())
    .join("\n");

  if (!data) {
    return null;
  }

  return JSON.parse(data) as MineRunEvent;
}
