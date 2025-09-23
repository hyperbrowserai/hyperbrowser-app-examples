'use client'

import { useMemo, useState } from 'react'
import { Copy } from 'lucide-react'

interface ApiEndpoint {
  method: string
  url: string
  status: number
  size: number
  source?: 'same-origin' | 'third-party'
}

interface EndpointListProps {
  endpoints: ApiEndpoint[]
}

const METHOD_COLORS: Record<string, string> = {
  GET: '#22c55e',
  POST: '#60a5fa',
  PUT: '#f59e0b',
  PATCH: '#a78bfa',
  DELETE: '#ef4444',
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

export default function EndpointList({ endpoints }: EndpointListProps) {
  const [query, setQuery] = useState('')
  const [method, setMethod] = useState<string>('ALL')
  const [source, setSource] = useState<'ALL' | 'same-origin' | 'third-party'>('ALL')
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null)

  const methods = useMemo(() => {
    const set = new Set(endpoints.map(e => e.method.toUpperCase()))
    return ['ALL', ...Array.from(set).sort()]
  }, [endpoints])

  const filtered = useMemo(() => {
    return endpoints.filter(e => {
      const matchesMethod = method === 'ALL' || e.method.toUpperCase() === method
      const q = query.trim().toLowerCase()
      const matchesQuery = q === '' || e.url.toLowerCase().includes(q)
      const matchesSource = source === 'ALL' || (e.source || 'same-origin') === source
      return matchesMethod && matchesQuery && matchesSource
    })
  }, [endpoints, method, query])

  return (
    <div className="mt-8">
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Filter by path or domain"
          className="flex-1 px-3 py-2 rounded-lg border border-gray-700/50 bg-black/30 text-gray-200 placeholder-gray-500 focus:outline-none"
        />
        <select
          value={method}
          onChange={(e) => setMethod(e.target.value)}
          className="px-3 py-2 rounded-lg border border-gray-700/50 bg-black/30 text-gray-200 focus:outline-none"
        >
          {methods.map(m => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={source}
          onChange={(e) => setSource(e.target.value as any)}
          className="px-3 py-2 rounded-lg border border-gray-700/50 bg-black/30 text-gray-200 focus:outline-none"
        >
          <option value="ALL">ALL SOURCES</option>
          <option value="same-origin">SAME ORIGIN</option>
          <option value="third-party">THIRD PARTY</option>
        </select>
      </div>

      <div className="divide-y divide-gray-800 rounded-xl border border-gray-800 overflow-hidden">
        {filtered.length === 0 && (
          <div className="p-4 text-gray-500">No endpoints match your filters.</div>
        )}

        {filtered.map((e, idx) => (
          <div key={`${e.method}-${e.url}-${idx}`} className="p-4 flex items-start gap-3 hover:bg-gray-900/40">
            <span
              className="px-2 py-1 text-xs font-bold rounded-md shrink-0"
              style={{ backgroundColor: METHOD_COLORS[e.method.toUpperCase()] || '#6b7280', color: 'black' }}
            >
              {e.method.toUpperCase()}
            </span>
            <div className="min-w-0 flex-1">
              <div className="text-gray-200 truncate" title={e.url}>{e.url}</div>
              <div className="text-xs text-gray-500 mt-1">{e.status} • {formatBytes(e.size)}{e.source ? ` • ${e.source}` : ''}</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(`${e.method.toUpperCase()} ${e.url}`)
                    setCopiedIndex(idx)
                    setTimeout(() => setCopiedIndex(null), 1500)
                  } catch {}
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"
              >
                <Copy className="w-4 h-4" /> {copiedIndex === idx ? 'Copied' : 'Copy'}
              </button>
              <button
                onClick={async () => {
                  const curl = `curl -X ${e.method.toUpperCase()} '${e.url}' -H 'Accept: application/json'`
                  try { await navigator.clipboard.writeText(curl) } catch {}
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"
                title="Copy cURL"
              >
                cURL
              </button>
              <button
                onClick={async () => {
                  const ts = `import fetch from 'node-fetch'\n\nasync function main() {\n  const res = await fetch('${e.url}', { method: '${e.method.toUpperCase()}', headers: { 'Accept': 'application/json' } })\n  console.log(await res.text())\n}\n\nmain().catch(console.error)`
                  try { await navigator.clipboard.writeText(ts) } catch {}
                }}
                className="inline-flex items-center gap-1 text-xs text-gray-300 hover:text-white"
                title="Copy TS fetch"
              >
                TS
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}



