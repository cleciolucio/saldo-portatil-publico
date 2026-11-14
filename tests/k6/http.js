import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Counter } from 'k6/metrics';
const journey = new Rate('journey_success'),
  completed = new Counter('completed_journeys');
const profile = __ENV.K6_PROFILE || 'smoke',
  base = __ENV.BASE_URL || 'http://127.0.0.1:4173';
const scenarios = {
  smoke: { executor: 'constant-vus', vus: 2, duration: '10s' },
  load: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '5s', target: 5 },
      { duration: '15s', target: 10 },
      { duration: '5s', target: 0 },
    ],
  },
  stress: {
    executor: 'ramping-vus',
    startVUs: 0,
    stages: [
      { duration: '10s', target: 10 },
      { duration: '20s', target: 30 },
      { duration: '10s', target: 50 },
      { duration: '10s', target: 0 },
    ],
  },
  soak: { executor: 'constant-vus', vus: 5, duration: __ENV.K6_SOAK_DURATION || '2m' },
};
if (!scenarios[profile]) throw new Error('Perfil k6 inválido.');
export const options = {
  scenarios: { [profile]: scenarios[profile] },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    http_req_duration: ['p(95)<500'],
    checks: ['rate==1'],
    journey_success: ['rate==1'],
    completed_journeys: ['count>0'],
  },
  summaryTrendStats: ['avg', 'min', 'med', 'max', 'p(90)', 'p(95)', 'p(99)'],
};
export default function () {
  try {
    const response = http.get(base + '/');
    let ok = check(response, {
      'HTML 200': (r) => r.status === 200,
      'Identidade Saldo': (r) => r.body.includes('Saldo'),
    });
    const refs = [...response.body.matchAll(/(?:src|href)="([^"#]+\.(?:js|css))"/g)].map(
      (m) => base.replace(/\/$/, '') + '/' + m[1].replace(/^[./]+/, ''),
    );
    for (const asset of refs) {
      const r = http.get(asset);
      ok = check(r, { 'Asset 200': (value) => value.status === 200 }) && ok;
    }
    journey.add(ok);
    completed.add(1);
  } catch (error) {
    journey.add(false);
    throw error;
  } finally {
    sleep(0.2);
  }
}
export function handleSummary(data) {
  return {
    [`reports/k6/${profile}-summary.json`]: JSON.stringify(data, null, 2),
    stdout: `k6 ${profile}: ${data.metrics.http_reqs?.values.count || 0} requisições; p95=${data.metrics.http_req_duration?.values['p(95)']?.toFixed(2)}ms. Resultado completo em reports/k6.\n`,
  };
}
