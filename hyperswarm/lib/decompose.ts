import { getOpenAI, ORCHESTRATOR_MODEL } from "@/lib/openai";
import type { SubTask } from "@/lib/types";

function buildSystemPrompt(targetCount: number): string {
  const n = Math.min(20, Math.max(5, targetCount));
  return `You are a task decomposition engine for a parallel web agent swarm.
The user will run up to ${n} browser agents in parallel. Decompose their goal into **exactly ${n}** independent sub-tasks, each runnable at the same time on a **different** website or source.

If the goal feels narrow, still reach ${n} tasks by adding adjacent angles: official sites, competitors, marketplaces, forums (e.g. Reddit), review/comparison sites, news, YouTube, regional or niche sources, documentation, social, job boards—anything that could surface relevant facts. No duplicate domains where avoidable.

Each sub-task must specify:
- task: what the agent should do (natural language)
- url: starting URL or full https URL (if unsure, use a Google search URL like https://www.google.com/search?q=encoded+query)
- extractionGoal: what specific data to bring back
- siteName: human-readable name of the target site

Rules:
- Return **exactly ${n}** items in the subtasks array (no fewer, no more)
- Each sub-task targets a different site or distinct source
- Sub-tasks are independent (no ordering dependencies)
- Be specific about what data to extract

Return JSON: { "subtasks": [ { "task", "url", "extractionGoal", "siteName" } ] }`;
}

export async function decomposeGoal(
  goal: string,
  targetAgentCount: number,
): Promise<SubTask[]> {
  const n = Math.min(20, Math.max(5, Math.floor(targetAgentCount)));
  const openai = getOpenAI();
  const response = await openai.chat.completions.create({
    model: ORCHESTRATOR_MODEL,
    messages: [
      { role: "system", content: buildSystemPrompt(n) },
      { role: "user", content: goal },
    ],
    response_format: { type: "json_object" },
  });
  const text = response.choices[0]?.message?.content;
  if (!text) throw new Error("Empty decomposition response");
  const parsed = JSON.parse(text) as { subtasks?: SubTask[] };
  if (!Array.isArray(parsed.subtasks) || parsed.subtasks.length === 0) {
    throw new Error("Invalid subtasks shape");
  }
  let list = parsed.subtasks;
  if (list.length > n) {
    list = list.slice(0, n);
  }
  if (list.length < n) {
    throw new Error(
      `Model returned ${list.length} sub-tasks but ${n} are required for your max agents setting. Try launching again, or lower max agents to ${list.length}.`,
    );
  }
  return list.map((s) => ({
    task: String(s.task ?? ""),
    url: String(s.url ?? ""),
    extractionGoal: String(s.extractionGoal ?? ""),
    siteName: String(s.siteName ?? ""),
  }));
}
