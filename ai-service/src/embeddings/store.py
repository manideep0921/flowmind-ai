# src/embeddings/store.py
import os
import chromadb
from chromadb.config import Settings
from openai import AsyncOpenAI
from typing import List, Dict, Any

client = AsyncOpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class EmbeddingStore:
    def __init__(self):
        self.chroma_client = None
        self.collection = None

    async def initialize(self):
        """Initialize ChromaDB connection."""
        host = os.getenv("CHROMA_HOST", "localhost")
        port = int(os.getenv("CHROMA_PORT", "8001"))
        
        try:
            self.chroma_client = chromadb.HttpClient(
                host=host,
                port=port,
                settings=Settings(anonymized_telemetry=False),
            )
            self.collection = self.chroma_client.get_or_create_collection(
                name="workflow_failures",
                metadata={"hnsw:space": "cosine"},
            )
            print(f"✅ ChromaDB connected at {host}:{port}")
        except Exception as e:
            print(f"⚠️  ChromaDB not available: {e}. Running without vector search.")
            self.chroma_client = None
            self.collection = None

    async def _get_embedding(self, text: str) -> List[float]:
        """Get embedding from OpenAI."""
        response = await client.embeddings.create(
            model="text-embedding-3-small",
            input=text[:8000],  # truncate to avoid token limits
        )
        return response.data[0].embedding

    async def store_failure(self, failure_id: str, text: str, metadata: Dict[str, Any]) -> None:
        """Store a failure in the vector database."""
        if not self.collection:
            return
        try:
            embedding = await self._get_embedding(text)
            self.collection.upsert(
                ids=[failure_id],
                embeddings=[embedding],
                documents=[text],
                metadatas=[metadata],
            )
        except Exception as e:
            print(f"Failed to store embedding: {e}")

    async def search_similar_failures(self, query: str, k: int = 5) -> List[Dict[str, Any]]:
        """Find similar past failures."""
        if not self.collection:
            return []
        try:
            embedding = await self._get_embedding(query)
            results = self.collection.query(
                query_embeddings=[embedding],
                n_results=min(k, self.collection.count()),
                include=["documents", "metadatas", "distances"],
            )
            
            similar = []
            for i in range(len(results["ids"][0])):
                similar.append({
                    "id": results["ids"][0][i],
                    "document": results["documents"][0][i],
                    "metadata": results["metadatas"][0][i],
                    "distance": results["distances"][0][i],
                })
            return similar
        except Exception as e:
            print(f"Similarity search failed: {e}")
            return []
