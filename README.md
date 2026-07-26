# Continuum

## Project Overview

Continuum is an AI-native persistent intelligence platform for autonomous missions. This repository is its engineering foundation: a deliberately minimal monorepo ready for teams to add services, interfaces, and domain capabilities without coupling them prematurely.

## Vision

Build a durable platform where autonomous systems can preserve context, reason across time, and execute well-defined missions responsibly. The current repository contains no product implementation; it establishes the boundaries and development standards that future work will use.

## Tech Stack

- **Workspace:** pnpm and Turborepo
- **Language:** TypeScript
- **Future applications:** Next.js, NestJS, and dedicated simulation tooling
- **Future platform services:** CockroachDB, Prisma, and Amazon Bedrock
- **Quality tooling:** ESLint, Prettier, Husky, lint-staged, and GitHub Actions

## Repository Structure

```text
apps/
  api/          Future NestJS API boundary
  web/          Future Next.js application
  simulator/    Future mission-simulation tooling
packages/
  config/       Shared TypeScript, ESLint, and Prettier configuration
  shared/       Future shared types and utilities
  agents/       Future agent abstractions and orchestration
  memory-engine/Future persistent-memory infrastructure
  prompts/      Future prompt assets and management abstractions
docs/
  architecture/ Architecture decision records and technical design
  diagrams/     System diagrams
  prd/          Product requirements documents
  research/     Research notes
```

## Development Setup

Prerequisites: Node.js 22 or later and pnpm 10 or later. Corepack can install the repository-pinned pnpm version:

```bash
corepack enable
pnpm install
```

Common commands:

```bash
pnpm lint
pnpm typecheck
pnpm test
pnpm build
pnpm format
```

Git hooks run lint-staged before each commit, formatting staged files and applying safe ESLint fixes. Copy an app's `.env.example` to `.env.local` only when that application gains runtime configuration; never commit secrets.

## License

This project is licensed under the [MIT License](LICENSE).
