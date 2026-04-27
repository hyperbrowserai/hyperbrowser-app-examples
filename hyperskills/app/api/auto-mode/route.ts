import { NextRequest } from "next/server";
import { hyperbrowserSearch } from "@/lib/hyperbrowser-search";
import {
  createAgentSession,
  startAutoBrowsingTask,
  pollHyperAgentJob,
  stopHyperAgentJob,
  stopAgentSession,
  scrapeUrl,
} from "@/lib/hyperbrowser-agent";
import {
  generateSingleSkillFile,
  generateSkillTreeFromAgent,
} from "@/lib/openai";
import {
  clearAutoModeCancel,
  isAutoModeCancelRequested,
} from "@/lib/auto-mode-cancel";
import type { AutoModeStreamEvent, SkillTreeFile } from "@/types";
import { randomUUID } from "crypto";

export const maxDuration = 300;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: AutoModeStreamEvent) => {
        try {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
          );
        } catch {
          // Stream may be closed
        }
      };

      let sessionId: string | null = null;
      let jobId: string | null = null;
      let userStopped = false;
      const runId = randomUUID();

      // Track file paths already streamed so we never duplicate
      const streamedPaths = new Set<string>();

      const sendFile = (file: SkillTreeFile) => {
        if (!streamedPaths.has(file.path)) {
          streamedPaths.add(file.path);
          send({ type: "skill_file", file });
        }
      };

      try {
        const body = await request.json();
        const { topic, url } = body as { topic?: string; url?: string };

        if (!topic?.trim() && !url?.trim()) {
          send({ type: "error", message: "Either topic or url is required" });
          return;
        }

        send({ type: "run_started", runId });

        const trimmedTopic = topic?.trim() ?? "";
        const trimmedUrlField = url?.trim() ?? "";
        const rawInput = (trimmedUrlField || trimmedTopic).trim();
        const isUrl =
          !!trimmedUrlField ||
          trimmedTopic.startsWith("http://") ||
          trimmedTopic.startsWith("https://");

        const labelTopic = isUrl ? rawInput : trimmedTopic;

        let seedUrls: string[] = [];

        if (isUrl) {
          send({
            type: "agent_status",
            message: "Opening documentation URL in live session...",
          });
          seedUrls = [rawInput];
          send({ type: "search_complete", urls: seedUrls });
        } else {
          send({ type: "phase", phase: "searching" });
          send({ type: "agent_status", message: "SEARCHING DOCUMENTATION..." });

          const hits = await hyperbrowserSearch(
            `${labelTopic} official documentation`,
            10
          );
          seedUrls = hits
            .map((h) => h.url)
            .filter((u) => u.startsWith("http://") || u.startsWith("https://"));

          if (seedUrls.length === 0) {
            send({
              type: "error",
              message:
                "No documentation URLs found via Hyperbrowser search. Try a more specific topic or paste a docs URL.",
            });
            return;
          }

          send({ type: "search_complete", urls: seedUrls });
        }

        if (isAutoModeCancelRequested(runId)) {
          send({ type: "error", message: "Stopped before the browser session started." });
          return;
        }

        // Start agent session for live browser
        const session = await createAgentSession();
        sessionId = session.sessionId;
        send({ type: "session_started", liveUrl: session.liveUrl });

        send({ type: "phase", phase: "browsing" });
        send({ type: "agent_status", message: "AGENT IS READING..." });

        if (isAutoModeCancelRequested(runId)) {
          send({ type: "error", message: "Stopped before the agent task started." });
          return;
        }

        // Announce the topic so the UI can init the skill tree panel immediately
        send({ type: "skill_tree_topic", topic: labelTopic });

        jobId = await startAutoBrowsingTask(session.sessionId, labelTopic, seedUrls);

        // ── Parallel track: scrape seed URLs and generate skill files live ──────
        // This runs concurrently with the agent polling loop below so that
        // skill files start appearing within seconds of browsing starting.
        const scrapeAndGenerate = async () => {
          // Limit to first 6 seed URLs to avoid overwhelming the UI
          const targets = seedUrls.slice(0, 6);
          for (const url of targets) {
            if (isAutoModeCancelRequested(runId)) break;
            try {
              const markdown = await scrapeUrl(url);
              if (!markdown || markdown.length < 100) continue;

              send({
                type: "agent_status",
                message: `READING ${new URL(url).hostname.replace("www.", "")}...`,
              });
              send({ type: "navigating", url });
              send({ type: "extracting", url, pageTitle: url });

              const file = await generateSingleSkillFile(labelTopic, url, markdown);
              if (file) sendFile(file);
            } catch {
              // Skip failed URLs silently
            }
          }
        };

        // Run scraping concurrently with agent polling
        const scrapePromise = scrapeAndGenerate();

        // ── Agent polling loop ───────────────────────────────────────────────
        let lastStepCount = 0;
        let attempts = 0;
        const maxAttempts = 100;
        let lastPoll = await pollHyperAgentJob(jobId);

        while (attempts < maxAttempts && !userStopped) {
          if (isAutoModeCancelRequested(runId)) {
            userStopped = true;
            break;
          }
          await sleep(3000);
          attempts++;

          lastPoll = await pollHyperAgentJob(jobId);

          if (lastPoll.stepsCompleted > lastStepCount && lastPoll.currentThoughts) {
            const urlMatch = lastPoll.currentThoughts.match(/https?:\/\/[^\s"'`)]+/);
            if (urlMatch) send({ type: "navigating", url: urlMatch[0] });
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

        if (userStopped && jobId) {
          send({ type: "agent_status", message: "Stopping agent — collecting partial results..." });
          await stopHyperAgentJob(jobId);
          await sleep(2000);
          lastPoll = await pollHyperAgentJob(jobId);
        }

        if (attempts >= maxAttempts && lastPoll.status === "running") {
          if (jobId) {
            await stopHyperAgentJob(jobId);
            await sleep(2000);
            lastPoll = await pollHyperAgentJob(jobId);
          }
          send({ type: "agent_status", message: "Time limit reached — finalising skill tree." });
        }

        if (lastPoll.status === "failed") {
          // Wait for scrape track to finish before erroring so we don't lose streamed files
          await scrapePromise;
          send({ type: "error", message: lastPoll.error || "Agent task failed" });
          return;
        }

        // Wait for the scrape+generate track to finish before the next phase
        await scrapePromise;

        if (userStopped) {
          send({ type: "stopped_early", message: "Generation continues from research gathered so far." });
        }

        // ── Post-browsing enrichment: generate deeper files from agent research ──
        const extracted = lastPoll.finalResult?.trim() || "";

        if (extracted) {
          send({ type: "phase", phase: "generating" });
          send({ type: "agent_status", message: "ENRICHING SKILL TREE..." });

          // Generate a full tree from the richer agent JSON and add any new files
          try {
            const fullTree = await generateSkillTreeFromAgent(labelTopic, extracted);

            for (const file of fullTree.files) {
              if (isAutoModeCancelRequested(runId)) break;
              sendFile(file); // deduplication handled inside sendFile
              await sleep(120);
            }

            // Send the final complete tree (includes all files for the UI to reconcile)
            send({ type: "complete", tree: fullTree });
          } catch {
            // Fall back to completing with only the scraped files
            send({
              type: "complete",
              tree: {
                topic: labelTopic,
                files: [...streamedPaths].map((p) => ({ path: p, content: "" })),
              },
            });
          }
        } else {
          // No agent result — complete with scraped files only
          send({
            type: "complete",
            tree: {
              topic: labelTopic,
              files: [...streamedPaths].map((p) => ({ path: p, content: "" })),
            },
          });
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unknown error occurred";
        send({ type: "error", message });
      } finally {
        clearAutoModeCancel(runId);
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
