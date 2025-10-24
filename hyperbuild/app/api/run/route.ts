import { NextRequest } from "next/server";
import { HyperbrowserProvider } from "@/lib/hyperbrowser";
import { getProvider, registerProvider } from "@/lib/providers";
import { generateQnaFromText } from "@/lib/qna";
import { runDeterministicLLM } from "@/lib/llm";
import { generateRunPath, writeRunFile } from "@/lib/utils";

type NodeDef = { id: string; type: string; data?: Record<string, unknown> };
type EdgeDef = { id: string; source: string; target: string };

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { nodes, edges, targetNodeId } = (await req.json()) as {
    nodes: NodeDef[];
    edges: EdgeDef[];
    targetNodeId?: string;
  };

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown) => controller.enqueue(encoder.encode(`${JSON.stringify(obj)}\n`));
      // register default provider
      registerProvider("hyperbrowser", HyperbrowserProvider);
      const web = getProvider();
      const { dir, runId } = generateRunPath();
      try {
        const ordered: NodeDef[] = topologicalSort(nodes, edges);
        const allowedIds: Set<string> | null = targetNodeId ? new Set(getAncestors(edges, targetNodeId).concat([targetNodeId])) : null;
        const state: Record<string, unknown> = {};
        const status: Record<string, string> = {};
        for (let i = 0; i < ordered.length; i++) {
          const node = ordered[i];
          if (allowedIds && !allowedIds.has(node.id)) continue;
          send({ event: "start", node: node.id, type: node.type });
          if (node.type === "Start") {
            let input = node.data?.input;
            if (typeof input === "string") {
              try { input = JSON.parse(input); } catch { /* keep as string */ }
            }
            state[node.id] = input;
            send({ event: "data", node: node.id, input });
            status[node.id] = "success";
          } else if (node.type === "Scrape") {
            const url = String(node.data?.url || node.data?.["url"] || "");
            if (!url) {
              send({ event: "error", node: node.id, message: "Scrape.url is required" });
              continue;
            }
            const markdown = await web.scrapeMarkdown({ url });
            state[node.id] = markdown;
            send({ event: "data", node: node.id, markdown });
            status[node.id] = "success";
          } else if (node.type === "Transform") {
            const input = String(resolveInput(state, node, edges) || "");
            const cleaned = input.replace(/\s+/g, " ").trim();
            state[node.id] = cleaned;
            send({ event: "data", node: node.id, text: cleaned });
            status[node.id] = "success";
          } else if (node.type === "LLM") {
            const input = String(resolveInput(state, node, edges) || "");
            const instruction = String(node.data?.instruction || "");
            if (!instruction) {
              send({ event: "error", node: node.id, message: "LLM.instruction is required" });
              continue;
            }
            const out = await runDeterministicLLM(input, instruction);
            state[node.id] = out;
            send({ event: "data", node: node.id, text: out });
            status[node.id] = "success";
          } else if (node.type === "QnAGenerator") {
            const input = String(resolveInput(state, node, edges) || "");
            const qna = await generateQnaFromText(input);
            state[node.id] = qna;
            send({ event: "data", node: node.id, qna });
            status[node.id] = "success";
          } else if (node.type === "Output" || node.type === "End") {
            const input = resolveInput(state, node, edges);
            // emit the final data so the UI can preview inside the node
            send({ event: "data", node: node.id, output: input });
            writeRunFile(dir, `output.json`, input);
            state[node.id] = input;
            send({ event: "saved", node: node.id, runId });
            status[node.id] = "success";
          } else if (node.type === "Extract") {
            const url = String(node.data?.url || "");
            const schema = node.data?.schema ?? {};
            if (!url) {
              send({ event: "error", node: node.id, message: "Extract.url is required" });
              continue;
            }
            const structured = await web.extractStructured({ url, schema });
            state[node.id] = structured;
            send({ event: "data", node: node.id, structured });
            status[node.id] = "success";
          } else if (node.type === "Crawl") {
            const seedUrls = Array.isArray(node.data?.seedUrls) ? (node.data?.seedUrls as string[]) : [String(node.data?.seedUrls || node.data?.url || "")].filter(Boolean);
            const maxPages = node.data?.maxPages as number | undefined;
            if (!seedUrls.length) {
              send({ event: "error", node: node.id, message: "Crawl.seedUrls is required" });
              continue;
            }
            const markdown = await web.crawlMarkdown({ seedUrls, maxPages });
            state[node.id] = markdown;
            send({ event: "data", node: node.id, markdown });
            status[node.id] = "success";
          } else if (node.type === "Condition") {
            // expects node.data.condition to be a JS expression using 'input'
            const input = resolveInput(state, node, edges);
            const expr = String(node.data?.condition || "");
            const result = safeEvalBoolean(expr, input);
            state[node.id] = result;
            send({ event: "data", node: node.id, result });
            status[node.id] = "success";
          } else if (node.type === "While") {
            // expects node.data.condition and a single downstream path
            const expr = String(node.data?.condition || "");
            let guard = 0;
            while (safeEvalBoolean(expr, resolveInput(state, node, edges))) {
              guard++;
              if (guard > 10) break; // prevent infinite loop
            }
            state[node.id] = guard;
            send({ event: "data", node: node.id, iterations: guard });
            status[node.id] = "success";
          } else if (node.type === "Approval") {
            // placeholder: mark as pending then auto-approve
            send({ event: "await", node: node.id, message: "Awaiting approval (auto)" });
            state[node.id] = "approved";
            status[node.id] = "success";
          } else {
            send({ event: "warn", node: node.id, message: `Unknown node type ${node.type}` });
          }
          send({ event: "end", node: node.id });
          if (targetNodeId && node.id === targetNodeId) break;
        }
        writeRunFile(dir, `state.json`, state);
        send({ event: "complete", runId });
        controller.close();
      } catch (e: unknown) {
        send({ event: "error", message: e instanceof Error ? e.message : String(e) });
        controller.error(e);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function topologicalSort(nodes: NodeDef[], edges: EdgeDef[]): NodeDef[] {
  const inDegree: Record<string, number> = {};
  const map = new Map<string, NodeDef>(nodes.map((n) => [n.id, n]));
  for (const n of nodes) inDegree[n.id] = 0;
  for (const e of edges) {
    if (map.has(e.source) && map.has(e.target)) {
      inDegree[e.target] = (inDegree[e.target] || 0) + 1;
    }
  }
  const queue = nodes.filter((n) => (inDegree[n.id] || 0) === 0);
  const out: NodeDef[] = [];
  while (queue.length) {
    const n = queue.shift()!;
    out.push(n);
    for (const e of edges.filter((ed) => ed.source === n.id)) {
      if (!map.has(e.target)) continue;
      inDegree[e.target] -= 1;
      if (inDegree[e.target] === 0) {
        const next = map.get(e.target);
        if (next) queue.push(next);
      }
    }
  }
  return out;
}

function resolveInput(state: Record<string, unknown>, node: NodeDef, edges: EdgeDef[]) {
  const incoming = edges.filter((e) => e.target === node.id);
  if (incoming.length === 0) return "";
  const sourceId = incoming[0].source;
  return state[sourceId];
}

function safeEvalBoolean(expression: string, input: unknown): boolean {
  if (!expression) return false;
  try {
    // extremely limited eval sandbox
    // eslint-disable-next-line no-new-func
    const fn = new Function("input", `try { return !!(${expression}); } catch { return false; }`);
    return !!fn(input);
  } catch {
    return false;
  }
}

function getAncestors(edges: EdgeDef[], nodeId: string): string[] {
  const ancestors = new Set<string>();
  const queue: string[] = [nodeId];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const e of edges) {
      if (e.target === cur && !ancestors.has(e.source)) {
        ancestors.add(e.source);
        queue.push(e.source);
      }
    }
  }
  return Array.from(ancestors);
}


