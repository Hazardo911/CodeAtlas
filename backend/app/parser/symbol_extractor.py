from tree_sitter import Node

from app.parser.models import (
    ImportSymbol,
    ClassSymbol,
    FunctionSymbol,
    FileSymbols,
)


class SymbolExtractor:
    """
    Extract symbols from a Python AST.
    """

    def __init__(self, source: str):

        self.source = source

        self.lines = source.splitlines()

    # --------------------------------------------------
    # Helpers
    # --------------------------------------------------

    def _text(self, node: Node):

        return self.source[
            node.start_byte:node.end_byte
        ]

    # --------------------------------------------------
    # Imports
    # --------------------------------------------------

    def extract_imports(self, root: Node):

        imports = []

        stack = [root]

        while stack:

            node = stack.pop()

            if node.type in (
                "import_statement",
                "import_from_statement",
            ):

                imports.append(

                    ImportSymbol(
                        module=self._text(node),
                        line=node.start_point[0] + 1,
                    )

                )

            stack.extend(node.children)

        return imports

    # --------------------------------------------------
    # Classes
    # --------------------------------------------------

    def extract_classes(self, root: Node):

        classes = []

        stack = [root]

        while stack:

            node = stack.pop()

            if node.type == "class_definition":

                name_node = node.child_by_field_name(
                    "name"
                )

                if name_node:

                    classes.append(

                        ClassSymbol(
                            name=self._text(name_node),
                            start_line=node.start_point[0] + 1,
                            end_line=node.end_point[0] + 1,
                        )

                    )

            stack.extend(node.children)

        return classes

    # --------------------------------------------------
    # Functions
    # --------------------------------------------------

    def extract_functions(self, root: Node):

        functions = []

        stack = [root]

        while stack:

            node = stack.pop()

            if node.type == "function_definition":

                name_node = node.child_by_field_name(
                    "name"
                )

                if name_node:

                    functions.append(

                        FunctionSymbol(
                            name=self._text(name_node),
                            start_line=node.start_point[0] + 1,
                            end_line=node.end_point[0] + 1,
                        )

                    )

            stack.extend(node.children)

        return functions

    # --------------------------------------------------
    # Complete Extraction
    # --------------------------------------------------

    def extract(
        self,
        path: str,
        tree,
    ):

        root = tree.root_node

        return FileSymbols(
            path=path,
            language="Python",
            imports=self.extract_imports(root),
            classes=self.extract_classes(root),
            functions=self.extract_functions(root),
        )