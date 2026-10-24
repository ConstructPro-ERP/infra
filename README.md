# ConstructPro ERP - Infrastructure

Shared GitHub Actions workflows and staging performance tooling for [ConstructPro ERP](https://github.com/ConstructPro-ERP).

This checkout contains CI configuration and a Node.js performance runner. It does not contain a Docker Compose stack, an environment template, or deployment provisioning scripts. Application setup is documented in the frontend and backend repositories.

## Repository layout

| Path | Purpose |
| --- | --- |
| [.github/workflows/ci.yml](.github/workflows/ci.yml) | Validate infrastructure workflows and performance tooling |
| [.github/workflows/frontend-ci.yml](.github/workflows/frontend-ci.yml) | Reusable frontend checks |
| [.github/workflows/backend-ci.yml](.github/workflows/backend-ci.yml) | Reusable backend checks and live Cloudinary integration |
| [.github/workflows/tests-ci.yml](.github/workflows/tests-ci.yml) | Reusable Playwright validation and optional deployed E2E |
| [.github/workflows/documents-ci.yml](.github/workflows/documents-ci.yml) | Reusable documentation checks |
| [.github/workflows/performance-check.yml](.github/workflows/performance-check.yml) | Manually dispatched staging benchmark |
| [tests/performance/runner.mjs](tests/performance/runner.mjs) | Bounded authenticated GET benchmark |
| [tests/performance/runner.test.mjs](tests/performance/runner.test.mjs) | Isolated runner tests |

## Local validation

Use Node.js 24 to match CI. The performance tooling uses Node built-ins and requires no npm dependency installation.

```bash
git clone https://github.com/ConstructPro-ERP/infra.git
cd infra
node --check tests/performance/runner.mjs
node --test tests/performance/runner.test.mjs
```

Infrastructure CI runs these checks on pushes and pull requests to `develop` and `main`. It also validates workflows with actionlint 1.7.12 through Docker. To run the same check in PowerShell with Docker available:

```powershell
docker run --rm -v "${PWD}:/repo" -w /repo rhysd/actionlint:1.7.12
```

Docker is needed for this actionlint command, not for the Node runner tests.

## Shared CI workflows

Reusable workflows use `workflow_call` and check out the **caller repository**. Their npm commands therefore run against the caller's package scripts and lockfile. All Node jobs currently use Node.js 24 and `npm ci`.

| Workflow | Checks |
| --- | --- |
| Frontend | Lint, formatting, tests, production build, dependency audit |
| Backend | Formatting, Prisma generation, lint without automatic fixes, unit and integration tests, full build, dependency audit |
| Tests | Dependency audit, TypeScript checks, Playwright test discovery; optionally deployed browser tests |
| Documents | At least one Markdown file exists; reject unresolved merge-conflict markers in Markdown |

Frontend, backend, and tests workflows run `npm audit --audit-level=high` against all dependencies. High/critical findings fail the job.

Call reusable workflows at the job level. For example, the frontend caller uses:

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

The sibling frontend and tests callers currently reference `@v1`; the backend caller references `@v2.0.0` and also has its own quotation quality job. Changes in this checkout affect callers only when their selected ref includes those changes. Review and validate changes before publishing a release ref and updating callers.

For private repositories, configure this repository's GitHub Actions access to permit the caller repositories. Keep secrets in the caller or the appropriate GitHub environment; pass supported secrets explicitly or use `secrets: inherit` where available.

### Backend secrets

| Secret | Use |
| --- | --- |
| `DATABASE_URL_TEST` | Required by the reusable workflow for backend integration tests |
| `CLOUDINARY_CLOUD_NAME` | Live storage integration |
| `CLOUDINARY_API_KEY` | Live storage integration |
| `CLOUDINARY_API_SECRET` | Live storage integration |

The Cloudinary secrets are optional in the call interface, but the live Cloudinary job runs on **push** after backend validation succeeds and fails when any is missing. Use an isolated test database and suitable integration resources.

### Deployed E2E configuration

The tests workflow defaults `run_e2e` to `false`. When enabled, the E2E job runs after static validation in the `staging` environment, installs Chromium, and executes `npm run test:e2e`.

| Inputs | Purpose |
| --- | --- |
| `frontend_base_url`, `api_base_url` | Running application URLs |
| `invoice_id`, `project_id`, `payment_amount` | Finance/AI test records; payment amount defaults to `1` |
| `client_project_id`, `client_document_id`, `client_quotation_id` | Client portal records |
| `other_client_project_id`, `other_client_document_id` | Ownership restriction records |

Supported credential secret pairs use the prefixes `E2E_USER`, `E2E_RESTRICTED_USER`, `E2E_CLIENT_USER`, `E2E_OTHER_CLIENT_USER`, and `E2E_STAFF_USER`, each with `_EMAIL` and `_PASSWORD`. Their necessity depends on the caller's test suites.

The current workflow does not export `E2E_ADMIN_*` or `E2E_ACCOUNTANT_*` to the test process. Management tests must use their supported admin fallback through `E2E_USER_*`, or the workflow must be extended to forward additional credentials. Inheriting secrets alone does not export them as environment variables.

Configure protection rules for the `staging` environment as appropriate. Use disposable test data: deployed tests can create or modify records. On failure, the workflow uploads `playwright-report/` and `test-results/` as `playwright-evidence`, retained for 14 days.

## Staging performance checks

Dispatch **Staging performance check** from GitHub Actions with 10, 50, or 200 concurrent sessions (default: 10). The job targets the `staging` environment, has a 15-minute timeout, and uses the `staging-performance-check` concurrency group without cancelling an active run.

Configure these values in the staging environment:

| Kind | Name | Purpose |
| --- | --- | --- |
| Secret | `PERF_AUTH_TOKEN` | Administrator/staff bearer token |
| Variable | `PERF_PROJECT_ID` | Enables project detail, milestones, tasks, expenses, documents, and AI risk checks |
| Variable | `PERF_INVOICE_ID` | Enables invoice detail and payment-list checks |
| Variable | `PERF_CLIENT_PROJECT_ID` | Client-owned project for portal checks |
| Secret | `PERF_CLIENT_AUTH_TOKEN` | Client bearer token; needed with the client project ID |

The runner requires the base URL and staff token. Resource IDs enable additional routes; client portal coverage requires both its project ID and token. HTTPS is required except for loopback HTTP tests. URLs must not contain credentials, query parameters, or fragments.

Each simulated session makes one sequential pass through the enabled routes. This is a bounded wave of GET requests, not a sustained-load test. Select 200 sessions only when the staging environment is approved for that load. Confirm the configured URL targets the intended test environment; the runner does not identify production hosts for you.

Coverage includes auth, users, clients, leads, quotations, projects, tasks, invoices, calendar status, document categories, analytics, and optional resource-specific/payment/AI/client portal routes. Calendar status does not request data from external calendar providers. Contractor, material, and notification services have no corresponding read routes in this benchmark and must not be reported as passing.

The workflow uploads `artifacts/performance-results.json` as `performance-results-<run-id>`, retained for 30 days. Inspect errors, latency, and route coverage before interpreting results.

## Related repositories

- `frontend`: Next.js application and local frontend tests
- `backend`: NestJS gateway, domain services, and backend tests
- `tests`: Cross-repository integration and browser workflows
- `documents`: Specifications, design documents, and project records
