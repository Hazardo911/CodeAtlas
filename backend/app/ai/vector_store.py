import logging
import json
import faiss
import numpy as np
from pathlib import Path
from typing import List, Dict, Tuple, Any

from app.config import WORKSPACE_DIR
from app.ai.embeddings import get_embedding_model
from app.utils.helpers import read_json, create_directory

logger = logging.getLogger("codeatlas.ai.vector_store")


class LocalVectorStore:
    """
    Manages building, saving, loading, and searching the local FAISS vector store
    for project files and metadata.
    """

    @classmethod
    def build_index(cls, project_id: str) -> bool:
        """
        Loads knowledge.json, reads source files, splits into documents,
        generates embeddings, and writes the FAISS index + document registry.

        Args:
            project_id (str): UUID of the project.

        Returns:
            bool: True if successful, False otherwise.
        """
        logger.info(f"Building vector index for project: {project_id}")

        cache_path = WORKSPACE_DIR / project_id / "cache"
        source_path = WORKSPACE_DIR / project_id / "source"
        embeddings_path = WORKSPACE_DIR / project_id / "embeddings"

        knowledge_file = cache_path / "knowledge.json"
        if not knowledge_file.exists():
            logger.error(f"Cannot build index: knowledge.json missing for project {project_id}")
            return False

        try:
            knowledge = read_json(knowledge_file)
            documents = cls._split_knowledge_into_documents(project_id, knowledge, source_path)

            if not documents:
                logger.warning(f"No documents found to index for project {project_id}")
                return False

            # Extract document texts for embedding
            texts = [doc["content"] for doc in documents]

            # Generate embeddings using the local model
            model = get_embedding_model()
            embeddings = model.get_embeddings(texts)  # Returns L2-normalized numpy array

            # Initialize FAISS IndexFlatIP (Inner Product) for cosine similarity
            dimension = model.get_dimension()
            index = faiss.IndexFlatIP(dimension)

            # Add embeddings to the index
            # FAISS expects float32 numpy arrays
            embeddings_f32 = np.array(embeddings, dtype=np.float32)
            index.add(embeddings_f32)

            # Save FAISS index and documents metadata
            create_directory(embeddings_path)
            faiss.write_index(index, str(embeddings_path / "index.bin"))

            # Save matching document texts/metadata
            with open(embeddings_path / "documents.json", "w", encoding="utf-8") as f:
                json.dump(documents, f, indent=4, ensure_ascii=False)

            logger.info(f"Successfully built and saved FAISS index with {index.ntotal} documents.")
            return True

        except Exception as e:
            logger.exception(f"Failed to build vector index for project {project_id}: {e}")
            return False

    @classmethod
    def _classify_document(cls, file_path: str, language: str) -> str:
        """
        Classifies a document based on its file path and extension.
        """
        path = Path(file_path)
        name_lower = path.name.lower()
        ext_lower = path.suffix.lower()

        if name_lower in ["project_summary.json", "knowledge.json", "health.json", "scan_result.json"]:
            return "Generated Metadata"
        elif name_lower in ["architecture.json", "architecture_report.json"]:
            return "Architecture Report"
        elif name_lower in ["readme.md", "readme", "changelog.md", "contributing.md"] or "docs/" in file_path.replace("\\", "/").lower():
            return "Documentation"
        elif name_lower in ["requirements.txt", "package.json", "pubspec.yaml", "pom.xml", "build.gradle", "go.mod", "cargo.toml", "composer.json", "pyproject.toml", "pipfile"]:
            return "Manifest"
        elif name_lower in ["dockerfile", "docker-compose.yml", "docker-compose.yaml", "tsconfig.json", "tailwind.config.js", "vite.config.ts", "vite.config.js", "webpack.config.js"]:
            return "Configuration"
        elif ext_lower in [".py", ".js", ".ts", ".tsx", ".jsx", ".java", ".go", ".rs", ".dart", ".cs", ".php", ".rb", ".cpp", ".c", ".h", ".hpp", ".swift", ".kt"]:
            return "Source Code"
        else:
            if language and language != "Unknown" and language != "JSON" and language != "Markdown" and language != "YAML" and language != "HTML" and language != "CSS":
                return "Source Code"
            return "Documentation"

    @classmethod
    def _split_knowledge_into_documents(cls, project_id: str, knowledge: Dict[str, Any], source_path: Path) -> List[Dict[str, Any]]:
        """
        Parses knowledge database structure into a list of documents.

        Args:
            project_id (str): UUID of the project.
            knowledge (Dict): The loaded knowledge database structure.
            source_path (Path): Path to source files.

        Returns:
            List[Dict]: List of document dictionaries containing 'metadata' and 'content'.
        """
        documents: List[Dict[str, Any]] = []

        metadata = knowledge.get("metadata", {})
        statistics = knowledge.get("statistics", {})
        architecture = knowledge.get("architecture", {})

        # 1. Create Project Overview Document
        overview_content = (
            f"Project Overview for: {metadata.get('project_name', 'Unnamed Project')}\n"
            f"Project ID: {project_id}\n"
            f"Statistics: {statistics.get('total_files', 0)} files, "
            f"{statistics.get('total_directories', 0)} directories, "
            f"{statistics.get('total_size', 0)} bytes total size.\n"
            f"Detected Frameworks: {', '.join(architecture.get('frameworks', []))}\n"
            f"Architecture Layers:\n"
            f"- Backend Layer: {architecture.get('backend', False)}\n"
            f"- Frontend Layer: {architecture.get('frontend', False)}\n"
            f"- Database Layer: {architecture.get('database', False)}\n"
            f"- API Layer: {architecture.get('api', False)}\n"
            f"- AI/RAG Components: {architecture.get('ai', False)}\n"
            f"- Docker Deployment: {architecture.get('docker', False)}\n"
            f"- GitHub Actions CI/CD: {architecture.get('github_actions', False)}\n"
        )
        documents.append({
            "type": "project_overview",
            "file_path": "project_summary.json",
            "content": overview_content,
            "classification": "Generated Metadata"
        })

        # 2. Create File Context Documents
        from app.utils.helpers import should_ignore_dir
        files = [f for f in knowledge.get("files", []) if not should_ignore_dir(Path(f.get("path", "")))]
        for file_info in files:
            rel_path = file_info.get("path")
            full_path = source_path / rel_path

            # Read actual source code (capped to prevent OOM/large context crashes)
            source_code = ""
            if full_path.exists() and full_path.is_file():
                try:
                    # Cap code reading at 50,000 characters
                    source_code = full_path.read_text(encoding="utf-8", errors="ignore")[:50000]
                except Exception as e:
                    logger.warning(f"Could not read source code for {rel_path}: {e}")

            symbols_list = file_info.get("symbols", [])
            symbols_str = ""
            if symbols_list:
                symbols_str = "Symbols defined in this file:\n"
                for sym in symbols_list:
                    symbols_str += f"- {sym.get('type')} '{sym.get('name')}' (Lines {sym.get('start_line')}-{sym.get('end_line')})\n"

            file_content = (
                f"File Path: {rel_path}\n"
                f"File Name: {file_info.get('name')}\n"
                f"Language: {file_info.get('language')}\n"
                f"Size: {file_info.get('size')} bytes\n"
            )

            if symbols_str:
                file_content += f"{symbols_str}\n"

            if source_code:
                file_content += f"Source Code:\n{source_code}\n"

            documents.append({
                "type": "file_context",
                "file_path": rel_path,
                "content": file_content,
                "classification": cls._classify_document(rel_path, file_info.get("language", "")),
                "symbols": symbols_list
            })

        logger.debug(f"Split project into {len(documents)} documents.")
        return documents

    @classmethod
    def load_index(cls, project_id: str) -> Tuple[Any, List[Dict[str, Any]]]:
        """
        Loads the FAISS index and documents metadata from disk.

        Args:
            project_id (str): UUID of the project.

        Returns:
            Tuple[Any, List[Dict]]: (FAISS index, List of document dictionaries)
        """
        embeddings_path = WORKSPACE_DIR / project_id / "embeddings"
        index_file = embeddings_path / "index.bin"
        docs_file = embeddings_path / "documents.json"

        if not index_file.exists() or not docs_file.exists():
            raise FileNotFoundError(f"FAISS index files not found in workspace: {embeddings_path}")

        index = faiss.read_index(str(index_file))
        with open(docs_file, "r", encoding="utf-8") as f:
            documents = json.load(f)

        return index, documents
