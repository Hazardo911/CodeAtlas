import logging
import re
from pathlib import Path
from typing import Dict, Any, List

from app.config import WORKSPACE_DIR, OLLAMA_MODEL
from app.ai.vector_store import LocalVectorStore
from app.ai.retriever import LocalRetriever
from app.ai.prompt_builder import PromptBuilder
from app.ai.ollama_client import get_ollama_client
from app.utils.helpers import read_json

logger = logging.getLogger("codeatlas.chat_service")


def _source(file_path: str) -> Dict[str, Any]:
    return {
        "file": file_path,
        "score": None,
        "line_start": None,
        "line_end": None,
    }


def _quick_scan_answer(project_id: str, query: str) -> Dict[str, Any] | None:
    """Answer common factual dashboard questions directly from verified scan data."""
    cache = WORKSPACE_DIR / project_id / "cache"
    summary_path = cache / "project_summary.json"
    scan_path = cache / "scan_result.json"
    if not summary_path.exists() or not scan_path.exists():
        return None

    summary = read_json(summary_path)
    scan = read_json(scan_path)
    normalized = query.lower().strip()
    files = scan.get("files", [])
    frameworks = summary.get("detected_frameworks", [])
    languages = summary.get("detected_languages", {})
    architecture = summary.get("architecture_overview", {})

    manifest_names = {
        "package.json", "pyproject.toml", "requirements.txt", "pubspec.yaml",
        "pom.xml", "cargo.toml", "go.mod",
    }
    manifests = [item["path"] for item in files if item.get("name", "").lower() in manifest_names]

    if "framework" in normalized or "technolog" in normalized:
        answer = (
            f"Detected frameworks: {', '.join(frameworks)}."
            if frameworks
            else "No registered framework was detected by the repository scanner."
        )
        return {"answer": answer, "sources": [_source(path) for path in manifests[:4]], "mode": "scan"}

    if any(term in normalized for term in ("overview", "what is this project", "summar")):
        detected_areas = [
            name.replace("_", " ").title()
            for name, value in architecture.items()
            if isinstance(value, bool) and value
        ]
        top_languages = sorted(languages.items(), key=lambda item: item[1], reverse=True)[:4]
        language_text = ", ".join(f"{name} ({count})" for name, count in top_languages) or "Unknown"
        answer = (
            f"This repository contains {scan.get('total_files', 0)} files across "
            f"{scan.get('total_directories', 0)} directories. Main detected languages: {language_text}. "
            f"Detected frameworks: {', '.join(frameworks) if frameworks else 'none registered'}. "
            f"Architecture signals: {', '.join(detected_areas) if detected_areas else 'none detected'}."
        )
        readmes = [item["path"] for item in files if item.get("name", "").lower().startswith("readme")]
        return {
            "answer": answer,
            "sources": [_source(path) for path in (readmes + manifests)[:4]],
            "mode": "scan",
        }

    if "start reading" in normalized or "where should i start" in normalized:
        priority = [item for item in files if item.get("name", "").lower().startswith("readme")]
        priority += [item for item in files if item.get("name", "").lower() in manifest_names]
        priority += [
            item for item in files
            if re.search(r"(^|[\\/])(main|index|app)\.(py|tsx?|jsx?|java|go|rs|dart)$", item.get("path", ""), re.I)
        ]
        unique = []
        seen = set()
        for item in priority:
            if item.get("path") not in seen:
                unique.append(item)
                seen.add(item.get("path"))
        selected = unique[:5]
        answer = "Start with:\n" + "\n".join(
            f"{index + 1}. {item['path']}" for index, item in enumerate(selected)
        ) if selected else "No README, manifest, or common entry point was found in the scan."
        return {"answer": answer, "sources": [_source(item["path"]) for item in selected], "mode": "scan"}

    return None

# Static registry of all known frameworks and databases for verification
KNOWN_FRAMEWORKS = {
    "Django", "Flask", "FastAPI", "Pyramid", "Tornado", "Sanic",
    "React", "Vue", "Angular", "Next.js", "Nuxt", "Electron", "Spring Boot",
    "Laravel", "Symfony", "Gin", "Fiber", "Echo", "Actix", "Rocket", "Axum",
    "Qt", "Ruby on Rails", "Sinatra", "Flutter", "React Native", "Svelte",
    "SvelteKit", "Astro", "Remix", "SolidJS"
}

KNOWN_DATABASES = {
    "PostgreSQL", "Postgres", "MySQL", "SQLite", "SQLite3", "MongoDB", "Redis",
    "MariaDB", "Oracle", "SQL Server", "SQLServer", "MSSQL", "Cassandra",
    "DynamoDB", "Firestore", "Firebase"
}


