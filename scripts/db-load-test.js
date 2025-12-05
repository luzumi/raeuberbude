import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// -----------------------------
// Konfiguration
// -----------------------------
export const options = {
  stages: [
    { duration: '1m', target: 50 },   // Ramp-up zu 50 VUs
    { duration: '3m', target: 100 },  // Ramp-up zu 100 VUs
    { duration: '5m', target: 100 },  // Halten bei 100 VUs (~1000 req/min total)
    { duration: '1m', target: 0 },    // Ramp-down
  ],
  thresholds: {
    http_req_duration: ['p(95)<200', 'p(99)<500'], // 95% < 200ms, 99% < 500ms
    errors: ['rate<0.05'],                          // Error-Rate < 5%
    slow_queries: ['rate<0.1'],                    // Slow-Query-Rate < 10%
  },
};

// -----------------------------
// Custom Metrics
// -----------------------------
const errorRate = new Rate('errors');
const slowQueryRate = new Rate('slow_queries'); // mark requests considered "slow" for our purposes

// -----------------------------
// Test-Data & Konstante
// -----------------------------
const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';
const API_KEY = __ENV.API_KEY || 'test-api-key';
const RELAXED = __ENV.RELAXED === '1'; // if set, treat non-5xx responses as success (smoke mode)
const SMOKE = __ENV.SMOKE === '1'; // if set, run only a lightweight health-check scenario
const LEGACY = __ENV.LEGACY === '1'; // if set, use only legacy-supported endpoints

// helper to determine if a response is acceptable
function isOk(res, expectedStatus) {
  if (!res) return false;
  if (typeof expectedStatus === 'number') {
    if (res.status === expectedStatus) return true;
  }
  // in relaxed mode accept any non-5xx
  if (RELAXED) return res.status < 500;
  // default: accept 2xx
  return res.status >= 200 && res.status < 300;
}

// -----------------------------
// Hilfsfunktionen / Szenarien
// -----------------------------
function bodyHasField(res, fieldName) {
  if (!res || !res.body) return false;
  // tolerate backend returning either 'id' or '_id' and similar naming differences
  const b = res.body;
  if (b.includes(`"${fieldName}"`)) return true;
  if (b.includes(`"_${fieldName}"`)) return true;
  return false;
}

function testUserLogin(userId) {
  const res = http.get(`${BASE_URL}/api/users/${userId}/permissions`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    tags: { scenario: 'auth' },
  });

  const ok = check(res, {
    'User Login: Status 200|relaxed': (r) => isOk(r, 200),
    'User Login: Has permissions': (r) => isOk(r, 200) && bodyHasField(r, 'permissions'),
  });

  errorRate.add(!ok);
  slowQueryRate.add(res.timings.duration > 100);
}

function testSpeechTranscript(userId, terminalId) {
  const payload = JSON.stringify({
    userId: userId,
    terminalId: terminalId,
    transcript: 'Schalte das Licht im Wohnzimmer ein',
    keywords: ['licht', 'wohnzimmer', 'einschalten'],
    intent: { action: 'turn_on', entity: 'light.living_room' },
    confidence: 0.95,
    isValid: true,
    durationMs: 1200,
    timings: { sttMs: 150, preProcessMs: 20, llmMs: 200 },
    model: 'test-model-1'
  });

  const res = http.post(`${BASE_URL}/api/transcripts`, payload, {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
    },
    tags: { scenario: 'transcript' },
  });

  const ok = check(res, {
    'Transcript: Status 201|relaxed': (r) => isOk(r, 201),
    'Transcript: Has ID': (r) => isOk(r, 201) && bodyHasField(r, 'id'),
  });

  errorRate.add(!ok);
  slowQueryRate.add(res.timings.duration > 200);

  // Optional: Keyword ranking read
  if (ok && Math.random() < 0.3) {
    const rankRes = http.get(`${BASE_URL}/api/keywords/ranking?limit=20`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      tags: { scenario: 'keywords' },
    });
    check(rankRes, {
      'Keyword Ranking: Status 200|relaxed': (r) => isOk(r, 200),
    });
  }
}

function testHaEntityLookup() {
  const entityId = TEST_ENTITY_IDS[Math.floor(Math.random() * TEST_ENTITY_IDS.length)];

  const entityRes = http.get(`${BASE_URL}/api/ha/entities/${entityId}`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    tags: { scenario: 'ha_lookup' },
  });

  const ok = check(entityRes, {
    'HA Entity: Status 200|relaxed': (r) => isOk(r, 200),
  });

  errorRate.add(!ok);
  slowQueryRate.add(entityRes.timings.duration > 50);

  if (ok && Math.random() < 0.3) {
    const historyRes = http.get(`${BASE_URL}/api/ha/entities/${entityId}/history?limit=10`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      tags: { scenario: 'ha_history' },
    });
    check(historyRes, {
      'HA History: Status 200|relaxed': (r) => isOk(r, 200),
    });
    slowQueryRate.add(historyRes.timings.duration > 200);
  }
}

