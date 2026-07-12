from app.analysis.architecture import ArchitectureDetector
from app.utils.helpers import (
    read_json,
    write_json,
)
from app.config import WORKSPACE_DIR


class ArchitectureService:

    def __init__(self):
        self.detector = ArchitectureDetector()

    def analyze(self, project_id: str):

        cache = (
            WORKSPACE_DIR
            / project_id
            / "cache"
        )

        scan_result = read_json(
            cache / "scan_result.json"
        )

        architecture = self.detector.analyze(
            scan_result
        )

        write_json(
            cache / "architecture.json",
            architecture,
        )

        return architecture