def _construct_verified_evidence(retrieved_docs: List[Dict[str, Any]], project_summary: Dict[str, Any] | None) -> Dict[str, List[str]]:
    """
    Compiles a lists of verified frameworks and databases present in summary or retrieved files.
    """
    evidence_fws = set()
    evidence_dbs = set()

    # 1. Project summary frameworks
    if project_summary:
        fws = project_summary.get("detected_frameworks", [])
        for fw in fws:
            evidence_fws.add(fw)

    # 2. Scanning retrieved document contents
    for doc in retrieved_docs:
        content_lower = doc.get("content", "").lower()
        # Scan for frameworks
        for fw in KNOWN_FRAMEWORKS:
            if fw.lower() in content_lower:
                evidence_fws.add(fw)
        # Scan for databases
        for db in KNOWN_DATABASES:
            if db.lower() in content_lower:
                evidence_dbs.add(db)

    return {
        "frameworks": sorted(list(evidence_fws)),
        "databases": sorted(list(evidence_dbs))
    }


def _clean_speculative_language(text: str) -> str:
    """
    Case-insensitively removes speculative/hallucinatory helper phrases from LLM generated text.
    """
    replacements = {
        "it is reasonable to infer": "it is indicated",
        "suggests that": "indicates that",
        "expected to": "designed to",
        "appears to": "",
        "could be": "is",
        "might": "",
        "probably": "",
        "likely": "",
        "potentially": ""
    }
    cleaned = text
    for phrase, rep in replacements.items():
        pattern = re.compile(r'\b' + re.escape(phrase) + r'\b', re.IGNORECASE)
        cleaned = pattern.sub(rep, cleaned)
    # Preserve section and paragraph breaks for the chat UI while normalizing
    # accidental runs of spaces produced by small local models.
    cleaned = re.sub(r'[^\S\r\n]+', ' ', cleaned)
    cleaned = re.sub(r'\n{3,}', '\n\n', cleaned)
    return cleaned.strip()


def _validate_and_filter_answer(answer: str, verified_evidence: Dict[str, List[str]]) -> tuple[str, set[str], set[str]]:
    """
    Identifies unsupported frameworks or databases and returns pruned string along with detected violations.
    """
    unsupported_fws = set()
    unsupported_dbs = set()

    allowed_fws_lower = {fw.lower() for fw in verified_evidence.get("frameworks", [])}
    allowed_dbs_lower = {db.lower() for db in verified_evidence.get("databases", [])}

    # Detect unsupported frameworks mentioned in the answer
    for fw in KNOWN_FRAMEWORKS:
        if re.search(r'\b' + re.escape(fw) + r'\b', answer, re.IGNORECASE):
            if fw.lower() not in allowed_fws_lower:
                unsupported_fws.add(fw)

    # Detect unsupported databases mentioned in the answer
    for db in KNOWN_DATABASES:
        if re.search(r'\b' + re.escape(db) + r'\b', answer, re.IGNORECASE):
            if db.lower() not in allowed_dbs_lower:
                unsupported_dbs.add(db)

    # Remove sentences containing unsupported technologies
    if unsupported_fws or unsupported_dbs:
        sentences = re.split(r'(?<=[.!?])\s+', answer)
        valid_sentences = []
        for sentence in sentences:
            has_unsupported = False
            for fw in unsupported_fws:
                if re.search(r'\b' + re.escape(fw) + r'\b', sentence, re.IGNORECASE):
                    has_unsupported = True
                    break
            for db in unsupported_dbs:
                if re.search(r'\b' + re.escape(db) + r'\b', sentence, re.IGNORECASE):
                    has_unsupported = True
                    break
            if not has_unsupported:
                valid_sentences.append(sentence)
        filtered_answer = " ".join(valid_sentences)
        return filtered_answer, unsupported_fws, unsupported_dbs

    return answer, unsupported_fws, unsupported_dbs


