import unittest
from pathlib import Path
import tempfile
import shutil
import zipfile
from app.utils.helpers import should_ignore_dir, extract_zip
from app.scanner.scanner import Scanner
from app.utils.constants import IGNORE_FOLDERS


class TestIgnoreLogic(unittest.TestCase):

    def test_should_ignore_dir_direct_and_nested(self):
        # Direct ignore
        self.assertTrue(should_ignore_dir(Path("venv")))
        self.assertTrue(should_ignore_dir(Path(".venv")))
        self.assertTrue(should_ignore_dir(Path("node_modules")))

        # Nested ignore
        self.assertTrue(should_ignore_dir(Path("src/venv")))
        self.assertTrue(should_ignore_dir(Path("backend/app/node_modules/some_package")))
        self.assertTrue(should_ignore_dir(Path("foo/bar/baz/.git")))

        # Case-insensitivity
        self.assertTrue(should_ignore_dir(Path("VENV")))
        self.assertTrue(should_ignore_dir(Path("Node_Modules")))
        self.assertTrue(should_ignore_dir(Path("src/ENV")))

        # Non-ignored path
        self.assertFalse(should_ignore_dir(Path("src/index.js")))
        self.assertFalse(should_ignore_dir(Path("backend/app/services/project_service.py")))

    def test_zip_extraction_excludes_ignored_directories(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            zip_path = tmpdir_path / "test.zip"
            dest_path = tmpdir_path / "extracted"

            # Create a mock zip file
            with zipfile.ZipFile(zip_path, "w") as zf:
                zf.writestr("src/main.py", "print('hello')")
                zf.writestr("venv/bin/activate", "# venv file")
                zf.writestr(".venv/pyvenv.cfg", "version = 3.12")
                zf.writestr("node_modules/package/index.js", "console.log()")
                zf.writestr("src/nested/venv/file.txt", "should ignore")
                zf.writestr("src/ok_folder/helper.py", "def help(): pass")

            # Extract the zip
            extract_zip(zip_path, dest_path)

            # Assertions
            self.assertTrue((dest_path / "src/main.py").exists())
            self.assertTrue((dest_path / "src/ok_folder/helper.py").exists())

            # These should not exist
            self.assertFalse((dest_path / "venv").exists())
            self.assertFalse((dest_path / ".venv").exists())
            self.assertFalse((dest_path / "node_modules").exists())
            self.assertFalse((dest_path / "src/nested/venv").exists())

    def test_zip_extraction_blocks_parent_path_traversal(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            zip_path = tmpdir_path / "unsafe.zip"
            dest_path = tmpdir_path / "extracted"

            with zipfile.ZipFile(zip_path, "w") as zf:
                zf.writestr("../escaped.py", "print('unsafe')")
                zf.writestr("src/safe.py", "print('safe')")

            extract_zip(zip_path, dest_path)

            self.assertFalse((tmpdir_path / "escaped.py").exists())
            self.assertTrue((dest_path / "src/safe.py").exists())

    def test_scanner_prunes_ignored_directories(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            tmpdir_path = Path(tmpdir)
            
            # Create a mock project structure
            (tmpdir_path / "src").mkdir()
            (tmpdir_path / "src" / "main.py").write_text("print('hello')", encoding="utf-8")
            
            (tmpdir_path / "venv").mkdir()
            (tmpdir_path / "venv" / "bin").mkdir()
            (tmpdir_path / "venv" / "bin" / "python.exe").write_text("", encoding="utf-8")
            
            (tmpdir_path / "src" / "node_modules").mkdir()
            (tmpdir_path / "src" / "node_modules" / "pkg").mkdir()
            (tmpdir_path / "src" / "node_modules" / "pkg" / "index.js").write_text("console.log()", encoding="utf-8")

            # Scan the mock project
            scanner = Scanner()
            result = scanner.scan(tmpdir_path)

            # Check that only non-ignored files/dirs were counted/collected
            self.assertEqual(result["total_files"], 1)
            # The only traversed directory is "src" (excluding root and ignored directories)
            self.assertEqual(result["total_directories"], 1)
            self.assertEqual(len(result["files"]), 1)
            self.assertEqual(result["files"][0]["name"], "main.py")


if __name__ == "__main__":
    unittest.main()