function testIntentLogs(terminalId) {
  const logsRes = http.get(`${BASE_URL}/api/intent-logs?terminal=${terminalId}&limit=50`, {
    headers: { 'Authorization': `Bearer ${API_KEY}` },
    tags: { scenario: 'intent_logs' },
  });

  const ok = check(logsRes, {
    'Intent Logs: Status 200|relaxed': (r) => isOk(r, 200),
  });

  errorRate.add(!ok);
  slowQueryRate.add(logsRes.timings.duration > 150);

  if (ok && Math.random() < 0.2) {
    const statsRes = http.get(`${BASE_URL}/api/intent-logs/stats?days=7`, {
      headers: { 'Authorization': `Bearer ${API_KEY}` },
      tags: { scenario: 'intent_stats' },
    });
    check(statsRes, {
      'Intent Stats: Status 200|relaxed': (r) => isOk(r, 200),
    });
    slowQueryRate.add(statsRes.timings.duration > 300);
  }
}

// -----------------------------
// Main scenario (exported anonymously for k6)
// -----------------------------
export default function main() {
  if (SMOKE) {
    // lightweight health probe
    const res = http.get(`${BASE_URL}/health`);
    check(res, { 'health is ok': (r) => r.status === 200 });
    sleep(1);
    return;
  }

  // If legacy mode, restrict scenarios to endpoints known to exist in legacy server
  if (LEGACY) {
    const p = Math.random();
    const userId = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
    const terminalId = TEST_TERMINALS[Math.floor(Math.random() * TEST_TERMINALS.length)];
    if (p < 0.6) {
      // majority transcripts
      testSpeechTranscript(userId, terminalId);
    } else if (p < 0.9) {
      testIntentLogs(terminalId);
    } else {
      // occasionally check categories or dbinfo
      if (Math.random() < 0.5) {
        http.get(`${BASE_URL}/api/categories`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
      } else {
        http.get(`${BASE_URL}/api/dbinfo`, { headers: { 'Authorization': `Bearer ${API_KEY}` } });
      }
    }
    sleep(0.5);
    return;
  }

  const userId = TEST_USERS[Math.floor(Math.random() * TEST_USERS.length)];
  const terminalId = TEST_TERMINALS[Math.floor(Math.random() * TEST_TERMINALS.length)];

  // Choose scenario by weighted probabilities
  const p = Math.random();
  if (p < 0.15) {
    testUserLogin(userId);
  } else if (p < 0.55) {
    testSpeechTranscript(userId, terminalId);
  } else if (p < 0.85) {
    testHaEntityLookup();
  } else {
    testIntentLogs(terminalId);
  }

  // wait a bit between iterations
  sleep(0.5);
}

// -----------------------------
// Teardown / Summary (vereinfacht)
// -----------------------------
function textSummary(data, options) {
  options = options || {};
  const indent = options.indent || ' ';

  const reqs = data && data.metrics && data.metrics.http_reqs && data.metrics.http_reqs.values ? data.metrics.http_reqs.values : {};
  const dur = data && data.metrics && data.metrics.http_req_duration && data.metrics.http_req_duration.values ? data.metrics.http_req_duration.values : {};
  const errors = data && data.metrics && data.metrics.errors && data.metrics.errors.values ? data.metrics.errors.values : {};
  const slow = data && data.metrics && data.metrics.slow_queries && data.metrics.slow_queries.values ? data.metrics.slow_queries.values : {};

  const total = reqs.count || 0;
  const rate = reqs.rate ? reqs.rate.toFixed(2) + '/s' : 'N/A';
  const p95 = dur && dur['p(95)'] !== undefined ? (dur['p(95)'].toFixed(2) + 'ms') : 'N/A';

  const errRate = (errors.rate === undefined) ? 'N/A' : (errors.rate * 100).toFixed(2) + '%';
  const slowRate = (slow.rate === undefined) ? 'N/A' : (slow.rate * 100).toFixed(2) + '%';

  // single-template output (no branching to reduce complexity)
  return `\n${indent}✅ Load Test Complete\n${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
    `${indent}📊 Requests:\n${indent}  Total:    ${total}\n${indent}  Rate:     ${rate}\n\n` +
    `${indent}⏱️  Response Times (P95): ${p95}\n\n` +
    `${indent}⚠️  Error Rate: ${errRate}\n` +
    `${indent}🐢 Slow Queries: ${slowRate}\n\n` +
    `${indent}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
}

export function handleSummary(data) {
  return {
    'load-test-results.json': JSON.stringify(data, null, 2),
    stdout: textSummary(data, { indent: ' ', enableColors: false }),
  };
}

// Reference exported symbols to avoid static 'unused' warnings in linters
globalThis.__used_exports = { options, main, handleSummary };
