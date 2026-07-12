from pathlib import Path

from tree_sitter import Parser
from tree_sitter_language_pack import get_language


class TreeParser:
    """
    Universal Tree-sitter parser.

    Currently supports Python.
    More languages can be added later.
    """

    def __init__(self, language: str = "python"):

        self.language_name = language.lower()

        self.language = get_language(self.language_name)

        self.parser = Parser(self.language)

    def parse_code(self, source_code: str):
        """
        Parse source code string into Tree-sitter Tree.
        """

        return self.parser.parse(
            bytes(source_code, "utf8")
        )

    def parse_file(self, file_path: Path):
        """
        Parse a source file.
        """

        source = file_path.read_text(
            encoding="utf-8",
            errors="ignore"
        )

        tree = self.parse_code(source)

        return tree, source