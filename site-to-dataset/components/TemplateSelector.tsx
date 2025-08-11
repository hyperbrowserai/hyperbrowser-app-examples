'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { getTemplateNames, QATemplate } from '@/lib/templates';

interface TemplateSelectorProps {
  selectedTemplate: string;
  onTemplateChange: (templateId: string) => void;
  disabled?: boolean;
}

export default function TemplateSelector({ 
  selectedTemplate, 
  onTemplateChange, 
  disabled = false 
}: TemplateSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const templates = getTemplateNames();
  const selected = templates.find(t => t.id === selectedTemplate);

  return (
    <div className="relative">
      <label className="block text-sm font-medium text-gray-700 mb-2">
        Q/A Template Type
      </label>
      
      {/* Dropdown Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`relative w-full bg-white border border-gray-300 rounded-xl px-4 py-3 text-left shadow-sm focus:outline-none focus:ring-2 focus:ring-black focus:border-black transition-all ${
          disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-gray-400 cursor-pointer'
        }`}
      >
        <span className="flex items-center">
          <span className="text-xl mr-3">{selected?.icon}</span>
          <span className="block truncate">
            <span className="font-medium">{selected?.name}</span>
            <span className="text-sm text-gray-500 block">{selected?.description}</span>
          </span>
        </span>
        <span className="absolute inset-y-0 right-0 flex items-center pr-4 pointer-events-none">
          <ChevronDown 
            className={`h-5 w-5 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} 
          />
        </span>
      </button>

      {/* Dropdown Options */}
      {isOpen && !disabled && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="absolute z-10 mt-2 w-full bg-white shadow-lg max-h-80 rounded-xl border border-gray-200 overflow-auto"
        >
          <div className="py-2">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                className={`relative w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                  selectedTemplate === template.id ? 'bg-gray-50' : ''
                }`}
                onClick={() => {
                  onTemplateChange(template.id);
                  setIsOpen(false);
                }}
              >
                <div className="flex items-center">
                  <span className="text-xl mr-3">{template.icon}</span>
                  <div className="flex-1">
                    <span className="font-medium text-gray-900 block">{template.name}</span>
                    <span className="text-sm text-gray-500">{template.description}</span>
                  </div>
                  {selectedTemplate === template.id && (
                    <Check className="h-5 w-5 text-green-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </motion.div>
      )}
      
      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}
