# src/agents/chat.py
import os
import json
from openai import AsyncOpenAI
from src.models import ChatRequest, ChatResponse
from src.embeddings.store import EmbeddingStore

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

SYSTEM = """You are the FlowMind AI Copilot — an expert at debugging and fixing workflow automation issues.
You help DevOps and business teams understand why their automations fail and how to fix them.

You have access to:
- Historical failure patterns from their organization
- Knowledge of common API error codes and fixes
- Best practices for Zapier, Make, n8n, and custom API workflows

Be concise, practical, and explain technical concepts in plain English.
When you mention specific fixes, be actionable and step-by-step.
"""

async def chat_with_copilot(req: ChatRequest, store: EmbeddingStore) -> ChatResponse:
    # Search for relevant context
    similar = await store.search_similar_failures(req.message, k=3)
    sources = []
    
    context_msg = ""
    if similar:
        context_parts = []
        for s in similar:
            meta = s.get("metadata", {})
            doc = s.get("document", "")
            if doc:
                context_parts.append(f"- Past failure ({meta.get('category', 'unknown')}): {doc[:200]}")
                sources.append(meta.get("id", "unknown"))
        if context_parts:
            context_msg = "Relevant past failures from your organization:\n" + "\n".join(context_parts) + "\n\n"

    messages = [{"role": "system", "content": SYSTEM}]

    # Add history
    if req.history:
        for h in req.history[-10:]:  # last 10 messages
            messages.append({"role": h.role, "content": h.content})

    # Add context + user message
    full_message = context_msg + req.message
    if req.context:
        full_message = f"Context: {json.dumps(req.context, default=str)}\n\n{full_message}"

    messages.append({"role": "user", "content": full_message})

    response = await client.chat.completions.create(
        model="gpt-4o",
        messages=messages,
        temperature=0.3,
        max_tokens=800,
    )

    return ChatResponse(
        response=response.choices[0].message.content,
        sources=sources if sources else None,
    )
