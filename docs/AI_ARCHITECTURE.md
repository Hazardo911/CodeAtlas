# CodeAtlas On-Device AI Architecture

## Decision

CodeAtlas uses a structured-first hybrid retrieval pipeline. Generated project knowledge and
extracted symbols are the primary evidence for architecture and project-level claims. Small,
relevant source excerpts may be indexed and retrieved locally when implementation detail is needed.

Repository content is never sent to a CodeAtlas cloud service. Embeddings are generated locally and
answers are generated through the user's local Ollama daemon.

## Pipeline

```text
Local repository
  -> scanner and architecture detector
  -> symbols.json and knowledge.json
  -> structured metadata documents
  -> safe, bounded local source excerpts
  -> local SentenceTransformer embeddings
  -> local FAISS retrieval
  -> bounded prompt
  -> local Ollama model
  -> answer plus file/line citations
```

The architecture stage does not build embeddings. The AI index is built lazily when project chat is
used for the first time.

## Context policy

The index always begins with:

- project statistics and detected architecture;
- detected frameworks;
- safe file metadata;
- extracted symbols where the parser supports the language.

Source excerpts are added only for eligible local text files. Each excerpt is bounded and records
its original line range. Limits are configurable through the `AI_*` environment variables.

The following are excluded from source context:

- `.env` variants and ignored dependency/build directories;
- credentials files and common private-key formats;
- package manager lockfiles;
- source maps and minified assets;
- binary or unknown file formats;
- files above the configured size limit.

## Privacy boundary

CodeAtlas currently trusts two local processes:

1. the FastAPI backend bound to localhost;
2. Ollama bound to localhost.

Users must not configure `OLLAMA_BASE_URL` to point at a remote service if they require the strict
on-device privacy guarantee. A future desktop build should enforce loopback-only AI endpoints by
default and make remote endpoints an explicit opt-in.

## Current limitations

- Symbol extraction is Python-only.
- The first AI use may need internet access to download the embedding model and Ollama model; later
  use can be offline once both are cached.
- Dependency and call graphs are not implemented.
- The What-if simulator has no backend impact engine.
- Source citations identify retrieved evidence, not formal proof of every statement in an answer.
