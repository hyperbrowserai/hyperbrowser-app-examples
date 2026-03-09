import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { Document, Packer, Paragraph, TextRun, HeadingLevel } from "docx";
import ExcelJS from "exceljs";
import PptxGenJS from "pptxgenjs";

interface Citation {
  url: string;
  title: string;
  quote: string;
}

interface Source {
  url: string;
  title?: string | null;
  snippet?: string | null;
}

interface Subagent {
  task: string;
  model: string;
  status: string;
}

interface ExportableRun {
  id: string;
  status: string;
  model?: string | null;
  startedAt?: string | Date | null;
  finishedAt?: string | Date | null;
  output?: string | null;
  sources: Source[];
  subagents: Subagent[];
  task?: { title: string; goal: string } | null;
}

interface ParsedOutput {
  answer: string;
  citations: Citation[];
}

export type ExportFormat = "pdf" | "docx" | "xlsx" | "pptx" | "html" | "md" | "json" | "csv" | "txt";

export interface ExportResult {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}

function parseOutput(run: ExportableRun): ParsedOutput | null {
  if (!run.output) return null;
  try {
    return JSON.parse(run.output) as ParsedOutput;
  } catch {
    return null;
  }
}

function stripMarkdown(md: string): string {
  return md
    .replace(/#{1,6}\s/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^[*-] /gm, "• ");
}

// ─── Format generators ───────────────────────────────────────────────────────

async function generatePdf(run: ExportableRun): Promise<Buffer> {
  const parsed = parseOutput(run);
  const doc = new jsPDF();
  const title = run.task?.title ?? "Research Results";
  const pageWidth = doc.internal.pageSize.getWidth() - 28;

  doc.setFontSize(18);
  doc.text(title, 14, 20);

  doc.setFontSize(10);
  doc.setTextColor(100);
  doc.text(`Model: ${run.model ?? "auto"} | Status: ${run.status}`, 14, 28);
  doc.setTextColor(0);

  let y = 38;

  if (parsed) {
    doc.setFontSize(14);
    doc.text("Answer", 14, y);
    y += 8;

    doc.setFontSize(10);
    const plainText = stripMarkdown(parsed.answer);
    const lines = doc.splitTextToSize(plainText, pageWidth);
    for (const line of lines) {
      if (y > 270) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 5;
    }

    if (parsed.citations.length > 0) {
      y += 10;
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFontSize(14);
      doc.text("Citations", 14, y);
      y += 4;

      autoTable(doc, {
        startY: y,
        head: [["#", "Title", "URL"]],
        body: parsed.citations.map((c, i) => [String(i + 1), c.title, c.url]),
        styles: { fontSize: 8 },
        headStyles: { fillColor: [0, 0, 0] },
      });
    }
  }

  return Buffer.from(doc.output("arraybuffer"));
}

async function generateDocx(run: ExportableRun): Promise<Buffer> {
  const parsed = parseOutput(run);
  const title = run.task?.title ?? "Research Results";

  const children: Paragraph[] = [
    new Paragraph({ text: title, heading: HeadingLevel.HEADING_1 }),
    new Paragraph({
      children: [new TextRun({ text: `Model: ${run.model ?? "auto"} | Status: ${run.status}`, italics: true, color: "666666" })],
    }),
    new Paragraph({ text: "" }),
  ];

  if (parsed) {
    children.push(new Paragraph({ text: "Answer", heading: HeadingLevel.HEADING_2 }));
    for (const line of parsed.answer.split("\n")) {
      if (line.startsWith("# ")) {
        children.push(new Paragraph({ text: line.replace(/^#+\s/, ""), heading: HeadingLevel.HEADING_3 }));
      } else {
        children.push(new Paragraph({ children: [new TextRun(stripMarkdown(line))] }));
      }
    }

    if (parsed.citations.length > 0) {
      children.push(new Paragraph({ text: "" }));
      children.push(new Paragraph({ text: "Citations", heading: HeadingLevel.HEADING_2 }));
      parsed.citations.forEach((c, i) => {
        children.push(new Paragraph({
          children: [
            new TextRun({ text: `[${i + 1}] `, bold: true }),
            new TextRun({ text: c.title }),
            new TextRun({ text: ` — ${c.url}`, color: "0066CC" }),
          ],
        }));
      });
    }
  }

  const doc = new Document({ sections: [{ children }] });
  const buf = await Packer.toBuffer(doc);
  return Buffer.from(buf);
}

async function generateXlsx(run: ExportableRun): Promise<Buffer> {
  const parsed = parseOutput(run);
  const wb = new ExcelJS.Workbook();

  // Sources sheet
  const srcSheet = wb.addWorksheet("Sources");
  srcSheet.columns = [
    { header: "URL", key: "url", width: 50 },
    { header: "Title", key: "title", width: 40 },
    { header: "Snippet", key: "snippet", width: 60 },
  ];
  for (const s of run.sources) {
    srcSheet.addRow({ url: s.url, title: s.title ?? "", snippet: s.snippet ?? "" });
  }

  // Citations sheet
  if (parsed?.citations.length) {
    const citSheet = wb.addWorksheet("Citations");
    citSheet.columns = [
      { header: "#", key: "num", width: 5 },
      { header: "Title", key: "title", width: 40 },
      { header: "URL", key: "url", width: 50 },
      { header: "Quote", key: "quote", width: 60 },
    ];
    parsed.citations.forEach((c, i) => {
      citSheet.addRow({ num: i + 1, title: c.title, url: c.url, quote: c.quote });
    });
  }

  // Subagents sheet
  if (run.subagents.length > 0) {
    const agentSheet = wb.addWorksheet("Subagents");
    agentSheet.columns = [
      { header: "Task", key: "task", width: 50 },
      { header: "Model", key: "model", width: 25 },
      { header: "Status", key: "status", width: 15 },
    ];
    for (const a of run.subagents) {
      agentSheet.addRow({ task: a.task, model: a.model, status: a.status });
    }
  }

  const arrayBuf = await wb.xlsx.writeBuffer();
  return Buffer.from(arrayBuf);
}

async function generatePptx(run: ExportableRun): Promise<Buffer> {
  const parsed = parseOutput(run);
  const pptx = new PptxGenJS();
  const title = run.task?.title ?? "Research Results";

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(title, { x: 0.5, y: 1.5, w: 9, h: 1.5, fontSize: 32, bold: true, color: "000000" });
  titleSlide.addText(`Model: ${run.model ?? "auto"}`, { x: 0.5, y: 3, w: 9, fontSize: 14, color: "666666" });

  if (parsed) {
    // Answer slides (split into chunks to fit slides)
    const plainText = stripMarkdown(parsed.answer);
    const chunkSize = 1500;
    for (let i = 0; i < plainText.length; i += chunkSize) {
      const slide = pptx.addSlide();
      slide.addText(i === 0 ? "Answer" : "Answer (cont.)", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 20, bold: true });
      slide.addText(plainText.slice(i, i + chunkSize), { x: 0.5, y: 1, w: 9, h: 5.5, fontSize: 11, color: "333333", valign: "top" });
    }

    // Citations slide
    if (parsed.citations.length > 0) {
      const citSlide = pptx.addSlide();
      citSlide.addText("Citations", { x: 0.5, y: 0.3, w: 9, h: 0.6, fontSize: 20, bold: true });
      const citText = parsed.citations.map((c, i) => `[${i + 1}] ${c.title} — ${c.url}`).join("\n");
      citSlide.addText(citText, { x: 0.5, y: 1, w: 9, h: 5.5, fontSize: 10, color: "333333", valign: "top" });
    }
  }

  const data = await pptx.write({ outputType: "nodebuffer" });
  return data as Buffer;
}

function generateHtml(run: ExportableRun): Buffer {
  const parsed = parseOutput(run);
  const title = run.task?.title ?? "Research Results";

  const answerHtml = parsed
    ? parsed.answer
        .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
        .replace(/^### (.+)$/gm, "<h3>$1</h3>")
        .replace(/^## (.+)$/gm, "<h2>$1</h2>")
        .replace(/^# (.+)$/gm, "<h1>$1</h1>")
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, "<code>$1</code>")
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
        .replace(/\n\n/g, "</p><p>")
        .replace(/\n/g, "<br/>")
    : "<p>No output</p>";

  const citHtml = parsed?.citations.length
    ? `<h2>Citations</h2><ol>${parsed.citations.map((c) => `<li><a href="${c.url}">${c.title}</a><br/><em>"${c.quote}"</em></li>`).join("")}</ol>`
    : "";

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"/><title>${title}</title>
<style>body{font-family:system-ui,sans-serif;max-width:800px;margin:2rem auto;padding:0 1rem;color:#111}
h1{font-size:1.8rem}h2{font-size:1.4rem;margin-top:2rem}code{background:#f0f0f0;padding:2px 4px;border-radius:3px}
a{color:#000}ol{padding-left:1.5rem}li{margin-bottom:0.5rem}em{color:#666}</style></head>
<body><h1>${title}</h1><p style="color:#666">Model: ${run.model ?? "auto"} | Status: ${run.status}</p>
<h2>Answer</h2><p>${answerHtml}</p>${citHtml}</body></html>`;

  return Buffer.from(html, "utf-8");
}

function generateMarkdown(run: ExportableRun): Buffer {
  const parsed = parseOutput(run);
  const title = run.task?.title ?? "Research Results";

  let md = `# ${title}\n\n_Model: ${run.model ?? "auto"} | Status: ${run.status}_\n\n`;

  if (parsed) {
    md += `## Answer\n\n${parsed.answer}\n\n`;
    if (parsed.citations.length > 0) {
      md += `## Citations\n\n`;
      parsed.citations.forEach((c, i) => {
        md += `${i + 1}. [${c.title}](${c.url}) — _"${c.quote}"_\n`;
      });
    }
  }

  return Buffer.from(md, "utf-8");
}

function generateJson(run: ExportableRun): Buffer {
  const parsed = parseOutput(run);
  const data = {
    id: run.id,
    status: run.status,
    model: run.model,
    startedAt: run.startedAt,
    finishedAt: run.finishedAt,
    goal: run.task?.goal,
    answer: parsed?.answer ?? null,
    citations: parsed?.citations ?? [],
    sources: run.sources,
    subagents: run.subagents,
  };
  return Buffer.from(JSON.stringify(data, null, 2), "utf-8");
}

function generateCsv(run: ExportableRun): Buffer {
  const parsed = parseOutput(run);
  const rows = [["#", "Title", "URL", "Quote"].join(",")];
  if (parsed) {
    parsed.citations.forEach((c, i) => {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      rows.push([String(i + 1), esc(c.title), esc(c.url), esc(c.quote)].join(","));
    });
  }
  return Buffer.from(rows.join("\n"), "utf-8");
}

function generateTxt(run: ExportableRun): Buffer {
  const parsed = parseOutput(run);
  const title = run.task?.title ?? "Research Results";

  let txt = `${title}\nModel: ${run.model ?? "auto"} | Status: ${run.status}\n${"=".repeat(60)}\n\n`;

  if (parsed) {
    txt += stripMarkdown(parsed.answer) + "\n\n";
    if (parsed.citations.length > 0) {
      txt += "CITATIONS\n" + "-".repeat(40) + "\n";
      parsed.citations.forEach((c, i) => {
        txt += `[${i + 1}] ${c.title}\n    ${c.url}\n    "${c.quote}"\n\n`;
      });
    }
  }

  return Buffer.from(txt, "utf-8");
}

// ─── Main export function ────────────────────────────────────────────────────

const FORMAT_CONFIG: Record<ExportFormat, { mimeType: string; extension: string }> = {
  pdf:  { mimeType: "application/pdf", extension: "pdf" },
  docx: { mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", extension: "docx" },
  xlsx: { mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", extension: "xlsx" },
  pptx: { mimeType: "application/vnd.openxmlformats-officedocument.presentationml.presentation", extension: "pptx" },
  html: { mimeType: "text/html", extension: "html" },
  md:   { mimeType: "text/markdown", extension: "md" },
  json: { mimeType: "application/json", extension: "json" },
  csv:  { mimeType: "text/csv", extension: "csv" },
  txt:  { mimeType: "text/plain", extension: "txt" },
};

export async function exportRunAs(run: ExportableRun, format: ExportFormat): Promise<ExportResult> {
  const config = FORMAT_CONFIG[format];
  if (!config) throw new Error(`Unsupported format: ${format}`);

  const slug = (run.task?.title ?? run.id).replace(/[^a-zA-Z0-9]+/g, "-").slice(0, 40);
  const filename = `${slug}.${config.extension}`;

  let buffer: Buffer;
  switch (format) {
    case "pdf":  buffer = await generatePdf(run); break;
    case "docx": buffer = await generateDocx(run); break;
    case "xlsx": buffer = await generateXlsx(run); break;
    case "pptx": buffer = await generatePptx(run); break;
    case "html": buffer = generateHtml(run); break;
    case "md":   buffer = generateMarkdown(run); break;
    case "json": buffer = generateJson(run); break;
    case "csv":  buffer = generateCsv(run); break;
    case "txt":  buffer = generateTxt(run); break;
  }

  return { buffer, mimeType: config.mimeType, filename };
}
