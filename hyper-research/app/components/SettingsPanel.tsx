"use client";

import React, { useState } from 'react';
import { X } from 'lucide-react';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  hyperbrowserKey: string;
  openaiKey: string;
  anthropicKey: string;
  onSaveHyperbrowser: (key: string) => void;
  onSaveOpenai: (key: string) => void;
  onSaveAnthropic: (key: string) => void;
}

export function SettingsPanel({ 
  isOpen, 
  onClose, 
  hyperbrowserKey, 
  openaiKey,
  anthropicKey,
  onSaveHyperbrowser,
  onSaveOpenai,
  onSaveAnthropic
}: SettingsPanelProps) {
  const [inputHB, setInputHB] = useState(hyperbrowserKey);
  const [inputOAI, setInputOAI] = useState(openaiKey);
  const [inputAnthropic, setInputAnthropic] = useState(anthropicKey);

  const handleSave = () => {
    onSaveHyperbrowser(inputHB);
    onSaveOpenai(inputOAI);
    onSaveAnthropic(inputAnthropic);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md border border-gray-200 animate-fadeIn">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="font-bold text-xl tracking-tight">Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Hyperbrowser Key */}
          <div>
            <label className="text-sm font-bold mb-2 block text-gray-700">
              Hyperbrowser API Key <span className="text-black">*</span>
            </label>
            <input 
              type="password"
              value={inputHB}
              onChange={(e) => setInputHB(e.target.value)}
              placeholder="hb_..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-gray-50 hover:bg-white transition-colors"
            />
            <a 
              href="https://hyperbrowser.ai" 
              target="_blank" 
              className="text-xs text-gray-500 hover:text-black mt-2 inline-block font-medium hover:underline"
            >
              Get your API key →
            </a>
          </div>

          {/* Anthropic Key */}
          <div>
            <label className="text-sm font-bold mb-2 block text-gray-700">
              Anthropic API Key <span className="text-gray-400 text-xs ml-1 font-normal">(recommended for Claude)</span>
            </label>
            <input 
              type="password"
              value={inputAnthropic}
              onChange={(e) => setInputAnthropic(e.target.value)}
              placeholder="sk-ant-..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-gray-50 hover:bg-white transition-colors"
            />
            <a 
              href="https://console.anthropic.com/settings/keys" 
              target="_blank" 
              className="text-xs text-gray-500 hover:text-black mt-2 inline-block font-medium hover:underline"
            >
              Get your API key →
            </a>
          </div>

          {/* OpenAI Key */}
          <div>
            <label className="text-sm font-bold mb-2 block text-gray-700">
              OpenAI API Key <span className="text-gray-400 text-xs ml-1 font-normal">(optional)</span>
            </label>
            <input 
              type="password"
              value={inputOAI}
              onChange={(e) => setInputOAI(e.target.value)}
              placeholder="sk-..."
              className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-black focus:border-black bg-gray-50 hover:bg-white transition-colors"
            />
            <a 
              href="https://platform.openai.com/api-keys" 
              target="_blank" 
              className="text-xs text-gray-500 hover:text-black mt-2 inline-block font-medium hover:underline"
            >
              Get your API key →
            </a>
          </div>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3 justify-end bg-gray-50 rounded-b-2xl">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 text-sm border border-gray-300 rounded-xl hover:bg-white hover:border-gray-400 font-medium transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={handleSave}
            className="px-5 py-2.5 text-sm bg-black text-white rounded-xl hover:bg-gray-800 hover:shadow-lg font-semibold transition-all transform hover:scale-105 active:scale-95"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}
