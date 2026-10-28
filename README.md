# ConstructPro ERP - Infrastructure

[![CI](https://github.com/ConstructPro-ERP/infra/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/ConstructPro-ERP/infra/actions/workflows/ci.yml) [![Performance tooling tests](https://img.shields.io/badge/runner%20tests-5%20passed-blue)](https://github.com/ConstructPro-ERP/infra/blob/develop/tests/performance/runner.test.mjs)

**Live application:** https://construct-pro-teal.vercel.app/  
**API documentation (Swagger):** https://construct-pro-api-gateway.vercel.app/api/docs  
**Project organization:** https://github.com/ConstructPro-ERP  
**Project board:** https://github.com/orgs/ConstructPro-ERP/projects/2

## Overview

This repository provides **reusable GitHub Actions workflows and performance testing tooling** for ConstructPro ERP, a cloud-based business management platform for Ishara Homes Pvt. Ltd.

The project uses a Next.js frontend and **14 NestJS backend applications (one API Gateway and 13 domain services)**, with a shared Neon PostgreSQL database managed through Prisma 7. Frontend and backend applications are deployed through Vercel. CI and supporting test workflows are maintained here to avoid duplicating workflow logic across the application repositories.

This checkout contains GitHub Actions configuration, small Node.js performance tools, and optional workflow snippets. It is **not** an independent application and does not contain a full application runtime setup, infrastructure provisioning system, or an application-wide Docker Compose stack.

## Demonstration Accounts

Open the **live application landing page** linked above before signing in with a demonstration account.

| Role               | Email                       | Password             |
| ------------------ | --------------------------- | -------------------- |
| Administrator      | `admin.demo@example.com`    | `DemoAdministrator`  |
| Sales Manager      | `sales.demo@example.com`    | `DemoSalesManager`   |
| Project Manager    | `projects.demo@example.com` | `DemoProjectManager` |
| Accountant         | `accounts.demo@example.com` | `DemoAccountant`     |
| Client Portal User | `client.demo@example.com`   | `DemoClient`         |

These are application demonstration accounts, not the credentials used by CI or the performance benchmark. CI credentials and record IDs are supplied separately through GitHub Actions secrets and environment variables.

## Repository Layout

| Path                                                                                 | Purpose                                                                    |
| ------------------------------------------------------------------------------------ | -------------------------------------------------------------------------- |
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml)                               | Validate infrastructure workflows and performance tooling                  |
| [`.github/workflows/frontend-ci.yml`](.github/workflows/frontend-ci.yml)             | Shared frontend validation                                                 |
| [`.github/workflows/backend-ci.yml`](.github/workflows/backend-ci.yml)               | Shared backend validation and Cloudinary integration                       |
| [`.github/workflows/tests-ci.yml`](.github/workflows/tests-ci.yml)                   | Playwright validation and optional deployed E2E                            |
| [`.github/workflows/documents-ci.yml`](.github/workflows/documents-ci.yml)           | Markdown/documentation checks                                              |
| [`.github/workflows/performance-check.yml`](.github/workflows/performance-check.yml) | Manually dispatched performance benchmark                                  |
| [`tests/performance/runner.mjs`](tests/performance/runner.mjs)                       | Bounded authenticated GET workload                                         |
| [`tests/performance/runner.test.mjs`](tests/performance/runner.test.mjs)             | Node tests for performance runner                                          |
| [`snippets/`](snippets/)                                                             | Optional, **not automatically active**, coverage and E2E workflow snippets |
| [`CHANGELOG.md`](CHANGELOG.md)                                                       | Infrastructure change history                                              |

## Prerequisites

- Git
- Node.js **24** (matches CI)
- Access to this GitHub organization for workflow contributions
- The application frontend/backend environments only when running integration or performance checks

No `npm install` or local `.env` is required to execute the performance runner's isolated Node tests.

## Installation and Local Validation

```bash
git clone https://github.com/ConstructPro-ERP/infra.git
cd infra
node --check tests/performance/runner.mjs
node --test tests/performance/runner.test.mjs
```

Infrastructure CI runs the JavaScript syntax and runner tests on pushes and pull requests to `develop` and `main`. The final development report records **five passing performance-runner tests**; this is a test count, **not a measured code-coverage percentage**.

The infrastructure workflow also uses actionlint 1.7.12 for workflow syntax validation. With Docker installed, the corresponding manual validation command in PowerShell is:

```powershell
docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:1.7.12
```

Docker is only used for this optional validation command. It is not needed to run the Node performance tooling or the ConstructPro application.

## Shared CI Workflows

Reusable workflows use `workflow_call` and check out their **caller repository**. Node-based jobs use Node.js 24 and `npm ci`, so their package scripts are resolved from each application repository.

| Workflow  | Validations                                                                                                          |
| --------- | -------------------------------------------------------------------------------------------------------------------- |
| Frontend  | ESLint, Prettier check, frontend tests, production build, dependency audit                                           |
| Backend   | Prettier, Prisma client generation, non-mutating ESLint, unit tests, integration tests, full build, dependency audit |
| Tests     | Dependency audit, TypeScript validation, Playwright **test discovery**, optionally browser E2E against staging       |
| Documents | At least one Markdown file; reject unresolved merge-conflict markers in Markdown                                     |

Frontend, backend and tests reusable workflows run `npm audit --audit-level=high` on all dependencies; a high/critical advisory makes the job fail.

An example caller is:

```yaml
name: Frontend CI
on:
  push:
    branches: [develop, main]
  pull_request:
    branches: [develop, main]
jobs:
  frontend-ci:
    uses: ConstructPro-ERP/infra/.github/workflows/frontend-ci.yml@v1
```

### Current Workflow References

| Calling repository | Reusable workflow reference |
| ------------------ | --------------------------- |
| Frontend           | `frontend-ci.yml@v1`        |
| Backend            | **`backend-ci.yml@v3`**     |
| Tests              | `tests-ci.yml@v1`           |
| Documents          | `documents-ci.yml@v1`       |

The **backend caller uses `@v3`, not `@v2.0.0`**. A workflow modification on this repository's `develop` branch does not automatically change existing callers pinned to version tags.

The backend has a shared-database concurrency group, `backend-neon-test-database`, with `cancel-in-progress: false`, to avoid overlapping database-backed CI executions.

### Backend Workflow Inputs and Secrets

| Secret                  | Use                                                  |
| ----------------------- | ---------------------------------------------------- |
| `DATABASE_URL_TEST`     | Isolated Neon database for backend integration tests |
| `CLOUDINARY_CLOUD_NAME` | Live storage integration                             |
| `CLOUDINARY_API_KEY`    | Live storage integration                             |
| `CLOUDINARY_API_SECRET` | Live storage integration                             |

The Cloudinary secrets are optional in the reusable workflow interface, but its live Cloudinary job runs on **push** after backend validation succeeds and requires the relevant values.

The backend workflow runs `npm run test:unit` and `npm run test:e2e`, not the coverage-collection scripts. The `snippets/backend-ci-coverage-steps.yml` file contains proposed coverage publishing steps; it **does not mean that a coverage percentage is currently enforced by CI**.

### Recorded Project Testing Evidence

The final development report (October 2026) records:

| Scope                                         | Recorded result                                        |
| --------------------------------------------- | ------------------------------------------------------ |
| Backend Jest unit tests                       | 1,535 passed (84 suites)                               |
| Backend Jest integration tests                | 546 passed, 2 skipped (27 suites)                      |
| Backend **unit** line coverage                | 76.4%                                                  |
| Frontend node:test and Vitest                 | 319 passed                                             |
| Cross-repository local Playwright, 25 October | 83 passed, 7 failed, 16 skipped, 1 not run (107 total) |
| Infrastructure performance-runner tests       | 5 passed                                               |

These results are historical report evidence rather than a live measurement of the current deployment. Source reports: [coverage](https://github.com/ConstructPro-ERP/documents/blob/develop/testing/coverage-sprint8.pdf), [test register](https://github.com/ConstructPro-ERP/documents/blob/develop/testing/test-register.pdf), and [performance](https://github.com/ConstructPro-ERP/documents/blob/develop/testing/performance-report.pdf).

## Deployed End-to-End Configuration

The reusable [Tests CI](.github/workflows/tests-ci.yml) performs static validation and Playwright discovery by default. Full deployed E2E execution is controlled by the `run_e2e` input (default `false`), executes against the `staging` environment, installs Chromium, and runs `npm run test:e2e` when enabled.

| Inputs                                                           | Purpose                         |
| ---------------------------------------------------------------- | ------------------------------- |
| `frontend_base_url`, `api_base_url`                              | Target application addresses    |
| `invoice_id`, `project_id`, `payment_amount`                     | Finance/AI test fixtures        |
| `client_project_id`, `client_document_id`, `client_quotation_id` | Client portal fixtures          |
| `other_client_project_id`, `other_client_document_id`            | Ownership verification fixtures |

Supported credential pairs include `E2E_USER_*`, `E2E_RESTRICTED_USER_*`, `E2E_CLIENT_USER_*`, `E2E_OTHER_CLIENT_USER_*`, and `E2E_STAFF_USER_*`, with `_EMAIL` and `_PASSWORD` suffixes. These are not the public demonstration accounts.

The current workflow does not export every optional management-specific pair, such as `E2E_ADMIN_*` or `E2E_ACCOUNTANT_*`, into the Playwright process. To execute those role-specific cases in CI, update the workflow forwarding or use the test suite's documented fallback where appropriate.

When deployed Playwright runs fail, the workflow can upload `playwright-report/` and `test-results/` as `playwright-evidence` for 14 days.

## Staging Performance Checks

Run the **Staging performance check** workflow manually through GitHub Actions. It executes an authenticated, bounded API GET workload in the `staging` environment.

The workflow accepts 10, 50, or 200 configured sessions (default: 10), has a 15-minute timeout, and uses a non-cancelling concurrency group.

Configure the following staging environment values:

| Kind     | Name                     | Purpose                             |
| -------- | ------------------------ | ----------------------------------- |
| Secret   | `PERF_AUTH_TOKEN`        | Staff bearer token                  |
| Variable | `PERF_PROJECT_ID`        | Project and project-resource routes |
| Variable | `PERF_INVOICE_ID`        | Invoice and payment-list routes     |
| Variable | `PERF_CLIENT_PROJECT_ID` | Client-owned project routes         |
| Secret   | `PERF_CLIENT_AUTH_TOKEN` | Client portal bearer token          |

The runner requires a base URL and staff token. Additional record IDs enable the corresponding endpoints. Each simulated session visits enabled routes sequentially once; the workflow is a **bounded-wave benchmark, not a sustained-load benchmark**.

Measured output is uploaded as `artifacts/performance-results.json` in a `performance-results-<run-id>` artifact with 30-day retention. Check the route sample sizes, error counts and timing percentiles when interpreting benchmark results.

The final report includes a separate workstation performance experiment with 25 API routes and browser diagnostics. Those results should be read from the [performance evidence](https://github.com/ConstructPro-ERP/documents/blob/develop/testing/performance-report.pdf) rather than attributed to a particular CI workflow run without its artifact.

## Deployed Application

The infrastructure repository itself has no public web deployment. The ConstructPro ERP frontend and API documentation are linked at the top. The API gateway and domain applications are deployed as separate Vercel projects selected from the backend repository through `DEPLOY_APP`.

## Related Repositories

| Repository                                                  | Purpose                                                |
| ----------------------------------------------------------- | ------------------------------------------------------ |
| [Frontend](https://github.com/ConstructPro-ERP/frontend)    | Next.js application and frontend tests                 |
| [Backend](https://github.com/ConstructPro-ERP/backend)      | NestJS gateway, domain services and database           |
| [Tests](https://github.com/ConstructPro-ERP/tests)          | Playwright API and browser E2E suites                  |
| [Infrastructure](https://github.com/ConstructPro-ERP/infra) | Shared CI workflows and performance tooling            |
| [Documents](https://github.com/ConstructPro-ERP/documents)  | Requirements, design, testing and performance evidence |

## Academic Project

Developed as part of **SENG 34213 – System Development Project**, Bachelor of Science (Hons.) in Software Engineering, University of Kelaniya.
