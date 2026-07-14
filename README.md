# 🚀 CodeAtlas

<p align="center">
  <img src="https://img.shields.io/badge/status-active-success.svg" alt="Project Status">
  <img src="https://img.shields.io/badge/python-3.12-blue.svg" alt="Python Version">
  <img src="https://img.shields.io/badge/backend-FastAPI-green.svg" alt="Backend Framework">
  <img src="https://img.shields.io/badge/license-MIT-red.svg" alt="License">
</p>

### 💡 "Understand Any Codebase in Minutes"

CodeAtlas is an on-device, AI-powered codebase analysis platform that scans software repositories, indexes source code using Tree-sitter, automatically infers project architecture using a multi-signal scoring engine, and exposes a secure Retrieval-Augmented Generation (RAG) chat API for codebase exploration.

---

## ✨ Features

- **Multiple Project Sources**: Support for uploading ZIP archives, checking out GitHub repositories, and analyzing local workspace directories.
- **Intelligent Ignore Logic**: Enforces case-insensitive, path-agnostic pruning of dependency folders (e.g. `.venv`, `node_modules`, `build`, `target`) at scan and extraction levels to prevent workspace pollution.
- **Tree-sitter AST Parsing**: Fully indexes programming language files to extract imports, classes, and function structures.
- **Registry-Based Architecture Detection**: Modular, configuration-driven scoring engine that evaluates directories, manifests, file extensions, and code imports to identify layers (Backend, Frontend, Mobile, Database, API, AI, Docker, CI/CD) and calculate confidence levels.
- **Query-Aware Semantic Retrieval**: Vector index retriever that dynamically re-prioritizes context types based on query intent (e.g., placing READMEs first for overview questions, source code first for implementation questions).
- **Hallucination Reducer & Grounding Guardrails**: Dual-stage LLM generation pipeline that scrubs speculative language, detereministically validates mentioned frameworks/databases against verified evidence, and triggers stricter regeneration prompts or sentence-level pruning if unsupported components are mentioned.

---

## 🏗 Architecture

### Project Workflow
```
Upload / Ingestion ──> Workspace Extraction ──> Scanner ──> AST Parser (Tree-sitter)
                                                                    │
Answer Generation <── Ollama (phi3:latest) <── Prompt Builder <── FAISS Index (BAAI/bge)
```

### Supported Upload Methods
- **ZIP Upload**: `POST /projects/upload` - Accepts raw ZIP file multipart uploads.
- **Local Folder Upload**: `POST /projects/upload-folder` - Accepts an absolute path to a folder on the host system, normalizing slash styles dynamically.
- **GitHub Repository Upload**: `POST /projects/upload-github` - Clones a remote repository via HTTP and initializes a workspace.

---

## 🔍 Code Analysis Pipeline

1. **Scanner**: Traverses the extracted repository source using Python 3.12 `Path.walk()`, pruning ignored folders in-place. Generates file lists, sizes, and language distributions.
2. **Parser**: Analyzes files matching supported extensions using Tree-sitter grammars to generate abstract syntax trees and extract symbol definitions.
3. **Health Analyzer**: Audits repository metadata to detect duplicate files, largest modules, empty files, and lines of code.

---

## 🤖 AI Architecture (Local RAG Pipeline)

CodeAtlas runs entirely on-device; no cloud APIs or external LLM tokens are required.

```
Repository Source Code
        │
        ▼
   Scanner (Ignored Pruning)
        │
        ▼
Tree-sitter AST Parser (Symbol Extraction)
        │
        ▼
Knowledge Base Generation (metadata.json, symbols.json, etc.)
        │
        ▼
Embeddings Generation (Local HuggingFace model: BAAI/bge-small-en-v1.5)
        │
        ▼
Vector Indexing (Local FAISS Store)
        │
        ▼
Query-Aware Semantic Retrieval (Score filtering, duplicate file chunk exclusion)
        │
        ▼
Prompt Builder (Strict grounding, verified evidence metadata)
        │
        ▼
Local Ollama Integration (phi3:latest)
        │
        ▼
Evidence-Grounded Answer
```

---

## 🏛 Architecture Detection Engine

Instead of relying solely on folder structures (such as `frontend/` or `backend/`), CodeAtlas uses a modular, configuration-driven scoring engine matching:
* **Manifest Detection**: Reads and parses dependencies in files like `package.json`, `pubspec.yaml`, `pom.xml`, etc.
* **Import Detection**: Scans file headers for framework-specific library import declarations.
* **Framework Detection**: Deduplicates and matches detected frameworks.
* **Rule-based Scoring**: Accumulates category points (e.g. +3 for direct framework match, +3 for code import, +3 for entry file, +2 for folder prefix) and evaluates them against threshold settings.
* **Confidence Levels**: Assigns confidence levels (`High`, `Medium`, `Low`, `None`) based on the score threshold.

---

## 🧠 Supported Ecosystems

