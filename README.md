# Naruto RPG — AI-driven interactive story engine

A lightweight React + Express TypeScript app that runs an interactive Naruto-flavored RPG: a frontend chat-driven Game Master UI, server endpoints for AI chat, memory syncing, and an audio engine for scene music/SFX.

Stack
- Language(s): TypeScript (frontend + server)
- Framework / runtime: Vite + React (frontend), Express (server)
- Notable libraries: openai (OpenAI SDK), vite, react, tailwindcss (present), tsx (dev runner)

Quickstart — run locally

Prerequisites
- Node.js 18+ (Node 20 recommended)
- Optional: ffmpeg & yt-dlp if you plan to use the audio import features

Install and run (development)

```bash
# install deps
npm ci

# run in dev mode (server with Vite middleware)
npm run dev
```

Build & run (production)

```bash
# build frontend and server artifact
npm run build

# start the built server
npm run start
```

Environment
- Copy `.env.example` to `.env` or set environment variables directly.
- The server will try to read OPENAI_API_KEY (and OPENAI_MODEL) from the environment. If you leave them unset, the frontend can still operate but chat generation requires an API key.

Repository layout (important top-level files)

```
package.json        # npm scripts and dependencies
tsconfig.json       # TypeScript config
server.ts           # Express server entry (handles /api/* endpoints)
src/                # Frontend React app (App.tsx, components, utils)
storage/            # runtime audio & generated data (created at runtime)
audio/              # bundled audio assets & libraries
data/               # static / generated data
tests/              # test files (if present)
README.md
```

How it fits together
- The Express server (server.ts) exposes API endpoints used by the React frontend (src/*). The chat endpoint streams model responses using the OpenAI SDK. Audio-related endpoints handle import, normalization, and library management (yt-dlp/ffmpeg features).

Notes & recommendations
- The project already has a `dev` script that runs `tsx server.ts` which starts the server in dev mode with Vite middleware.
- The current `lint` script runs `tsc --noEmit` (i.e., type-check). Consider adding dedicated linting (ESLint) and a test runner.

What I changed
- Clarified README with run/build instructions, environment notes, and a short repo overview.
- Added a GitHub Actions CI workflow (see .github/workflows/ci.yml) that installs dependencies, runs type-check (current `lint` script), and builds the project.
- Added Dependabot configuration (.github/dependabot.yml) to keep npm dependencies up to date weekly.

Next improvements I can make (pick any):
- Add ESLint + Prettier configs and a formatting/linting pipeline
- Add unit tests + GitHub Action test step (Vitest or Jest)
- Add stricter tsconfig with `strict: true` and a `typecheck` script in package.json
- Add pre-commit hooks (husky + lint-staged) and a CODEOWNERS/CONTRIBUTING.md

If you'd like, I can open a PR that adds ESLint + Prettier and a stricter tsconfig, and update package.json scripts accordingly.
