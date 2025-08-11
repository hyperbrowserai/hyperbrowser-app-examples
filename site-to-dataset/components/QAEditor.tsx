'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Edit2, Trash2, Check, X, Filter, Search, Download } from 'lucide-react';
import { QAPair } from '@/lib/qa';

interface QAEditorProps {
  qaPairs: QAPair[];
  onQAPairsChange: (pairs: QAPair[]) => void;
  onExport: (pairs: QAPair[]) => void;
}

interface ExtendedQAPair extends QAPair {
  id: string;
  quality_score?: number;
  is_edited?: boolean;
  is_selected?: boolean;
}

export default function QAEditor({ qaPairs, onQAPairsChange, onExport }: QAEditorProps) {
  const [pairs, setPairs] = useState<ExtendedQAPair[]>(() => 
    qaPairs.map((pair, index) => ({ 
      ...pair, 
      id: `pair-${index}`,
      quality_score: calculateQualityScore(pair),
      is_selected: true 
    }))
  );
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [qualityFilter, setQualityFilter] = useState<'all' | 'high' | 'medium' | 'low'>('all');

  // Calculate quality score based on various factors
  function calculateQualityScore(pair: QAPair): number {
    let score = 0;
    
    // Question quality checks
    if (pair.question.includes('?')) score += 20;
    if (pair.question.length >= 20 && pair.question.length <= 150) score += 15;
    if (/^(how|what|why|when|where|which|who)/i.test(pair.question)) score += 15;
    
    // Answer quality checks
    if (pair.answer.length >= 50 && pair.answer.length <= 500) score += 20;
    if (pair.answer.split('.').length >= 2) score += 10; // Multiple sentences
    if (!/\b(this|these|that|those|the above|mentioned)\b/i.test(pair.answer)) score += 10; // No references
    if (/\b(can|should|will|would|could)\b/i.test(pair.answer)) score += 5; // Actionable language
    
    // Bonus for specific patterns
    if (/\b(step|first|second|example|for instance)\b/i.test(pair.answer)) score += 5;
    
    return Math.min(100, score);
  }

  const getQualityLevel = (score: number): 'high' | 'medium' | 'low' => {
    if (score >= 80) return 'high';
    if (score >= 60) return 'medium';
    return 'low';
  };

  const getQualityColor = (score: number): string => {
    if (score >= 80) return 'text-green-600 bg-green-50 border-green-200';
    if (score >= 60) return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    return 'text-red-600 bg-red-50 border-red-200';
  };

  const filteredPairs = pairs.filter(pair => {
    const matchesSearch = searchTerm === '' || 
      pair.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
      pair.answer.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesQuality = qualityFilter === 'all' || 
      getQualityLevel(pair.quality_score || 0) === qualityFilter;
    
    return matchesSearch && matchesQuality;
  });

  const selectedCount = pairs.filter(p => p.is_selected).length;

  const handleEdit = (id: string, newQuestion: string, newAnswer: string) => {
    setPairs(prev => prev.map(pair => 
      pair.id === id 
        ? { 
            ...pair, 
            question: newQuestion, 
            answer: newAnswer, 
            is_edited: true,
            quality_score: calculateQualityScore({ 
              question: newQuestion, 
              answer: newAnswer, 
              source_url: pair.source_url 
            })
          }
        : pair
    ));
    setEditingId(null);
  };

  const handleDelete = (id: string) => {
    setPairs(prev => prev.filter(pair => pair.id !== id));
  };

  const handleToggleSelect = (id: string) => {
    setPairs(prev => prev.map(pair => 
      pair.id === id ? { ...pair, is_selected: !pair.is_selected } : pair
    ));
  };

  const handleExport = () => {
    const selectedPairs = pairs.filter(p => p.is_selected);
    const cleanPairs = selectedPairs.map(pair => {
      const { id, quality_score, is_edited, is_selected, ...cleanPair } = pair;
      return cleanPair;
    });
    onExport(cleanPairs);
  };

  return (
    <div className="space-y-6">
      {/* Header Stats */}
      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">{pairs.length}</div>
            <div className="text-sm text-gray-500">Total Q/A Pairs</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{selectedCount}</div>
            <div className="text-sm text-gray-500">Selected</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{Math.round(pairs.reduce((sum, p) => sum + (p.quality_score || 0), 0) / pairs.length)}</div>
            <div className="text-sm text-gray-500">Avg Quality</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {pairs.filter(p => p.is_edited).length}
            </div>
            <div className="text-sm text-gray-500">Edited</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white border border-gray-200 rounded-xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search questions or answers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black"
            />
          </div>
          
          {/* Quality Filter */}
          <select
            value={qualityFilter}
            onChange={(e) => setQualityFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black"
          >
            <option value="all">All Quality</option>
            <option value="high">High Quality (80+)</option>
            <option value="medium">Medium Quality (60-79)</option>
            <option value="low">Low Quality (&lt;60)</option>
          </select>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-3">
          <button
            onClick={handleExport}
            disabled={selectedCount === 0}
            className="px-4 py-2 text-sm bg-black text-white rounded-lg hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            <Download className="h-4 w-4" />
            <span>Export Selected ({selectedCount})</span>
          </button>
        </div>
      </div>

      {/* Q/A Pairs List */}
      <div className="space-y-4">
        {filteredPairs.map((pair, index) => (
          <QAPairItem
            key={pair.id}
            pair={pair}
            index={index}
            isEditing={editingId === pair.id}
            onEdit={() => setEditingId(pair.id)}
            onSave={handleEdit}
            onCancel={() => setEditingId(null)}
            onDelete={() => handleDelete(pair.id)}
            onToggleSelect={() => handleToggleSelect(pair.id)}
            getQualityColor={getQualityColor}
          />
        ))}
      </div>

      {filteredPairs.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <Filter className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>No Q/A pairs match your current filters.</p>
        </div>
      )}
    </div>
  );
}

