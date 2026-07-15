# OSDHack 2026 Final Submission Checklist

Deadline: **15 July 2026, 6:00 PM IST**. Only commits before the deadline are considered.

## Must complete before submission

- [ ] Record the 2–3 minute demo using `docs/DEMO_SCRIPT.md`.
- [ ] Upload the video as unlisted YouTube or judge-accessible Drive.
- [ ] Replace the demo placeholder near the top of `README.md` with the URL.
- [ ] Add the same demo URL to the Unstop submission.
- [ ] Confirm <https://github.com/Hazardo911/CodeAtlas> is public.
- [ ] Confirm the final commit appears on the remote `develop` branch before 6:00 PM.
- [ ] Decide whether judges should use `develop` or merge the final build into the repository's default branch. Clearly submit the exact branch URL.
- [ ] Submit through <https://unstop.com/o/1693803> while logged in as the team leader.
- [ ] Submit early enough to reopen and verify the entry before 6:00 PM.

## Repository checks

- [x] MIT license exists.
- [x] Reproducible backend and frontend commands are documented.
- [x] Sample inputs and expected outputs are documented.
- [x] On-device/local versus internet-required components are documented.
- [x] Architecture and data flow are documented.
- [x] Runtime, model, quantization, size, latency, and tested CPU are documented.
- [x] Evaluation method and failure cases are documented.
- [x] Privacy, storage, permissions, risks, and limitations are documented.
- [x] Models and major libraries are attributed.
- [ ] Add 2–4 current product screenshots to the README if time permits.

## Final smoke test

```powershell
cd E:\CodeAtlas\CodeAtlas
uv sync --locked
cd backend
& ..\.venv\Scripts\python.exe -m unittest test_ai_context.py test_ignore.py -v

cd ..\frontend
npm install
npm run lint
npm run build
```

Manual flow:

- [ ] `/health` returns healthy.
- [ ] `/ai/status` reports Ollama and `phi3:latest` available.
- [ ] GitHub import completes.
- [ ] Architecture shows detected evidence.
- [ ] 3D Galaxy loads and remains interactive.
- [ ] Repository metrics and onboarding load.
- [ ] AI Chat completes a pre-tested question and shows evidence citations where available.
- [ ] Back to home works.

## Suggested Unstop text

**Project title:** CodeAtlas — Private On-Device AI Software Architect

**One-line summary:** CodeAtlas converts an unfamiliar repository into evidence-based architecture signals, an interactive 3D map, and locally generated AI answers without sending source code to a cloud LLM.

**Repository:** <https://github.com/Hazardo911/CodeAtlas>

**Branch:** `develop` until merged into the default branch.

**Demo:** `PASTE FINAL VIDEO URL`

**On-device AI:** BAAI/bge-small-en-v1.5 embeddings, local FAISS retrieval, and quantized Phi-3 generation through Ollama all run on the user's machine. Internet is needed only for initial model downloads and optional public GitHub import.
