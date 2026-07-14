from pathlib import Path
import json
import shutil
import zipfile
import aiofiles
from fastapi import UploadFile
from app.utils.constants import IGNORE_FILES, IGNORE_FOLDERS

def create_directory(path: Path):
    """Create directory if it doesn't exist."""
    path.mkdir(parents=True, exist_ok=True)


def delete_directory(path: Path):
    """Delete directory safely."""
    if path.exists():
        shutil.rmtree(path)


def write_json(path: Path, data: dict):
    """
    Write dictionary to JSON file.
    """

    path.parent.mkdir(
        parents=True,
        exist_ok=True,
    )

    with open(
        path,
        "w",
        encoding="utf-8",
    ) as f:
        json.dump(
            data,
            f,
            indent=4,
            ensure_ascii=False,
        )


def read_json(path: Path):
    """Read JSON file."""
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def should_ignore_dir(path: Path) -> bool:
    """
    Check if any part of the path is in IGNORE_FOLDERS (case-insensitive).
    """
    return any(part.lower() in IGNORE_FOLDERS for part in path.parts)


def extract_zip(zip_path: Path, destination: Path):
    """
    Extract ZIP while skipping unnecessary folders.
    """

    destination_root = destination.resolve()

    with zipfile.ZipFile(zip_path, "r") as zip_ref:

        for member in zip_ref.infolist():

            member_path = Path(member.filename)
            filename = member_path.name

            if filename in IGNORE_FILES:
                continue

            # Skip ignored folders
            if should_ignore_dir(member_path):
                continue

            if member_path.is_absolute() or ".." in member_path.parts:
                continue

            target = (destination / member.filename).resolve()
            if not target.is_relative_to(destination_root):
                continue

            if member.is_dir():
                target.mkdir(parents=True, exist_ok=True)
                continue

            target.parent.mkdir(parents=True, exist_ok=True)

            with zip_ref.open(member) as source:
                with open(target, "wb") as dest:
                    shutil.copyfileobj(source, dest)




async def save_upload_file(upload_file: UploadFile, destination: Path):
    """
    Save an uploaded file to disk.
    """
    async with aiofiles.open(destination, "wb") as out_file:
        while content := await upload_file.read(1024 * 1024):
            await out_file.write(content)


def find_project_root(extracted_path: Path) -> Path:
    """
    If ZIP contains one top-level folder, return it.
    Otherwise return extracted_path.
    """

    items = list(extracted_path.iterdir())

    if len(items) == 1 and items[0].is_dir():
        return items[0]

    return extracted_path


def copy_folder_contents(src: Path, dest: Path):
    """
    Copy all files and folders recursively from src to dest,
    skipping ignored folders and files.
    """
    for root, dirs, files in src.walk():
        # Prune ignored folders in-place
        dirs[:] = [d for d in dirs if not should_ignore_dir(Path(d))]

        # Calculate subpath relative to src
        rel_path = root.relative_to(src)
        dest_dir = dest / rel_path
        dest_dir.mkdir(parents=True, exist_ok=True)

        for file in files:
            if file in IGNORE_FILES:
                continue
            src_file = root / file
            dest_file = dest_dir / file
            shutil.copy2(src_file, dest_file)
