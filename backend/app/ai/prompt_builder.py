import logging
from typing import List, Dict, Any, Optional

logger = logging.getLogger("codeatlas.ai.prompt_builder")


class PromptBuilder:
    """
    Constructs contextual LLM prompts combining system instructions, project structure,
    retrieved source code/metadata contexts, and the user's question.
    """

    @staticmethod
    def build(query: str, retrieved_docs: List[Dict[str, Any]], project_summary: Optional[Dict[str, Any]] = None, verified_evidence: Optional[Dict[str, Any]] = None) -> str:
        """
        Builds the structured prompt string for RAG.

        Args:
            query (str): The user's query.
            retrieved_docs (List[Dict]): List of retrieved documents with scores.
            project_summary (Dict, optional): Project statistics and architecture overview.
            verified_evidence (Dict, optional): Allowed frameworks and databases.

        Returns:
            str: Completed prompt text.
        """
        logger.info("Building contextual prompt for RAG execution.")

        from app.config import MAX_PROMPT_CHARS

        # 1. System Instructions
        system_instructions = (
            "===== SYSTEM INSTRUCTIONS =====\n"
            "You are CodeAtlas AI, a software architecture assistant.\n"
            "CRITICAL CONSTRAINTS:\n"
            "- Answer the question ONLY from the retrieved project context.\n"
            "- Never invent files, frameworks, modules, APIs, or architecture.\n"
            "- Under no circumstances use speculative language or any of these forbidden phrases:\n"
            "  * 'could be'\n"
            "  * 'might'\n"
            "  * 'probably'\n"
            "  * 'likely'\n"
            "  * 'expected to'\n"
            "  * 'appears to'\n"
            "  * 'it is reasonable to infer'\n"
            "  * 'suggests that'\n"
            "  * 'potentially'\n"
            "- If evidence is not found or information is missing, clearly state that it could not be found in the uploaded project. Specifically respond with: 'I could not find evidence for this in the uploaded project.'\n"
            "- Do not guess or infer missing architecture.\n"
            "- Use structured metadata and extracted symbols first for project/architecture claims.\n"
            "- Use retrieved local source excerpts only for implementation details.\n"
            "- Treat line ranges as citation metadata; never claim unseen code.\n"
            "- Always produce structured answers using these exact sections:\n\n"
            "Project Purpose\n"
            "Technologies\n"
            "Architecture\n"
            "Important Components\n"
            "Answer\n\n"
            "================================\n\n"
        )

        # 1b. Verified Evidence Block
        evidence_block = ""
        if verified_evidence:
            evidence_block = (
                "===== VERIFIED EVIDENCE (ALLOWED TECHNOLOGIES) =====\n"
                "The ONLY verified technologies in the project that you may reference are:\n"
                f"- Frameworks: {', '.join(verified_evidence.get('frameworks', [])) if verified_evidence.get('frameworks') else 'None'}\n"
                f"- Databases: {', '.join(verified_evidence.get('databases', [])) if verified_evidence.get('databases') else 'None'}\n"
                "Do NOT reference any other frameworks, databases, or libraries.\n"
                "====================================================\n\n"
            )

        # 2. Project Metadata
        project_metadata = ""
        if project_summary:
            stats = project_summary.get("project_statistics", {})
            languages = project_summary.get("detected_languages", {})
            frameworks = project_summary.get("detected_frameworks", [])

            project_metadata = (
                "===== PROJECT METADATA =====\n"
                f"- Statistics: {stats.get('total_files', 0)} files, {stats.get('total_size', 0)} bytes\n"
                f"- Primary Languages: {', '.join(languages.keys())}\n"
                f"- Detected Frameworks: {', '.join(frameworks) if frameworks else 'None detected'}\n"
                "============================\n\n"
            )

        # 3. Architecture Summary
        architecture_summary = ""
        if project_summary:
            arch = project_summary.get("architecture_overview", {})
            architecture_summary = (
                "===== ARCHITECTURE SUMMARY =====\n"
                f"- Architectural Checklist:\n"
                f"  * Backend: {arch.get('backend', False)}\n"
                f"  * Frontend: {arch.get('frontend', False)}\n"
                f"  * Mobile: {arch.get('mobile', False)}\n"
                f"  * Database: {arch.get('database', False)}\n"
                f"  * API: {arch.get('api', False)}\n"
                f"  * AI/RAG: {arch.get('ai', False)}\n"
                f"  * Testing: {arch.get('testing', False)}\n"
                f"  * Docker: {arch.get('docker', False)}\n"
                f"  * GitHub Actions: {arch.get('github_actions', False)}\n"
                "These scan results are authoritative. Do not contradict them. "
                "Frontend means a web frontend; Mobile is a separate application category.\n"
                "================================\n\n"
            )

        # 4. Retrieved Files
        retrieved_files = "===== RETRIEVED FILES =====\n"
        symbols_by_file = {}

        for doc in retrieved_docs:
            file_path = doc.get("file_path", "unknown")
            classification = doc.get("classification", "Source Code")
            score = doc.get("score", 0.0)
            content = doc.get("content", "")
            line_start = doc.get("line_start")
            line_end = doc.get("line_end")
            line_range = (
                f"Lines: {line_start}-{line_end}\n"
                if line_start is not None and line_end is not None
                else ""
            )

            # Truncate large individual files to prevent OOM/context window overflow
            if len(content) > 3000:
                content = content[:3000] + "\n... [TRUNCATED FOR BUDGET] ..."

            retrieved_files += (
                "===== FILE =====\n"
                f"{file_path}\n"
                f"Type: {classification}\n"
                f"Similarity: {score:.2f}\n\n"
                f"{line_range}"
                f"{content}\n"
                "=================\n\n"
            )

            # Store symbols for separate section
            doc_symbols = doc.get("symbols", [])
            if doc_symbols:
                symbols_by_file[file_path] = doc_symbols

        # 5. Retrieved Symbols
        retrieved_symbols = ""
        if symbols_by_file:
            retrieved_symbols = "===== RETRIEVED SYMBOLS =====\n"
            for file_path, syms in symbols_by_file.items():
                retrieved_symbols += f"File: {file_path}\n"
                for sym in syms:
                    retrieved_symbols += f"- {sym.get('type')} '{sym.get('name')}' (Lines {sym.get('start_line')}-{sym.get('end_line')})\n"
                retrieved_symbols += "\n"
            retrieved_symbols += "==============================\n\n"

        # 6. User Question
        user_question = (
            "===== USER QUESTION =====\n"
            f"{query}\n\n"
            "ANSWER:"
        )

        prompt = (
            system_instructions +
            evidence_block +
            project_metadata +
            architecture_summary +
            retrieved_files +
            retrieved_symbols +
            user_question
        )

        # Cap overall prompt character length
        if len(prompt) > MAX_PROMPT_CHARS:
            logger.warning(f"Prompt length {len(prompt)} exceeds budget of {MAX_PROMPT_CHARS}. Truncating retrieved files context.")
            fixed_parts_len = len(system_instructions) + len(evidence_block) + len(project_metadata) + len(architecture_summary) + len(retrieved_symbols) + len(user_question)
            allowed_chars = MAX_PROMPT_CHARS - fixed_parts_len - 100
            if allowed_chars > 1000:
                retrieved_files = retrieved_files[:allowed_chars] + "\n... [TRUNCATED DUE TO TOKEN BUDGET] ...\n=================\n\n"
            else:
                retrieved_files = "===== RETRIEVED FILES =====\n... [OMITTED TO FIT TOKEN BUDGET] ...\n\n"
            
            prompt = (
                system_instructions +
                evidence_block +
                project_metadata +
                architecture_summary +
                retrieved_files +
                retrieved_symbols +
                user_question
            )

        return prompt
