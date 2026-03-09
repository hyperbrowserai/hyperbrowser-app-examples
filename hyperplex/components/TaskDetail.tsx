"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { Play, Calendar, Clock, ChevronRight, ArrowRight, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RunDetail } from "@/components/RunDetail";
import type { TaskWithRuns, Run, TaskStatus, RunStatus } from "@/types";

interface TaskDetailProps {
  taskId: string;
  selectedRunId?: string | null;
  onSelectRun?: (runId: string) => void;
}

function StatusBadge({ status }: { status: TaskStatus | RunStatus }) {
  const config = {
    queued: "border-gray-200 text-gray-600",
    running: "border-black text-black",
    completed: "border-black text-black",
    failed: "border-gray-500 text-gray-500",
  };
  return (
    <span
      className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config[status] ?? config.queued}`}
    >
      {status === "running" && (
        <span className="w-2 h-2 bg-black rounded-full mr-2 animate-pulse" />
      )}
      {status}
    </span>
  );
}

function formatRelativeTime(dateStr?: string | null): string {
  if (!dateStr) return "";
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TaskDetail({ taskId, selectedRunId, onSelectRun }: TaskDetailProps) {
  const [task, setTask] = useState<TaskWithRuns | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [activeRunId, setActiveRunId] = useState<string | null>(selectedRunId ?? null);

  const fetchTask = useCallback(async () => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`);
      if (!res.ok) return;
      const data: TaskWithRuns = await res.json();
      setTask(data);
      // Auto-select latest run if none selected
      if (!activeRunId && data.runs.length > 0) {
        const latestRun = data.runs[0];
        setActiveRunId(latestRun.id);
        onSelectRun?.(latestRun.id);
      }
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  }, [taskId, activeRunId, onSelectRun]);

  useEffect(() => {
    setIsLoading(true);
    setTask(null);
    setActiveRunId(selectedRunId ?? null);
    fetchTask();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  useEffect(() => {
    if (selectedRunId) setActiveRunId(selectedRunId);
  }, [selectedRunId]);

  // Poll task for run list updates
  useEffect(() => {
    const interval = setInterval(fetchTask, 3000);
    return () => clearInterval(interval);
  }, [fetchTask]);

  const [promptInput, setPromptInput] = useState("");
  const [queuedPrompts, setQueuedPrompts] = useState<{ id: string; text: string }[]>([]);
  const [runningPromptId, setRunningPromptId] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  async function handleRunWithGoal(goalOverride?: string) {
    if (!task) return;
    setIsRunning(true);
    try {
      const body = goalOverride ? { goal: goalOverride } : undefined;
      const res = await fetch(`/api/tasks/${taskId}/run`, {
        method: "POST",
        headers: body ? { "Content-Type": "application/json" } : {},
        body: body ? JSON.stringify(body) : undefined,
      });
      if (!res.ok) return;
      const data = await res.json();
      const newRunId = data.run.id;
      setActiveRunId(newRunId);
      onSelectRun?.(newRunId);
      fetchTask();
    } catch {
      // ignore
    } finally {
      setIsRunning(false);
      setRunningPromptId(null);
    }
  }

  function handleAddPrompt() {
    if (!promptInput.trim()) return;
    setQueuedPrompts((prev) => [...prev, { id: crypto.randomUUID(), text: promptInput.trim() }]);
    setPromptInput("");
  }

  function handleRemovePrompt(id: string) {
    setQueuedPrompts((prev) => prev.filter((p) => p.id !== id));
  }

  async function handleRunPrompt(id: string, text: string) {
    setRunningPromptId(id);
    setQueuedPrompts((prev) => prev.filter((p) => p.id !== id));
    await handleRunWithGoal(text);
  }

  function handleRunImmediately(e: React.FormEvent) {
    e.preventDefault();
    if (!promptInput.trim() || isRunning) return;
    const text = promptInput.trim();
    setPromptInput("");
    handleRunWithGoal(text);
  }

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.max(44, inputRef.current.scrollHeight)}px`;
    }
  }, [promptInput]);

  if (isLoading) {
    return (
      <div className="flex flex-col h-full bg-white">
        <div className="px-8 py-5 border-b border-gray-200">
          <Skeleton className="h-7 w-1/3 mb-3" />
          <Skeleton className="h-4 w-2/3" />
        </div>
        <div className="flex flex-1 overflow-hidden">
          <div className="w-64 border-r border-gray-200 p-4 space-y-3">
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
            <Skeleton className="h-16 w-full rounded-lg" />
          </div>
          <div className="flex-1 p-6 space-y-6">
            <Skeleton className="h-12 w-full rounded-xl" />
            <Skeleton className="h-32 w-full rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  if (!task) return <div className="p-6 text-sm text-gray-400">Task not found.</div>;

  const activeRun = task.runs.find((r) => r.id === activeRunId) as Run | undefined;

  return (
    <div className="flex flex-col h-full">
      {/* Task header */}
      <div className="px-8 py-5 border-b border-gray-200">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-xl font-bold text-black truncate">{task.title}</h1>
              <StatusBadge status={task.status} />
            </div>
            <p className="text-sm text-gray-500 leading-relaxed font-medium">{task.goal}</p>
            {task.scheduleCron && (
              <div className="flex items-center gap-2 mt-2 text-xs text-gray-400 font-medium">
                <Calendar className="w-3.5 h-3.5" />
                <code className="font-mono">{task.scheduleCron}</code>
              </div>
            )}
          </div>
          <Button
            size="sm"
            onClick={() => handleRunWithGoal()}
            disabled={isRunning || task.status === "running"}
            className="flex-shrink-0 gap-1.5 bg-black text-white hover:bg-gray-800 text-sm font-semibold px-4"
          >
            <Play className="w-3.5 h-3.5" />
            {isRunning ? "Starting..." : "Re-run"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Run history sidebar */}
        {task.runs.length > 0 && (
          <div className="w-64 border-r border-gray-200 overflow-y-auto flex-shrink-0">
            <div className="px-5 py-4">
              <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Threads
              </h2>
            </div>
            <div className="space-y-1 px-3 pb-4">
              {task.runs.map((run, i) => {
                const isActive = activeRunId === run.id;
                const runLabel = run.goal
                  ? run.goal.length > 50 ? run.goal.slice(0, 50) + "..." : run.goal
                  : "Original goal";
                return (
                  <button
                    key={run.id}
                    onClick={() => {
                      setActiveRunId(run.id);
                      onSelectRun?.(run.id);
                    }}
                    className={`w-full text-left px-3 py-2.5 rounded-lg transition-colors animate-slide-up ${
                      isActive
                        ? "bg-black text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                    style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                  >
                    <p className={`text-sm font-medium leading-snug line-clamp-2 ${isActive ? "text-white" : "text-gray-800"}`}>
                      {runLabel}
                    </p>
                    <div className={`flex items-center gap-1.5 mt-1 text-xs font-medium ${isActive ? "text-gray-300" : "text-gray-400"}`}>
                      {run.status === "running" && (
                        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${isActive ? "bg-white" : "bg-black"}`} />
                      )}
                      <span>{run.status}</span>
                      <span className="mx-0.5">·</span>
                      <Clock className="w-3 h-3" />
                      {formatRelativeTime(run.startedAt ?? run.steps?.[0]?.startedAt)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Run detail + follow-up input */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6">
            {activeRun ? (
              <>
                {activeRun.goal && activeRun.goal !== task.goal && (
                  <div className="mb-5 px-4 py-3 bg-gray-50 rounded-xl border border-gray-200">
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Follow-up prompt</p>
                    <p className="text-sm text-gray-700 font-medium">{activeRun.goal}</p>
                  </div>
                )}
                <RunDetail runId={activeRun.id} initialRun={activeRun} />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full py-20 px-6 text-center">
                <div className="w-12 h-12 rounded-full border-2 border-gray-200 flex items-center justify-center mb-4 bg-gray-50">
                  <Search className="w-6 h-6 text-gray-400" />
                </div>
                <p className="text-base text-gray-600 font-medium">No runs yet</p>
                <p className="text-sm text-gray-400 mt-1.5 max-w-[250px]">
                  Type a prompt below or click "Re-run" to start your first research agent.
                </p>
              </div>
            )}
          </div>

          {/* Queued prompts + input bar */}
          <div className="border-t border-gray-200 bg-white shadow-[0_-4px_24px_rgba(0,0,0,0.02)] z-10 relative">
            {queuedPrompts.length > 0 && (
              <div className="px-6 pt-3 space-y-2">
                {queuedPrompts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center gap-2 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg group"
                  >
                    <p className="flex-1 text-sm text-gray-700 font-medium truncate">{p.text}</p>
                    <button
                      onClick={() => handleRunPrompt(p.id, p.text)}
                      disabled={isRunning}
                      className="p-1.5 rounded-md bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex-shrink-0"
                      title="Run this prompt"
                    >
                      {runningPromptId === p.id ? (
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      ) : (
                        <Play className="w-3.5 h-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => handleRemovePrompt(p.id)}
                      className="p-1.5 rounded-md text-gray-400 hover:text-black hover:bg-gray-200 transition-colors flex-shrink-0"
                      title="Remove"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="px-6 py-3">
              <form onSubmit={handleRunImmediately} className="flex items-end gap-2">
                <div className="flex-1">
                  <textarea
                    ref={inputRef}
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Add a follow-up prompt..."
                    rows={1}
                    className="w-full px-4 py-3 text-sm font-medium bg-gray-50 border border-gray-200 rounded-xl resize-none focus:outline-none focus:border-black focus:bg-white transition-all placeholder:text-gray-400 overflow-hidden"
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey && !e.metaKey) {
                        e.preventDefault();
                        handleAddPrompt();
                      }
                      if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                        e.preventDefault();
                        handleRunImmediately(e);
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddPrompt}
                  disabled={!promptInput.trim()}
                  className="p-3 border border-gray-200 text-gray-600 rounded-xl hover:border-black hover:text-black disabled:opacity-50 disabled:hover:border-gray-200 disabled:hover:text-gray-600 disabled:cursor-not-allowed transition-all flex-shrink-0"
                  title="Add to queue (Enter)"
                >
                  <Plus className="w-4 h-4" />
                </button>
                <button
                  type="submit"
                  disabled={isRunning || !promptInput.trim()}
                  className="p-3 bg-black text-white rounded-xl hover:bg-gray-800 disabled:opacity-50 disabled:hover:bg-black disabled:cursor-not-allowed transition-all active:scale-95 disabled:active:scale-100 flex-shrink-0"
                  title="Run immediately (Cmd+Enter)"
                >
                  {isRunning && !runningPromptId ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <ArrowRight className="w-4 h-4" />
                  )}
                </button>
              </form>
             
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
