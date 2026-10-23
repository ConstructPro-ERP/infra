import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

const baseRoutes = [
  { module: 'auth-service', name: 'current-user', path: '/api/auth/me' },
  { module: 'user-service', name: 'users', path: '/api/users' },
  { module: 'client-service', name: 'clients', path: '/api/clients' },
  { module: 'lead-service', name: 'leads', path: '/api/leads' },
  { module: 'quotation-service', name: 'quotations', path: '/api/quotations' },
  { module: 'project-service', name: 'projects', path: '/api/projects' },
  { module: 'task-service', name: 'tasks', path: '/api/tasks' },
  { module: 'invoice-service', name: 'invoices', path: '/api/invoices' },
  { module: 'calendar-service', name: 'calendar-status', path: '/api/calendar/status' },
  { module: 'document-service', name: 'document-categories', path: '/api/document-categories' },
  {
    module: 'analytics-service',
    name: 'dashboard-summary',
    path: '/api/analytics/dashboard/summary',
    targetMs: 3000,
  },
  { module: 'analytics-service', name: 'revenue-kpis', path: '/api/analytics/kpis/revenue' },
];
const timeoutMs = 10_000;
const maxResponseBytes = 2 * 1024 * 1024;

export function buildRoutes({ projectId, invoiceId, clientProjectId, clientToken }) {
  const routes = [...baseRoutes];

  if (projectId) {
    routes.push(
      { module: 'project-service', name: 'project-detail', path: `/api/projects/${projectId}` },
      { module: 'project-service', name: 'project-milestones', path: `/api/projects/${projectId}/milestones` },
      { module: 'task-service', name: 'project-tasks', path: `/api/projects/${projectId}/tasks` },
      { module: 'project-service', name: 'expense-summary', path: `/api/projects/${projectId}/expenses/summary` },
      { module: 'document-service', name: 'project-documents', path: `/api/projects/${projectId}/documents` },
      { module: 'ai-service', name: 'project-risk', path: `/api/ai-forecasting/projects/${projectId}/risk` },
    );
  }

  if (invoiceId) {
    routes.push(
      { module: 'invoice-service', name: 'invoice-detail', path: `/api/invoices/${invoiceId}` },
      { module: 'payment-service', name: 'invoice-payments', path: `/api/invoices/${invoiceId}/payments` },
    );
  }

  if (clientProjectId && clientToken) {
    routes.push(
      {
        module: 'client-service',
        name: 'client-portal-projects',
        path: '/api/client-portal/projects',
        token: clientToken,
      },
      {
        module: 'client-service',
        name: 'client-portal-project-detail',
        path: `/api/client-portal/projects/${clientProjectId}`,
        token: clientToken,
      },
      {
        module: 'client-service',
        name: 'client-portal-milestones',
        path: `/api/client-portal/projects/${clientProjectId}/milestones`,
        token: clientToken,
      },
      {
        module: 'client-service',
        name: 'client-portal-documents',
        path: `/api/client-portal/projects/${clientProjectId}/documents`,
        token: clientToken,
      },
      {
        module: 'client-service',
        name: 'client-portal-quotations',
        path: '/api/client-portal/quotations',
        token: clientToken,
      },
    );
  }

  return routes.map((route) => ({ targetMs: 2000, ...route }));
}

export function validateConfig({ baseUrl, token, users }) {
  if (!baseUrl) throw new Error('PERF_BASE_URL is required.');
  if (!token) throw new Error('PERF_AUTH_TOKEN is required.');

  let parsed;
  try {
    parsed = new URL(baseUrl);
  } catch {
    throw new Error('PERF_BASE_URL must be an absolute HTTP(S) URL.');
  }

  const isLoopback = ['localhost', '127.0.0.1', '[::1]'].includes(parsed.hostname);
  if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && isLoopback)) {
    throw new Error('PERF_BASE_URL must use HTTPS (HTTP is allowed only for loopback tests).');
  }
  if (parsed.username || parsed.password || parsed.search || parsed.hash) {
    throw new Error('PERF_BASE_URL must not contain credentials, query parameters, or a fragment.');
  }

  const concurrency = Number(users);
  if (!Number.isInteger(concurrency) || concurrency < 1 || concurrency > 200) {
    throw new Error('PERF_USERS must be an integer between 1 and 200.');
  }

  return { baseUrl: parsed.toString().replace(/\/$/, ''), concurrency };
}

export function percentile(values, fraction) {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.max(0, Math.ceil(fraction * sorted.length) - 1)];
}

