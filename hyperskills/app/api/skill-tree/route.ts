import { NextRequest } from "next/server";
import type { SkillTreeStreamEvent } from "@/types";
import { hyperbrowserSearch } from "@/lib/hyperbrowser-search";
import {
  createAgentSession,
  startAutoBrowsingTask,
  pollHyperAgentJob,
  stopAgentSession,
} from "@/lib/hyperbrowser-agent";
import { generateSkillTreeFromAgent } from "@/lib/openai";

export const maxDuration = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SkillTreeStreamEvent) => {
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
        const body = await request.json();
        const { topic, url } = body as { topic?: string; url?: string };

        if (!topic?.trim() && !url?.trim()) {
          send({ type: "error", message: "Either topic or url is required" });
          return;
        }

        const trimmedTopic = topic?.trim() ?? "";
        const trimmedUrl = url?.trim() ?? "";
        const rawInput = (trimmedUrl || trimmedTopic).trim();
        const isUrl =
          !!trimmedUrl ||
          trimmedTopic.startsWith("http://") ||
          trimmedTopic.startsWith("https://");

        const labelTopic = isUrl ? rawInput : trimmedTopic;

        // 1. Find seed URLs
        let seedUrls: string[] = [];
        if (isUrl) {
          seedUrls = [rawInput];
          send({ type: "sources", urls: seedUrls });
        } else {
          send({ type: "phase", phase: "searching" });
          send({ type: "agent_status", message: "SEARCHING DOCUMENTATION..." });

          const hits = await hyperbrowserSearch(
            `${labelTopic} official documentation API reference`,
            10
          );
          seedUrls = hits
            .map((h) => h.url)
            .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

          if (seedUrls.length === 0) {
            send({
              type: "error",
              message:
                "No documentation URLs found. Try a more specific topic or paste a docs URL.",
            });
            return;
          }
          send({ type: "sources", urls: seedUrls });
        }

        // 2. Create live browser session
        const session = await createAgentSession();
        sessionId = session.sessionId;
        send({ type: "session_started", liveUrl: session.liveUrl });

        // 3. Launch HyperAgent — same autonomous browsing task as Auto Mode
        send({ type: "phase", phase: "browsing" });
        send({ type: "agent_status", message: "AGENT IS READING..." });

        const jobId = await startAutoBrowsingTask(
          session.sessionId,
          labelTopic,
          seedUrls
        );

        // 4. Poll + stream live navigation events
        let lastStepCount = 0;
        let attempts = 0;
        const maxAttempts = 100;
        let lastPoll = await pollHyperAgentJob(jobId);

        while (attempts < maxAttempts) {
          await sleep(3000);
          attempts++;
          lastPoll = await pollHyperAgentJob(jobId);

          if (
            lastPoll.stepsCompleted > lastStepCount &&
            lastPoll.currentThoughts
          ) {
            const urlMatch = lastPoll.currentThoughts.match(
              /https?:\/\/[^\s"'`)]+/
            );
            if (urlMatch) {
              send({ type: "navigating", url: urlMatch[0] });
            }
            send({
              type: "extracting",
              url: urlMatch?.[0] || seedUrls[0] || "",
              pageTitle: lastPoll.currentThoughts.slice(0, 160),
            });
            send({ type: "agent_status", message: "AGENT IS READING..." });
            lastStepCount = lastPoll.stepsCompleted;
          }

          if (
            lastPoll.status === "completed" ||
            lastPoll.status === "failed" ||
            lastPoll.status === "stopped"
          ) {
            break;
          }
        }

        if (lastPoll.status === "failed") {
          send({
            type: "error",
            message: lastPoll.error || "Agent task failed",
          });
          return;
        }

        const extracted = lastPoll.finalResult?.trim() || "";
        if (!extracted) {
          send({
            type: "error",
            message:
              "Agent returned no research content. Try again with a different topic.",
          });
          return;
        }

        // 5. Generate skill tree from the agent's rich JSON output
        send({ type: "phase", phase: "generating" });
        send({
          type: "agent_status",
          message: "BUILDING SKILL TREE...",
        });

        const tree = await generateSkillTreeFromAgent(labelTopic, extracted);

        send({ type: "tree_topic", topic: tree.topic });

        // 6. Stream files one by one (HyperLearn-style)
        for (const file of tree.files) {
          send({ type: "skill_generated", file });
          await sleep(120);
        }

        send({ type: "complete", tree });
      } catch (error) {
        console.error("Error in /api/skill-tree:", error);
        const errorMessage =
          error instanceof Error ? error.message : "An unknown error occurred";
        send({ type: "error", message: errorMessage });
      } finally {
        if (sessionId) {
          await stopAgentSession(sessionId);
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