class ChatService:
    """
    Orchestrator service that coordinates vector-search retrieval, prompt building,
    and Ollama-driven LLM answer generation for project-related questions.
    """

    def __init__(self, top_k: int = 3, ollama_model: str = OLLAMA_MODEL):
        """
        Initializes the ChatService dependencies.
        """
        self.retriever = LocalRetriever()
        self.ollama_client = get_ollama_client(default_model=ollama_model)
        self.top_k = top_k
        logger.info(f"ChatService initialized (default TOP_K = {self.top_k}).")

    def answer_question(self, project_id: str, query: str, model: str | None = None) -> Dict[str, Any]:
        """
        Answers a user question regarding a project using RAG.

        Args:
            project_id (str): UUID of the project workspace.
            query (str): Question to answer.
            model (str, optional): Target LLM model name.

        Returns:
            Dict[str, Any]: The response dictionary containing "answer" and "sources".
        """
        logger.info(f"Processing chat request for project: {project_id} | Query: '{query}'")

        quick_answer = _quick_scan_answer(project_id, query)
        if quick_answer is not None:
            return quick_answer

        embeddings_path = WORKSPACE_DIR / project_id / "embeddings"
        index_file = embeddings_path / "index.bin"
        docs_file = embeddings_path / "documents.json"

        # 1. Build index on the fly if it is missing
        if not index_file.exists() or not docs_file.exists():
            logger.info(f"Vector index not found on disk for project {project_id}. Initiating index generation...")
            success = LocalVectorStore.build_index(project_id)
            if not success:
                logger.error(f"Failed to build vector index dynamically for project {project_id}")
                return {
                    "answer": "Error: Failed to index the project files. Ensure the project is scanned first.",
                    "sources": [],
                    "mode": "error",
                }

        # 2. Retrieve relevant documents
        retrieved_docs = self.retriever.retrieve(project_id, query, top_k=self.top_k)

        # 3. Read project summary for prompt builder context
        project_summary = None
        summary_path = WORKSPACE_DIR / project_id / "cache" / "project_summary.json"
        if summary_path.exists():
            try:
                project_summary = read_json(summary_path)
            except Exception as e:
                logger.warning(f"Could not load project_summary.json for prompt context: {e}")

        # 4. Construct verified evidence object and compile prompt
        verified_evidence = _construct_verified_evidence(retrieved_docs, project_summary)
        prompt = PromptBuilder.build(query, retrieved_docs, project_summary=project_summary, verified_evidence=verified_evidence)

        # 5. Call local Ollama client to generate response
        answer = self.ollama_client.generate(prompt, model=model)

        # Scrub speculative language
        answer = _clean_speculative_language(answer)

        # Perform framework/database validation
        filtered_answer, unsupported_fws, unsupported_dbs = _validate_and_filter_answer(answer, verified_evidence)

        # Stricter regeneration if unsupported claims are present
        if unsupported_fws or unsupported_dbs:
            logger.warning(
                f"Unsupported mentions detected in first LLM generation. "
                f"Frameworks: {unsupported_fws}, Databases: {unsupported_dbs}. "
                f"Initiating stricter regeneration..."
            )
            logger.info(f"UNSUPPORTED_MENTIONS: frameworks={unsupported_fws}, databases={unsupported_dbs}")

            stricter_prompt = prompt + (
                "\n\n[CRITICAL WARNING: REGENERATION REQUIRED]\n"
                "Your previous response mentioned unauthorized technologies. You MUST rewrite your answer.\n"
                "You are STRICTLY FORBIDDEN from mentioning the following technologies as there is no evidence for them:\n"
                f"- Forbidden Frameworks: {', '.join(unsupported_fws) if unsupported_fws else 'None'}\n"
                f"- Forbidden Databases: {', '.join(unsupported_dbs) if unsupported_dbs else 'None'}\n"
                "Rewrite the response fully following the rules and ONLY referencing the verified evidence.\n"
            )
            regenerated_answer = self.ollama_client.generate(stricter_prompt, model=model)
            regenerated_answer = _clean_speculative_language(regenerated_answer)
            
            # Post-validate the regenerated answer
            second_filtered, sec_unsupported_fws, sec_unsupported_dbs = _validate_and_filter_answer(regenerated_answer, verified_evidence)
            
            if sec_unsupported_fws or sec_unsupported_dbs:
                logger.error(
                    f"Regeneration still contained unsupported mentions. "
                    f"Frameworks: {sec_unsupported_fws}, Databases: {sec_unsupported_dbs}. "
                    f"Pruning sentences as last resort."
                )
                logger.info(f"UNSUPPORTED_MENTIONS_REGENERATED: frameworks={sec_unsupported_fws}, databases={sec_unsupported_dbs}")
                answer = second_filtered
            else:
                answer = regenerated_answer
        else:
            answer = filtered_answer

        # Fallback if final answer is blank or only whitespace
        if not answer.strip():
            answer = "I could not find evidence for this in the uploaded project."

        # 6. Format richer sources metadata
        sources_by_file: Dict[str, Dict[str, Any]] = {}
        for doc in retrieved_docs:
            if doc.get("type") == "project_overview":
                continue
            file_path = doc.get("file_path")
            if not file_path:
                continue
            candidate = {
                "file": file_path,
                "score": doc.get("score"),
                "line_start": doc.get("line_start"),
                "line_end": doc.get("line_end"),
            }
            existing = sources_by_file.get(file_path)
            if existing is None or (candidate["score"] or 0) > (existing["score"] or 0):
                sources_by_file[file_path] = candidate

        return {
            "answer": answer,
            "sources": list(sources_by_file.values()),
            "mode": "ai",
        }