### Supported Languages
* Python (`.py`)
* JavaScript (`.js`, `.jsx`)
* TypeScript (`.ts`, `.tsx`)
* Java (`.java`)
* Go (`.go`)
* Rust (`.rs`)
* C++ (`.cpp`, `.c`, `.h`, `.hpp`)
* C# (`.cs`)
* PHP (`.php`)
* Ruby (`.rb`)
* Dart (`.dart`)
* Swift (`.swift`)
* Kotlin (`.kt`)

### Supported Frameworks & Libraries
| Language | Frameworks / Libraries |
| :--- | :--- |
| **Python** | FastAPI, Django, Flask, Pyramid, Tornado, Sanic |
| **JavaScript / TypeScript** | React, Next.js, Vue, Nuxt, Angular, Svelte, SvelteKit, Astro, Remix, SolidJS, Express, NestJS |
| **Java** | Spring Boot |
| **Go** | Gin, Fiber, Echo |
| **Rust** | Actix, Rocket, Axum |
| **PHP** | Laravel, Symfony |
| **Mobile** | Flutter, React Native, Android (Native), iOS (Native) |
| **AI / RAG** | LangChain, Ollama, Sentence Transformers, FAISS |

---

## 📂 Workspace Structure & Generated Outputs

Every project workspace receives its own unique folder inside `workspace/{project_id}/` where intermediate representations are cached:

```
workspace/{project_id}/
├── source/                  # Extracted source code files
├── cache/                   # Generated code-analysis JSON outputs
│   ├── scan_result.json     # File listing and language metadata
│   ├── health.json          # Lines of code and project statistics
│   ├── symbols.json         # Tree-sitter parsed imports, classes, and functions
│   ├── architecture.json    # Evaluated architecture checkpoints and details
│   ├── project_summary.json # High-level project summary overview
│   └── knowledge.json       # Combined knowledge base payload
└── embeddings/              # Local Vector Database
    ├── index.bin            # FAISS vector index binary
    └── documents.json       # Document text chunks, classifications, and symbol mappings
```

---

## 🔌 API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/projects/upload` | Upload a ZIP archive to initialize a workspace. |
| `POST` | `/projects/upload-folder` | Ingest a project from an absolute path on the host system. |
| `POST` | `/projects/upload-github` | Checkout and clone a remote GitHub repository. |
| `POST` | `/projects/{id}/scan` | Scan files, analyze health metrics, and extract AST symbols. |
| `POST` | `/projects/{id}/architecture` | Run the multi-signal registry-driven architecture detector. |
| `POST` | `/projects/{id}/chat` | Ask technical questions about the codebase using local RAG. |

---

## 📦 Installation & Running Locally

### 1. Prerequisite Checks
* Python **3.12.x** installed.
* [Ollama](https://ollama.com/) running locally with the `phi3:latest` model downloaded:
  ```bash
  ollama pull phi3:latest
  ```

### 2. Clone and Setup Environment
```bash
git clone <repository-url>
cd CodeAtlas/backend
```

### 3. Install dependency manager `uv`
```bash
pip install uv
```

### 4. Create and Sync Virtual Environment
```bash
uv venv
# On Windows PowerShell
.venv\Scripts\activate

# Sync packages
uv sync
```

### 5. Start the API Server
```bash
uv run uvicorn app.main:app --reload --port 8000
```
* **API Address**: `http://127.0.0.1:8000`
* **Swagger Documentation Docs**: `http://127.0.0.1:8000/docs`

---

## 📸 Screenshots Placeholders

### Ingestion & Scanning
* **Repository Upload**: `[Screenshot Placeholder: upload_endpoints.png]`
* **Architecture Detection**: `[Screenshot Placeholder: architecture_endpoints.png]`

### AI Chat & Developer Docs
* **Swagger API UI**: `[Screenshot Placeholder: swagger_docs.png]`
* **Chat Interface**: `[Screenshot Placeholder: rag_chat_interface.png]`
* **Architecture Diagram**: `[Screenshot Placeholder: system_diagram.png]`

---

## 🛣 Roadmap

### Completed Milestones
* [x] **Ingestion Engine**: ZIP, Local Folder, and GitHub clone sources.
* [x] **Ignore Safeguards**: Centralized path exclusion logic.
* [x] **Repository Scanner**: Folder traversing, language detection, health audits.
* [x] **AST Parser**: Tree-sitter indexing and symbol extraction.
* [x] **Registry Architecture Detector**: Multi-signal scoring for backend/frontend/mobile/database layers.
* [x] **On-Device RAG Pipeline**: SentenceTransformers embeddings, FAISS indexing, Ollama API connector.
* [x] **Quality Guardrails**: Speculation scrubbing, database/framework alignment check, sentence-pruning fallback.

### Future Backlog
* [ ] **Dependency Graph**: Generate imports-based module maps.
* [ ] **Architecture Visualization**: Render interactive network graphics of layers.
* [ ] **Multi-Language AST Parse**: Fully implement Tree-sitter parsers for TypeScript, Java, and Rust files.
* [ ] **Automatic Code Review**: Highlight anti-patterns, duplicate logic blocks, and security flaws.
* [ ] **Documentation Generator**: Auto-generate markdown wiki pages.

---

## 🤝 Contributing

Contributions are welcome. Please open an issue or submit a pull request for additional parser grammars, framework rules, or UI visual enhancements.

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.