# src/agents/predictor.py
import os
import json
from collections import Counter
from datetime import datetime
from openai import AsyncOpenAI
from src.models import PredictRequest, PredictResponse, RiskFactor

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

async def predict_failure_risk(req: PredictRequest) -> PredictResponse:
    executions = req.executions
    if not executions:
        return PredictResponse(
            risk_score=0.0, risk_level="LOW",
            explanation="No execution history available.",
            factors=[]
        )

    total = len(executions)
    failed = sum(1 for e in executions if e.status == "FAILED")
    failure_rate = failed / total if total > 0 else 0

    # Analyze recent trend (last 10)
    recent = executions[:10]
    recent_failed = sum(1 for e in recent if e.status == "FAILED")
    recent_rate = recent_failed / len(recent) if recent else 0

    # Category distribution
    categories = [e.category for e in executions if e.category]
    category_counts = Counter(categories)

    # Duration trend
    durations = [e.durationMs for e in executions if e.durationMs]
    avg_duration = sum(durations) / len(durations) if durations else 0

    prompt = f"""Analyze workflow failure risk based on this data:
- Total executions: {total}
- Overall failure rate: {failure_rate:.1%}
- Recent failure rate (last 10): {recent_rate:.1%}
- Common failure categories: {dict(category_counts)}
- Average duration ms: {avg_duration:.0f}

Respond ONLY with JSON:
{{
  "risk_score": 0.65,
  "risk_level": "MEDIUM",
  "explanation": "Plain English explanation of the risk",
  "factors": [
    {{"factor": "Factor name", "impact": 0.3, "description": "Why this matters"}}
  ],
  "predicted_failure_window": "Next 2-4 hours" or null
}}
risk_level: LOW (<0.3), MEDIUM (0.3-0.6), HIGH (0.6-0.8), CRITICAL (>0.8)
"""

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=600,
    )

    result = json.loads(response.choices[0].message.content)
    factors = [RiskFactor(**f) for f in result.get("factors", [])]

    return PredictResponse(
        risk_score=float(result.get("risk_score", failure_rate)),
        risk_level=result.get("risk_level", "MEDIUM"),
        explanation=result.get("explanation", ""),
        factors=factors,
        predicted_failure_window=result.get("predicted_failure_window"),
    )
