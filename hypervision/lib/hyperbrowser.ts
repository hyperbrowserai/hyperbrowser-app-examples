import { Hyperbrowser } from '@hyperbrowser/sdk';

export interface HyperbrowserExtractResponse {
  success: boolean;
  data: {
    url: string;
    title: string;
    description?: string;
    content: string;
    metadata: {
      [key: string]: any;
    };
    html?: string;
    text?: string;
    screenshot?: string;
  };
}

export interface GraphNode {
  id: string;
  name: string;
  group: number;
  val: number;
}

export interface GraphLink {
  source: string;
  target: string;
  value: number;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
}

export async function extractPageData(url: string, apiKey: string): Promise<HyperbrowserExtractResponse> {
  const client = new Hyperbrowser({ apiKey });

  // Try with proxy first
  try {
    const result = await client.scrape.startAndWait({
      url,
      sessionOptions: {
        useStealth: true,
        useProxy: true,
        solveCaptchas: true,
        adblock: false,
      },
      scrapeOptions: {
        formats: ['markdown', 'html'],
        onlyMainContent: false,
        waitFor: 5000,
      },
    });

    if (result.status === 'failed') {
      throw new Error(result.error || 'Scrape job failed with proxy');
    }

    const scrapedData = result.data || {};
    const metadata = scrapedData.metadata || {};

    const title = (metadata.title as string) || (metadata['og:title'] as string) || '';
    const description = (metadata.description as string) || (metadata['og:description'] as string) || '';
    const content = scrapedData.markdown || scrapedData.html || '';

    return {
      success: true,
      data: {
        url,
        title,
        description,
        content,
        metadata: metadata as Record<string, any>,
        html: scrapedData.html || '',
        text: scrapedData.markdown || '',
        screenshot: scrapedData.screenshot || '',
      },
    };
  } catch (proxyError: any) {
    // If proxy fails, retry without proxy
    console.log('Proxy failed, retrying without proxy:', proxyError.message);
    
    try {
      const result = await client.scrape.startAndWait({
        url,
        sessionOptions: {
          useStealth: true,
          useProxy: false,
          solveCaptchas: true,
          adblock: false,
        },
        scrapeOptions: {
          formats: ['markdown', 'html'],
          onlyMainContent: false,
          waitFor: 5000,
        },
      });

      if (result.status === 'failed') {
        throw new Error(result.error || 'Scrape job failed');
      }

      const scrapedData = result.data || {};
      const metadata = scrapedData.metadata || {};

      const title = (metadata.title as string) || (metadata['og:title'] as string) || '';
      const description = (metadata.description as string) || (metadata['og:description'] as string) || '';
      const content = scrapedData.markdown || scrapedData.html || '';

      return {
        success: true,
        data: {
          url,
          title,
          description,
          content,
          metadata: metadata as Record<string, any>,
          html: scrapedData.html || '',
          text: scrapedData.markdown || '',
          screenshot: scrapedData.screenshot || '',
        },
      };
    } catch (directError: any) {
      console.error('Direct connection also failed:', directError);
      throw new Error(`Failed to scrape ${url}: ${directError.message}`);
    }
  }
}

