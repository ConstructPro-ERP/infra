# ConstructPro ERP - Infrastructure

## Project Description

This repository contains the Infrastructure as Code (Docker, docker-compose, CI/CD configurations, deployment scripts) for the **ConstructPro ERP** system. It supports the deployment and orchestration of the backend API, frontend application, and database services.

**Broader Project:** [ConstructPro ERP Organization](https://github.com/ConstructPro-ERP)

## Prerequisites

- Docker & Docker Compose
- Environment Variables (see `.env.example`)

## Installation & Run Instructions

1. **Clone the repository:**
   ```bash
   git clone https://github.com/ConstructPro-ERP/infra.git
   cd infra
   ```
2. **Set up environment variables:**
   Copy `.env.example` to `.env` and configure your infrastructure secrets.
   ```bash
   cp .env.example .env
   ```
3. **Spin up the environment:**
   ```bash
   docker-compose up -d
   ```

## Deployed Application

Infrastructure provisions: [ConstructPro ERP (Staging)](https://staging.constructpro.com)

## Shared CI

Reusable GitHub Actions workflows live in `.github/workflows`:

- `frontend-ci.yml` runs frontend lint, formatting, tests, build, and audit.
- `backend-ci.yml` runs backend formatting, Prisma generation, lint, tests,
  build, and audit.
- `tests-ci.yml` validates the Playwright suite and can run deployed E2E tests.
- `documents-ci.yml` checks documentation integrity and merge-conflict markers.

Each application repository keeps a small `pull_request`/`push` caller workflow
and delegates its jobs to this repository. The shared workflows currently use
the `develop` ref. After merging and verifying them, publish a stable `v1` tag
and update callers from `@develop` to `@v1`.

For private organization repositories, GitHub Actions access for this repository
must allow workflows to be called by the frontend, backend, tests, and documents
repositories. Secrets remain configured in each caller repository or its
protected `staging` environment.
