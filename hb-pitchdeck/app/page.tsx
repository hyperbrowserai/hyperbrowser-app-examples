'use client';

import { useState } from 'react';
import Image from 'next/image';

type Theme = 'modern' | 'dark' | 'neon';

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

export default function Home() {
  const [url, setUrl] = useState('');
  const [theme, setTheme] = useState<Theme>('neon');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pitchDeck, setPitchDeck] = useState<PitchDeck | null>(null);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [filename, setFilename] = useState<string | null>(null);

  const generatePitchDeck = async () => {
    if (!url) {
      setError('Please enter a URL');
      return;
    }

    setIsLoading(true);
    setError(null);
    setPitchDeck(null);
    setPdfBase64(null);

    try {
      const response = await fetch('/api/pitchdeck', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url, theme }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate pitch deck');
      }

      setPitchDeck(data.pitch);
      setPdfBase64(data.pdfBase64);
      setFilename(data.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const downloadPDF = () => {
    if (!pdfBase64 || !filename) return;

    const link = document.createElement('a');
    link.href = `data:application/pdf;base64,${pdfBase64}`;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const downloadJSON = () => {
    if (!pitchDeck || !filename) return;

    const jsonString = JSON.stringify(pitchDeck, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = filename.replace('.pdf', '.json');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const SectionCard = ({ title, items }: { title: string; items?: string[] }) => {
    if (!items || items.length === 0) return null;
    
    return (
      <div className="bg-hb-dark border border-hb-gray rounded-lg p-4 shadow-lg">
        <h3 className="text-hb-yellow text-lg font-bold mb-2 text-center">{title}</h3>
        <ul className="list-disc pl-5 space-y-1">
          {items.map((item, index) => (
            <li key={index} className="text-white text-sm">{item}</li>
          ))}
        </ul>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-hb-black p-4 md:p-8 flex flex-col items-center">
      <header className="max-w-4xl w-full text-center mb-12">
        <h1 className="text-hb-yellow text-4xl font-bold mb-3">Startup Pitch Deck Generator</h1>
        <p className="text-hb-white text-xl">
          Turn any URL into a professional pitch deck PDF
        </p>
      </header>

      <main className="max-w-4xl w-full">
        <div className="bg-hb-dark border border-hb-gray p-8 rounded-lg shadow-lg mb-8">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1">
              <label htmlFor="url" className="block text-hb-yellow text-base font-medium mb-2">
                Company Website URL
              </label>
              <input
                id="url"
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
                className="w-full p-4 border-2 border-hb-gray rounded-md bg-black text-white focus:border-hb-yellow focus:outline-none text-left"
                disabled={isLoading}
              />
            </div>
            <div className="md:w-1/3">
              <label htmlFor="theme" className="block text-hb-yellow text-base font-medium mb-2">
                Theme
              </label>
              <select
                id="theme"
                value={theme}
                onChange={(e) => setTheme(e.target.value as Theme)}
                className="w-full p-4 border-2 border-hb-gray rounded-md bg-black text-white focus:border-hb-yellow focus:outline-none text-left appearance-none"
                disabled={isLoading}
                style={{
                  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%23F0FF26' viewBox='0 0 24 24' stroke='%23F0FF26'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 1rem center',
                  backgroundSize: '1.5em 1.5em',
                  paddingRight: '2.5rem'
                }}
              >
                <option value="modern">Modern</option>
                <option value="dark">Dark</option>
                <option value="neon">Neon</option>
              </select>
            </div>
          </div>
          
          <button
            onClick={generatePitchDeck}
            disabled={isLoading || !url}
            className="w-full md:w-64 bg-hb-yellow hover:bg-[#d9e824] text-black font-bold text-lg py-4 px-6 rounded-md disabled:opacity-50 disabled:cursor-not-allowed transition-colors mx-auto block mt-8"
          >
            {isLoading ? 'Generating...' : 'Generate Pitch Deck'}
          </button>
        </div>

        {error && (
          <div className="bg-red-900/30 border border-red-500 text-red-300 px-4 py-3 rounded mb-8 text-center">
            <p>{error}</p>
          </div>
        )}

        {pitchDeck && (
          <div className="space-y-8">
            <div className="bg-hb-dark border border-hb-gray p-8 rounded-lg shadow-lg">
              <div className="flex flex-col items-center mb-6">
                <h2 className="text-hb-yellow text-3xl font-bold text-center">{pitchDeck.company}</h2>
                <p className="text-white mt-2 text-center max-w-2xl">{pitchDeck.one_liner}</p>
                <div className="flex gap-4 mt-8">
                  <button
                    onClick={downloadPDF}
                    className="bg-white hover:bg-gray-100 text-black font-bold py-3 px-8 rounded-md transition-colors"
                  >
                    Download PDF
                  </button>
                  <button
                    onClick={downloadJSON}
                    className="bg-hb-yellow hover:bg-[#d9e824] text-black font-bold py-3 px-8 rounded-md transition-colors"
                  >
                    Download JSON
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <SectionCard title="Problem" items={pitchDeck.problem} />
              <SectionCard title="Solution" items={pitchDeck.solution} />
              <SectionCard title="Product" items={pitchDeck.product} />
              <SectionCard title="Market" items={pitchDeck.market} />
              <SectionCard title="Business Model" items={pitchDeck.business_model} />
              <SectionCard title="Competition" items={pitchDeck.competition} />
              {pitchDeck.traction && <SectionCard title="Traction" items={pitchDeck.traction} />}
              {pitchDeck.team && <SectionCard title="Team" items={pitchDeck.team} />}
              <SectionCard title="Call to Action" items={pitchDeck.cta} />
            </div>
          </div>
        )}
      </main>

      <footer className="max-w-4xl w-full mt-12 pt-4 border-t border-hb-gray text-center text-sm text-gray-400">
        <p className="text-white">Built with <a href="https://hyperbrowser.ai" className="text-white hover:underline">Hyperbrowser</a></p>
        <p className="mt-1 text-white">Follow <a href="https://x.com/hyperbrowser" className="text-white hover:underline">@hyperbrowser</a> for updates</p>
      </footer>
    </div>
  );
}