import tempfile
import unittest
from pathlib import Path

from app.ai.context_builder import build_context_documents


class TestHybridAiContext(unittest.TestCase):
    def test_builds_structured_metadata_and_bounded_source_chunks(self):
        with tempfile.TemporaryDirectory() as temporary_directory:
            source = Path(temporary_directory)
            safe_file = source / "src" / "service.py"
            safe_file.parent.mkdir(parents=True)
            safe_file.write_text("\n".join(f"def function_{index}(): return {index}" for index in range(600)), encoding="utf-8")

            secret_file = source / ".env"
            secret_file.write_text("API_TOKEN=SECRET_VALUE", encoding="utf-8")
            lock_file = source / "package-lock.json"
            lock_file.write_text('{"secret": "LOCK_VALUE"}', encoding="utf-8")

            knowledge = {
                "metadata": {"project_name": "context-test"},
                "statistics": {"total_files": 3, "total_directories": 1, "total_size": 1000},
                "architecture": {"backend": True, "frameworks": ["FastAPI"]},
                "files": [
                    {
                        "path": "src/service.py",
                        "name": "service.py",
                        "language": "Python",
                        "size": safe_file.stat().st_size,
                        "symbols": [{"type": "function", "name": "function_1", "start_line": 2, "end_line": 2}],
                    },
                    {"path": ".env", "name": ".env", "language": "Unknown", "size": secret_file.stat().st_size, "symbols": []},
                    {"path": "package-lock.json", "name": "package-lock.json", "language": "JSON", "size": lock_file.stat().st_size, "symbols": []},
                ],
            }

            documents = build_context_documents("project-id", knowledge, source)
            combined_context = "\n".join(document["content"] for document in documents)
            source_chunks = [document for document in documents if document["type"] == "source_chunk"]

            self.assertEqual(documents[0]["type"], "project_overview")
            self.assertTrue(any(document["type"] == "file_metadata" for document in documents))
            self.assertGreater(len(source_chunks), 1)
            self.assertTrue(all(document["line_start"] <= document["line_end"] for document in source_chunks))
            self.assertIn("function_1", combined_context)
            self.assertNotIn("SECRET_VALUE", combined_context)
            self.assertNotIn("LOCK_VALUE", combined_context)


if __name__ == "__main__":
    unittest.main()
