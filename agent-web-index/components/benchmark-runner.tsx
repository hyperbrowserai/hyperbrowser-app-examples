"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { supportedUrls } from "@/lib/match-task";
import type { Site } from "@/lib/types";

type RunStatus = "idle" | "running" | "succeeded" | "failed" | "stopped";

type BenchStatus = {
  status: RunStatus;
  logs: string[];
  startedAt: string | null;
  endedAt: string | null;
  exitCode: number | null;
  taskId: string | null;
  taskUrl: string | null;
  taskGoal: string | null;
  latestSite: Site | null;
  results: {
    exists: boolean;
    siteCount: number;
    updatedAt: string | null;
  };
};

const INITIAL_STATUS: BenchStatus = {
  status: "idle",
  logs: [],
  startedAt: null,
  endedAt: null,
  exitCode: null,
  taskId: null,
  taskUrl: null,
  taskGoal: null,
  latestSite: null,
  results: { exists: false, siteCount: 0, updatedAt: null },
};

function normalizeStatus(raw: Partial<BenchStatus>): BenchStatus {
  return {
    ...INITIAL_STATUS,
    ...raw,
    logs: raw.logs ?? [],
    results: { ...INITIAL_STATUS.results, ...raw.results },
  };
}

export default function BenchmarkRunner({
  onResults,
  onSelectSite,
  onClear,
}: {
  onResults: (sites: Site[]) => void;
  onSelectSite: (id: string) => void;
  onClear: () => void;
}) {
  const [url, setUrl] = useState("");
  const [status, setStatus] = useState<BenchStatus>(INITIAL_STATUS);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  async function loadStatus(reset = false) {
    const res = await fetch(
      reset ? "/api/bench?reset=1" : "/api/bench",
      { cache: "no-store" }
    );
    if (!res.ok) throw new Error("could not read run status");
    const data = normalizeStatus((await res.json()) as Partial<BenchStatus>);
    setStatus(data);
    return data;
  }

  const refreshResults = useCallback(
    async (selectId?: string | null) => {
      const res = await fetch("/api/results", { cache: "no-store" });
      if (!res.ok) throw new Error("could not load results");
      const data = (await res.json()) as { sites: Site[] };
      onResults(data.sites);
      const pick = selectId ?? status.taskId;
      if (pick && data.sites.some((s) => s.id === pick)) onSelectSite(pick);
    },
    [onResults, onSelectSite, status.taskId]
  );

  async function startRun() {
    if (!url.trim()) return;
    setLoading(true);
    setError(null);
    onClear();
    try {
      const res = await fetch("/api/bench", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data = normalizeStatus(
        (await res.json()) as Partial<BenchStatus> & {
          error?: string;
          supportedUrls?: string[];
        }
      );
      setStatus(data);
      if (res.status === 400) {
        setError(
          data.error
            ? `${data.error}. try: ${(data.supportedUrls ?? supportedUrls()).join(", ")}`
            : "unsupported url"
        );
        return;
      }
      if (!res.ok && res.status !== 409) {
        throw new Error("could not start run");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not start run");
    } finally {
      setLoading(false);
    }
  }

  async function stopRun() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/bench", { method: "DELETE" });
      if (!res.ok) throw new Error("could not stop run");
      setStatus(normalizeStatus((await res.json()) as Partial<BenchStatus>));
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not stop run");
    } finally {
      setLoading(false);
    }
  }

  const prevStatus = useRef<RunStatus>("idle");

  useEffect(() => {
    const id = window.setTimeout(() => {
      void loadStatus(true).catch(() => undefined);
    }, 0);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    if (status.status !== "running") return;
    const id = window.setInterval(() => {
      void loadStatus().catch(() => undefined);
    }, 1500);
    return () => window.clearInterval(id);
  }, [status.status]);

  useEffect(() => {
    const finished =
      prevStatus.current === "running" &&
      (status.status === "succeeded" ||
        status.status === "failed" ||
        status.status === "stopped");
    prevStatus.current = status.status;
    if (!finished) return;
    if (status.status === "succeeded") {
      void refreshResults(status.taskId).catch((err) => {
        setError(err instanceof Error ? err.message : "could not load results");
      });
    }
  }, [status.status, status.taskId, status.endedAt, refreshResults]);

  const logs = status.logs ?? [];

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "nearest" });
  }, [logs.length]);

  const running = status.status === "running";

  return (
    <section className="mt-8 border-4 border-black shadow-brutal-lg bg-white">
      <div className="border-b-4 border-black p-5">
        <div className="font-mono text-[11px] uppercase tracking-widest text-gray-400 mb-2">
          live demo
        </div>
        <h2 className="text-2xl font-extrabold tracking-tight lowercase mb-2">
          paste a url, watch it run
        </h2>
        <p className="max-w-2xl text-sm font-semibold text-gray-500 leading-snug mb-5">
          this opens a real hyperbrowser session, runs glm-5.2, claude opus 4.8,
          and gpt-5.5 on the same task, and streams progress here. no mock data.
        </p>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void startRun();
          }}
          className="max-w-2xl group"
        >
          <div className="flex items-stretch bg-white border-4 border-black shadow-brutal transition-transform group-focus-within:translate-x-[2px] group-focus-within:translate-y-[2px]">
            <span className="hidden sm:flex items-center pl-4 pr-2 font-mono text-lg font-bold select-none">
              &gt;
            </span>
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://news.ycombinator.com"
              spellCheck={false}
              autoComplete="off"
              disabled={running}
              className="flex-1 min-w-0 bg-transparent outline-none font-mono text-sm sm:text-base font-semibold py-3.5 px-4 sm:pl-0 placeholder:text-gray-400 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={running || loading || !url.trim()}
              className="border-l-4 border-black bg-black text-white font-extrabold text-xs uppercase tracking-wider px-5 hover:bg-[#222] transition-colors disabled:opacity-40"
            >
              {running ? "running…" : "run site"}
            </button>
          </div>
        </form>
        <div className="mt-2 font-mono text-[10px] uppercase tracking-widest text-gray-400">
          supported: {supportedUrls().join(" · ")}
        </div>
      </div>

      <div className="flex items-start justify-end gap-2 flex-wrap border-b-4 border-black px-5 py-3">
        {running && (
          <button
            type="button"
            onClick={stopRun}
            disabled={loading}
            className="bg-white text-black border-2 border-black px-3 py-1.5 font-extrabold uppercase tracking-wider text-[10px] disabled:opacity-40"
          >
            stop
          </button>
        )}
      </div>

      <div className="grid sm:grid-cols-4 border-b-4 border-black font-mono text-xs lowercase">
        <Meta label="status" value={status.status} />
        <Meta label="task" value={status.taskId ?? "-"} />
        <Meta label="exit" value={status.exitCode === null ? "-" : String(status.exitCode)} />
        <Meta label="updated" value={formatTime(status.results.updatedAt)} />
      </div>

      {error && (
        <div className="border-b-4 border-black bg-black text-white font-mono text-sm p-4 lowercase">
          {error}
        </div>
      )}

      <div className="bg-black text-white font-mono text-xs sm:text-sm p-4 h-64 overflow-y-auto">
        {logs.length ? (
          logs.map((line, idx) => (
            <div key={`${idx}-${line}`} className="py-0.5 whitespace-pre-wrap">
              <span className="text-gray-500 mr-2">{String(idx + 1).padStart(3, "0")}</span>
              {line}
            </div>
          ))
        ) : status.status === "running" ? (
          <div className="text-gray-400 lowercase">
            waiting for harness output…
          </div>
        ) : (
          <div className="text-gray-400 lowercase">
            enter a supported url and click run site.
          </div>
        )}
        <div ref={endRef} />
      </div>
    </section>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 border-b-4 sm:border-b-0 sm:border-r-4 sm:last:border-r-0 border-black">
      <div className="text-gray-400 uppercase tracking-widest text-[10px] mb-1">
        {label}
      </div>
      <div className="font-bold truncate">{value}</div>
    </div>
  );
}

function formatTime(value: string | null) {
  if (!value) return "-";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
