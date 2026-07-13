import fnmatch
import logging
from pathlib import Path
from typing import Dict, List, Set, Any, Tuple

from app.analysis.registry import (
    MANIFEST_REGISTRY,
    MANIFEST_WILDCARDS,
    IMPORT_REGISTRY,
    FRAMEWORK_NORM_MAP,
    ARCHITECTURE_RULES
)

logger = logging.getLogger("codeatlas.analysis.architecture")


class ArchitectureDetector:

    def analyze(self, scan_result: dict, project_path: Path | None = None) -> dict:
        """
        Analyzes the file list and checks file contents (if project_path is provided)
        to identify architectural layers and framework utilization.

        Args:
            scan_result (dict): The repository files scanner report.
            project_path (Path, optional): Root folder of the project source files.

        Returns:
            dict: Architecture checklist, detected frameworks, and detailed metadata.
        """
        from app.utils.helpers import should_ignore_dir
        files = [f for f in scan_result.get("files", []) if not should_ignore_dir(Path(f["path"]))]

        # Phase 1: Framework Detection from Manifests and Imports
        detected_frameworks, code_signals = self._detect_frameworks(files, project_path)

        # Phase 2: Architecture Scoring
        details = self._score_architecture(files, detected_frameworks, code_signals)

        # Phase 3: Result Construction
        result = self._construct_result(details, detected_frameworks)

        return result

    def _detect_frameworks(self, files: List[dict], project_path: Path | None) -> Tuple[List[str], Dict[str, Set[str]]]:
        """
        Scan files and config files to detect language frameworks.
        Returns:
            Tuple[List[str], Dict[str, Set[str]]]: (detected frameworks, dict of import signals matched in files)
        """
        frameworks_set: Set[str] = set()
        code_signals: Dict[str, Set[str]] = {
            "imports": set(),
            "folders": set(),
            "files": set()
        }

        # Check manifests
        manifest_frameworks = self._detect_manifests(files, project_path, code_signals)
        frameworks_set.update(manifest_frameworks)

        # Check imports in source code files
        import_frameworks = self._detect_imports(files, project_path, code_signals)
        frameworks_set.update(import_frameworks)

        # Normalize framework names
        normalized_frameworks = []
        seen = set()
        for fw in frameworks_set:
            norm = FRAMEWORK_NORM_MAP.get(fw.lower(), fw)
            if norm not in seen:
                seen.add(norm)
                normalized_frameworks.append(norm)

        return normalized_frameworks, code_signals

    def _detect_manifests(self, files: List[dict], project_path: Path | None, code_signals: Dict[str, Set[str]]) -> Set[str]:
        """
        Detect frameworks using manifests/config files.
        """
        frameworks = set()
        for file_info in files:
            path_str = file_info["path"]
            name = Path(path_str).name
            name_lower = name.lower()

            matched_keywords = None
            if name_lower in MANIFEST_REGISTRY:
                matched_keywords = MANIFEST_REGISTRY[name_lower]
            else:
                # Check wildcards
                for pattern, keywords in MANIFEST_WILDCARDS:
                    if fnmatch.fnmatch(name_lower, pattern):
                        matched_keywords = keywords
                        break

            if matched_keywords:
                code_signals["files"].add(name_lower)
                # If we have the project path, read and inspect manifest contents
                if project_path:
                    full_path = project_path / path_str
                    if full_path.exists():
                        try:
                            content = full_path.read_text(encoding="utf-8", errors="ignore").lower()
                            for kw in matched_keywords:
                                if kw in content:
                                    frameworks.add(kw)
                        except Exception as e:
                            logger.warning(f"Failed to read manifest {path_str}: {e}")
                else:
                    # In absence of file contents, add all keywords as potential framework candidates
                    frameworks.update(matched_keywords)

        return frameworks

    def _detect_imports(self, files: List[dict], project_path: Path | None, code_signals: Dict[str, Set[str]]) -> Set[str]:
        """
        Detect frameworks using code imports.
        """
        frameworks = set()
        if not project_path:
            return frameworks

        # Cap scan to first 100 source files for performance
        source_files = [f for f in files if Path(f["path"]).suffix.lower() in IMPORT_REGISTRY]
        for f in source_files[:100]:
            path_str = f["path"]
            f_path = project_path / path_str
            if not f_path.exists():
                continue

            ext = Path(path_str).suffix.lower()
            import_rules = IMPORT_REGISTRY[ext]

            try:
                content = f_path.read_text(encoding="utf-8", errors="ignore")
                content_lower = content.lower()
                for fw_name, signatures in import_rules.items():
                    for sig in signatures:
                        if sig.lower() in content_lower:
                            frameworks.add(fw_name)
                            code_signals["imports"].add(fw_name.lower())
                            code_signals["imports"].add(sig.lower())
            except Exception as e:
                logger.warning(f"Failed to read source file {path_str} for imports: {e}")

        return frameworks

    def _score_architecture(self, files: List[dict], detected_frameworks: List[str], code_signals: Dict[str, Set[str]]) -> Dict[str, dict]:
        """
        Perform confidence point scoring for each architecture category.
        """
        details = {}
        
        # Populate path parts
        all_path_parts = set()
        for f in files:
            parts = Path(f["path"]).parts
            for p in parts[:-1]: # Exclude filename
                all_path_parts.add(p.lower())

        for category, rules in ARCHITECTURE_RULES.items():
            score = 0
            matched_signals = []

            # 1. Folders check
            for folder in rules["folders"]:
                if folder.lower() in all_path_parts:
                    pt = rules["points"].get("folders", 2)
                    score += pt
                    matched_signals.append(f"folder:{folder}")

            # 2. Files check
            file_names = {Path(f["path"]).name.lower() for f in files}
            for rule_file in rules["files"]:
                if rule_file.lower() in file_names:
                    pt = rules["points"].get("files", 3)
                    score += pt
                    matched_signals.append(f"file:{rule_file}")

            # 3. File patterns check
            for f in files:
                path_lower = f["path"].replace("\\", "/").lower()
                name_lower = Path(f["path"]).name.lower()
                for pattern in rules["file_patterns"]:
                    # Match name or path
                    if fnmatch.fnmatch(name_lower, pattern) or fnmatch.fnmatch(path_lower, pattern):
                        pt = rules["points"].get("file_patterns", 2)
                        score += pt
                        matched_signals.append(f"pattern:{pattern}")
                        break

            # 4. Frameworks check
            for fw in detected_frameworks:
                if fw in rules["frameworks"]:
                    pt = rules["points"].get("frameworks", 3)
                    score += pt
                    matched_signals.append(f"framework:{fw}")

            # 5. Imports/dependencies check
            for sig in code_signals["imports"]:
                for imp_keyword in rules["imports"]:
                    if imp_keyword.lower() in sig:
                        pt = rules["points"].get("imports", 3)
                        score += pt
                        matched_signals.append(f"import:{imp_keyword}")
                        break

            # Deduplicate matched signals
            matched_signals = sorted(list(set(matched_signals)))

            # Calculate confidence level
            threshold = rules["threshold"]
            detected = score >= threshold
            
            if score >= threshold * 2:
                confidence = "High"
            elif score >= threshold:
                confidence = "Medium"
            elif score > 0:
                confidence = "Low"
            else:
                confidence = "None"

            details[category] = {
                "detected": detected,
                "confidence": confidence,
                "score": score,
                "matched_signals": matched_signals
            }

        return details

    def _construct_result(self, details: Dict[str, dict], detected_frameworks: List[str]) -> dict:
        """
        Format results preserving backward compatibility with top-level boolean fields.
        """
        result = {
            "backend": details.get("backend", {}).get("detected", False),
            "frontend": details.get("frontend", {}).get("detected", False),
            "mobile": details.get("mobile", {}).get("detected", False),
            "database": details.get("database", {}).get("detected", False),
            "api": details.get("api", {}).get("detected", False),
            "ai": details.get("ai", {}).get("detected", False),
            "testing": details.get("testing", {}).get("detected", False),
            "docker": details.get("docker", {}).get("detected", False),
            "github_actions": details.get("github_actions", {}).get("detected", False),
            "frameworks": detected_frameworks,
            "details": details
        }
        return result