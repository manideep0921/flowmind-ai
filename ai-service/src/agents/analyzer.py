# src/agents/analyzer.py
import json
import os
from openai import AsyncOpenAI
from src.models import AnalyzeRequest, AnalyzeResponse, Fix, BusinessImpact, FailureCategory, Severity
from src.embeddings.store import EmbeddingStore

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM_PROMPT = """You are FlowMind AI, an expert at analyzing workflow automation failures.
You analyze logs, API responses, and error messages to identify root causes and suggest fixes.

When analyzing a failure, you MUST respond with a JSON object (no markdown, just raw JSON) matching this exact schema:
{
  "root_cause": "Brief technical root cause (1-2 sentences)",
  "explanation": "Plain English explanation for a business user (2-3 sentences, no jargon)",
  "technical_details": "Detailed technical information including HTTP codes, stack traces, etc",
  "confidence_score": 0.85,
  "severity": "CRITICAL|HIGH|MEDIUM|LOW",
  "category": "AUTH_ERROR|RATE_LIMIT|SCHEMA_CHANGE|NETWORK_ERROR|TIMEOUT|DATA_VALIDATION|CONFIGURATION|THIRD_PARTY_OUTAGE|UNKNOWN",
  "suggested_fixes": [
    {
      "priority": 1,
      "title": "Fix title",
      "description": "What to do",
      "automated": true
    }
  ],
  "business_impact": {
    "type": "leads_lost|revenue_impact|data_loss|operational_delay",
    "description": "Business impact description",
    "count": 43,
    "estimatedRevenueLoss": 4300
  }
}

Classification guidelines:
- AUTH_ERROR: 401, 403, expired tokens, invalid credentials
- RATE_LIMIT: 429, throttling, quota exceeded  
- SCHEMA_CHANGE: missing fields, unexpected response format, type errors
- NETWORK_ERROR: connection refused, DNS failure, ECONNRESET
- TIMEOUT: ETIMEDOUT, response timeout, gateway timeout
- DATA_VALIDATION: missing required fields, invalid data format
- CONFIGURATION: wrong endpoint, misconfigured settings
- THIRD_PARTY_OUTAGE: service unavailable, 503 errors
- UNKNOWN: cannot determine

For business_impact, estimate based on workflow type. Use null if cannot determine.
Always provide at least 2 suggested fixes, prioritized by ease of implementation.
"""

async def analyze_failure(req: AnalyzeRequest, store: EmbeddingStore) -> AnalyzeResponse:
    """Use GPT-4o to analyze a workflow failure."""
    
    # Find similar past failures for context
    similar_failures = []
    if req.errorMessage or req.rawLogs:
        query = f"{req.errorMessage or ''} {req.workflowSource} {req.workflowName}"
        similar = await store.search_similar_failures(query, k=3)
        similar_failures = [s["id"] for s in similar if s.get("id")]

    # Build the analysis prompt
    context_parts = [
        f"Workflow: {req.workflowName}",
        f"Source: {req.workflowSource}",
        f"Status: {req.status}",
    ]
    
    if req.errorMessage:
        context_parts.append(f"Error: {req.errorMessage}")
    
    if req.rawLogs:
        # Truncate logs to avoid token limits
        logs_str = req.rawLogs[:3000] if len(req.rawLogs) > 3000 else req.rawLogs
        context_parts.append(f"Logs: {logs_str}")
    
    if req.steps:
        failed_steps = [s for s in req.steps if s.status == "FAILED"]
        if failed_steps:
            context_parts.append(f"Failed steps: {json.dumps([s.model_dump() for s in failed_steps], default=str)}")
    
    if req.outputData:
        output_str = json.dumps(req.outputData)[:1000]
        context_parts.append(f"Output data: {output_str}")

    user_message = "\n".join(context_parts)

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": f"Analyze this workflow failure:\n\n{user_message}"},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=1500,
    )

    result = json.loads(response.choices[0].message.content)

    # Store this failure for future similarity search
    await store.store_failure(
        failure_id=req.executionId,
        text=f"{req.errorMessage or ''} {req.workflowSource} {result.get('category', '')} {result.get('root_cause', '')}",
        metadata={
            "id": req.executionId,
            "category": result.get("category"),
            "workflow": req.workflowName,
            "source": req.workflowSource,
        }
    )

    # Parse fixes
    fixes = [Fix(**f) for f in result.get("suggested_fixes", [])]

    # Parse business impact
    business_impact = None
    if result.get("business_impact"):
        try:
            business_impact = BusinessImpact(**result["business_impact"])
        except Exception:
            pass

    return AnalyzeResponse(
        root_cause=result.get("root_cause", "Unknown root cause"),
        explanation=result.get("explanation", "Analysis unavailable"),
        technical_details=result.get("technical_details", ""),
        confidence_score=float(result.get("confidence_score", 0.5)),
        severity=Severity(result.get("severity", "MEDIUM")),
        category=FailureCategory(result.get("category", "UNKNOWN")),
        suggested_fixes=fixes,
        business_impact=business_impact,
        similar_failures=similar_failures if similar_failures else None,
    )
