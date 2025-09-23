import { NextRequest } from 'next/server'
import { v4 as uuidv4 } from 'uuid'
import { Hyperbrowser } from '@hyperbrowser/sdk'
import { dedupeEndpoints, generatePostmanCollection } from '../../../lib/utils'

// Rate limiting map - in production, use Redis or database
const rateLimitMap = new Map<string, number>()
const RATE_LIMIT_WINDOW = 60 * 60 * 1000 // 1 hour
const MAX_REQUESTS = 1

interface ApiEndpoint {
  method: string
  url: string
  status: number
  size: number
  timestamp?: number
  source?: 'same-origin' | 'third-party'
}

export async function POST(request: NextRequest) {
  try {
    const { url, sameOriginOnly = true } = await request.json()
    
    if (!url || typeof url !== 'string') {
      return new Response('URL is required', { status: 400 })
    }

    // Basic URL validation
    try {
      new URL(url)
    } catch {
      return new Response('Invalid URL format', { status: 400 })
    }

    // Rate limiting by IP
    const clientIP = request.headers.get('x-forwarded-for') || 
                    request.headers.get('x-real-ip') || 
                    'unknown'
                    
    const now = Date.now()
    const lastRequest = rateLimitMap.get(clientIP)
    
    if (lastRequest && (now - lastRequest) < RATE_LIMIT_WINDOW) {
      return new Response('Rate limit exceeded. Please try again in an hour.', { 
        status: 429,
        headers: {
          'Retry-After': Math.ceil((RATE_LIMIT_WINDOW - (now - lastRequest)) / 1000).toString()
        }
      })
    }
    
    rateLimitMap.set(clientIP, now)

    // Initialize Hyperbrowser
    if (!process.env.HYPERBROWSER_API_KEY) {
      throw new Error('HYPERBROWSER_API_KEY is not configured')
    }

    const hb = new Hyperbrowser({
      apiKey: process.env.HYPERBROWSER_API_KEY,
    })

    // Create readable stream for SSE
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        const sendSSE = (data: any) => {
          const withTs = typeof data === 'object' && data !== null ? { ts: Date.now(), level: data.level || 'info', ...data } : data
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(withTs)}\n\n`))
        }

        try {
          const crawlId = uuidv4()
          const endpoints: ApiEndpoint[] = []
          const seedHost = new URL(url).hostname
          let progress = 0
          const maxProgress = 90 // Reserve 10% for final processing

          sendSSE({ type: 'log', message: `Starting crawl for ${url}` })
          sendSSE({ type: 'progress', progress: 5 })

          // Create browser session
          const session = await hb.sessions.create({
            useStealth: true,
            useProxy: true
          })

          sendSSE({ type: 'log', message: 'Browser session created' })
          sendSSE({ type: 'progress', progress: 15 })

          // Connect with Puppeteer
          const { connect } = await import('puppeteer-core')
          const browser = await connect({
            browserWSEndpoint: session.wsEndpoint,
            defaultViewport: null,
          })

          const [page] = await browser.pages()
          let requestCount = 0

          sendSSE({ type: 'log', message: 'Connected to browser' })
          sendSSE({ type: 'progress', progress: 20 })

          page.on('requestfinished', (request) => {
            try {
              const response = request.response()
              if (response) {
                const method = request.method()
                const reqUrl = request.url()
                const status = response.status()
                const headers = response.headers()
                const size = parseInt(headers['content-length'] || '0', 10)
                const contentType = headers['content-type'] || ''
                const resourceType = request.resourceType ? request.resourceType() : ''

                // Skip static assets and analytics
                const skipPatterns = [
                  /\.(css|js|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i,
                  /google-analytics|googletagmanager|facebook|twitter|linkedin/i,
                  /posthog|mixpanel|segment|amplitude|hotjar/i, // Analytics services
                  /cdn\.|assets\.|static\./i
                ]

                const isStaticAsset = skipPatterns.some(pattern => pattern.test(reqUrl))
                
                // Enhanced API detection patterns
                const isApiEndpoint = !isStaticAsset && (
                  // Traditional API patterns
                  reqUrl.includes('/api/') ||
                  reqUrl.includes('/v1/') || reqUrl.includes('/v2/') || reqUrl.includes('/v3/') ||
                  reqUrl.match(/\/(api|rest|graphql|gql)\//i) ||
                  reqUrl.includes('.json') ||
                  
                  // Modern API patterns
                  contentType.includes('application/json') ||
                  contentType.includes('application/api') ||
                  contentType.includes('text/plain') && (method === 'POST' || method === 'PUT') ||
                  
                  // XHR/Fetch requests (often APIs)
                  (resourceType === 'xhr' || resourceType === 'fetch') ||
                  (method !== 'GET' && !isStaticAsset) ||
                  (headers['x-requested-with'] === 'XMLHttpRequest') ||
                  
                  // Backend endpoints
                  reqUrl.match(/\/(auth|login|logout|user|users|data|config|settings)/i) ||
                  reqUrl.match(/\/(submit|upload|download|search|query)/i) ||
                  reqUrl.match(/\/(repos|repositories|gists|notifications|issues|pulls)/i) ||
                  reqUrl.match(/\/(orgs|organizations|teams|projects|actions)/i) ||
                  reqUrl.match(/\/(graphql|rest|api|_private|internal)/i) ||
                  
                  // Status codes that suggest API endpoints
                  [200, 201, 202, 400, 401, 403, 404, 422, 500, 502, 503].includes(status) && 
                  !reqUrl.includes('favicon') && 
                  !reqUrl.includes('robots.txt')
                )

                if (isApiEndpoint) {
                  const host = (() => { try { return new URL(reqUrl).hostname } catch { return '' } })()
                  const source: 'same-origin' | 'third-party' = host && host === seedHost ? 'same-origin' : 'third-party'
                  if (!sameOriginOnly || source === 'same-origin') {
                    endpoints.push({ method: method === 'HEAD' ? 'HEAD' : method, url: reqUrl, status, size, timestamp: Date.now(), source })
                  }
                  
                  const logMessage = `${method} ${reqUrl} → ${status} (${contentType})`
                  sendSSE({ type: 'log', message: logMessage })
                  
                  // Update progress based on requests found
                  requestCount++
                  progress = Math.min(10 + (requestCount * 2), maxProgress)
                  sendSSE({ type: 'progress', progress })
                }
              }
            } catch (err) {
              console.warn('Error processing request:', err)
            }
          })

          sendSSE({ type: 'log', message: `Navigating to ${url}` })
          
          // Navigate to the URL with more robust timeout handling
          try {
            await page.goto(url, { 
              waitUntil: 'domcontentloaded', // Less strict than networkidle0
              timeout: 45000 // Increased from 30s to 45s
            })
            
            // Wait for additional network requests to settle
            try {
              await new Promise(resolve => setTimeout(resolve, 3000)) // Wait 3s for additional requests
              await page.evaluate(() => new Promise(resolve => {
                if (document.readyState === 'complete') resolve(null)
                else window.addEventListener('load', () => resolve(null))
              }))
            } catch {
              // If waiting fails, continue anyway
              sendSSE({ type: 'log', message: 'Additional wait failed, continuing with analysis' })
            }
          } catch (error) {
            if (error instanceof Error && error.message.includes('timeout')) {
              sendSSE({ type: 'log', message: 'Page load timeout, continuing with partial analysis' })
            } else {
              throw error
            }
          }

          sendSSE({ type: 'log', message: 'Page loaded, analyzing network traffic' })
          sendSSE({ type: 'progress', progress: 50 })

          // Trigger user interactions to discover more API endpoints
          sendSSE({ type: 'log', message: 'Simulating user interactions to discover APIs' })
          
          try {
            // Scroll to trigger lazy loading
            await page.evaluate(() => {
              return new Promise((resolve) => {
                let totalHeight = 0
                const distance = 100
                const timer = setInterval(() => {
                  window.scrollBy(0, distance)
                  totalHeight += distance
                  
                  if(totalHeight >= document.body.scrollHeight) {
                    clearInterval(timer)
                    resolve(null)
                  }
                }, 100)
              })
            })
            
            // Click on common interactive elements
            const clickableSelectors = [
              'button', 'a[href="#"]', '[onclick]', '[role="button"]',
              '.nav-link', '.menu-item', '.tab', '.dropdown-toggle',
              '[data-toggle]', '[data-action]', '.btn',
              // GitHub-specific selectors
              '.js-site-search-form', '.js-global-search-toggle', 
              '.header-search-button', '.octicon-search',
              '.repo-list a', '.avatar', '.user-mention',
              // More generic interactive elements
              '[data-testid]', '[data-view-component]', '[data-action]',
              'a[href*="/api"]', 'a[href*="/search"]', 'a[href*="/user"]'
            ]
            
            for (const selector of clickableSelectors) {
              try {
                const elements = await page.$$(selector)
                if (elements.length > 0) {
                  // Click first few elements of each type
                  for (let i = 0; i < Math.min(3, elements.length); i++) {
                    await elements[i].click({ delay: 100 })
                    await new Promise(resolve => setTimeout(resolve, 500)) // Wait for potential API calls
                  }
                }
              } catch (err) {
                // Continue if clicking fails
              }
            }
            
                         // Trigger form interactions and searches
             try {
               const forms = await page.$$('form')
               for (const form of forms.slice(0, 3)) { // Increased to 3 forms
                 const inputs = await form.$$('input[type="text"], input[type="search"], input[type="email"], textarea')
                 for (const input of inputs.slice(0, 2)) {
                   // Use more realistic test data that might trigger APIs
                   const testInputs = ['react', 'javascript', 'python', 'test']
                   const randomInput = testInputs[Math.floor(Math.random() * testInputs.length)]
                  await input.type(randomInput, { delay: 50 })
                  await new Promise(resolve => setTimeout(resolve, 500)) // Wait longer for autocomplete/search APIs
                   
                   // Try pressing Enter to trigger search
                   try {
                     await input.press('Enter')
                    await new Promise(resolve => setTimeout(resolve, 1000))
                   } catch (err) {
                     // Continue if Enter press fails
                   }
                 }
               }
               
               // Try triggering search specifically
               try {
                 const searchInput = await page.$('input[type="search"], input[name*="search"], input[placeholder*="search"]')
                if (searchInput) {
                  await searchInput.type('react', { delay: 100 })
                  await new Promise(resolve => setTimeout(resolve, 800)) // Wait for autocomplete APIs
                }
               } catch (err) {
                 // Continue if search fails
               }
               
             } catch (err) {
               // Continue if form interaction fails
             }
            
          } catch (err) {
            sendSSE({ type: 'log', message: 'User interaction simulation completed with some errors' })
          }
          
          sendSSE({ type: 'progress', progress: 70 })
          
          // Wait for any final API calls triggered by interactions
          await new Promise(resolve => setTimeout(resolve, 3000))
          
          sendSSE({ type: 'log', message: 'Processing discovered endpoints' })
          sendSSE({ type: 'progress', progress: 80 })

          // Clean up
          await browser.close()
          await hb.sessions.stop(session.id)
          
          // Dedupe and process endpoints
          const uniqueEndpoints = dedupeEndpoints(endpoints)
          const postmanCollection = generatePostmanCollection(url, uniqueEndpoints)
          
          sendSSE({ type: 'progress', progress: 95 })
          sendSSE({ type: 'log', message: `Crawl complete! Found ${uniqueEndpoints.length} unique endpoints` })

          // Send final result
          sendSSE({
            type: 'complete',
            result: {
              crawlId,
              endpoints: uniqueEndpoints,
              postmanCollection
            }
          })

          sendSSE({ type: 'progress', progress: 100 })
          
        } catch (error) {
          console.error('Crawl error:', error)
          sendSSE({ 
            type: 'log', 
            message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}` 
          })
        } finally {
          controller.close()
        }
      }
    })

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    })

  } catch (error) {
    console.error('API error:', error)
    return new Response(
      error instanceof Error ? error.message : 'Internal server error',
      { status: 500 }
    )
  }
} 