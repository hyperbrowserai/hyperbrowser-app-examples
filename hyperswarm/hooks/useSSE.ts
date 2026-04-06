import type { SwarmEvent } from "@/lib/types";

export function parseSwarmSseBuffer(buffer: string): {
  events: SwarmEvent[];
  rest: string;
} {
  const events: SwarmEvent[] = [];
  const parts = buffer.split("\n\n");
  const rest = parts.pop() ?? "";
  for (const block of parts) {
    for (const line of block.split("\n")) {
      if (!line.startsWith("data: ")) continue;
      const raw = line.slice(6).trim();
      if (!raw) continue;
      try {
        events.push(JSON.parse(raw) as SwarmEvent);
      } catch {
        /* skip */
      }
    }
  }
  return { events, rest };
}
