import abc
import logging
from typing import List, Dict

from app.parser.symbol_extractor import SymbolExtractor

logger = logging.getLogger("codeatlas.parser_service")


class LanguageExtractor(abc.ABC):
    """
    Abstract base class for extracting symbols from an AST.
    All language-specific extractors must inherit from this class.
    """

    @abc.abstractmethod
    def extract(self, file_path: str, tree, source: str) -> List[Dict]:
        """
        Extracts code symbols from the parsed Tree-sitter AST.

        Args:
            file_path (str): Relative file path.
            tree: The parsed Tree-sitter Tree.
            source (str): Original source code content.

        Returns:
            List[Dict]: A list of generic symbols matching the unified schema:
                {
                    "type": str,       # "class", "function", "import", etc.
                    "name": str,       # Symbol name
                    "language": str,   # Language name
                    "file": str,       # File path
                    "start_line": int, # 1-indexed start line
                    "end_line": int    # 1-indexed end line
                }
        """
        pass


class PythonExtractor(LanguageExtractor):
    """
    Python symbol extractor. Translates AST symbols into the unified generic format.
    """

    def extract(self, file_path: str, tree, source: str) -> List[Dict]:
        """
        Extracts Python symbols using SymbolExtractor and maps them to unified symbols.
        """
        logger.info(f"Extracting Python symbols for: {file_path}")
        extractor = SymbolExtractor(source)
        file_symbols = extractor.extract(file_path, tree)

        generic_symbols = []

        # 1. Map imports
        for imp in file_symbols.imports:
            generic_symbols.append(
                {
                    "type": "import",
                    "name": imp.module,
                    "language": "Python",
                    "file": file_path,
                    "start_line": imp.line,
                    "end_line": imp.line,
                }
            )

        # 2. Map classes
        for cls in file_symbols.classes:
            generic_symbols.append(
                {
                    "type": "class",
                    "name": cls.name,
                    "language": "Python",
                    "file": file_path,
                    "start_line": cls.start_line,
                    "end_line": cls.end_line,
                }
            )

        # 3. Map functions
        for func in file_symbols.functions:
            generic_symbols.append(
                {
                    "type": "function",
                    "name": func.name,
                    "language": "Python",
                    "file": file_path,
                    "start_line": func.start_line,
                    "end_line": func.end_line,
                }
            )

        logger.debug(f"Extracted {len(generic_symbols)} symbols from {file_path}")
        return generic_symbols


class LanguageRegistry:
    """
    Registry for managing supported programming languages, their Tree-sitter configurations,
    and their associated symbol extractors.
    """

    # Mapping of lowercase language names to Tree-sitter language identifier and Extractor class
    _registry: Dict[str, Dict] = {
        "python": {
            "parser_lang": "python",
            "extractor_cls": PythonExtractor,
        }
    }

    @classmethod
    def get_supported_languages(cls) -> List[str]:
        """Returns the list of registered language keys."""
        return list(cls._registry.keys())

    @classmethod
    def is_supported(cls, language: str) -> bool:
        """Checks if a language is supported by the registry."""
        return language.lower() in cls._registry

    @classmethod
    def get_parser_lang(cls, language: str) -> str:
        """Gets the Tree-sitter language pack name for a registered language."""
        if not cls.is_supported(language):
            raise KeyError(f"Language '{language}' is not registered.")
        return cls._registry[language.lower()]["parser_lang"]

    @classmethod
    def get_extractor(cls, language: str) -> LanguageExtractor:
        """Returns an instance of the registered symbol extractor for a language."""
        if not cls.is_supported(language):
            raise KeyError(f"Language '{language}' is not registered.")
        extractor_cls = cls._registry[language.lower()]["extractor_cls"]
        return extractor_cls()
