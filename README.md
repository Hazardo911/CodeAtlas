# 🚀 CodeAtlas

<p align="center">

**Understand Any Codebase in Minutes**

An AI-powered codebase analysis platform that scans software projects, understands their architecture, indexes source code using Tree-sitter, and provides intelligent insights for developers.

---

⚠️ **Project Status:** Under Active Development

Current Version: **v0.1.0**

---

## 📖 Overview

Modern software projects are becoming larger and more complex every day. Understanding an unfamiliar codebase often takes hours or even days.

CodeAtlas aims to solve this problem.

Instead of manually exploring hundreds of files, developers simply upload their project, and CodeAtlas automatically:

- Scans the repository
- Detects project structure
- Identifies technologies used
- Builds a software architecture overview
- Extracts classes, functions, methods, and imports
- Creates a searchable project knowledge base
- (Upcoming) Allows developers to ask AI questions about the project

The long-term vision is to make onboarding into any codebase as simple as opening ChatGPT.

---

# 🎯 Project Goal

CodeAtlas is designed to become an intelligent software architecture assistant.

Instead of only displaying files and folders, it understands relationships inside a project.

For example:

```
Frontend

↓

API

↓

Backend

↓

Database
```

Eventually, developers will be able to ask questions like:

- Explain this project.
- Where is authentication implemented?
- Which file handles payments?
- Show the architecture.
- Which functions call this method?
- Explain this class.

without manually reading the source code.

---

# 🏗 Current Features

## ✅ Project Upload

Currently supported:

- ZIP File Upload

Upcoming:

- Local Folder Upload
- GitHub Repository URL

Every uploaded project is automatically converted into a standard workspace.

---

## ✅ Repository Scanner

The scanner automatically discovers:

- Files
- Directories
- File extensions
- Programming languages
- File sizes

Current output includes:

- Total files
- Total directories
- Language distribution
- File metadata

---

## ✅ Health Analysis

The health analyzer generates basic project statistics such as:

- Largest file
- Empty files
- Average file size
- Total project size

Future versions will include:

- Cyclomatic Complexity
- Maintainability Index
- Duplicate Code
- Dead Code Detection
- Dependency Health

---

## ✅ Architecture Detection

Current architecture detection identifies whether the project contains:

- Backend
- Frontend
- Database
- API
- AI Modules
- Docker
- GitHub Actions
- Testing

This gives a quick overview of the repository before opening any source files.

---

## ✅ Python Code Parsing (Tree-sitter)

The project now integrates **Tree-sitter** for source code parsing.

Currently implemented:

- Import detection
- Class detection
- Function detection

Upcoming:

- Methods
- Async functions
- Decorators
- Docstrings
- Variables
- Function parameters
- Return types

---

## 🚧 AI Features (In Progress)

Upcoming capabilities include:

- AI Codebase Chat
- Architecture Explanation
- Documentation Generation
- Code Review
- Developer Onboarding
- Project Summaries
- Dependency Explanation

The AI will use the indexed project data instead of scanning source code directly.

---

# 🏛 Current Backend Architecture

```
backend/

├── app/
│
├── api/
│
├── analysis/
│
├── parser/
│
├── scanner/
│
├── services/
│
├── database/
│
├── ai/
│
├── utils/
│
├── config.py
│
└── main.py

data/

workspace/

tests/
```

Each module has only one responsibility.

---

# 📂 Workspace Structure

Every uploaded project receives its own workspace.

Example:

```
workspace/

project_id/

metadata.json

original.zip

logs/

cache/

source/
```

### Source

Contains the extracted project files.

### Cache

Stores generated analysis.

Current cache files:

```
scan_result.json

health.json

architecture.json
```

Upcoming:

```
symbols.json
```

---

# ⚙️ Current Workflow

```
Upload ZIP

↓

Extract Project

↓

Create Workspace

↓

Scan Files

↓

Detect Languages

↓

Generate Health Report

↓

Detect Architecture

↓

Tree-sitter Parser

↓

(Upcoming)

Generate Symbols

↓

(Upcoming)

AI
```

