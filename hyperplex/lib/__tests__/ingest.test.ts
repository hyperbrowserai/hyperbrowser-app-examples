import { describe, it, expect } from "vitest";
import { ingestFile, isSupportedMimeType, IngestError, getSupportedFormats } from "../ingest";

describe("isSupportedMimeType", () => {
  it("accepts PDF", () => expect(isSupportedMimeType("application/pdf")).toBe(true));
  it("accepts DOCX", () => expect(isSupportedMimeType("application/vnd.openxmlformats-officedocument.wordprocessingml.document")).toBe(true));
  it("accepts text/plain", () => expect(isSupportedMimeType("text/plain")).toBe(true));
  it("accepts text/markdown", () => expect(isSupportedMimeType("text/markdown")).toBe(true));
  it("accepts CSV", () => expect(isSupportedMimeType("text/csv")).toBe(true));
  it("accepts PNG", () => expect(isSupportedMimeType("image/png")).toBe(true));
  it("accepts MP3", () => expect(isSupportedMimeType("audio/mpeg")).toBe(true));
  it("accepts MP4", () => expect(isSupportedMimeType("video/mp4")).toBe(true));
  it("rejects unsupported types", () => expect(isSupportedMimeType("application/zip")).toBe(false));
});

describe("getSupportedFormats", () => {
  it("returns a non-empty array of MIME types", () => {
    const formats = getSupportedFormats();
    expect(formats.length).toBeGreaterThan(10);
    expect(formats).toContain("application/pdf");
  });
});

describe("ingestFile", () => {
  it("parses plain text files", async () => {
    const content = "Hello, this is a test document with some text content.";
    const buffer = Buffer.from(content, "utf-8");
    const result = await ingestFile(buffer, "text/plain", "test.txt");
    expect(result.text).toBe(content);
  });

  it("parses markdown files", async () => {
    const md = "# Title\n\nSome **bold** text.";
    const buffer = Buffer.from(md, "utf-8");
    const result = await ingestFile(buffer, "text/markdown", "doc.md");
    expect(result.text).toContain("# Title");
    expect(result.text).toContain("**bold**");
  });

  it("parses JSON files as text", async () => {
    const json = JSON.stringify({ key: "value", nested: { a: 1 } });
    const buffer = Buffer.from(json, "utf-8");
    const result = await ingestFile(buffer, "application/json", "data.json");
    expect(result.text).toContain('"key"');
  });

  it("parses CSV files", async () => {
    const csv = "Name,Age\nAlice,30\nBob,25";
    const buffer = Buffer.from(csv, "utf-8");
    const result = await ingestFile(buffer, "text/csv", "people.csv");
    expect(result.text).toContain("Alice");
    expect(result.text).toContain("Bob");
  });

  it("rejects files over 20MB", async () => {
    const bigBuffer = Buffer.alloc(21 * 1024 * 1024);
    await expect(ingestFile(bigBuffer, "text/plain", "big.txt")).rejects.toThrow(IngestError);
    await expect(ingestFile(bigBuffer, "text/plain", "big.txt")).rejects.toThrow("20MB");
  });

  it("rejects unsupported MIME types", async () => {
    const buffer = Buffer.from("zip data");
    await expect(ingestFile(buffer, "application/zip", "file.zip")).rejects.toThrow(IngestError);
    await expect(ingestFile(buffer, "application/zip", "file.zip")).rejects.toThrow("Unsupported");
  });

  it("handles corrupted data gracefully with IngestError", async () => {
    const garbage = Buffer.from([0xff, 0xfe, 0x00, 0x01, 0x02, 0x03]);
    // PDF parser should fail on garbage data
    await expect(ingestFile(garbage, "application/pdf", "bad.pdf")).rejects.toThrow(IngestError);
  });

  it("image ingestion requires OPENAI_API_KEY", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47]);
      await expect(ingestFile(pngHeader, "image/png", "img.png")).rejects.toThrow("OPENAI_API_KEY");
    } finally {
      if (original) process.env.OPENAI_API_KEY = original;
    }
  });

  it("audio transcription requires OPENAI_API_KEY", async () => {
    const original = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    try {
      const buf = Buffer.alloc(100);
      await expect(ingestFile(buf, "audio/mpeg", "audio.mp3")).rejects.toThrow("OPENAI_API_KEY");
    } finally {
      if (original) process.env.OPENAI_API_KEY = original;
    }
  });
});
