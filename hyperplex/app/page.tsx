"use client";

import { useCallback, Suspense, useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { TaskSidebar } from "@/components/TaskSidebar";
import { TaskDetail } from "@/components/TaskDetail";

function EmptyState({ onTaskCreated }: { onTaskCreated: (id: string) => void }) {
  const [goal, setGoal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.max(140, textareaRef.current.scrollHeight)}px`;
    }
  }, [goal]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!goal.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: goal.trim().substring(0, 40) + (goal.length > 40 ? "..." : ""),
          goal: goal.trim(),
          model: "auto",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? `Request failed (${res.status})`);
      }
      const data = await res.json();
      onTaskCreated(data.task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col items-center justify-center h-full px-6 max-w-4xl mx-auto w-full">
      <div className="w-full space-y-10">
        <div className="text-center space-y-5">
          <div className="flex justify-center">
            <img src="/hyperbrowser-logo.svg" alt="Hyperbrowser" className="h-20 w-auto" />
          </div>
          <h1 className="text-5xl md:text-6xl font-medium tracking-tight text-gray-900">
            What do you want to research?
          </h1>
          <p className="text-xl text-gray-500 font-medium max-w-2xl mx-auto">
            Give the AI a goal. It will automatically orchestrate the best frontier models to search, fetch, and synthesize a complete answer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="w-full space-y-4">
          <div className="relative flex flex-col w-full rounded-3xl border-2 border-gray-200 bg-white shadow-sm focus-within:border-black transition-all overflow-hidden">
            <textarea
              ref={textareaRef}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              placeholder="Compare the latest AI models launched this month, pricing, context windows, benchmarks, and which one actually wins for coding."
              className="w-full min-h-[140px] max-h-[60vh] p-6 md:p-8 pb-4 text-xl font-medium bg-transparent resize-none focus:outline-none focus:ring-0 border-none placeholder:text-gray-400 placeholder:font-normal overflow-y-auto"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
            />

            {/* Bottom toolbar */}
            <div className="px-6 md:px-8 pb-4 pt-2 flex items-center justify-end bg-white">
              <button
                type="submit"
                disabled={isSubmitting || !goal.trim()}
                className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black disabled:cursor-not-allowed transition-all active:scale-95 disabled:active:scale-100 flex items-center justify-center"
              >
                {isSubmitting ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {error && (
            <p className="text-center text-sm text-red-500 font-medium pt-2">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
}

function TasksApp() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const taskId = searchParams.get("task");
  const runId = searchParams.get("run");

  const handleSelectTask = useCallback(
    (id: string | null) => {
      const params = new URLSearchParams();
      if (id) {
        params.set("task", id);
      }
      router.push(id ? `?${params.toString()}` : "/");
    },
    [router]
  );

  const handleSelectRun = useCallback(
    (id: string) => {
      if (!taskId) return;
      const params = new URLSearchParams();
      params.set("task", taskId);
      params.set("run", id);
      router.replace(`?${params.toString()}`);
    },
    [router, taskId]
  );

  return (
    <div className="flex h-screen overflow-hidden bg-white text-gray-900">
      <TaskSidebar
        selectedTaskId={taskId}
        onSelectTask={handleSelectTask}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed((prev) => !prev)}
      />
      <main className="flex-1 overflow-hidden">
        {taskId ? (
          <TaskDetail
            taskId={taskId}
            selectedRunId={runId}
            onSelectRun={handleSelectRun}
          />
        ) : (
          <EmptyState onTaskCreated={handleSelectTask} />
        )}
      </main>
    </div>
  );
}

export default function HomePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen overflow-hidden bg-white">
          <aside className="w-[30rem] min-w-[30rem] border-r border-gray-200 bg-white flex flex-col h-full">
            <div className="px-5 pt-6 pb-4 border-b border-gray-200 flex justify-between">
              <div className="h-6 w-32 bg-gray-200 rounded-md animate-pulse" />
              <div className="h-8 w-24 bg-gray-200 rounded-md animate-pulse" />
            </div>
            <div className="p-4 space-y-4">
              <div className="h-20 w-full bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-20 w-full bg-gray-100 rounded-xl animate-pulse" />
              <div className="h-20 w-full bg-gray-100 rounded-xl animate-pulse" />
            </div>
          </aside>
          <main className="flex-1 flex flex-col items-center justify-center p-8">
            <div className="h-16 w-3/4 max-w-2xl bg-gray-100 rounded-2xl animate-pulse mb-8" />
            <div className="h-40 w-full max-w-4xl bg-gray-50 rounded-3xl border-2 border-gray-100 animate-pulse" />
          </main>
        </div>
      }
    >
      <TasksApp />
    </Suspense>
  );
}
