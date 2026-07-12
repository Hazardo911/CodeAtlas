from pathlib import Path

from app.parser.tree_parser import TreeParser
from app.parser.symbol_extractor import SymbolExtractor


PROJECT_ID = "ae8a56da-413e-492a-b3fb-4ca738c71f0b"

FILE_PATH = Path(
    f"workspace/{PROJECT_ID}/source/agent/planner.py"
)


def main():

    print("=" * 70)
    print("CodeAtlas Tree-sitter Test")
    print("=" * 70)

    print(f"\nFile: {FILE_PATH}")

    if not FILE_PATH.exists():
        print("\n❌ File does not exist.")
        return

    parser = TreeParser()

    tree, source = parser.parse_file(FILE_PATH)

    print("\n✅ Parsing Successful")
    print(f"Root Node : {tree.root_node.type}")
    print(f"Children  : {len(tree.root_node.children)}")

    extractor = SymbolExtractor(source)

    symbols = extractor.extract(
        path=str(FILE_PATH),
        tree=tree,
    )

    print("\n" + "=" * 70)
    print("IMPORTS")
    print("=" * 70)

    if symbols.imports:
        for imp in symbols.imports:
            print(f"• {imp.module}")
    else:
        print("No imports found.")

    print("\n" + "=" * 70)
    print("CLASSES")
    print("=" * 70)

    if symbols.classes:
        for cls in symbols.classes:
            print(
                f"• {cls.name} "
                f"(Lines {cls.start_line}-{cls.end_line})"
            )
    else:
        print("No classes found.")

    print("\n" + "=" * 70)
    print("FUNCTIONS")
    print("=" * 70)

    if symbols.functions:
        for func in symbols.functions:
            print(
                f"• {func.name} "
                f"(Lines {func.start_line}-{func.end_line})"
            )
    else:
        print("No functions found.")

    print("\n" + "=" * 70)
    print("TEST COMPLETE")
    print("=" * 70)


if __name__ == "__main__":
    main()