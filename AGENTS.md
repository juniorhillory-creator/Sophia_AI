# Sophia AI — OpenCode Project Instructions

## Project Overview

Sophia AI is an AI-powered research paper assistant.

Users can:

- Create accounts using username/email and password.
- Sign in using Google.
- Upload research papers as PDFs.
- Generate structured summaries.
- Ask questions about uploaded papers using RAG.
- View source citations and navigate to PDF pages.
- Manage their research documents.

## Project Documentation

Before making changes, read:

- `design.md`
- `README.md`
- Existing project configuration and source code.

Treat `design.md` as the UI/UX design reference and the existing code as the current implementation.

## Current Development Stage

The project is currently in the frontend development stage.

The first frontend implementation contains a basic Sophia header and PDF upload page.

Continue from the existing implementation. Do not restart or recreate the project.

## Technology Stack

Preferred stack:

- React
- Vite
- TypeScript
- Tailwind CSS
- Python
- FastAPI
- PostgreSQL
- SQLAlchemy
- Ollama
- Sentence Transformers
- ChromaDB

Use the technologies already installed in the project when they satisfy the requirements. Do not replace dependencies without a clear reason.

## Development Rules

1. Inspect the existing implementation before modifying it.
2. Preserve working functionality.
3. Do not rewrite the entire application unnecessarily.
4. Follow `design.md` for UI design.
5. Implement one feature or development phase at a time.
6. Use reusable components.
7. Keep frontend, backend, and business logic separated.
8. Avoid unnecessary abstractions and dependencies.
9. Never implement fake authentication or fake AI responses as final functionality.
10. Do not hardcode secrets.
11. Do not commit `.env` files, uploaded PDFs, model files, or database files.
12. Ask before making destructive changes or deleting existing functionality.
13. Never run `git commit` or `git push` automatically. Leave all git staging, commits, and pushes to the user unless explicitly instructed.

## Security Rules

- Enforce authentication on protected backend endpoints.
- Verify document ownership on every document operation.
- Never expose passwords, password hashes, tokens, or secrets.
- Validate PDF uploads on the backend.
- Never trust user IDs provided by the frontend.
- Keep each user's documents, conversations, and vector data isolated.
- Treat uploaded PDF content as untrusted input.

## AI and RAG Rules

- Ground chatbot answers in retrieved document evidence.
- Generate citations from actual retrieved chunk metadata.
- Never fabricate page numbers or source excerpts.
- If the document does not contain the answer, say so.
- Preserve PDF page numbers throughout extraction, chunking, and retrieval.

## Coding Standards

- Use TypeScript types.
- Use Pydantic schemas for backend validation.
- Follow the existing project conventions.
- Keep components focused and reusable.
- Handle loading, success, empty, and error states.
- Avoid duplicated logic.

## Verification

After each implementation phase:

1. Inspect the changed files.
2. Run relevant tests.
3. Run the frontend build when frontend code changes.
4. Run backend tests when backend code changes.
5. Fix errors caused by the changes.
6. Summarize implemented functionality and remaining issues.

Never claim a feature works unless it has been verified.
