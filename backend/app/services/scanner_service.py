from app.config import WORKSPACE_DIR
from app.scanner.scanner import Scanner
from app.analysis.metrics import Metrics
from app.utils.helpers import write_json


class ScannerService:

    def __init__(self):
        self.scanner = Scanner()
        self.metrics = Metrics()

    def scan_project(self, project_id: str):

        project_path = (
            WORKSPACE_DIR
            / project_id
            / "source"
        )

        if not project_path.exists():
            raise FileNotFoundError("Project not found.")

        cache_path = (
            WORKSPACE_DIR
            / project_id
            / "cache"
        )

        # -------------------------
        # 1. Scan the project
        # -------------------------
        scan_result = self.scanner.scan(project_path)

        write_json(
            cache_path / "scan_result.json",
            scan_result,
        )

        # -------------------------
        # 2. Calculate health metrics
        # -------------------------
        health_result = self.metrics.calculate(scan_result)

        write_json(
            cache_path / "health.json",
            health_result,
        )

        # -------------------------
        # 3. Return everything
        # -------------------------
        return {
            "project_id": project_id,
            "scan": scan_result,
            "health": health_result,
        }