---

# 📊 Current Progress

| Module | Status |
|---------|--------|
| Backend Setup | ✅ Completed |
| Upload Pipeline (ZIP) | ✅ Completed |
| Workspace Manager | ✅ Completed |
| Scanner | ✅ Completed |
| Health Analysis | ✅ Completed |
| Architecture Detection | ✅ Completed |
| Python Tree-sitter | 🟡 In Progress |
| AI Engine | 🔴 Not Started |
| React Parser | 🔴 Planned |
| GitHub Upload | 🔴 Planned |
| Local Folder Upload | 🔴 Planned |

Overall project completion:

**≈ 40%**

---

# 🧠 Supported Languages

Current:

- Python

Planned:

- JavaScript
- TypeScript
- React
- Java
- C++
- Go
- Rust

---

# 🚀 Installation

## 1. Clone Repository

```bash
git clone <repository-url>

cd CodeAtlas/backend
```

---

## 2. Install Python

Recommended:

Python **3.12.x**

Verify:

```bash
python --version
```

---

## 3. Install UV

Windows:

```bash
pip install uv
```

Verify:

```bash
uv --version
```

---

## 4. Create Virtual Environment

```bash
uv venv
```

Activate:

Windows

```powershell
.venv\Scripts\activate
```

---

## 5. Install Dependencies

```bash
uv sync
```

---

# ▶ Running the Backend

From the backend folder:

```bash
uv run uvicorn app.main:app --reload
```

Server starts at:

```
http://127.0.0.1:8000
```

Swagger Documentation:

```
http://127.0.0.1:8000/docs
```

---

# 🖥 How to Use CodeAtlas

## Step 1

Start the backend.

```bash
uv run uvicorn app.main:app --reload
```

---

## Step 2

Open Swagger.

```
http://127.0.0.1:8000/docs
```

---

## Step 3

Locate:

```
POST

/projects/upload
```

---

## Step 4

Click

```
Try it out
```

---

## Step 5

Select a ZIP file containing your project.

Example:

```
VoyageOS.zip
```

---

## Step 6

Execute.

The backend automatically:

- Creates a unique project ID
- Creates a workspace
- Stores project metadata
- Extracts the ZIP
- Ignores unnecessary folders (e.g. `.venv`, `.git`)
- Stores project source files

---

## Step 7

Copy the returned Project ID.

Example:

```
ae8a56da-413e-492a-b3fb-4ca738c71f0b
```

---

## Step 8

Use the Project ID with analysis endpoints.

Current available endpoints generate:

- Project Scan
- Health Report
- Architecture Report

---

## Step 9 (Current Development)

Run the Tree-sitter parser to analyze Python files and extract:

- Imports
- Classes
- Functions

This functionality is currently tested using the included parser test script and will soon be available as an API endpoint.

---

# 📁 Generated Output

Current outputs:

```
metadata.json

scan_result.json

health.json

architecture.json
```

Upcoming:

```
symbols.json

dependency_graph.json

embeddings.json
```

---

# 🛣 Roadmap

### Phase 1

- ZIP Upload
- Scanner
- Health
- Architecture
- Python Parser

### Phase 2

- Symbols API
- Methods
- Decorators
- Async Functions

### Phase 3

- React Parser
- JavaScript Support
- GitHub Upload
- Local Folder Upload

### Phase 4

- AI Assistant
- Documentation Generator
- Code Review
- Architecture Visualization
- RAG Search

---

# 🤝 Contributing

Contributions are welcome.

Future improvements include:

- Additional language support
- Better architecture detection
- Dependency graphs
- AI enhancements
- Performance optimizations

---

# 📄 License

MIT License

---

# ⭐ Future Vision

CodeAtlas aims to become an intelligent software understanding platform capable of analyzing complete software systems instead of individual files.

The long-term goal is to allow developers to upload any repository and immediately understand:

- Project architecture
- Code organization
- Dependencies
- Design patterns
- Technologies used
- Documentation
- Developer onboarding
- AI-assisted code exploration

Making software projects understandable in minutes instead of days.