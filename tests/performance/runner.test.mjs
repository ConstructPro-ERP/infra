import assert from 'node:assert/strict';
import test from 'node:test';
import { buildRoutes, percentile, runBenchmark, validateConfig } from './runner.mjs';

test('requires a token and bounds concurrency to 200', () => {
  assert.throws(() => validateConfig({ baseUrl: 'https://staging.example', token: '', users: '10' }), /PERF_AUTH_TOKEN/);
  assert.throws(() => validateConfig({ baseUrl: 'https://staging.example', token: 'secret', users: '201' }), /between 1 and 200/);
  assert.throws(() => validateConfig({ baseUrl: 'http://staging.example', token: 'secret', users: '10' }), /HTTPS/);
  assert.equal(validateConfig({ baseUrl: 'http://localhost:3000', token: 'secret', users: '10' }).concurrency, 10);
});

test('calculates nearest-rank percentiles', () => {
  assert.equal(percentile([30, 10, 20, 40], 0.5), 20);
  assert.equal(percentile([30, 10, 20, 40], 0.95), 40);
  assert.equal(percentile([], 0.95), null);
});

test('includes gateway modules and configured detail routes', () => {
  const routes = buildRoutes({
    projectId: 'project-1',
    invoiceId: 'invoice-1',
    clientProjectId: 'client-project-1',
    clientToken: 'client-token',
  });
  const modules = new Set(routes.map(({ module }) => module));

  for (const module of [
    'auth-service',
    'user-service',
    'client-service',
    'lead-service',
    'quotation-service',
    'project-service',
    'task-service',
    'invoice-service',
    'payment-service',
    'calendar-service',
    'document-service',
    'analytics-service',
    'ai-service',
  ]) {
    assert.ok(modules.has(module), `expected ${module} route coverage`);
  }
  assert.ok(routes.filter(({ name }) => name.startsWith('client-portal-')).every(({ token }) => token === 'client-token'));
});

test('runs bounded GET requests and reports route targets without response bodies', async () => {
  const requests = [];
  const report = await runBenchmark({
    baseUrl: 'http://localhost:3000',
    token: 'local-test-token',
    users: '4',
    fetchImpl: async (url, options) => {
      requests.push({ method: options.method, url: new URL(url).pathname, auth: options.headers.authorization });
      return new Response(JSON.stringify({ privateField: 'not included in report' }), {
        status: 200,
        headers: { 'content-type': 'application/json' },
      });
    },
  });

  assert.equal(requests.length, report.conditions.endpoints.length * 4);
  assert.ok(requests.every(({ method, auth }) => method === 'GET' && auth === 'Bearer local-test-token'));
  assert.deepEqual(new Set(requests.map(({ url }) => url)), new Set(report.conditions.endpoints.map(({ path }) => path)));
  assert.ok(report.results.every(({ samples, errorCount }) => samples === 4 && errorCount === 0));
  assert.ok(report.results.every(({ targetMet }) => targetMet));
  assert.equal(JSON.stringify(report).includes('privateField'), false);
  assert.equal(JSON.stringify(report).includes('local-test-token'), false);
});

test('reports non-success responses as errors', async () => {
  const report = await runBenchmark({
    baseUrl: 'http://localhost:3000',
    token: 'local-test-token',
    users: '1',
    fetchImpl: async () => new Response('unavailable', { status: 503 }),
  });

  assert.ok(report.results.every(({ errorCount, targetMet }) => errorCount === 1 && !targetMet));
});
