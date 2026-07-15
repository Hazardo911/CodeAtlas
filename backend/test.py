from pathlib import Path

from app.parser.tree_parser import TreeParser

parser = TreeParser()

tree, source = parser.parse_file(
    Path("workspace/ae8a56da-413e-492a-b3fb-4ca738c71f0b/source/app.py")
)

print(tree.root_node.type)