# src/agents/healer.py
import os
from openai import AsyncOpenAI
from src.models import HealRequest, HealResponse
import json

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

HEAL_SYSTEM = """You are an automation healing agent. Given a workflow failure, determine what automated actions can be taken.
Respond ONLY with JSON:
{
  "success": true,
  "log": "Summary of what was done or attempted",
  "actions": ["List of specific actions taken or recommended"]
}

For AUTH_ERROR: suggest token refresh steps
For RATE_LIMIT: suggest adding delays and retry logic
For TIMEOUT: suggest increasing timeout values
For NETWORK_ERROR: suggest retry with exponential backoff
Always be honest about what you can vs cannot automate.
"""

async def attempt_auto_heal(req: HealRequest) -> HealResponse:
    fixes_str = json.dumps([f if isinstance(f, dict) else f for f in req.suggestedFixes], default=str)
    
    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": HEAL_SYSTEM},
            {"role": "user", "content": f"Category: {req.category}\nRoot cause: {req.rootCause}\nAvailable fixes: {fixes_str}"},
        ],
        response_format={"type": "json_object"},
        temperature=0.1,
        max_tokens=500,
    )

    result = json.loads(response.choices[0].message.content)
    return HealResponse(
        success=result.get("success", False),
        log=result.get("log", "No actions taken"),
        actions=result.get("actions", []),
    )
