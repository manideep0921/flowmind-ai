"""
FlowMind AI — AI Service
FastAPI app providing:
- Root cause analysis
- Auto-healing suggestions
- Predictive failure detection
- RAG-powered chatbot
"""
import os
from fastapi import FastAPI, HTTPException, Depends, Security
from fastapi.security.api_key import APIKeyHeader
from contextlib import asynccontextmanager
from dotenv import load_dotenv

load_dotenv()

from src.agents.analyzer import analyze_failure
from src.agents.healer import attempt_auto_heal
from src.agents.predictor import predict_failure_risk
from src.agents.chat import chat_with_copilot
from src.embeddings.store import EmbeddingStore
from src.models import (
    AnalyzeRequest, AnalyzeResponse,
    HealRequest, HealResponse,
    PredictRequest, PredictResponse,
    ChatRequest, ChatResponse,
)

# ── Embedding Store (singleton) ───────────────────────────────────────────
embedding_store = EmbeddingStore()

@asynccontextmanager
async def lifespan(app: FastAPI):
    await embedding_store.initialize()
    print("✅ FlowMind AI Service started")
    yield
    print("Shutting down AI service...")

app = FastAPI(
    title="FlowMind AI Service",
    version="1.0.0",
    description="AI-powered workflow failure intelligence",
    lifespan=lifespan,
)

# ── Auth ──────────────────────────────────────────────────────────────────
API_KEY_HEADER = APIKeyHeader(name="x-api-key", auto_error=False)
EXPECTED_KEY = os.getenv("AI_SERVICE_API_KEY", "internal-ai-service-secret")

def verify_api_key(api_key: str = Security(API_KEY_HEADER)):
    if api_key != EXPECTED_KEY:
        raise HTTPException(status_code=401, detail="Invalid API key")
    return api_key

# ── Endpoints ─────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "flowmind-ai"}

@app.post("/analyze", response_model=AnalyzeResponse)
async def analyze(req: AnalyzeRequest, _: str = Depends(verify_api_key)):
    """Analyze a workflow execution failure using AI."""
    result = await analyze_failure(req, embedding_store)
    return result

@app.post("/auto-heal", response_model=HealResponse)
async def auto_heal(req: HealRequest, _: str = Depends(verify_api_key)):
    """Attempt to auto-heal a workflow failure."""
    result = await attempt_auto_heal(req)
    return result

@app.post("/predict", response_model=PredictResponse)
async def predict(req: PredictRequest, _: str = Depends(verify_api_key)):
    """Predict failure risk for a workflow based on historical data."""
    result = await predict_failure_risk(req)
    return result

@app.post("/chat", response_model=ChatResponse)
async def chat(req: ChatRequest, _: str = Depends(verify_api_key)):
    """AI copilot chat for workflow debugging."""
    result = await chat_with_copilot(req, embedding_store)
    return result
