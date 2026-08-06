import { describe, expect, it } from "vitest";
import { executeMineRun } from "../mine-runner";
import type { MineRunEvent } from "../run-events";

describe("executeMineRun", () => {
  it("returns validation errors without starting a run", async () => {
    const events: MineRunEvent[] = [];
    const run = await executeMineRun(
      { query: "ok", sources: ["github"], maxResults: 6 },
      {
        emit: (event) => {
          events.push(event);
        },
      }
    );

    expect(run.ok).toBe(false);
    expect(events).toEqual([]);
  });

  it("emits start and completion events for demo fallback", async () => {
    const previousKey = process.env.HYPERBROWSER_API_KEY;
    delete process.env.HYPERBROWSER_API_KEY;
    const events: MineRunEvent[] = [];

    try {
      const run = await executeMineRun(
        {
          query: "captcha failures with playwright",
          sources: ["github", "hyperbrowser"],
          maxResults: 6,
          analysisMode: "full",
        },
        {
          emit: (event) => {
            events.push(event);
          },
        }
      );

      expect(run.ok).toBe(true);
      expect(events[0]).toMatchObject({
        type: "run_started",
        query: "captcha failures with playwright",
      });
      expect(events.at(-1)?.type).toBe("run_completed");
    } finally {
      if (previousKey) {
        process.env.HYPERBROWSER_API_KEY = previousKey;
      }
    }
  });
});
