import logging
import numpy as np
from typing import List, Dict, Any

from app.ai.embeddings import get_embedding_model
from app.ai.vector_store import LocalVectorStore

logger = logging.getLogger("codeatlas.ai.retriever")


class LocalRetriever:
    """
    Retrieves the most relevant code contexts and metadata from the project's
    local FAISS index using cosine similarity.
    """

def _determine_query_intent(query: str) -> str:
    q = query.lower()
    # Check Deployment keywords
    if any(kw in q for kw in ["docker", "deploy", "kubernetes", "ci/cd", "cd", "action", "workflow", "compose", "infra", "yml", "yaml", "config"]):
        return "deployment"
    # Check Framework keywords
    if any(kw in q for kw in ["framework", "library", "libraries", "package", "dependency", "dependencies", "version", "import"]):
        return "framework"
    # Check Overview keywords
    if any(kw in q for kw in ["explain", "overview", "what is", "about", "structure", "architecture", "project", "summary"]):
        return "overview"
    # Default is implementation
    return "implementation"


def _get_rank_weight(classification: str, intent: str) -> int:
    # Priority orders (lower index = higher priority)
    if intent == "overview":
        order = ["Documentation", "Generated Metadata", "Architecture Report", "Source Code", "Manifest", "Configuration"]
    elif intent == "framework":
        order = ["Manifest", "Configuration", "Source Code", "Architecture Report", "Documentation", "Generated Metadata"]
    elif intent == "deployment":
        order = ["Configuration", "Manifest", "Source Code", "Architecture Report", "Documentation", "Generated Metadata"]
    else:  # implementation
        order = ["Source Code", "Architecture Report", "Manifest", "Configuration", "Documentation", "Generated Metadata"]

    if classification in order:
        return order.index(classification)
    return len(order)


class LocalRetriever:
    """
    Retrieves the most relevant code contexts and metadata from the project's
    local FAISS index using cosine similarity.
    """

    def retrieve(self, project_id: str, query: str, top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Embeds the query, searches the project's FAISS index, and returns matching
        documents enriched with cosine similarity scores.

        Args:
            project_id (str): The project's unique identifier.
            query (str): The search query.
            top_k (int): Number of top results to retrieve. Default is 5.

        Returns:
            List[Dict[str, Any]]: List of retrieved documents with keys:
                - "type": "project_overview" or "file_context"
                - "file_path": str path to file
                - "content": str text chunk
                - "score": float cosine similarity score
                - "classification": str classification type
                - "symbols": list of tree-sitter symbols
        """
        logger.info(f"Retrieving top-{top_k} documents for query in project {project_id}")

        try:
            # Load the FAISS index and documents list
            index, documents = LocalVectorStore.load_index(project_id)
        except FileNotFoundError as e:
            logger.error(f"Cannot perform retrieval: {e}")
            return []
        except Exception as e:
            logger.exception(f"Unexpected error loading FAISS index: {e}")
            return []

        if index.ntotal == 0:
            logger.warning(f"FAISS index is empty for project: {project_id}")
            return []

        try:
            # 1. Embed query
            model = get_embedding_model()
            # Returns L2-normalized 1D array
            query_emb = model.get_embedding(query)

            # 2. Reshape for FAISS search (requires 2D float32 array)
            query_emb_np = np.array([query_emb], dtype=np.float32)

            # Request a larger pool of candidates to allow room for deduplication and filtering
            search_k = min(max(top_k * 4, 20), index.ntotal)

            # 3. Perform inner product (IP) search.
            scores, indices = index.search(query_emb_np, search_k)

            # 4. Map results back to documents. Keep at most two contexts per file
            # so a structured symbol record and one relevant source excerpt can coexist.
            retrieved_docs = []
            path_counts: Dict[str, int] = {}
            for score, doc_idx in zip(scores[0], indices[0]):
                if doc_idx < 0 or doc_idx >= len(documents):
                    continue

                doc = documents[doc_idx]
                path = doc.get("file_path", "unknown")
                if path_counts.get(path, 0) >= 2:
                    continue
                path_counts[path] = path_counts.get(path, 0) + 1

                retrieved_docs.append({
                    "type": doc.get("type"),
                    "file_path": path,
                    "content": doc.get("content"),
                    "score": float(score),
                    "classification": doc.get("classification", "Source Code"),
                    "symbols": doc.get("symbols", []),
                    "line_start": doc.get("line_start"),
                    "line_end": doc.get("line_end"),
                    "chunk_index": doc.get("chunk_index"),
                })

            # 5. Filter by similarity score (Retrieval Verification)
            from app.config import MIN_SIMILARITY_SCORE
            verified_docs = [doc for doc in retrieved_docs if doc["score"] >= MIN_SIMILARITY_SCORE]

            # 6. Graceful fallback if too few documents pass threshold
            if len(verified_docs) < 2 and len(retrieved_docs) > 0:
                retrieved_docs.sort(key=lambda d: d["score"], reverse=True)
                verified_docs = retrieved_docs[:min(2, len(retrieved_docs))]

            # 7. Query-aware ranking
            intent = _determine_query_intent(query)
            verified_docs.sort(key=lambda d: _get_rank_weight(d.get("classification", "Source Code"), intent))

            # 8. Capping at top_k
            final_docs = verified_docs[:top_k]

            logger.info(f"Retrieved {len(final_docs)} documents after deduplication and filtering (Intent: {intent}).")
            return final_docs

        except Exception as e:
            logger.exception(f"Failed to execute retrieval query: {e}")
            return []
