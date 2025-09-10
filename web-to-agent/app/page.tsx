'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { StreamingCodeDisplay } from '@/components/streaming-code-display';
import { Logo } from '@/components/logo';
import { type CrawlResult, type Action, type TestResult } from '@/lib/types';

interface PipelineState {
  crawling: boolean;
  mapping: boolean;
  scaffolding: boolean;
  crawlResult?: CrawlResult;
  actions: Action[];
  generatedCode?: string;
  error?: string;
}

interface TestState {
  [actionName: string]: {
    testing: boolean;
    result?: TestResult;
    input: Record<string, unknown>;
  };
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [pipeline, setPipeline] = useState<PipelineState>({
    crawling: false,
    mapping: false,
    scaffolding: false,
    actions: [],
  });
  const [testStates, setTestStates] = useState<TestState>({});

  const runPipeline = async () => {
    if (!url) return;

    setPipeline(prev => ({ ...prev, crawling: true, error: undefined }));

    try {
      // Step 1: Crawl
      const crawlResponse = await fetch('/api/crawl', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url }),
      });
      
      const crawlData = await crawlResponse.json();
      if (!crawlData.success) throw new Error(crawlData.error);

      setPipeline(prev => ({ 
        ...prev, 
        crawling: false, 
        mapping: true, 
        crawlResult: crawlData.data 
      }));

      // Step 2: Map
      const mapResponse = await fetch('/api/map', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ domJson: crawlData.data }),
      });

      const mapData = await mapResponse.json();
      if (!mapData.success) throw new Error(mapData.error);

      setPipeline(prev => ({ 
        ...prev, 
        mapping: false, 
        scaffolding: true, 
        actions: mapData.data.actions 
      }));

      // Initialize test states
      const newTestStates: TestState = {};
      mapData.data.actions.forEach((action: Action) => {
        newTestStates[action.name] = {
          testing: false,
          input: {},
        };
      });
      setTestStates(newTestStates);

      // Step 3: Scaffold
      const scaffoldResponse = await fetch('/api/scaffold', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actions: mapData.data.actions, url }),
      });

      const scaffoldData = await scaffoldResponse.json();
      if (!scaffoldData.success) throw new Error(scaffoldData.error);

      setPipeline(prev => ({ 
        ...prev, 
        scaffolding: false, 
        generatedCode: scaffoldData.data.typescript 
      }));

    } catch (error) {
      setPipeline(prev => ({ 
        ...prev, 
        crawling: false, 
        mapping: false, 
        scaffolding: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }));
    }
  };

  const testAction = async (action: Action) => {
    const testState = testStates[action.name];
    if (!testState || !pipeline.crawlResult) return;

    setTestStates(prev => ({
      ...prev,
      [action.name]: { ...prev[action.name], testing: true },
    }));

    try {
      const response = await fetch('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action,
          input: testState.input,
          url: pipeline.crawlResult.url,
        }),
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setTestStates(prev => ({
        ...prev,
        [action.name]: { 
          ...prev[action.name], 
          testing: false, 
          result: data.data 
        },
      }));

    } catch (error) {
      setTestStates(prev => ({
        ...prev,
        [action.name]: { 
          ...prev[action.name], 
          testing: false, 
          result: {
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            logs: [],
          }
        },
      }));
    }
  };

  const exportTools = () => {
    if (!pipeline.generatedCode) return;
    
    const blob = new Blob([pipeline.generatedCode], { type: 'text/typescript' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'generated-tools.ts';
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateTestInput = (actionName: string, key: string, value: string) => {
    setTestStates(prev => ({
      ...prev,
      [actionName]: {
        ...prev[actionName],
        input: { ...prev[actionName].input, [key]: value },
      },
    }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navbar */}
      <nav className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-8 py-4">
          <div className="flex items-center justify-between">
            {/* Logo and Title */}
            <div className="flex items-center gap-3">
              <Logo className="h-8 w-8" />
              <div>
                <h1 className="text-xl font-bold">Web-to-Agent Tool Generator</h1>
                <p className="text-sm text-muted-foreground">
                  Built with <a href="https://hyperbrowser.ai" className="text-accent hover:underline font-medium">Hyperbrowser</a>
                </p>
              </div>
            </div>
            
            {/* GitHub Link */}
            <a 
              href="https://github.com/hyperbrowserai/hyperbrowser-app-examples"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 rounded-lg bg-accent/90 hover:bg-accent/100 text-background transition-colors border border-accent/30 hover:border-accent/50"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
              </svg>
              <span className="font-medium">Github</span>
            </a>
          </div>
        </div>
      </nav>

      <div className="max-w-6xl mx-auto p-8">
        <header className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">Generate Agent Tools from Any Website</h2>
          <p className="text-muted-foreground">
            Enter a URL to generate agent tools that can interact with that site 
          </p>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Generate Tools</CardTitle>
            <CardDescription>Enter a website URL to automatically generate agent tools</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 mb-4">
              <Input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter website URL..."
                className="flex-1"
              />
              <Button
                onClick={runPipeline}
                disabled={!url || pipeline.crawling || pipeline.mapping || pipeline.scaffolding}
                className="px-8 bg-accent hover:bg-accent/90"
              >
                {pipeline.crawling ? 'Crawling...' : 
                 pipeline.mapping ? 'Mapping...' : 
                 pipeline.scaffolding ? 'Scaffolding...' : 
                 'Generate Tools'}
              </Button>
            </div>

            {/* Progress indicator */}
            {(pipeline.crawling || pipeline.mapping || pipeline.scaffolding) && (
              <div className="mb-4">
                <div className="flex justify-between text-sm mb-2">
                  <span>Pipeline Progress</span>
                  <span>
                    {pipeline.crawling ? 'Crawling website...' : 
                     pipeline.mapping ? 'Analyzing elements...' : 
                     pipeline.scaffolding ? 'Generating code...' : 
                     'Complete'}
                  </span>
                </div>
                <Progress 
                  value={
                    pipeline.crawling ? 25 : 
                    pipeline.mapping ? 60 : 
                    pipeline.scaffolding ? 90 : 100
                  } 
                  className="w-full"
                />
              </div>
            )}

            {/* Debug info */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-muted-foreground mb-2">
                {/* Debug: crawling={pipeline.crawling.toString()}, mapping={pipeline.mapping.toString()}, scaffolding={pipeline.scaffolding.toString()} */}
              </div>
            )}

            {pipeline.error && (
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Error:</strong> {pipeline.error}
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {pipeline.crawlResult && (
          <Card className="mb-8">
            <CardHeader>
              <CardTitle>Crawl Results</CardTitle>
              <CardDescription>Website analysis complete</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <h3 className="font-semibold">Page Info</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p><span className="font-medium">Title:</span> {pipeline.crawlResult.title}</p>
                    {/* <p><span className="font-medium">Elements found:</span> {pipeline.crawlResult.elements.length}</p> */}
                    <p><span className="font-medium">Timestamp:</span> {new Date(pipeline.crawlResult.timestamp).toLocaleString()}</p>
                  </div>
                </div>
                {pipeline.crawlResult.screenshot && (
                  <div>
                    <h3 className="font-semibold mb-2">Screenshot</h3>
                    <Image 
                      src={`data:image/png;base64,${pipeline.crawlResult.screenshot}`}
                      alt="Page screenshot"
                      width={400}
                      height={300}
                      className="max-w-full h-auto border rounded"
                    />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {pipeline.actions.length > 0 && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Generated Actions</CardTitle>
                  <CardDescription>AI-generated tools for website interaction</CardDescription>
                </div>
                {pipeline.generatedCode && (
                  <Button variant="outline" onClick={exportTools}>
                    Export Tools
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pipeline.actions.map((action) => {
                const testState = testStates[action.name];
                const result = testState?.result;
                
                return (
                  <Card key={action.name}>
                    <CardHeader>
                      <CardTitle className="text-lg">{action.name}</CardTitle>
                      <CardDescription>{action.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-4 space-x-2">
                        <Badge variant="secondary">{action.type}</Badge>
                        {action.selector && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {action.selector}
                          </Badge>
                        )}
                      </div>

                    {/* Input fields for testing */}
                    {action.inputSchema.properties && Object.entries(action.inputSchema.properties).map(([key, schema]) => {
                      const typedSchema = schema as { description?: string; type?: string };
                      return (
                      <div key={key} className="mb-3">
                        <label className="block text-sm font-medium mb-1">{key}</label>
                        <Input
                          type="text"
                          placeholder={typedSchema.description || key}
                          value={(testState?.input[key] as string) || ''}
                          onChange={(e) => updateTestInput(action.name, key, e.target.value)}
                        />
                      </div>
                      );
                    })}

                    <Button
                      onClick={() => testAction(action)}
                      disabled={testState?.testing}
                      className="w-full mb-4"
                      variant="outline"
                    >
                      {testState?.testing ? 'Testing...' : 'Test Action'}
                    </Button>

                    {result && (
                      <div className="border-t border-gray-700 pt-4">
                        <h4 className="font-medium mb-2">Test Result</h4>
                        {result.success ? (
                          <div className="text-green-400 text-sm mb-2">✓ Success</div>
                        ) : (
                          <div className="text-red-400 text-sm mb-2">✗ {result.error}</div>
                        )}
                        
                        {result.logs.length > 0 && (
                          <div className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">Logs:</div>
                            <div className="bg-gray-800 rounded p-2 text-xs font-mono max-h-32 overflow-y-auto">
                              {result.logs.map((log, i) => (
                                <div key={i} className="text-gray-300">{log}</div>
                              ))}
                            </div>
                          </div>
                        )}

                        {result.screenshot && (
                          <div>
                            <div className="text-xs text-gray-500 mb-1">Screenshot:</div>
                            <Image 
                              src={`data:image/png;base64,${result.screenshot}`}
                              alt="Test screenshot"
                              width={300}
                              height={200}
                              className="max-w-full h-auto border border-gray-700 rounded"
                            />
                          </div>
                        )}
                      </div>
                    )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
            </CardContent>
          </Card>
        )}

        {pipeline.actions.length > 0 && (
          <StreamingCodeDisplay
            actions={pipeline.actions}
            url={url || "https://example.com"}
            onComplete={(code) => {
              setPipeline(prev => ({ ...prev, generatedCode: code }));
            }}
          />
        )}

      
      </div>
    </div>
  );
}