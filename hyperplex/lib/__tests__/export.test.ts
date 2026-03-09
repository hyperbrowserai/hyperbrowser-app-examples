import { describe, it, expect } from "vitest";
import { exportRunAs, type ExportFormat } from "../export";

const mockRun = {
  id: "run-123",
  status: "completed",
  model: "claude-sonnet-4-6",
  startedAt: "2026-01-01T00:00:00Z",
  finishedAt: "2026-01-01T00:01:00Z",
  output: JSON.stringify({
    answer: "# Test Answer\n\nThis is a **test** with [link](https://example.com).\n\nParagraph two.",
    citations: [
      { url: "https://example.com", title: "Example", quote: "A test quote" },
      { url: "https://test.com", title: "Test Site", quote: "Another quote" },
    ],
  }),
  sources: [
    { url: "https://example.com", title: "Example", snippet: "A snippet" },
    { url: "https://test.com", title: "Test Site", snippet: "Another snippet" },
  ],
  subagents: [
    { task: "Subtask 1", model: "claude-sonnet-4-6", status: "completed" },
    { task: "Subtask 2", model: "gpt-5-mini", status: "completed" },
  ],
  task: { title: "Test Research Task", goal: "Research something" },
};

const emptyRun = {
  id: "run-empty",
  status: "completed",
  model: null,
  output: null,
  sources: [],
  subagents: [],
  task: { title: "Empty", goal: "Nothing" },
};

const ALL_FORMATS: ExportFormat[] = ["pdf", "docx", "xlsx", "pptx", "html", "md", "json", "csv", "txt"];

describe("exportRunAs", () => {
  for (const format of ALL_FORMATS) {
    it(`generates a non-empty buffer for format: ${format}`, async () => {
      const result = await exportRunAs(mockRun, format);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
      expect(result.filename).toMatch(new RegExp(`\\.${format === "md" ? "md" : format}$`));
      expect(result.mimeType).toBeTruthy();
    });
  }

  for (const format of ALL_FORMATS) {
    it(`handles empty output gracefully for format: ${format}`, async () => {
      const result = await exportRunAs(emptyRun, format);
      expect(result.buffer).toBeInstanceOf(Buffer);
      expect(result.buffer.byteLength).toBeGreaterThan(0);
    });
  }

  it("throws on unsupported format", async () => {
    await expect(exportRunAs(mockRun, "mp3" as ExportFormat)).rejects.toThrow("Unsupported format");
  });

  it("produces correct MIME types", async () => {
    const pdf = await exportRunAs(mockRun, "pdf");
    expect(pdf.mimeType).toBe("application/pdf");

    const json = await exportRunAs(mockRun, "json");
    expect(json.mimeType).toBe("application/json");

    const csv = await exportRunAs(mockRun, "csv");
    expect(csv.mimeType).toBe("text/csv");
  });

  it("JSON export contains structured data", async () => {
    const result = await exportRunAs(mockRun, "json");
    const data = JSON.parse(result.buffer.toString("utf-8"));
    expect(data.id).toBe("run-123");
    expect(data.citations).toHaveLength(2);
    expect(data.sources).toHaveLength(2);
    expect(data.answer).toContain("Test Answer");
  });

  it("Markdown export contains heading and citations", async () => {
    const result = await exportRunAs(mockRun, "md");
    const text = result.buffer.toString("utf-8");
    expect(text).toContain("# Test Research Task");
    expect(text).toContain("## Citations");
    expect(text).toContain("example.com");
  });

  it("CSV export has header row and data rows", async () => {
    const result = await exportRunAs(mockRun, "csv");
    const lines = result.buffer.toString("utf-8").split("\n");
    expect(lines[0]).toBe("#,Title,URL,Quote");
    expect(lines).toHaveLength(3);
  });
});