async function request(url, token, fetchImpl) {
  const started = performance.now();
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
      redirect: 'manual',
      signal: AbortSignal.timeout(timeoutMs),
    });

    let bytes = 0;
    if (response.body) {
      const reader = response.body.getReader();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        bytes += value.byteLength;
        if (bytes > maxResponseBytes) {
          await reader.cancel();
          throw new Error('Response exceeded the 2 MiB measurement limit.');
        }
      }
    }
    return { status: response.status, ok: response.status >= 200 && response.status < 300, ms: performance.now() - started, bytes };
  } catch (error) {
    return { status: null, ok: false, ms: performance.now() - started, bytes: 0, error: error?.name === 'TimeoutError' ? 'timeout' : 'request_failed' };
  }
}

async function runWave({ baseUrl, token, concurrency, fetchImpl, routes }) {
  const records = [];
  let nextUser = 0;
  const worker = async () => {
    while (true) {
      const user = nextUser++;
      if (user >= concurrency) return;
      for (const route of routes) {
        records.push({
          module: route.module,
          route: route.name,
          ...(await request(`${baseUrl}${route.path}`, route.token ?? token, fetchImpl)),
        });
      }
    }
  };
  await Promise.all(Array.from({ length: concurrency }, worker));
  return records;
}

function summarize(records, concurrency, durationMs, routes) {
  return routes.map((route) => {
    const samples = records.filter((record) => record.route === route.name);
    const latencies = samples.map(({ ms }) => ms);
    const errors = samples.filter(({ ok }) => !ok).length;
    const statusCounts = Object.fromEntries(
      [...new Set(samples.map(({ status }) => status ?? 'network_error'))].map((status) => [
        status,
        samples.filter((sample) => (sample.status ?? 'network_error') === status).length,
      ]),
    );
    const p95Ms = percentile(latencies, 0.95);
    return {
      module: route.module,
      name: route.name,
      endpoint: route.path,
      samples: samples.length,
      concurrency,
      p50Ms: Math.round(percentile(latencies, 0.5) ?? 0),
      p95Ms: Math.round(p95Ms ?? 0),
      p99Ms: Math.round(percentile(latencies, 0.99) ?? 0),
      throughputRequestsPerSecond: Number((samples.length / (durationMs / 1000)).toFixed(2)),
      errorCount: errors,
      errorRate: Number((samples.length ? errors / samples.length : 1).toFixed(4)),
      statusCounts,
      targetMs: route.targetMs,
      targetMet: errors === 0 && p95Ms <= route.targetMs,
      averageResponseBytes: samples.length
        ? Math.round(samples.reduce((total, { bytes }) => total + bytes, 0) / samples.length)
        : 0,
    };
  });
}

export async function runBenchmark({
  baseUrl,
  token,
  users,
  projectId,
  invoiceId,
  clientProjectId,
  clientToken,
  fetchImpl = fetch,
  now = () => performance.now(),
}) {
  const { baseUrl: safeBaseUrl, concurrency } = validateConfig({ baseUrl, token, users });
  const routes = buildRoutes({ projectId, invoiceId, clientProjectId, clientToken });
  const startedAt = new Date().toISOString();
  const started = now();
  const results = await runWave({ baseUrl: safeBaseUrl, token, concurrency, fetchImpl, routes });
  const durationMs = now() - started;
  return {
    startedAt,
    targetHost: new URL(safeBaseUrl).origin,
    conditions: {
      method: 'GET',
      concurrency,
      requestsPerEndpoint: concurrency,
      timeoutMs,
      maximumResponseBytes: maxResponseBytes,
      endpoints: routes.map(({ module, name, path }) => ({ module, name, path })),
      notExposedThroughGateway: ['contractor-service', 'material-service', 'notification-service'],
      note: 'One bounded wave of read-only API Gateway requests; no writes, retries, ramp-up, or sustained load. Internal services without Gateway read routes are reported as untested.',
    },
    durationMs: Math.round(durationMs),
    results: summarize(results, concurrency, durationMs, routes),
  };
}

async function main() {
  const required = (name) => {
    const value = process.env[name];
    if (!value) throw new Error(`${name} is required for the all-module benchmark.`);
    return value;
  };
  const report = await runBenchmark({
    baseUrl: required('PERF_BASE_URL'),
    token: required('PERF_AUTH_TOKEN'),
    users: process.env.PERF_USERS ?? '10',
    projectId: required('PERF_PROJECT_ID'),
    invoiceId: required('PERF_INVOICE_ID'),
    clientProjectId: required('PERF_CLIENT_PROJECT_ID'),
    clientToken: required('PERF_CLIENT_AUTH_TOKEN'),
  });
  await mkdir('artifacts', { recursive: true });
  await writeFile('artifacts/performance-results.json', `${JSON.stringify(report, null, 2)}\n`, { mode: 0o600 });
  for (const result of report.results) {
    console.log(`${result.endpoint}: ${result.samples} requests, p95 ${result.p95Ms}ms (target ${result.targetMs}ms), ${result.errorCount} errors`);
  }
  if (report.results.some(({ targetMet }) => !targetMet)) {
    throw new Error('Performance target or HTTP success criteria failed. See the JSON artifact.');
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}
