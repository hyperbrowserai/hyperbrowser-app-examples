import { NextRequest, NextResponse } from 'next/server'
import { scrapeSearchResults } from '../../../lib/scrape'
import { scrapeAcademicSources } from '../../../lib/academic-search'
import { classifyQuestion } from '../../../lib/classifier'
import { generateAnswer } from '../../../lib/answer'
import { buildPostmanCollection, buildEndpointManifest } from '../../../lib/postman'
import { createZipBundle } from '../../../lib/zip'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { query } = body

    if (!query) {
      return NextResponse.json(
        { error: 'Missing required field: query' },
        { status: 400 }
      )
    }

    // Check for Hyperbrowser API key in environment
    if (!process.env.HYPERBROWSER_API_KEY) {
      return NextResponse.json(
        { error: 'Hyperbrowser API key not configured on server' },
        { status: 500 }
      )
    }

    // Set up Server-Sent Events
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendData = (data: any) => {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`))
        }

        const sendLog = (message: string) => {
          sendData({ type: 'log', message })
        }

        const sendProgress = (progress: number) => {
          sendData({ type: 'progress', progress })
        }

        try {
          sendLog('🚀 Starting OpenAI SourceForge research...')
          sendProgress(5)

          // Step 1: Classify the question type
          sendLog('🔍 Classifying question type...')
          const classification = await classifyQuestion(query)
          sendLog(`📋 Question classified as: ${classification.type} (confidence: ${Math.round(classification.confidence * 100)}%)`)
          sendLog(`💭 Reasoning: ${classification.reasoning}`)
          sendProgress(15)

          // Step 2: Scrape sources based on question type
          let allSources: any[] = []
          
          if (classification.type === 'research' || classification.type === 'medical') {
            // For research/medical questions, ONLY use academic sources
            sendLog('🎓 Searching academic sources only...')
            const academicSources = await scrapeAcademicSources(
              query,
              classification.type,
              process.env.HYPERBROWSER_API_KEY!,
              (progress) => sendProgress(15 + progress * 0.55),
              sendLog
            )
            allSources = [...academicSources]
            sendLog(`📚 Found ${academicSources.length} academic sources - no general web sources for research/medical questions`)
          } else {
            // For technical questions, use the original approach with Reddit, documentation, etc.
            sendLog('🔍 Scraping technical sources (documentation, Reddit, Stack Overflow, etc.)...')
            const scrapeResult = await scrapeSearchResults(
              query,
              process.env.HYPERBROWSER_API_KEY!,
              (progress) => sendProgress(15 + progress * 0.55),
              sendLog
            )
            allSources = scrapeResult.sources
          }

          // Create combined result object
          const combinedResult = {
            sources: allSources,
            totalEndpoints: allSources.reduce((sum, source) => sum + source.endpoints.length, 0),
            creditsUsed: Math.ceil(allSources.length * 0.8) // Estimate credits used
          }

          sendLog(`✅ Scraped ${combinedResult.sources.length} total sources with ${combinedResult.totalEndpoints} endpoints`)
          sendProgress(70)

          // Step 3: Generate answer using OpenAI
          sendLog('🤖 Generating AI answer with GPT-4o...')
          const answerResult = await generateAnswer(query, combinedResult.sources)
          sendProgress(85)

          // Step 4: Build Postman collection and manifest
          sendLog('📦 Building Postman collection...')
          const postmanCollection = buildPostmanCollection(combinedResult.sources, query)
          const endpointManifest = buildEndpointManifest(combinedResult.sources, query)
          sendProgress(90)

          // Step 5: Create downloadable ZIP
          sendLog('🗜️ Creating download package...')
          const zipBuffer = await createZipBundle({
            answerMarkdown: answerResult.answerMarkdown,
            postmanCollection,
            endpointManifest,
            query
          })
          sendProgress(95)

          // Convert zip buffer to base64 for transmission
          const zipBase64 = zipBuffer.toString('base64')

          sendLog('✨ Research complete!')
          sendProgress(100)

          // Send final result
          sendData({
            type: 'complete',
            result: {
              answerMarkdown: answerResult.answerMarkdown,
              citations: answerResult.citations,
              postmanCollection,
              endpointManifest,
              zipFile: zipBase64,
              creditsUsed: combinedResult.creditsUsed,
              questionType: classification.type,
              stats: {
                sources: combinedResult.sources.length,
                endpoints: combinedResult.totalEndpoints,
                citations: answerResult.citations.length
              }
            }
          })

        } catch (error) {
          console.error('Research error:', error)
          sendLog(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          sendData({ 
            type: 'error', 
            error: error instanceof Error ? error.message : 'Unknown error' 
          })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })

  } catch (error) {
    console.error('API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 