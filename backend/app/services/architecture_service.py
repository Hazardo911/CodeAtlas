import logging
from pathlib import Path
from typing import Dict, Any

from app.analysis.architecture import ArchitectureDetector
from app.utils.helpers import read_json, write_json
from app.config import WORKSPACE_DIR

logger = logging.getLogger("codeatlas.architecture_service")


class ArchitectureService:
    """
    Service responsible for detecting structural aspects of the code (languages,
    frameworks, deployment styles) and compiling consolidated summaries and RAG-ready
    knowledge bases.
    """

    def __init__(self):
        self.detector = ArchitectureDetector()

    def analyze(self, project_id: str) -> Dict[str, Any]:
        """
        Analyzes the architecture of the project, updates cached summaries,
        and generates a consolidated 'knowledge.json' file prepared for future RAG indexing.

        Args:
            project_id (str): The project's unique identifier.

        Returns:
            Dict[str, Any]: The architecture detection checklist.
        """
        logger.info(f"Analyzing architecture for project: {project_id}")

        cache = WORKSPACE_DIR / project_id / "cache"
        project_path = WORKSPACE_DIR / project_id / "source"
        metadata_file = WORKSPACE_DIR / project_id / "metadata.json"

        # 1. Load scan result and metadata
        scan_result_path = cache / "scan_result.json"
        if not scan_result_path.exists():
            logger.error(f"Scan result missing for project {project_id}")
            raise FileNotFoundError("Scan result not found. Run project scan first.")

        scan_result = read_json(scan_result_path)

        metadata = {}
        if metadata_file.exists():
            metadata = read_json(metadata_file)

        # 2. Perform architecture analysis
        architecture = self.detector.analyze(scan_result, project_path=project_path)
        write_json(cache / "architecture.json", architecture)
        logger.info(f"Architecture detection complete for project: {project_id}")

        # 3. Read health metrics and symbols
        health_result = {}
        health_path = cache / "health.json"
        if health_path.exists():
            health_result = read_json(health_path)

        symbols = []
        symbols_path = cache / "symbols.json"
        if symbols_path.exists():
            symbols = read_json(symbols_path).get("symbols", [])

        # 4. Count symbol types
        symbol_counts: Dict[str, int] = {}
        for sym in symbols:
            sym_type = sym.get("type", "unknown")
            symbol_counts[sym_type] = symbol_counts.get(sym_type, 0) + 1

        # 5. Extract statistics
        stats = health_result.get("summary", {
            "total_files": scan_result.get("total_files", 0),
            "total_directories": scan_result.get("total_directories", 0),
            "total_size": sum(f.get("size", 0) for f in scan_result.get("files", []))
        })

        # 6. Generate project_summary.json
        summary_payload = {
            "detected_languages": scan_result.get("languages", {}),
            "detected_frameworks": architecture.get("frameworks", []),
            "architecture_overview": architecture,
            "project_statistics": stats,
            "symbol_counts": symbol_counts
        }
        write_json(cache / "project_summary.json", summary_payload)
        logger.info(f"Project summary generated for: {project_id}")

        # 7. Generate knowledge.json (Consolidated, hierarchical model for RAG)
        # Group symbols by file path
        symbols_by_file: Dict[str, list] = {}
        for sym in symbols:
            fpath = sym.get("file")
            if fpath not in symbols_by_file:
                symbols_by_file[fpath] = []
            symbols_by_file[fpath].append({
                "type": sym.get("type"),
                "name": sym.get("name"),
                "start_line": sym.get("start_line"),
                "end_line": sym.get("end_line")
            })

        # Build inline list of files with their associated symbols
        knowledge_files = []
        for file_info in scan_result.get("files", []):
            fpath = file_info.get("path")
            knowledge_files.append({
                "path": fpath,
                "name": file_info.get("name"),
                "extension": file_info.get("extension"),
                "language": file_info.get("language"),
                "size": file_info.get("size"),
                "symbols": symbols_by_file.get(fpath, [])
            })

        knowledge_payload = {
            "project_id": project_id,
            "metadata": metadata,
            "statistics": stats,
            "architecture": architecture,
            "files": knowledge_files
        }
        write_json(cache / "knowledge.json", knowledge_payload)
        logger.info(f"Knowledge database representation generated for: {project_id}")

        # Trigger index building automatically after analysis is completed
        try:
            from app.ai.vector_store import LocalVectorStore
            LocalVectorStore.build_index(project_id)
        except Exception as e:
            logger.error(f"Failed to auto-build vector store index after architecture analysis: {e}")

        return architecture