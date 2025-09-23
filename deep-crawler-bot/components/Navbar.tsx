'use client'

import { ExternalLink, Github, BookOpen } from 'lucide-react'

export default function Navbar() {
  return (
    <nav className="bg-black/95 backdrop-blur-sm  border-gray-800 sticky top-0 z-40">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <div className="flex items-center space-x-3">
            <img src="/hb.svg" alt="Hyperbrowser" className="w-36 h-36  " />
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex items-center space-x-6">
            <a
              href="https://docs.hyperbrowser.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 transition-colors font-medium tracking-tight4"
            >
              <BookOpen className="w-4 h-4" />
              <span>Docs</span>
            </a>
            <a
              href="https://github.com/hyperbrowserai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 text-gray-400 hover:text-gray-200 transition-colors font-medium tracking-tight4"
            >
              <Github className="w-4 h-4" />
              <span>GitHub</span>
            </a>
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors tracking-tight4 font-medium"
              style={{
                background: 'linear-gradient(135deg, #F0FF26 0%, #E0EF16 100%)',
                color: '#000000'
              }}
            >
              <span>Get API Key</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <a
              href="https://hyperbrowser.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-2 rounded-lg text-sm transition-colors tracking-tight4 font-medium"
              style={{
                background: 'linear-gradient(135deg, #F0FF26 0%, #E0EF16 100%)',
                color: '#000000'
              }}
            >
              Get API Key
            </a>
          </div>
        </div>
      </div>
    </nav>
  )
} 