export function transformToGraphData(extractedData: HyperbrowserExtractResponse): {
  graph: GraphData;
  reasoning: string[];
  nodeToReasoning: { [key: string]: number[] };
} {
  const { data } = extractedData;
  const nodes: GraphNode[] = [];
  const links: GraphLink[] = [];
  const reasoning: string[] = [];
  const nodeToReasoning: { [key: string]: number[] } = {};

  nodes.push({
    id: 'root',
    name: data.title || 'Page',
    group: 1,
    val: 30,
  });

  nodeToReasoning['root'] = [reasoning.length];
  reasoning.push(`Primary Entity: ${data.title || 'Unnamed Page'}`);
  nodeToReasoning['root'] = [reasoning.length - 1];

  if (data.description) {
    nodes.push({
      id: 'description',
      name: 'Description',
      group: 2,
      val: 20,
    });
    links.push({ source: 'root', target: 'description', value: 3 });
    const truncDesc = data.description.length > 120 ? data.description.substring(0, 120) + '...' : data.description;
    nodeToReasoning['description'] = [reasoning.length];
    reasoning.push(`Description Layer: ${truncDesc}`);
  }

  if (data.content) {
    const contentLength = data.content.length;
    nodes.push({
      id: 'content',
      name: 'Content',
      group: 3,
      val: Math.min(25, contentLength / 100),
    });
    links.push({ source: 'root', target: 'content', value: 5 });
    nodeToReasoning['content'] = [reasoning.length];
    reasoning.push(`Content Analysis: Processed ${contentLength.toLocaleString()} characters of page content`);
  }

  if (data.metadata && Object.keys(data.metadata).length > 0) {
    const metadataKeys = Object.keys(data.metadata).filter(key => 
      key !== 'title' && key !== 'description' && data.metadata[key]
    );
    
    const metadataNodeIds: string[] = [];
    metadataKeys.slice(0, 8).forEach((key, index) => {
      const nodeId = `meta_${key}`;
      metadataNodeIds.push(nodeId);
      const displayName = key.length > 15 ? key.substring(0, 15) + '...' : key;
      nodes.push({
        id: nodeId,
        name: displayName.toUpperCase(),
        group: 4,
        val: 12,
      });
      links.push({ source: 'root', target: nodeId, value: 2 });
    });
    
    metadataNodeIds.forEach(id => {
      nodeToReasoning[id] = [reasoning.length];
    });
    reasoning.push(`Metadata Extraction: Identified ${metadataKeys.length} metadata properties including ${metadataKeys.slice(0, 3).join(', ')}`);
  }

  if (data.text) {
    const words = data.text.split(/\s+/).filter(w => w.length > 0);
    const wordCount = words.length;
    
    nodes.push({
      id: 'textual',
      name: `Text (${wordCount}w)`,
      group: 5,
      val: Math.min(22, wordCount / 50),
    });
    links.push({ source: 'root', target: 'textual', value: 4 });
    nodeToReasoning['textual'] = [reasoning.length];
    reasoning.push(`Textual Analysis: Extracted and processed ${wordCount.toLocaleString()} words from the page`);
    
    const avgWordLength = words.reduce((sum, w) => sum + w.length, 0) / wordCount;
    nodes.push({
      id: 'language_complexity',
      name: `Lang Complexity`,
      group: 5,
      val: 14,
    });
    links.push({ source: 'textual', target: 'language_complexity', value: 2 });
    nodeToReasoning['language_complexity'] = [reasoning.length];
    reasoning.push(`Language Metrics: Average word length is ${avgWordLength.toFixed(1)} characters, indicating ${avgWordLength > 6 ? 'formal/technical' : 'casual/simple'} language complexity`);
  }

  const semanticNode = {
    id: 'semantic',
    name: 'Semantic Core',
    group: 6,
    val: 20,
  };
  nodes.push(semanticNode);
  
  if (nodes.find(n => n.id === 'content')) {
    links.push({ source: 'content', target: 'semantic', value: 3 });
  }
  if (nodes.find(n => n.id === 'textual')) {
    links.push({ source: 'textual', target: 'semantic', value: 3 });
  }
  if (nodes.find(n => n.id === 'description')) {
    links.push({ source: 'description', target: 'semantic', value: 2 });
  }
  
  nodeToReasoning['semantic'] = [reasoning.length];
  reasoning.push('Semantic Understanding: Cross-referencing content and textual data to build contextual relationships');
  
  nodes.push({
    id: 'ai_perception',
    name: 'AI Perception',
    group: 6,
    val: 18,
  });
  links.push({ source: 'semantic', target: 'ai_perception', value: 4 });
  nodeToReasoning['ai_perception'] = [reasoning.length];
  reasoning.push('AI Perception Layer: Synthesizing high-level understanding from semantic analysis');

  reasoning.push(`Graph Construction: Built ${nodes.length} nodes with ${links.length} connections representing page structure`);
  reasoning.push('Analysis Complete: Page successfully analyzed and visualized');

  return {
    graph: { nodes, links },
    reasoning,
    nodeToReasoning,
  };
}
