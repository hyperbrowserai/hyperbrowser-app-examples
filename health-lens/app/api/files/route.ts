import { NextRequest, NextResponse } from "next/server";
import Papa from "papaparse";
import { anthropic } from "@ai-sdk/anthropic";
import { generateText } from "ai";
import { generateResearchQueries } from "@/lib/research-query-generator";
import { searchAllSources } from "@/lib/hyperbrowser";

// Optimized duration for PDF processing + background research
export const maxDuration = 30; // PDF extraction + single Hyperbrowser search (optimized)

async function extractTextFromPdf(buffer: Buffer): Promise<string> {
  const PDFParser = require("pdf2json");
  
  return new Promise((resolve, reject) => {
    const pdfParser = new PDFParser(null, 1); // rawTextMode = true
    
    pdfParser.on("pdfParser_dataReady", (pdfData: any) => {
      try {
        // Extract text from parsed data
        let text = "";
        if (pdfData && pdfData.Pages) {
          pdfData.Pages.forEach((page: any) => {
            if (page.Texts) {
              page.Texts.forEach((textItem: any) => {
                if (textItem.R) {
                  textItem.R.forEach((run: any) => {
                    if (run.T) {
                      // Decode URI encoded text
                      text += decodeURIComponent(run.T) + " ";
                    }
                  });
                }
              });
              text += "\n";
            }
          });
        }
        resolve(text.trim());
      } catch (error) {
        reject(error);
      }
    });
    
    pdfParser.on("pdfParser_dataError", (error: any) => {
      reject(error);
    });
    
    pdfParser.parseBuffer(buffer);
  });
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const filename = file.name;
    const fileType = file.type;
    const fileSize = file.size;
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    let extractedData: any = {
      filename,
      fileType,
      fileSize,
      uploadedAt: new Date().toISOString(),
      markers: [],
      rawText: "",
    };

    // Parse PDF files
    if (fileType === "application/pdf" || filename.endsWith(".pdf")) {
      try {
        const text = await extractTextFromPdf(buffer);
        extractedData.rawText = text;
        
        // Debug: log extracted text (first 500 chars)
        console.log("PDF extracted text preview:", text.substring(0, 500));
        
        // AI-powered marker extraction using Claude Sonnet 4.5
        const markers = await extractHealthMarkers(text);
        console.log("Extracted markers:", markers);
        extractedData.markers = markers;
      } catch (error) {
        console.error("PDF parsing error:", error);
        extractedData.error = "Failed to parse PDF";
      }
    }

    // Parse CSV files
    else if (fileType === "text/csv" || filename.endsWith(".csv")) {
      const text = buffer.toString("utf-8");
      const parsed = Papa.parse(text, { header: true });
      extractedData.rawText = text;
      extractedData.csvData = parsed.data;
      
      // Try to extract health markers from CSV
      const markers = extractHealthMarkersFromCSV(parsed.data);
      extractedData.markers = markers;
    }

    // Parse text files
    else if (fileType === "text/plain" || filename.endsWith(".txt")) {
      const text = buffer.toString("utf-8");
      extractedData.rawText = text;
      const markers = await extractHealthMarkers(text);
      extractedData.markers = markers;
    }

    // Generate a unique file ID for caching research
    const fileId = `file_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    extractedData.id = fileId;

    // Perform research synchronously and return results
    let researchResults = null;
    if (extractedData.rawText && extractedData.rawText.length > 100) {
      try {
        console.log(`🔍 Starting research for file ${fileId}...`);
        
        // Generate single health topic using AI
        const topics = await generateResearchQueries(extractedData.markers || [], extractedData.rawText);
        console.log(`📋 Health topic: "${topics[0] || 'none'}"`);
        
        if (topics.length > 0) {
          // Scrape MedlinePlus for health information
          const results = await searchAllSources(topics);
          console.log(`✅ Research completed for file ${fileId}: Health info retrieved`);
          
          researchResults = {
            fileId,
            queries: topics,
            results,
            status: "completed"
          };
          extractedData.researchStatus = "completed";
        } else {
          extractedData.researchStatus = "failed";
        }
      } catch (err) {
        console.error("Research failed:", err);
        extractedData.researchStatus = "failed";
      }
    }

    return NextResponse.json({
      success: true,
      file: extractedData,
      research: researchResults, // Include research results in response
    });
  } catch (error) {
    console.error("File upload error:", error);
    return NextResponse.json(
      { error: "Failed to process file" },
      { status: 500 }
    );
  }
}

// Extract health markers from text using AI (Claude Sonnet 4.5)
async function extractHealthMarkers(text: string): Promise<any[]> {
  try {
    // Use full text (Claude Sonnet 4.5 has 200K context window)
    const prompt = `You are a medical data extraction expert. Analyze this lab report and extract ALL health markers/test results.

Lab Report Text:
${text}

Instructions:
- Extract EVERY test name, value, and unit you find
- Use the exact test names as they appear in the report
- Be thorough - don't miss any markers
- If there are 50+ markers, extract all of them
- Return ONLY a valid JSON array, no other text

Return format:
[
  {"name": "Total Cholesterol", "value": "170", "unit": "mg/dL"},
  {"name": "HDL Cholesterol", "value": "96", "unit": "mg/dL"}
]

JSON array:`;

    const result = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      prompt,
      temperature: 0.1,
      maxOutputTokens: 8192, // Allow large responses for comprehensive lab reports
    });

    // Parse the JSON response
    const jsonMatch = result.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("AI extraction failed: no JSON found in response");
      return [];
    }

    const markers = JSON.parse(jsonMatch[0]);
    
    // Add timestamp to each marker
    return markers.map((m: any) => ({
      ...m,
      date: new Date().toISOString(),
    }));
  } catch (error) {
    console.error("AI extraction error:", error);
    // Fallback to empty array if AI extraction fails
    return [];
  }
}

// Extract health markers from CSV data
function extractHealthMarkersFromCSV(data: any[]): any[] {
  const markers: any[] = [];
  
  // Look for common column names
  const markerColumns = ["test", "marker", "name", "measurement", "lab_test"];
  const valueColumns = ["value", "result", "measurement"];
  const unitColumns = ["unit", "units", "uom"];
  const dateColumns = ["date", "test_date", "collection_date"];

  data.forEach((row: any) => {
    const markerName = markerColumns.find((col) => row[col])
      ? row[markerColumns.find((col) => row[col]) as string]
      : null;
    const value = valueColumns.find((col) => row[col])
      ? row[valueColumns.find((col) => row[col]) as string]
      : null;
    const unit = unitColumns.find((col) => row[col])
      ? row[unitColumns.find((col) => row[col]) as string]
      : null;
    const date = dateColumns.find((col) => row[col])
      ? row[dateColumns.find((col) => row[col]) as string]
      : new Date().toISOString();

    if (markerName && value) {
      markers.push({
        name: markerName,
        value: value.toString(),
        unit: unit || "",
        date,
      });
    }
  });

  return markers;
}

