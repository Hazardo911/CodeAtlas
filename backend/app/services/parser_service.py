import logging
from pathlib import Path
from typing import Dict, List, Any

from app.config import WORKSPACE_DIR
from app.parser.tree_parser import TreeParser
from app.parser.parser_service import LanguageRegistry
from app.utils.helpers import read_json, write_json

logger = logging.getLogger("codeatlas.parser_service")


class ParserService:
    """
    Independent service responsible for loading scanned files, executing
    language-specific Tree-sitter parsers, running symbol extraction, and
    writing unified symbol data to the workspace cache.
    """

    def parse_project(self, project_id: str) -> Dict[str, Any]:
        """
        Parses all supported source files in the project workspace and
        extracts code symbols into a generic, unified format.

        Args:
            project_id (str): The UUID of the project workspace.

        Returns:
            Dict[str, Any]: Summary dictionary containing the count and list of extracted symbols.
        """
        logger.info(f"Starting symbol parsing for project: {project_id}")

        source_path = WORKSPACE_DIR / project_id / "source"
        cache_path = WORKSPACE_DIR / project_id / "cache"

        scan_result_file = cache_path / "scan_result.json"
        if not scan_result_file.exists():
            logger.error(f"Scan result not found for project: {project_id}")
            raise FileNotFoundError("Scan result not found. Run project scan first.")

        from app.utils.helpers import read_json, write_json, should_ignore_dir

        scan_result = read_json(scan_result_file)
        files = scan_result.get("files", [])

        all_symbols: List[Dict[str, Any]] = []
        # Cache parser instances to avoid repeatedly instantiating them
        parser_cache: Dict[str, TreeParser] = {}

        for file_info in files:
            rel_path = file_info.get("path", "")
            if not rel_path or should_ignore_dir(Path(rel_path)):
                continue

            language_name = file_info.get("language", "")
            if not language_name or language_name == "Unknown":
                continue

            lang_key = language_name.lower()
            if not LanguageRegistry.is_supported(lang_key):
                logger.debug(f"Language '{language_name}' not supported by parser registry, skipping file: {file_info.get('path')}")
                continue

            rel_path = file_info.get("path")
            full_path = source_path / rel_path

            if not full_path.exists():
                logger.warning(f"File listed in scan results but missing from disk: {full_path}")
                continue

            try:
                # Retrieve or initialize language parser
                if lang_key not in parser_cache:
                    parser_lang = LanguageRegistry.get_parser_lang(lang_key)
                    parser_cache[lang_key] = TreeParser(language=parser_lang)

                parser = parser_cache[lang_key]
                logger.info(f"Parsing AST for: {rel_path}")
                tree, source = parser.parse_file(full_path)

                # Get the registered extractor for the language
                extractor = LanguageRegistry.get_extractor(lang_key)
                file_symbols = extractor.extract(rel_path, tree, source)
                all_symbols.extend(file_symbols)

            except Exception as e:
                logger.exception(f"Failed to extract symbols from file '{rel_path}': {e}")

        # Save generic symbols list to cache
        symbols_payload = {
            "symbols": all_symbols
        }

        write_json(cache_path / "symbols.json", symbols_payload)
        logger.info(f"Symbol parsing completed for project: {project_id}. Extracted {len(all_symbols)} total symbols.")

        return {
            "total_symbols": len(all_symbols),
            "symbols": all_symbols
        }
