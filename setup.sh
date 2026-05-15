#!/bin/bash
# FlowMind AI — First-time setup script
set -e

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║       FlowMind AI - Setup             ║"
echo "╚═══════════════════════════════════════╝"
echo ""

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js required. Install from https://nodejs.org"; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "❌ Docker required. Install from https://docker.com"; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3.11+ required."; exit 1; }

echo "✅ Prerequisites OK"
echo ""

# Copy env if missing
if [ ! -f .env ]; then
  cp .env.example .env
  echo "📋 Created .env from .env.example"
  echo "⚠️  Please set your OPENAI_API_KEY in .env before continuing"
  echo ""
fi

# Check OpenAI key
if grep -q "sk-your-openai-api-key-here" .env; then
  echo "⚠️  WARNING: You haven't set your OPENAI_API_KEY in .env"
  echo "   Edit .env and add your key, then run this script again."
  echo ""
fi

echo "🐳 Starting Docker services (Postgres, Redis, ChromaDB)..."
docker-compose up -d postgres redis chromadb
echo ""

echo "⏳ Waiting for Postgres to be ready..."
sleep 5

echo "📦 Installing backend dependencies..."
cd backend && npm install
echo ""

echo "🗄️  Running database migrations..."
npx prisma generate
npx prisma migrate dev --name init
echo ""

echo "🌱 Seeding demo data..."
npx ts-node prisma/seed.ts
cd ..
echo ""

echo "📦 Installing frontend dependencies..."
cd frontend && npm install && cd ..
echo ""

echo ""
echo "╔═══════════════════════════════════════╗"
echo "║       Setup Complete! 🎉              ║"
echo "╠═══════════════════════════════════════╣"
echo "║  Start services:                      ║"
echo "║  docker-compose up -d                 ║"
echo "║                                       ║"
echo "║  Dev mode (separate terminals):       ║"
echo "║  cd backend && npm run dev            ║"
echo "║  cd ai-service && uvicorn main:app    ║"
echo "║  cd frontend && npm run dev           ║"
echo "║                                       ║"
echo "║  URLs:                                ║"
echo "║  App:      http://localhost:3000      ║"
echo "║  API:      http://localhost:4000      ║"
echo "║  AI:       http://localhost:8000      ║"
echo "║                                       ║"
echo "║  Demo login:                          ║"
echo "║  demo@flowmind.ai / demo1234          ║"
echo "╚═══════════════════════════════════════╝"
echo ""
