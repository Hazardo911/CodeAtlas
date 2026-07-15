# CodeAtlas Technical Report

## Submission snapshot

This report describes the CodeAtlas build prepared for OSDHack 2026 on 15 July 2026. Measurements are prototype observations, not broad hardware benchmarks.

## Local AI stack

| Layer | Implementation |
|---|---|
| Generative runtime | Ollama 0.32.0, localhost HTTP API |
| Generative model | `phi3:latest`, Phi-3 family, 3.8B parameters |
| Quantization | Q4_0 reported by the tested Ollama model metadata |
| Download size | Approximately 2.2 GB reported by `ollama list` |
| Loaded CPU footprint | Approximately 3.86 GB reported by Ollama for the loaded model |
| Embedding model | `BAAI/bge-small-en-v1.5` through SentenceTransformers |
| Vector search | FAISS `IndexFlatIP` over normalized embeddings |
| Prompt budget | 9,000 characters, bounded to local model context |
| Output budget | 320 generated tokens |
| Runtime mode tested | CPU-only; Ollama reported 0 bytes VRAM use |

## Tested device and software

| Item | Value |
|---|---|
| Operating system | Windows, 64-bit |
| CPU | Intel Core Ultra 5 125H |
| Accelerator use | CPU-only during recorded test; no GPU VRAM used by Ollama |
| Python | 3.12.6 |
| Node.js | 22.20.0 |
| npm | 10.9.3 |
| Ollama | 0.32.0 |
| Model | `phi3:latest` Q4_0 |

Peak whole-application RAM was not captured with a controlled profiler before submission and is therefore not claimed. Ollama reported an approximately 3.86 GB loaded model allocation in the CPU-only test.

## Latency observation

### Method

1. Import and scan the public `Nexus-Project1` repository used during integration testing.
2. Allow CodeAtlas to create and cache its local FAISS index.
3. Send `What is this project? Answer briefly.` to `/projects/{id}/chat`.
4. Measure wall-clock request time in PowerShell using `Measure-Command`.

### Result

| Scenario | Observed wall time |
|---|---:|
| Already-indexed repository, Phi-3 CPU generation | 42.3 seconds |

The initial request is slower because it may download/load the embedding model and construct the index. Latency varies with repository size, prompt evidence, CPU load, model warm state, and hardware.

## Evaluation

### Automated checks

- Five backend tests pass, covering safe context construction, ignored directories, and ZIP traversal protection.
- Python backend modules pass `compileall`.
- Frontend passes Oxlint and a TypeScript/Vite production build.

### Quality evaluation method

The team manually checks answers against:

1. scanner and architecture JSON outputs;
2. detected framework evidence;
3. retrieved file and line citations;
4. the original repository files.

There is no labelled benchmark dataset or statistically meaningful accuracy score in this prototype. Claiming one would be misleading. Compared with an ungrounded local-model prompt, CodeAtlas adds verified architecture metadata, semantic retrieval, bounded source evidence, framework/database validation, and citations. The benefit is inspectability and repository specificity rather than a claimed universal accuracy percentage.

### Known failure cases

- Broad questions can retrieve metadata instead of the most useful README/source excerpt.
- Phi-3 can still contradict evidence or produce incomplete summaries.
- Unsupported languages have file/framework signals but no symbol-level context.
- Very large repositories are bounded by document, file-size, and chunk-count limits.
- Questions about runtime behavior cannot be proven because CodeAtlas does not execute imported code.
- CPU generation can exceed a minute on slower or busy machines.

## Privacy and local AI verification

### Fully local after model installation

- repository copying, scanning, and architecture detection;
- source filtering and context construction;
- embedding generation;
- FAISS indexing and retrieval;
- Phi-3 inference through Ollama;
- answer rendering and local citations.

### Internet access

- required to clone a public GitHub repository;
- required once to download `phi3:latest` through Ollama;
- required once to download `BAAI/bge-small-en-v1.5` through Hugging Face/SentenceTransformers;
- not required for later local-folder analysis and chat once models are cached.

CodeAtlas does not send repository content to a hosted CodeAtlas service and does not use a cloud LLM API. Strict local operation assumes `OLLAMA_BASE_URL` remains a loopback URL.

### Data handling

- Imported repositories and derived indexes persist under `backend/workspace/`.
- `.env` variants, private keys, common credential files, dependency/build folders, lockfiles, minified assets, source maps, binaries, unknown formats, and oversized files are excluded from source context.
- ZIP path traversal and unsafe multipart relative paths are rejected.
- CodeAtlas analyzes files but does not execute imported repository code.

### Safety limitations

- Repository content is untrusted data and can attempt prompt injection. System grounding rules reduce but do not eliminate this risk.
- Local users with filesystem access can read cached repository data.
- Generated advice must be reviewed before security, deployment, or destructive code changes.

## Attribution

### Models

- Microsoft Phi-3 Mini family, distributed locally through Ollama as `phi3:latest`.
- BAAI `bge-small-en-v1.5` embedding model, loaded through SentenceTransformers.

Model use remains subject to the upstream model licenses and terms distributed by their maintainers.

### Primary open-source libraries

- FastAPI, Uvicorn, Pydantic, HTTPX, python-multipart, aiofiles
- SentenceTransformers, Transformers ecosystem, NumPy, FAISS CPU
- Tree-sitter packages and Python parsing tooling
- React, React DOM, TypeScript, Vite
- Three.js, Motion, OGL
- Ollama local runtime

The complete resolved Python and JavaScript dependency versions are recorded in `uv.lock` and `frontend/package-lock.json`. CodeAtlas source code is licensed under MIT; third-party components retain their respective licenses.

## Reproduction commands

See the root [README](../README.md) for complete installation and run steps. The minimum verification commands are:

```powershell
ollama list
Invoke-RestMethod http://127.0.0.1:8000/ai/status

cd backend
& ..\.venv\Scripts\python.exe -m unittest test_ai_context.py test_ignore.py -v
cd ..\frontend
npm run lint
npm run build
```
