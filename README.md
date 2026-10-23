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
  build, and a blocking audit of production and development dependencies.
- `tests-ci.yml` audits test-suite dependencies, validates the Playwright suite,
  and can run deployed E2E tests.
- `documents-ci.yml` checks documentation integrity and merge-conflict markers.

Each application repository keeps a small `pull_request`/`push` caller workflow
and delegates its jobs to this repository. Backend, frontend, and tests callers
use the `develop` ref so these checks run immediately. After merging and
verifying them, publish a stable tag and update callers from `@develop`.

For private organization repositories, GitHub Actions access for this repository
must allow workflows to be called by the frontend, backend, tests, and documents
repositories. Secrets remain configured in each caller repository or its
protected `staging` environment.

## Staging performance checks

The `Staging performance check` workflow is manually dispatched against the
protected `staging` environment. It runs one bounded wave of read-only requests
through the API Gateway and uploads `performance-results.json`; select 200
users only when the staging environment is approved for that load. It does not
run against production or claim a sustained-load result.

Configure these GitHub Actions staging environment values:

- Variables: `PERF_BASE_URL`, `PERF_PROJECT_ID`, `PERF_INVOICE_ID`,
  `PERF_CLIENT_PROJECT_ID`.
- Secrets: `PERF_AUTH_TOKEN` (an administrator/staff test account) and
  `PERF_CLIENT_AUTH_TOKEN` (the client account for the configured client
  project).

The benchmark covers authenticated gateway routes for auth, users, clients,
leads, quotations, projects, project milestones/tasks/expenses/documents,
invoices/payments, calendar status, document categories, analytics, AI risk,
and the client portal. Contractor, material, and notification services do not
currently have corresponding API Gateway read routes and are marked untested;
they must not be reported as passing. Calendar status is measured without
requesting data from external calendar providers.

Backend, frontend, and tests CI now run `npm audit --audit-level=high`; a
high/critical vulnerability fails the validation job. Audit findings require
remediation or documented release-blocker disposition before release.
