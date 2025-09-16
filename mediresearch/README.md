# Medi-Research

**Built with [Hyperbrowser](https://hyperbrowser.ai)**

Deep-analyze blood test results with AI-powered medical research and real-time data extraction. Upload your blood reports and get comprehensive analysis with live medical references from trusted sources like Mayo Clinic, NIH, and PubMed.

## Features

- 📋 **Smart File Processing** - Upload PDF, HTML, or CSV blood reports
- 🔬 **AI-Powered Extraction** - Automatically extract and normalize test results using GPT-4o
- 🌐 **Live Medical Research** - Real-time crawling of trusted medical sources with Hyperbrowser
- 📊 **Comprehensive Analysis** - AI-generated insights with reference ranges comparison
- 📄 **Evidence Documentation** - Full markdown evidence with sources and processing details
- 📱 **Export to PDF** - Professional analysis reports for sharing with healthcare providers

## Tech Stack

- **Framework**: Next.js 15 (App Router) with TypeScript
- **AI**: OpenAI GPT-4o for medical data extraction and analysis
- **Web Automation**: Hyperbrowser SDK for medical research crawling
- **Validation**: Zod schemas for type-safe data handling
- **UI**: Tailwind CSS with dark theme
- **File Processing**: PDF parsing, HTML extraction, CSV processing

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- OpenAI API key
- Hyperbrowser API key

### Get an API Key

1. **Hyperbrowser API**: Get your key at [https://hyperbrowser.ai](https://hyperbrowser.ai)
2. **OpenAI API**: Get your key at [https://platform.openai.com](https://platform.openai.com)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd mediresearch

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local

# Add your API keys to .env.local
OPENAI_API_KEY=your_openai_api_key_here
HYPERBROWSER_API_KEY=your_hyperbrowser_api_key_here

# Run the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## API Endpoints

### POST /api/fetchResults

Extracts blood test results from uploaded files using AI.

**Request:**
```typescript
{
  "file": "base64_encoded_file_content",
  "fileType": "pdf" | "html" | "csv"
}
```

**Response:**
```typescript
{
  "tests": [{
    "name": "Test Name",
    "value": "value",
    "unit": "unit",
    "refRange": "reference_range",
    "status": "normal" | "high" | "low" | "critical"
  }],
  "evidence": {
    "md": "markdown_content",
    "sources": ["source1", "source2"]
  },
  "runId": "unique_run_identifier"
}
```

### POST /api/fetchResearch

Crawls medical sources for test-specific research using Hyperbrowser.

**Request:**
```typescript
{
  "testName": "Blood Test Name",
  "testValue": "optional_value"
}
```

**Response:**
```typescript
{
  "articles": [{
    "title": "Article Title",
    "summary": "AI-generated summary",
    "link": "source_url",
    "source": "domain_name"
  }],
  "runId": "unique_run_identifier"
}
```

### POST /api/analyze

Generates comprehensive analysis using AI with medical research context.

**Request:**
```typescript
{
  "results": [BloodTest[]],
  "research": [ResearchArticle[]]
}
```

**Response:**
```typescript
{
  "insights": [{
    "test": "Test Name",
    "status": "normal" | "high" | "low" | "critical",
    "comparison": "value_vs_reference_explanation",
    "message": "plain_language_analysis",
    "sources": ["source1", "source2"],
    "recommendations": ["recommendation1", "recommendation2"]
  }],
  "summary": "overall_health_summary",
  "runId": "unique_run_identifier"
}
```

## Architecture

### Data Flow

1. **File Upload** → User uploads blood test report (PDF/HTML/CSV)
2. **AI Extraction** → GPT-4o extracts structured test data
3. **Medical Research** → Hyperbrowser crawls trusted medical sources
4. **AI Analysis** → GPT-4o generates insights with medical context
5. **Visualization** → Results displayed with status indicators and recommendations
6. **Export** → Professional PDF reports for healthcare providers

### Key Components

- **`lib/types.ts`** - TypeScript types and Zod validation schemas
- **`lib/utils.ts`** - Utility functions for data processing and retries
- **`lib/pdfExport.ts`** - PDF generation for analysis reports
- **`app/api/`** - API routes for data processing and analysis
- **`app/components/`** - React components for the user interface

### Medical Sources

The application crawls these trusted medical sources using Hyperbrowser:

- Mayo Clinic (mayoclinic.org)
- National Institutes of Health (nih.gov)
- PubMed (pubmed.ncbi.nlm.nih.gov)
- WebMD (webmd.com)
- MedlinePlus (medlineplus.gov)

## Usage Example

```typescript
// Upload a blood test PDF
const formData = new FormData();
formData.append('file', pdfFile);

// The app will automatically:
// 1. Extract test results with AI
// 2. Research each test using Hyperbrowser
// 3. Generate comprehensive analysis
// 4. Display results with status indicators
// 5. Provide downloadable PDF report
```

## Growth Use Case

Perfect for healthcare professionals, patients, and health-conscious individuals who want to:

- **Understand** complex blood test results in plain language
- **Research** medical conditions with real-time data
- **Track** health metrics over time
- **Share** professional reports with healthcare providers
- **Learn** about optimal health ranges with scientific backing

## Development

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run linting
npm run lint
```

## Deployment

The app is ready for deployment on Vercel, Netlify, or any Node.js hosting platform. Make sure to set the required environment variables in your deployment configuration.

## Important Disclaimer

This application is for educational purposes only and does not constitute medical advice. Always consult with qualified healthcare professionals for proper medical diagnosis and treatment recommendations.

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

---

Follow [@hyperbrowser](https://twitter.com/hyperbrowser) for updates.