"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";

interface NewTaskDialogProps {
  onTaskCreated: (taskId: string) => void;
  children?: React.ReactNode;
}

const MODEL_OPTIONS = [
  { value: "auto",                    label: "Auto",             description: "Best available model based on your API keys" },
  // Anthropic
  { value: "claude-opus-4-6",         label: "Claude Opus 4.6",  description: "Anthropic · Most capable" },
  { value: "claude-sonnet-4-6",       label: "Claude Sonnet 4.6", description: "Anthropic · Fast & capable" },
  { value: "claude-haiku-4-5",        label: "Claude Haiku 4.5", description: "Anthropic · Fastest" },
  // OpenAI
  { value: "gpt-5.2",                 label: "GPT-5.2",          description: "OpenAI · Flagship" },
  { value: "o4-mini",                 label: "o4-mini",          description: "OpenAI · Fast reasoning" },
  { value: "o3",                      label: "o3",               description: "OpenAI · Deep reasoning" },
  // Google
  { value: "gemini-3.1-pro-preview",  label: "Gemini 3.1 Pro",  description: "Google · Advanced reasoning" },
  { value: "gemini-3-flash-preview",  label: "Gemini 3 Flash",  description: "Google · Fast multimodal" },
] as const;

export function NewTaskDialog({ onTaskCreated, children }: NewTaskDialogProps) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [model, setModel] = useState("auto");
  const [scheduleCron, setScheduleCron] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !goal.trim()) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          goal: goal.trim(),
          model,
          scheduleCron: scheduleCron.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to create task");
      }

      const data = await res.json();
      setOpen(false);
      setTitle("");
      setGoal("");
      setModel("auto");
      setScheduleCron("");
      onTaskCreated(data.task.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children ?? (
          <Button size="sm" className="gap-2 bg-black text-white hover:bg-gray-800 text-sm font-semibold px-4 py-2 h-auto">
            <Plus className="w-4 h-4" />
            New Task
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] p-6">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-black">New Research Task</DialogTitle>
          <DialogDescription className="text-base text-gray-500 font-medium">
            Create a task and the AI will research it using live web sources.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6 py-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-base font-semibold text-black">Task name</Label>
              <Input
              id="title"
              placeholder="e.g. Latest AI models overview"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="text-base font-medium p-3 h-auto border-2 border-gray-200 focus-visible:border-black focus-visible:ring-0"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="goal" className="text-base font-semibold text-black">Research goal</Label>
            <Textarea
              id="goal"
              placeholder="Describe what you want to research in detail..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              rows={4}
              required
              className="text-base font-medium p-3 border-2 border-gray-200 focus-visible:border-black focus-visible:ring-0 resize-none"
            />
          </div>

          {/* Model selector */}
          <div className="space-y-2">
            <Label className="text-base font-semibold text-black">Model</Label>
            <div className="grid grid-cols-1 gap-2">
              {MODEL_OPTIONS.map((opt) => (
                <label
                  key={opt.value}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition-colors ${
                    model === opt.value
                      ? "border-black bg-gray-50"
                      : "border-gray-200 hover:border-black"
                  }`}
                >
                  <input
                    type="radio"
                    name="model"
                    value={opt.value}
                    checked={model === opt.value}
                    onChange={() => setModel(opt.value)}
                    className="sr-only"
                  />
                  <div
                    className={`w-4 h-4 rounded-full border-2 flex-shrink-0 ${
                      model === opt.value ? "border-black bg-black" : "border-gray-300"
                    }`}
                  />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`text-base font-semibold ${model === opt.value ? "text-black" : "text-gray-700"}`}>
                      {opt.label}
                    </span>
                    <span className="text-sm font-medium text-gray-500 truncate">{opt.description}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="cron" className="text-base font-semibold text-black">
              Schedule{" "}
              <span className="text-sm text-gray-500 font-medium">(optional)</span>
            </Label>
            <Input
              id="cron"
              placeholder="e.g. 0 9 * * * (every day at 9am)"
              value={scheduleCron}
              onChange={(e) => setScheduleCron(e.target.value)}
              className="text-base font-medium p-3 h-auto border-2 border-gray-200 focus-visible:border-black focus-visible:ring-0"
            />
            <p className="text-sm text-gray-500 font-medium">
              Use cron syntax.{" "}
              <a href="https://crontab.guru" target="_blank" rel="noopener noreferrer" className="text-black hover:underline font-medium">
                crontab.guru
              </a>{" "}
              · Examples: <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">0 * * * *</code> (hourly),{" "}
              <code className="font-mono bg-gray-100 px-1 py-0.5 rounded">0 9 * * 1</code> (Mon 9am)
            </p>
          </div>

          {error && <p className="text-base text-red-600 font-medium">{error}</p>}
          <DialogFooter className="gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setOpen(false)} disabled={isSubmitting} className="text-base font-semibold h-12 px-6 text-black hover:bg-gray-100">
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !title.trim() || !goal.trim()} className="text-base font-semibold h-12 px-6 bg-black text-white hover:bg-gray-800">
              {isSubmitting ? "Creating..." : "Create & Run"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
