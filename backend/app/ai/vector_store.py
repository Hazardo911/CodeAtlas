import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

import faiss
import numpy as np

from app.ai.context_builder import build_context_documents
from app.ai.embeddings import get_embedding_model
from app.config import WORKSPACE_DIR
from app.utils.helpers import create_directory, read_json

logger = logging.getLogger("codeatlas.ai.vector_store")


class LocalVectorStore:
    """Persist the structured-first, fully local FAISS project index."""

    @classmethod
    def build_index(cls, project_id: str) -> bool:
        cache_path = WORKSPACE_DIR / project_id / "cache"
        source_path = WORKSPACE_DIR / project_id / "source"
        embeddings_path = WORKSPACE_DIR / project_id / "embeddings"
        knowledge_file = cache_path / "knowledge.json"

        if not knowledge_file.exists():
            logger.error("Cannot build index: knowledge.json missing for project %s", project_id)
            return False

        try:
            knowledge = read_json(knowledge_file)
            documents = build_context_documents(project_id, knowledge, source_path)
            if not documents:
                logger.warning("No safe documents found to index for project %s", project_id)
                return False

            model = get_embedding_model()
            embeddings = model.get_embeddings([document["content"] for document in documents])
            index = faiss.IndexFlatIP(model.get_dimension())
            index.add(np.asarray(embeddings, dtype=np.float32))

            create_directory(embeddings_path)
            faiss.write_index(index, str(embeddings_path / "index.bin"))
            with open(embeddings_path / "documents.json", "w", encoding="utf-8") as file:
                json.dump(documents, file, indent=2, ensure_ascii=False)

            logger.info(
                "Built local project index with %s structured/source documents.",
                index.ntotal,
            )
            return True
        except Exception as error:
            logger.exception("Failed to build vector index for project %s: %s", project_id, error)
            return False

    @classmethod
    def load_index(cls, project_id: str) -> Tuple[Any, List[Dict[str, Any]]]:
        embeddings_path = WORKSPACE_DIR / project_id / "embeddings"
        index_file = embeddings_path / "index.bin"
        documents_file = embeddings_path / "documents.json"

        if not index_file.exists() or not documents_file.exists():
            raise FileNotFoundError(f"FAISS index files not found in workspace: {embeddings_path}")

        index = faiss.read_index(str(index_file))
        with open(documents_file, "r", encoding="utf-8") as file:
            documents = json.load(file)
        return index, documents
