import OpenAI from "openai";

export type GenerateAgentInput = {
  idea: string;
};

export type WorkflowGraph = {
  nodes: Array<{ id: string; type: string; data: Record<string, unknown> }>;
  edges: Array<{ id: string; source: string; target: string }>;
};

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAgentFromIdea(idea: string): Promise<WorkflowGraph> {
  
  const system = `You are a workflow generator. Output ONLY strict JSON with {nodes, edges}.

EXAMPLE OUTPUT FORMAT:
{
  "nodes": [
    {"id": "s1", "type": "Start", "data": {"input": ""}},
    {"id": "n1", "type": "Scrape", "data": {"url": "https://example.com"}},
    {"id": "n2", "type": "LLM", "data": {"instruction": "Analyze the scraped content and extract pricing information. Identify plans, costs, features, and billing cycles. Format as structured JSON with clear categories."}},
    {"id": "o1", "type": "Output", "data": {"filename": "output.json"}}
  ],
  "edges": [
    {"id": "e1", "source": "s1", "target": "n1"},
    {"id": "e2", "source": "n1", "target": "n2"},
    {"id": "e3", "source": "n2", "target": "o1"}
  ]
}

RULES:
- Always include exactly one Start node and one Output node (NOT End node)
- Always include AT LEAST one Hyperbrowser node (Scrape, Extract, or Crawl)
- Use <= 5 nodes total
- CRITICAL: Every LLM node MUST have an "instruction" field in its data object
- LLM instructions must be detailed and specific to the user's request
- Scrape nodes must have "url" field in data
- Connect nodes linearly: Start -> Scrape/Extract/Crawl -> LLM -> Output

For the user's idea "${idea}", create a workflow that includes a detailed LLM instruction tailored to their specific request.`;
  const user = `Create a workflow for: ${idea}

Remember: The LLM node MUST include a specific "instruction" field that tells the AI exactly what to do with the scraped content.`;
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-nano",
    temperature: 0.1,
    messages: [
      { role: "system", content: system },
      { role: "user", content: user },
    ],
    response_format: { type: "json_object" },
  });
  const content = resp.choices?.[0]?.message?.content || "{}";
  console.log("Generated workflow:", content); // Debug log
  const parsed = JSON.parse(content) as WorkflowGraph;
  
  // Ensure LLM nodes have instructions
  if (parsed.nodes) {
    parsed.nodes.forEach(node => {
      if (node.type === "LLM" && (!node.data || !node.data.instruction)) {
        console.warn("LLM node missing instruction, adding default");
        node.data = { 
          ...node.data, 
          instruction: `Analyze the input content related to "${idea}". Extract key information and format as structured JSON with clear categories and actionable insights.`
        };
      }
    });
  }
  
  return parsed;
}

export async function runDeterministicLLM(input: string, instruction?: string): Promise<string> {
  const sys = instruction || "Summarize the input precisely in 5 bullet points. Keep neutral tone.";
  const resp = await openai.chat.completions.create({
    model: process.env.OPENAI_MODEL || "gpt-5-nano",
    temperature: 0.1,
    messages: [
      { role: "system", content: sys },
      { role: "user", content: input.slice(0, 6000) },
    ],
  });
  return resp.choices?.[0]?.message?.content ?? "";
}


