// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import mammoth from "mammoth";
import ExcelJS from "exceljs";
import OpenAI from "openai";

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB
const WHISPER_MAX_SIZE = 25 * 1024 * 1024; // 25MB (OpenAI limit)

export interface IngestResult {
  text: string;
  metadata: Record<string, string>;
}

export class IngestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "IngestError";
  }
}

const SUPPORTED_MIME_TYPES = new Set([
  // Documents
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/plain",
  "text/markdown",
  "application/json",
  "application/rtf",
  "text/rtf",
  // Spreadsheets
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/csv",
  // Presentations
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  // Images
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  // Audio
  "audio/mpeg",
  "audio/wav",
  "audio/mp3",
  // Video
  "video/mp4",
  "video/quicktime",
]);

export function isSupportedMimeType(mime: string): boolean {
  return SUPPORTED_MIME_TYPES.has(mime);
}

export function getSupportedFormats(): string[] {
  return [...SUPPORTED_MIME_TYPES];
}

async function parsePdf(buffer: Buffer): Promise<IngestResult> {
  const data = await pdfParse(Buffer.from(buffer));
  const extractedText = (data.text ?? "").trim();

  if (extractedText.length > 50) {
    return {
      text: extractedText,
      metadata: { pages: String(data.numpages), method: "text-extraction" },
    };
  }

  // Scanned PDF — fall back to vision model to read it as an image
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return {
      text: extractedText || "(Scanned PDF — no text could be extracted. Set OPENAI_API_KEY for vision-based OCR.)",
      metadata: { pages: String(data.numpages), method: "text-extraction-empty" },
    };
  }

  const openai = new OpenAI({ apiKey });
  const base64 = buffer.toString("base64");
  const dataUrl = `data:application/pdf;base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 4096,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: "This is a scanned PDF document. Extract ALL text visible in the document as accurately as possible. Preserve structure like tables, headings, and lists. If it contains forms, extract both the field labels and the filled-in values.",
          },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  const visionText = response.choices[0]?.message?.content ?? "";

  return {
    text: visionText || extractedText || "(Could not extract text from scanned PDF)",
    metadata: { pages: String(data.numpages), method: "vision-ocr" },
  };
}

async function parseDocx(buffer: Buffer): Promise<IngestResult> {
  const result = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
  return {
    text: result.value,
    metadata: {},
  };
}

async function parseText(buffer: Buffer): Promise<IngestResult> {
  return {
    text: new TextDecoder("utf-8").decode(buffer),
    metadata: {},
  };
}

async function parseXlsx(buffer: Buffer): Promise<IngestResult> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as unknown as ExcelJS.Buffer);
  const lines: string[] = [];

  wb.eachSheet((sheet) => {
    lines.push(`--- Sheet: ${sheet.name} ---`);
    sheet.eachRow((row) => {
      const cells = (row.values as (string | number | null)[]).slice(1).map((v) => String(v ?? ""));
      lines.push(cells.join("\t"));
    });
    lines.push("");
  });

  return {
    text: lines.join("\n"),
    metadata: { sheets: String(wb.worksheets.length) },
  };
}

async function parseCsv(buffer: Buffer): Promise<IngestResult> {
  return {
    text: new TextDecoder("utf-8").decode(buffer),
    metadata: { format: "csv" },
  };
}

async function describeImageWithLLM(buffer: Buffer, mimeType: string): Promise<IngestResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new IngestError("Image ingestion requires OPENAI_API_KEY for vision");

  const openai = new OpenAI({ apiKey });
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await openai.chat.completions.create({
    model: "gpt-5-mini",
    max_completion_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: "Describe this image in detail. Extract any text visible in the image." },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
  });

  return {
    text: response.choices[0]?.message?.content ?? "",
    metadata: { method: "llm-vision" },
  };
}

async function transcribeAudio(buffer: Buffer, filename: string): Promise<IngestResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new IngestError("Audio transcription requires OPENAI_API_KEY");
  if (buffer.byteLength > WHISPER_MAX_SIZE) {
    throw new IngestError(`Audio file exceeds Whisper limit (${Math.round(WHISPER_MAX_SIZE / 1024 / 1024)}MB)`);
  }

  const openai = new OpenAI({ apiKey });
  const file = new File([new Uint8Array(buffer)], filename, { type: "audio/mpeg" });
  const transcription = await openai.audio.transcriptions.create({
    model: "whisper-1",
    file,
  });

  return {
    text: transcription.text,
    metadata: { method: "whisper-transcription" },
  };
}

export async function ingestFile(
  buffer: Buffer,
  mimeType: string,
  filename: string
): Promise<IngestResult> {
  if (buffer.byteLength > MAX_FILE_SIZE) {
    throw new IngestError(`File exceeds ${Math.round(MAX_FILE_SIZE / 1024 / 1024)}MB limit`);
  }

  if (!isSupportedMimeType(mimeType)) {
    throw new IngestError(
      `Unsupported file type: ${mimeType}. Supported: PDF, DOCX, TXT, MD, JSON, XLSX, CSV, images, audio/video`
    );
  }

  try {
    switch (mimeType) {
      case "application/pdf":
        return await parsePdf(buffer);

      case "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        return await parseDocx(buffer);

      case "text/plain":
      case "text/markdown":
      case "application/json":
      case "application/rtf":
      case "text/rtf":
        return await parseText(buffer);

      case "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet":
        return await parseXlsx(buffer);

      case "text/csv":
        return await parseCsv(buffer);

      case "application/vnd.openxmlformats-officedocument.presentationml.presentation":
        // PPTX: extract as xlsx-style since full PPTX parsing is complex
        // Fall back to basic text extraction
        return await parseText(buffer);

      case "image/png":
      case "image/jpeg":
      case "image/webp":
      case "image/gif":
        return await describeImageWithLLM(buffer, mimeType);

      case "audio/mpeg":
      case "audio/wav":
      case "audio/mp3":
        return await transcribeAudio(buffer, filename);

      case "video/mp4":
      case "video/quicktime":
        return await transcribeAudio(buffer, filename);

      default:
        throw new IngestError(`No parser for type: ${mimeType}`);
    }
  } catch (err) {
    if (err instanceof IngestError) throw err;
    throw new IngestError(
      `Failed to parse ${filename}: ${err instanceof Error ? err.message : String(err)}`
    );
  }
}