interface QAPairItemProps {
  pair: ExtendedQAPair;
  index: number;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (id: string, question: string, answer: string) => void;
  onCancel: () => void;
  onDelete: () => void;
  onToggleSelect: () => void;
  getQualityColor: (score: number) => string;
}

function QAPairItem({ 
  pair, 
  index, 
  isEditing, 
  onEdit, 
  onSave, 
  onCancel, 
  onDelete, 
  onToggleSelect,
  getQualityColor 
}: QAPairItemProps) {
  const [editQuestion, setEditQuestion] = useState(pair.question);
  const [editAnswer, setEditAnswer] = useState(pair.answer);

  const handleSave = () => {
    if (editQuestion.trim() && editAnswer.trim()) {
      onSave(pair.id, editQuestion.trim(), editAnswer.trim());
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white border rounded-xl overflow-hidden transition-all ${
        pair.is_selected ? 'border-blue-200 shadow-sm' : 'border-gray-200'
      }`}
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-start space-x-3">
            <input
              type="checkbox"
              checked={pair.is_selected || false}
              onChange={onToggleSelect}
              className="mt-1 rounded"
            />
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-sm font-medium text-gray-500">#{index + 1}</span>
                <div className={`px-2 py-1 rounded-full text-xs font-medium border ${getQualityColor(pair.quality_score || 0)}`}>
                  Quality: {pair.quality_score || 0}/100
                </div>
                {pair.is_edited && (
                  <div className="px-2 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-600 border border-blue-200">
                    Edited
                  </div>
                )}
              </div>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {isEditing ? (
              <>
                <button
                  onClick={handleSave}
                  className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={onCancel}
                  className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={onEdit}
                  className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  <Edit2 className="h-4 w-4" />
                </button>
                <button
                  onClick={onDelete}
                  className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {/* Question */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Question</label>
            {isEditing ? (
              <textarea
                value={editQuestion}
                onChange={(e) => setEditQuestion(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-none"
                rows={2}
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{pair.question}</p>
            )}
          </div>

          {/* Answer */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Answer</label>
            {isEditing ? (
              <textarea
                value={editAnswer}
                onChange={(e) => setEditAnswer(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-black focus:border-black resize-none"
                rows={4}
              />
            ) : (
              <p className="text-gray-900 bg-gray-50 p-3 rounded-lg">{pair.answer}</p>
            )}
          </div>

          {/* Source URL */}
          <div className="text-xs text-gray-500">
            Source: <a href={pair.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{pair.source_url}</a>
          </div>
        </div>
      </div>
    </motion.div>
  );
}