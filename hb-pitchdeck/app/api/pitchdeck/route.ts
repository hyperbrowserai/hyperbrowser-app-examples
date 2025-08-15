import { NextRequest, NextResponse } from 'next/server';
import { Hyperbrowser } from '@hyperbrowser/sdk';
import OpenAI from 'openai';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

// Initialize clients
const hyperbrowser = new Hyperbrowser({
  apiKey: process.env.HYPERBROWSER_API_KEY!,
});

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY!,
});

// Define types
type Theme = 'modern' | 'dark' | 'neon';

interface PitchDeckRequest {
  url: string;
  theme?: Theme;
}

interface PitchDeck {
  company: string;
  one_liner: string;
  problem: string[];
  solution: string[];
  product: string[];
  market: string[];
  business_model: string[];
  competition: string[];
  traction?: string[];
  team?: string[];
  cta: string[];
}

interface PitchDeckResponse {
  pitch: PitchDeck;
  pdfBase64: string;
  filename: string;
}

// Convert hex color to RGB
function hexToRgb(hex: string) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return { r, g, b };
}

// Theme colors
const themeColors = {
  modern: {
    background: rgb(1, 1, 1),
    foreground: rgb(0.1, 0.1, 0.1),
    accent: rgb(0, 0.4, 0.8),
  },
  dark: {
    background: rgb(0.1, 0.1, 0.1),
    foreground: rgb(0.9, 0.9, 0.9),
    accent: rgb(0, 0.4, 0.8),
  },
  neon: {
    // Hyperbrowser theme
    background: rgb(0, 0, 0), // Black
    foreground: rgb(0.94, 1, 0.15), // #F0FF26 (bright yellow)
    accent: rgb(0, 1, 0.53), // #00FF88 (neon green)
  },
};

// Helper functions
function slugify(text: string): string {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-');
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  words.forEach(word => {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (testLine.length <= maxWidth) {
      currentLine = testLine;
    } else {
      lines.push(currentLine);
      currentLine = word;
    }
  });

  if (currentLine) {
    lines.push(currentLine);
  }

  return lines;
}

// System prompt for OpenAI
const SYSTEM_PROMPT = `You are an expert pitch deck consultant who helps startups create compelling pitch decks.
Given content from a company's website, create a structured pitch deck with the following sections:
- company: The company name
- one_liner: A single sentence that describes what the company does (max 15 words)
- problem: 3-5 bullet points describing the problem the company solves
- solution: 3-5 bullet points describing the company's solution
- product: 3-5 bullet points describing the product/service
- market: 3-5 bullet points about the market size and opportunity
- business_model: 3-5 bullet points about how the company makes money
- competition: 3-5 bullet points about competitors and how this company differentiates
- traction: (optional) 3-5 bullet points about growth, customers, or milestones
- team: (optional) 3-5 bullet points about key team members if mentioned
- cta: 2-3 bullet points with clear next steps for potential investors

Keep each bullet point concise (under 15 words) and impactful.
Format your response as a valid JSON object with these exact keys.`;

// Generate PDF from pitch deck data
async function generatePDF(pitch: PitchDeck, url: string, theme: Theme = 'neon'): Promise<Uint8Array> {
  const pdfDoc = await PDFDocument.create();
  const timesRomanFont = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBoldFont = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  
  const { background, foreground, accent } = themeColors[theme];
  
  // Cover page
  const coverPage = pdfDoc.addPage([842, 595]); // A4 landscape
  const { width, height } = coverPage.getSize();
  
  coverPage.drawRectangle({
    x: 0,
    y: 0,
    width,
    height,
    color: background,
  });
  
  // Company name
  coverPage.drawText(pitch.company, {
    x: 50,
    y: height - 150,
    size: 40,
    font: timesRomanBoldFont,
    color: foreground,
  });
  
  // One-liner
  const wrappedOneLiner = wrapText(pitch.one_liner, 50);
  wrappedOneLiner.forEach((line, i) => {
    coverPage.drawText(line, {
      x: 50,
      y: height - 220 - (i * 30),
      size: 24,
      font: timesRomanFont,
      color: foreground,
    });
  });
  
  // Source URL and date
  coverPage.drawText(`Source: ${url}`, {
    x: 50,
    y: 100,
    size: 12,
    font: timesRomanFont,
    color: foreground,
  });
  
  coverPage.drawText(`Generated: ${new Date().toLocaleDateString()}`, {
    x: 50,
    y: 80,
    size: 12,
    font: timesRomanFont,
    color: foreground,
  });
  
  // Content pages
  const sections: [string, string[]][] = [
    ['Problem', pitch.problem],
    ['Solution', pitch.solution],
    ['Product', pitch.product],
    ['Market', pitch.market],
    ['Business Model', pitch.business_model],
    ['Competition', pitch.competition],
  ];
  
  if (pitch.traction && pitch.traction.length > 0) {
    sections.push(['Traction', pitch.traction]);
  }
  
  if (pitch.team && pitch.team.length > 0) {
    sections.push(['Team', pitch.team]);
  }
  
  sections.push(['Call to Action', pitch.cta]);
  
  sections.forEach(([title, bullets]) => {
    const page = pdfDoc.addPage([842, 595]); // A4 landscape
    const { width, height } = page.getSize();
    
    page.drawRectangle({
      x: 0,
      y: 0,
      width,
      height,
      color: background,
    });
    
    // Section title
    page.drawText(title, {
      x: 50,
      y: height - 80,
      size: 36,
      font: timesRomanBoldFont,
      color: accent,
    });
    
    // Bullets
    bullets.slice(0, 8).forEach((bullet, i) => {
      page.drawText('•', {
        x: 50,
        y: height - 150 - (i * 50),
        size: 24,
        font: timesRomanFont,
        color: foreground,
      });
      
      const wrappedBullet = wrapText(bullet, 70);
      wrappedBullet.forEach((line, j) => {
        page.drawText(line, {
          x: 80,
          y: height - 150 - (i * 50) - (j * 30),
          size: 20,
          font: timesRomanFont,
          color: foreground,
        });
      });
    });
  });
  
  return pdfDoc.save();
}

