"use client";

import React from 'react';
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, Legend } from 'recharts';
import { SourceScore } from '../types';

interface ScoresSidebarProps {
  scores: SourceScore[];
}

export function ScoresSidebar({ scores }: ScoresSidebarProps) {
  if (!scores || scores.length === 0) return null;

  // Prepare radar chart data
  const radarData = [
    { dimension: 'Price', ...Object.fromEntries(scores.map(s => [s.name, s.scores.pricing || 0])) },
    { dimension: 'Features', ...Object.fromEntries(scores.map(s => [s.name, s.scores.features || 0])) },
    { dimension: 'Ease', ...Object.fromEntries(scores.map(s => [s.name, s.scores.ease_of_use || 0])) },
    { dimension: 'Speed', ...Object.fromEntries(scores.map(s => [s.name, s.scores.performance || 0])) },
    { dimension: 'Support', ...Object.fromEntries(scores.map(s => [s.name, s.scores.support || 0])) },
  ];

  // Colors for different sources (black, gray shades)
  const colors = ['#000000', '#666666', '#999999', '#CCCCCC'];

  // Sort by overall score
  const sortedScores = [...scores].sort((a, b) => (b.overall || 0) - (a.overall || 0));

  return (
    <div className="w-80 border-l border-gray-200 bg-white flex flex-col shrink-0 overflow-auto shadow-sm">
      {/* Radar Chart */}
      <div className="p-6 border-b border-gray-100">
        <h3 className="text-xs font-bold mb-4 uppercase tracking-wider text-gray-700">Comparison</h3>
        <div className="h-64 bg-gray-50 rounded-xl p-2">
          <ResponsiveContainer width="100%" height="100%">
            <RadarChart data={radarData}>
              <PolarGrid stroke="#e5e5e5" />
              <PolarAngleAxis 
                dataKey="dimension" 
                tick={{ fontSize: 10, fill: '#666' }}
              />
              {scores.map((source, idx) => (
                <Radar
                  key={source.name}
                  name={source.name}
                  dataKey={source.name}
                  stroke={colors[idx]}
                  fill={colors[idx]}
                  fillOpacity={idx === 0 ? 0.3 : 0.1}
                  strokeWidth={2}
                />
              ))}
              <Legend 
                wrapperStyle={{ fontSize: '10px' }}
                iconType="line"
              />
            </RadarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Overall Scores */}
      <div className="p-6 space-y-5">
        <h3 className="text-xs font-bold uppercase tracking-wider text-gray-700">Overall Scores</h3>
        
        {sortedScores.map((source, idx) => (
          <div key={source.name} className="space-y-3 p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
            <div className="flex items-baseline justify-between">
              <span className="text-sm font-bold truncate pr-2">{source.name}</span>
              <span className="text-sm font-bold">{source.overall?.toFixed(1) || 'N/A'}/10</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden shadow-inner">
              <div 
                className="h-full bg-black transition-all duration-500 rounded-full"
                style={{ width: `${(source.overall || 0) * 10}%` }}
              />
            </div>

            {/* Category breakdown */}
            <div className="space-y-2 pt-2">
              {[
                { label: 'Price', key: 'pricing' },
                { label: 'Features', key: 'features' },
                { label: 'Ease', key: 'ease_of_use' },
                { label: 'Speed', key: 'performance' },
                { label: 'Support', key: 'support' },
              ].map(({ label, key }) => {
                const score = (source.scores as any)[key];
                if (!score) return null;
                return (
                  <div key={key} className="flex items-center justify-between text-xs">
                    <span className="text-gray-600 font-medium">{label}</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1 bg-gray-200 rounded-full overflow-hidden shadow-inner">
                        <div 
                          className="h-full bg-gray-600 transition-all duration-500 rounded-full"
                          style={{ width: `${score * 10}%` }}
                        />
                      </div>
                      <span className="text-gray-700 w-7 text-right font-semibold">{score.toFixed(1)}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {idx < sortedScores.length - 1 && (
              <div className="pt-4" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}


