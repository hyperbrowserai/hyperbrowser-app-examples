#!/bin/bash

set -e

echo "🔍 Verifying Sora Research Setup..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node -v)
    echo "✅ Node.js installed: $NODE_VERSION"
else
    echo "❌ Node.js not found. Install from https://nodejs.org"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm -v)
    echo "✅ npm installed: $NPM_VERSION"
else
    echo "❌ npm not found"
    exit 1
fi

# Check FFmpeg
if command -v ffmpeg &> /dev/null; then
    FFMPEG_VERSION=$(ffmpeg -version | head -n 1 | awk '{print $3}')
    echo "✅ FFmpeg installed: $FFMPEG_VERSION"
else
    echo "❌ FFmpeg not found. Install with:"
    echo "   macOS: brew install ffmpeg"
    echo "   Linux: sudo apt-get install ffmpeg"
    exit 1
fi

# Check dependencies
if [ -d "node_modules" ]; then
    echo "✅ Dependencies installed"
else
    echo "⚠️  Dependencies not installed. Run: npm install"
fi

# Check .env.local
if [ -f ".env.local" ]; then
    echo "✅ .env.local exists"
    
    if grep -q "HYPERBROWSER_API_KEY=hb_" .env.local 2>/dev/null; then
        echo "✅ HYPERBROWSER_API_KEY configured"
    else
        echo "⚠️  HYPERBROWSER_API_KEY not configured"
    fi
    
    if grep -q "OPENAI_API_KEY=sk-" .env.local 2>/dev/null; then
        echo "✅ OPENAI_API_KEY configured"
    else
        echo "⚠️  OPENAI_API_KEY not configured"
    fi
else
    echo "⚠️  .env.local not found. Copy .env.local.example and configure your API keys"
fi

# Check runs directory
if [ -d "public/runs" ]; then
    echo "✅ Runs directory exists"
else
    echo "⚠️  Creating runs directory..."
    mkdir -p public/runs
    touch public/runs/.gitkeep
    echo "✅ Runs directory created"
fi

# Check build
if [ -d ".next" ]; then
    echo "✅ Project previously built"
else
    echo "⚠️  Project not built yet. Run: npm run build"
fi

echo ""
echo "🚀 Setup verification complete!"
echo ""
echo "Next steps:"
echo "  1. Configure .env.local with your API keys"
echo "  2. Run: npm run dev"
echo "  3. Open: http://localhost:3000"
echo ""
echo "Get API keys:"
echo "  - Hyperbrowser: https://hyperbrowser.ai"
echo "  - OpenAI: https://platform.openai.com/api-keys"