// Extract content from a webpage using Hyperbrowser
async function extractContentFromUrl(url: string): Promise<{ title: string; content: string }> {
  try {
    // Create a new browser session
    const session = await hyperbrowser.sessions.create();
    
    try {
      // Use the browser agent to extract content
      const result = await hyperbrowser.agents.browserUse.startAndWait({
        task: `Visit ${url} and extract the page title and main content.`,
        sessionId: session.id,
      });
      
      // Extract title from the URL if not available in the result
      const urlObj = new URL(url);
      const domainParts = urlObj.hostname.split('.');
      const domain = domainParts.length >= 2 ? 
        domainParts[domainParts.length - 2].charAt(0).toUpperCase() + 
        domainParts[domainParts.length - 2].slice(1) : 
        'Company';
      
      // Process the result
      const title = domain;
      const content = result.data?.finalResult || '';
      
      return { title, content };
    } finally {
      // Stop the session
      await hyperbrowser.sessions.stop(session.id);
    }
  } catch (error) {
    console.error('Error extracting content:', error);
    throw new Error('Failed to extract content from URL');
  }
}

// Main API handler
export async function POST(req: NextRequest) {
  try {
    const body: PitchDeckRequest = await req.json();
    const { url, theme = 'neon' } = body;
    
    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }
    
    // 1. Extract content from the URL using Hyperbrowser
    const { title, content } = await extractContentFromUrl(url);
    const scrapedContent = `${title}\n\n${content}`;
    
    // 2. Generate pitch deck content using OpenAI
    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Create a pitch deck based on this content from ${url}:\n\n${scrapedContent}` }
      ],
      response_format: { type: 'json_object' },
    });
    
    const pitchContent = completion.choices[0].message.content;
    if (!pitchContent) {
      return NextResponse.json({ error: 'Failed to generate pitch deck content' }, { status: 500 });
    }
    
    const pitch = JSON.parse(pitchContent) as PitchDeck;
    
    // 3. Generate PDF
    const pdfBytes = await generatePDF(pitch, url, theme);
    const pdfBase64 = Buffer.from(pdfBytes).toString('base64');
    
    // 4. Send to Slack if webhook URL is provided
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    if (slackWebhookUrl) {
      try {
        const filename = `${slugify(pitch.company)}-pitch-deck.pdf`;
        
        await fetch(slackWebhookUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text: `New pitch deck generated for ${pitch.company}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*New pitch deck generated*\n*Company:* ${pitch.company}\n*One-liner:* ${pitch.one_liner}\n*Source:* ${url}`
                }
              }
            ],
            attachments: [
              {
                filename,
                content: pdfBase64,
                content_type: 'application/pdf'
              }
            ]
          })
        });
      } catch (error) {
        console.error('Failed to send to Slack:', error);
        // Continue execution even if Slack notification fails
      }
    }
    
    // 5. Return response
    const filename = `${slugify(pitch.company)}-pitch-deck.pdf`;
    
    return NextResponse.json({
      pitch,
      pdfBase64,
      filename,
    });
    
  } catch (error) {
    console.error('Error generating pitch deck:', error);
    return NextResponse.json({ error: 'Failed to generate pitch deck' }, { status: 500 });
  }
}