'use client';

import { AnalysisInsight } from '@/lib/types';

interface AnalysisPanelProps {
  insights: AnalysisInsight[];
  summary: string;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'high':
      return 'text-red-400';
    case 'low':
      return 'text-yellow-400';
    case 'critical':
      return 'text-red-500';
    default:
      return 'text-green-400';
  }
};

export default function AnalysisPanel({ insights, summary }: AnalysisPanelProps) {
  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800/60 p-6">
        <h3 className="text-xl font-semibold mb-4 text-heading">AI Analysis Summary</h3>
        <div className="prose prose-invert max-w-none">
          <p className="text-gray-300 leading-relaxed whitespace-pre-line">{summary}</p>
        </div>
      </div>

      {/* Individual Insights */}
      <div className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800/60">
        <div className="p-6 border-b border-gray-800/60">
          <h3 className="text-xl font-semibold text-heading">Detailed Insights</h3>
          <p className="text-gray-400 mt-1">AI-powered analysis with medical references</p>
        </div>
        <div className="p-6">
          {(() => {
            const order: Record<string, number> = { critical: 0, high: 1, low: 2, normal: 3 };
            const sorted = [...insights].sort((a, b) => (order[a.status] ?? 9) - (order[b.status] ?? 9));
            if (sorted.length === 0) {
              return (
                <div className="text-center text-gray-400 p-8">No analysis insights available</div>
              );
            }
            return (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sorted.map((insight, index) => (
                  <div key={index} className="bg-gray-900/40 backdrop-blur-sm rounded-lg border border-gray-800/60 p-4">
                    <div className="flex items-start justify-between mb-3">
                      <h4 className="font-semibold text-lg text-heading">{insight.test}</h4>
                      <span className={`text-xs px-2 py-1 rounded-full border ${getStatusColor(insight.status)} border-gray-700`}>
                        {insight.status.charAt(0).toUpperCase() + insight.status.slice(1)}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-1">Comparison</h5>
                        <p className="text-gray-300 text-heading">{insight.comparison}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-medium text-gray-400 mb-1">Analysis</h5>
                        <p className="text-gray-300 text-heading">{insight.message}</p>
                      </div>
                      {insight.recommendations && insight.recommendations.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-400 mb-2">Recommendations</h5>
                          <ul className="space-y-1">
                            {insight.recommendations.map((rec, recIndex) => (
                              <li key={recIndex} className="text-gray-300 text-sm flex items-start">
                                <span className="text-[#F0FF26] mr-2">•</span>
                                {rec}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {insight.sources.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium text-gray-400 mb-2">Sources</h5>
                          <div className="flex flex-wrap gap-2">
                            {insight.sources.map((source, sourceIndex) => (
                              <span key={sourceIndex} className="px-2 py-1 bg-gray-800 border border-gray-700 rounded text-xs text-gray-300">
                                {source}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

