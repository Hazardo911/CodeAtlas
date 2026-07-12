# Contributing to CodeAtlas

Thank you for contributing to CodeAtlas! 🚀

Please follow these guidelines to keep the project consistent and maintainable.

---

# Repository Structure

```text
CodeAtlas/
├── frontend/
├── backend/
├── .github/
├── CONTRIBUTING.md
└── README.md
```

---

# Development Setup

Clone the repository:

```bash
git clone https://github.com/Hazardo911/CodeAtlas.git
cd CodeAtlas
```

## Frontend

```bash
cd frontend
npm install
npm run dev
```

## Backend

> Coming soon.

---

# Branch Naming

Use descriptive branch names.

Examples:

```text
feature/project-galaxy
feature/upload-flow
feature/auth-api

fix/navbar-hover
fix/api-validation

docs/update-readme

ci/update-frontend-workflow
```

---

# Commit Messages

This project follows the Conventional Commits specification.

Examples:

```text
feat: add project galaxy visualization
fix: resolve upload flow validation
docs: update frontend README
style: format project with Prettier
refactor: simplify upload component
ci: add frontend GitHub Actions workflow
chore: update project dependencies
```

---

# Before Pushing

## Frontend

```bash
cd frontend
npm run check
```

## Backend

Run the backend quality checks once available.

---

# Continuous Integration

GitHub Actions automatically validates changes.

- Changes inside `frontend/` run the **Frontend CI** workflow.
- Changes inside `backend/` run the **Backend CI** workflow.
- Changes affecting both directories run both workflows.

Please ensure all checks pass before requesting a review.

---

# Pull Requests

Before opening a Pull Request:

- Keep each PR focused on a single feature or fix.
- Ensure the relevant project checks pass.
- Complete the Pull Request template.

---

# Code Style

- Follow the existing project structure.
- Use meaningful variable, function, and component names.
- Keep components and modules focused and reusable.
- Format code using the project's configured formatter.
- Follow the project's linting rules.

---

# Questions

If you're unsure about an implementation or architectural decision, discuss it with the team before making large changes.