# CodeAtlas Frontend

The frontend application for **CodeAtlas**, an AI-powered software architecture visualization platform that helps developers understand complex codebases through interactive visualizations and intelligent analysis.

---

## Feature status

- ✅ **Repository Upload** – Sends browser-selected folders to the local FastAPI workspace.
- ✅ **Architecture Detection** – Displays real backend framework, layer, confidence, and evidence results.
- ✅ **Repository Metrics** – Displays measured files, folders, sizes, empty files, and languages.
- ✅ **Local RAG Chat** – Uses the uploaded project index when Ollama and the configured model are available.
- 🟡 **Repository Galaxy** – Live projects show scan-derived folder topology; dependency edges are not implemented.
- 🟡 **Reading Guide** – Uses verified scan metadata, not generated semantic onboarding.
- 🧪 **What-if Simulator** – Concept preview only; the backend impact engine is not implemented.

---

## Tech Stack

- React
- TypeScript
- Vite
- CSS3
- Oxlint
- Prettier
- GitHub Actions (CI)

---

## Prerequisites

- Node.js **22+**
- npm

---

## Getting Started

### Clone the repository

```bash
git clone https://github.com/Hazardo911/CodeAtlas.git
cd CodeAtlas/frontend
```

### Install dependencies

```bash
npm install
```

### Start the development server

```bash
npm run dev
```

The application will be available at:

```text
http://localhost:5173
```

---

# Available Scripts

## Development

### Start Development Server

```bash
npm run dev
```

Starts the Vite development server with Hot Module Replacement (HMR).

---

### Build for Production

```bash
npm run build
```

Compiles TypeScript and creates an optimized production build.

---

### Preview Production Build

```bash
npm run preview
```

Serves the production build locally.

---

# Code Quality

### Run All Project Checks

```bash
npm run check
```

Runs all quality checks:

- ✅ Prettier formatting check
- ✅ Oxlint
- ✅ Production build

This is the recommended command to run before pushing changes.

---

### Format the Project

```bash
npm run format
```

Formats all supported files using Prettier.

---

### Check Formatting

```bash
npm run format:check
```

Checks whether all files follow the configured formatting rules without modifying them.

---

### Run Oxlint

```bash
npm run lint
```

Checks the project for code quality issues and potential bugs.

---

### Automatically Fix Lint Issues

```bash
npm run lint:fix
```

Automatically fixes supported Oxlint issues.

---

## Development Workflow

Before pushing changes, run:

```bash
npm run check
```

This verifies that:

- Formatting is correct
- Linting passes
- The project builds successfully

The same checks are automatically executed by GitHub Actions on every push and pull request.

---

## Project Structure

```text
frontend/
├── public/
├── src/
│   ├── assets/
│   ├── components/
│   ├── App.tsx
│   ├── App.css
│   ├── index.css
│   ├── main.tsx
│   └── wide.css
├── .github/
│   └── workflows/
├── .oxlintrc.json
├── .prettierrc
├── .prettierignore
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## Continuous Integration

GitHub Actions automatically verifies every push and pull request by:

- Installing dependencies
- Checking formatting with Prettier
- Running Oxlint
- Building the production bundle

---

## Contributing

1. Create a new branch from `frontend`.
2. Make your changes.
3. Run:

```bash
npm run check
```

4. Commit your changes.
5. Open a Pull Request.

---

## License

This project is licensed under the MIT License. See the repository's `LICENSE` file for details.
