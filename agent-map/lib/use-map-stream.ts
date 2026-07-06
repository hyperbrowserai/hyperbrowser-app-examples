"use client";

import { useMemo, useRef, useState } from "react";

import type {
  AgentMap,
  AgentMapEdge,
  CrawlFeedItem,
  MapStreamEvent,
  PageSummary,
} from "./types";
import { normalizeUrl, resolveUrl } from "./url-utils";

export type GraphPage = CrawlFeedItem & {
  summary?: PageSummary;
};

export function useMapStream() {
  const [running, setRunning] = useState(false);
  const [feed, setFeed] = useState<CrawlFeedItem[]>([]);
  const [summaries, setSummaries] = useState<Record<string, PageSummary>>({});
  const [artifact, setArtifact] = useState<AgentMap | null>(null);
  const [errors, setErrors] = useState<string[]>([]);
  const [status, setStatus] = useState("idle");
  const abortRef = useRef<AbortController | null>(null);

  const graphPages = useMemo<GraphPage[]>(
    () =>
      feed.map((item) => ({
        ...item,
        summary: summaries[normalizeUrl(item.url)],
      })),
    [feed, summaries],
  );

  const graphEdges = useMemo(
    () => buildClientEdges(graphPages),
    [graphPages],
  );

  async function start(url: string, maxPages = 15) {
    abortRef.current?.abort();
    const abortController = new AbortController();
    abortRef.current = abortController;

    setRunning(true);
    setFeed([]);
    setSummaries({});
    setArtifact(null);
    setErrors([]);
    setStatus("starting");

    try {
      const response = await fetch("/api/map/stream", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, maxPages }),
        signal: abortController.signal,
      });

      if (!response.ok || !response.body) {
        const body = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(body?.message ?? "Unable to start crawl.");
      }

      await readEventStream(response.body, handleEvent);
    } catch (error) {
      if (!abortController.signal.aborted) {
        setErrors((current) => [...current, getErrorMessage(error)]);
      }
    } finally {
      if (!abortController.signal.aborted) {
        setRunning(false);
      }
    }
  }

  function stop() {
    abortRef.current?.abort();
    setRunning(false);
    setStatus("stopped");
  }

  function handleEvent(event: MapStreamEvent) {
    switch (event.type) {
      case "started":
        setStatus(`crawl job ${event.jobId.slice(0, 8)}`);
        break;
      case "progress":
        setStatus(`${event.status} - ${event.totalCrawledPages} pages`);
        break;
      case "page":
        setFeed((current) => {
          const normalizedUrl = normalizeUrl(event.url);
          if (current.some((item) => normalizeUrl(item.url) === normalizedUrl)) {
            return current;
          }
          return [...current, event];
        });
        break;
      case "extract":
        setSummaries((current) => ({
          ...current,
          [normalizeUrl(event.url)]: event.summary,
        }));
        break;
      case "artifact":
        setArtifact(event.artifact);
        setStatus("extracting - artifact ready");
        break;
      case "complete":
        setArtifact(event.artifact);
        setStatus("complete");
        setRunning(false);
        break;
      case "error":
        setErrors((current) => [...current, event.message]);
        break;
    }
  }

  return {
    artifact,
    errors,
    feed,
    graphEdges: artifact?.edges ?? graphEdges,
    graphPages,
    running,
    start,
    status,
    stop,
  };
}

async function readEventStream(
  stream: ReadableStream<Uint8Array>,
  onEvent: (event: MapStreamEvent) => void,
) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();

    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });
    const messages = buffer.split("\n\n");
    buffer = messages.pop() ?? "";

    for (const message of messages) {
      const dataLine = message
        .split("\n")
        .find((line) => line.startsWith("data: "));

      if (!dataLine) {
        continue;
      }

      onEvent(JSON.parse(dataLine.slice(6)) as MapStreamEvent);
    }
  }
}

function buildClientEdges(pages: GraphPage[]): AgentMapEdge[] {
  const pageUrls = new Set(pages.map((page) => normalizeUrl(page.url)));
  const seen = new Set<string>();
  const edges: AgentMapEdge[] = [];

  for (const page of pages) {
    const source = normalizeUrl(page.url);

    for (const link of page.links) {
      const target = resolveUrl(link, source);

      if (!target || !pageUrls.has(target) || target === source) {
        continue;
      }

      const key = `${source}->${target}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      edges.push({ source, target });
    }
  }

  return edges;
}

function getErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unknown error";
}
