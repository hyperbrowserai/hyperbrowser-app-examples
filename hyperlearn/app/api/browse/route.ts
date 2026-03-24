import { NextRequest } from "next/server";
import {
  createSession,
  startBrowsingTask,
  pollTaskStatus,
  stopSession,
} from "@/lib/hyperbrowser";
import { generateSkillTree } from "@/lib/skill-generator";
import { BrowseEvent } from "@/lib/types";

export const maxDuration = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { topic, url } = body as { topic?: string; url?: string };

  if (!topic && !url) {
    return new Response(
      JSON.stringify({ error: "Either topic or url is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: BrowseEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream may be closed
        }
      };

      let sessionId: string | null = null;

      try {
        const searchTopic = topic || url || "";

        // 1. Create Hyperbrowser session with live view
        const session = await createSession();
        sessionId = session.sessionId;
        send({ type: "session_started", liveUrl: session.liveUrl });

        // 2. Start cloud HyperAgent task — it handles Google search + browsing
        const taskInput = url
          ? { urls: [url] }
          : { topic: searchTopic };
        const jobId = await startBrowsingTask(sessionId, taskInput);

        // 3. Poll for progress
        let lastStepCount = 0;
        let attempts = 0;
        const maxAttempts = 100; // ~5 minutes at 3s intervals

        while (attempts < maxAttempts) {
          await sleep(3000);
          attempts++;

          const poll = await pollTaskStatus(jobId);

          if (poll.stepsCompleted > lastStepCount && poll.currentThoughts) {
            // Try to detect URL navigation from agent thoughts
            const urlMatch = poll.currentThoughts.match(
              /https?:\/\/[^\s"')]+/
            );
            if (urlMatch) {
              send({ type: "navigating", url: urlMatch[0] });
            }
            send({
              type: "extracting",
              url: urlMatch?.[0] || "https://www.google.com",
              pageTitle: poll.currentThoughts.slice(0, 100),
            });
            lastStepCount = poll.stepsCompleted;
          }

          if (poll.status === "completed") {
            const extractedContent = poll.finalResult || "";

            // 4. Generate skill tree from extracted content
            send({ type: "generating_skills" });

            const tree = await generateSkillTree(searchTopic, extractedContent);

            // 5. Stream each file individually
            for (const file of tree.files) {
              send({ type: "skill_generated", file });
              await sleep(150); // Brief pause for visual effect
            }

            // 6. Stream completion
            send({ type: "complete", tree });
            break;
          }

          if (poll.status === "failed" || poll.status === "stopped") {
            send({
              type: "error",
              message: poll.error || "Agent task failed",
            });
            break;
          }
        }

        if (attempts >= maxAttempts) {
          send({ type: "error", message: "Agent task timed out" });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        send({ type: "error", message });
      } finally {
        if (sessionId) {
          await stopSession(sessionId);
        }
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
