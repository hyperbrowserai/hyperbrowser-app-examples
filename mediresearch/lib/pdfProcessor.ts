import { createWorker } from 'tesseract.js';
import { createCanvas } from 'canvas';


interface PDFExtractionResult {
  fullText: string;
  pages: ExtractedPage[];
  processingTime: number;
}

interface ExtractedPage {
  pageNumber: number;
  text: string;
  hasText: boolean;
  ocrUsed: boolean;
}

const MIN_TEXT_LENGTH_FOR_OCR = 50; 


export async function extractTextFromPDF(pdfBuffer: Buffer): Promise<PDFExtractionResult> {
  const startTime = Date.now();
  
  try {
    console.log('Starting PDF text extraction...');
    
    try {
      const { createRequire } = await import('module');
      const require = createRequire(import.meta.url);
      const pdfParse = require('pdf-parse');
      const pdfData = await pdfParse(pdfBuffer);
      const embeddedText = pdfData.text.trim();
      const totalPages = pdfData.numpages;
      
      console.log(`PDF has ${totalPages} pages, extracted ${embeddedText.length} characters of embedded text`);
      
      if (embeddedText.length > MIN_TEXT_LENGTH_FOR_OCR && /[a-zA-Z0-9]/.test(embeddedText)) {
        console.log('Using embedded text extraction');
        
        const pages: ExtractedPage[] = [];
        
        const textPerPage = Math.ceil(embeddedText.length / totalPages);
        for (let i = 0; i < totalPages; i++) {
          const startPos = i * textPerPage;
          const endPos = Math.min((i + 1) * textPerPage, embeddedText.length);
          const pageText = embeddedText.substring(startPos, endPos);
          
          pages.push({
            pageNumber: i + 1,
            text: pageText,
            hasText: pageText.length > 0,
            ocrUsed: false
          });
        }
        
        const processingTime = Date.now() - startTime;
        return {
          fullText: embeddedText,
          pages,
          processingTime
        };
      }
      
      // If embedded text is insufficient, fall back to OCR
      console.log('Embedded text insufficient, falling back to OCR...');
      return await extractTextWithOCR(pdfBuffer, startTime);
      
    } catch (pdfParseError: unknown) {
      const reason = pdfParseError instanceof Error ? pdfParseError.message : String(pdfParseError);
      console.log('pdf-parse failed, falling back to OCR:', reason);
      // If pdf-parse fails, use OCR for all pages
      return await extractTextWithOCR(pdfBuffer, startTime);
    }
    
  } catch (error: unknown) {
    console.error('PDF processing error:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process PDF: ${message}`);
  }
}


async function extractTextWithOCR(pdfBuffer: Buffer, startTime: number): Promise<PDFExtractionResult> {
  try {
    let pdfjs: Record<string, any>;
    try {
      pdfjs = await import('pdfjs-dist/legacy/build/pdf.js');
    } catch {
      try {
        pdfjs = await import('pdfjs-dist');
      } catch {
        pdfjs = await import('pdfjs-dist/build/pdf.js');
      }
    }
    const { getDocument, GlobalWorkerOptions } = pdfjs;
    (GlobalWorkerOptions as Record<string, any>).workerSrc = undefined as unknown as string;

    const loadingTask = getDocument({ data: pdfBuffer, useSystemFonts: true, verbosity: 0 });
    const pdf = await loadingTask.promise;

    let fullText = '';
    const pages: ExtractedPage[] = [];

    for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
      const page = await pdf.getPage(pageNum);
      let pageText = '';
      let usedOCR = false;

      try {
        const textContent = await page.getTextContent();
        const embedded = (textContent.items as Array<{str: string}>).map((it) => it.str).join(' ').trim();
        if (embedded.length > MIN_TEXT_LENGTH_FOR_OCR && /[a-zA-Z0-9]/.test(embedded)) {
          pageText = embedded;
        } else {
          const viewport = page.getViewport({ scale: 2.0 });
          const canvas = createCanvas(viewport.width, viewport.height);
          const ctx = canvas.getContext('2d') as Record<string, any>;
          await page.render({ canvasContext: ctx, viewport }).promise;
          const pngBuffer = canvas.toBuffer('image/png');
          const worker = await createWorker('eng', 1, { logger: () => {} });
          const { data: { text } } = await worker.recognize(pngBuffer);
          await worker.terminate();
          pageText = (text || '').trim();
          usedOCR = true;
        }
      } catch {
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = createCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext('2d') as Record<string, any>;
        await page.render({ canvasContext: ctx, viewport }).promise;
        const pngBuffer = canvas.toBuffer('image/png');
        const worker = await createWorker('eng', 1, { logger: () => {} });
        const { data: { text } } = await worker.recognize(pngBuffer);
        await worker.terminate();
        pageText = (text || '').trim();
        usedOCR = true;
      }

      pages.push({ pageNumber: pageNum, text: pageText, hasText: pageText.length > 0, ocrUsed: usedOCR });
      fullText += `${pageText}\n\n--- Page ${pageNum} ---\n\n`;
    }

    const processingTime = Date.now() - startTime;
    return { fullText: fullText.trim(), pages, processingTime };
  } catch (error: unknown) {
    console.error('OCR processing error:', error);
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to process PDF with OCR: ${message}`);
  }
}


export function isPDFProcessingAvailable(): boolean {
  return true; // This simplified version should always work
}


export function validatePDFBuffer(buffer: Buffer): boolean {
  if (!buffer || buffer.length === 0) {
    return false;
  }
  
  // Check PDF header
  const header = buffer.subarray(0, 4).toString();
  return header === '%PDF';
}