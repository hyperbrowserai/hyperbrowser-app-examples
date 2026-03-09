"use client";

import { useState, useEffect } from "react";
import { Clock, Plus, Trash2, PanelLeftClose, PanelLeftOpen, FolderOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import type { Task, TaskStatus } from "@/types";

interface TaskSidebarProps {
  selectedTaskId: string | null;
  onSelectTask: (taskId: string | null) => void;
  collapsed: boolean;
  onToggleCollapse: () => void;
}

type FilterTab = "all" | "running" | "completed" | "failed";

const FILTER_TABS: { value: FilterTab; label: string }[] = [
  { value: "all", label: "All" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Done" },
  { value: "failed", label: "Failed" },
];

function StatusDot({ status }: { status: TaskStatus }) {
  const config = {
    queued: "bg-gray-300",
    running: "bg-black animate-pulse",
    completed: "bg-black",
    failed: "bg-gray-400",
  };
  return (
    <span className="flex items-center justify-center w-5 h-5 flex-shrink-0">
      <span className={`block w-2 h-2 rounded-full ${config[status] ?? "bg-gray-300"}`} />
    </span>
  );
}

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function TaskSidebar({ selectedTaskId, onSelectTask, collapsed, onToggleCollapse }: TaskSidebarProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [filter, setFilter] = useState<FilterTab>("all");

  async function fetchTasks() {
    try {
      const res = await fetch("/api/tasks");
      if (!res.ok) return;
      const data: Task[] = await res.json();
      setTasks(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(fetchTasks, 3000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tasks.filter((t) => {
    if (filter === "all") return true;
    if (filter === "running") return t.status === "running" || t.status === "queued";
    return t.status === filter;
  });

  if (collapsed) {
    return (
      <aside className="w-16 min-w-16 flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen items-center py-4 gap-3 transition-all duration-200">
        <button
          onClick={onToggleCollapse}
          className="p-2.5 rounded-lg text-gray-500 hover:text-black hover:bg-gray-100 transition-colors"
          aria-label="Expand sidebar"
        >
          <PanelLeftOpen className="w-5 h-5" />
        </button>
        <button
          onClick={() => onSelectTask(null)}
          className="p-2.5 rounded-lg bg-black text-white hover:bg-gray-800 transition-colors"
          aria-label="New task"
        >
          <Plus className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-[30rem] min-w-[30rem] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col h-screen transition-all duration-200">
      {/* Header */}
      <div className="px-5 pt-6 pb-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-lg text-gray-400 hover:text-black hover:bg-gray-100 transition-colors"
              aria-label="Collapse sidebar"
            >
              <PanelLeftClose className="w-5 h-5" />
            </button>
            <h1 className="text-base font-bold text-black tracking-tight">HyperPlex-Computer</h1>
          </div>
          <Button
            size="sm"
            onClick={() => onSelectTask(null)}
            className="gap-2 bg-black text-white hover:bg-gray-800 text-sm font-semibold px-4 py-2 h-auto"
          >
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        </div>
      </div>

      {/* Filter tabs */}
      <div className="flex px-4 pt-3 gap-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setFilter(tab.value)}
            className={`flex-1 text-xs py-1.5 rounded-full font-semibold transition-colors ${
              filter === tab.value
                ? "bg-black text-white"
                : "text-gray-500 hover:text-black hover:bg-gray-100"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Task list */}
      <ScrollArea className="flex-1 mt-2">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 px-6 text-center">
            <div className="w-12 h-12 rounded-full border-2 border-dashed border-gray-200 bg-gray-50 flex items-center justify-center mb-4">
              <FolderOpen className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-semibold text-gray-600">No tasks found</p>
            <p className="text-xs text-gray-400 mt-1 max-w-[200px]">
              {filter === "all" ? "Create your first research task to get started." : `No tasks match the "${filter}" filter.`}
            </p>
          </div>
        ) : (
          <div className="px-3 pb-4 space-y-1 pt-1">
            {filtered.map((task, i) => {
              const latestRun = task.runs[0];
              const isSelected = selectedTaskId === task.id;
              return (
                <div
                  key={task.id}
                  className={`group relative rounded-xl transition-colors animate-slide-up ${
                    isSelected
                      ? "bg-gray-100 text-black"
                      : "text-gray-600 hover:bg-gray-50 hover:text-black"
                  }`}
                  style={{ animationDelay: `${Math.min(i * 40, 400)}ms` }}
                >
                  <button
                    onClick={() => onSelectTask(task.id)}
                    className="w-full text-left px-3 py-3 min-w-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <StatusDot status={task.status} />
                      <div className="flex-1 min-w-0">
                        <span className="text-[15px] font-semibold leading-snug break-words line-clamp-2 block">
                          {task.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-400 font-medium">
                          <Clock className="w-3 h-3 flex-shrink-0" />
                          {formatRelativeTime(latestRun?.startedAt ?? task.createdAt)}
                          {task.scheduleCron && (
                            <span className="ml-0.5 text-gray-400">· cron</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={async (e) => {
                      e.stopPropagation();
                      if (!confirm("Delete this task?")) return;
                      const res = await fetch(`/api/tasks/${task.id}`, { method: "DELETE" });
                      if (!res.ok) return;
                      await fetchTasks();
                      if (selectedTaskId === task.id) onSelectTask(null);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-md text-gray-400 hover:text-black hover:bg-gray-200 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Delete task"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>
    </aside>
  );
}
