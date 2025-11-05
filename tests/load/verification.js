import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration for public verification endpoint
export const options = {
  stages: [
    { duration: '2m', target: 200 }, // Ramp up to 200 users
    { duration: '5m', target: 500 }, // Ramp up to 500 users
    { duration: '5m', target: 1000 }, // Peak at 1000 concurrent verifiers
    { duration: '5m', target: 1000 }, // Hold at peak
    { duration: '3m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<1500'], // 95% of requests should be below 1.5s
    http_req_failed: ['rate<0.03'], // Error rate should be below 3%
    errors: ['rate<0.03'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/v1';

export function setup() {
  // Get list of settled draws that can be verified
  const drawsResponse = http.get(`${BASE_URL}/draws?status=SETTLED&limit=10`);

  if (drawsResponse.status === 200) {
    const draws = drawsResponse.json('draws') || drawsResponse.json();

    if (Array.isArray(draws) && draws.length > 0) {
      return {
        drawIds: draws.map((d) => d.id),
      };
    }
  }

  console.log('No settled draws available for verification testing');
  return { drawIds: [] };
}

export default function (data) {
  if (!data.drawIds || data.drawIds.length === 0) {
    // If no settled draws, just test the draws list endpoint
    const drawsResponse = http.get(`${BASE_URL}/draws?limit=10`);

    check(drawsResponse, {
      'Draws list status is 200': (r) => r.status === 200,
    });

    sleep(5);
    return;
  }

  // Pick a random settled draw
  const drawId = data.drawIds[Math.floor(Math.random() * data.drawIds.length)];

  // 1. Get verification data
  const verifyDataResponse = http.get(`${BASE_URL}/fairness/verify/${drawId}`);

  check(verifyDataResponse, {
    'Verification data status is 200': (r) => r.status === 200,
    'Has merkle root': (r) => r.json('merkle_root') !== undefined,
    'Has beacon value': (r) => r.json('beacon_value') !== undefined,
    'Has winner serial': (r) => r.json('winner_serial') !== undefined,
    'Verification data response time < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1);

  sleep(1);

  // 2. Server-side verification computation
  const computeResponse = http.get(`${BASE_URL}/fairness/verify/${drawId}/compute`);

  check(computeResponse, {
    'Compute verification status is 200': (r) => r.status === 200,
    'Has computed hash': (r) => r.json('computed_hash') !== undefined,
    'Has computed winner': (r) => r.json('computed_winner_index') !== undefined,
    'Has match result': (r) => r.json('matches') !== undefined,
    'Compute response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  const verificationResult = computeResponse.json();

  check(verificationResult, {
    'Verification matches': (r) => r.matches === true,
    'Verification is valid': (r) => r.is_valid === true,
  }) || errorRate.add(1);

  sleep(2);

  // 3. Get tickets for the draw (simulate user checking their ticket)
  const ticketsResponse = http.get(`${BASE_URL}/tickets?draw_id=${drawId}&limit=5`);

  check(ticketsResponse, {
    'Tickets list status is 200 or 401': (r) => r.status === 200 || r.status === 401, // May need auth
    'Tickets response time < 500ms': (r) => r.timings.duration < 500,
  });

  sleep(3);
}

export function handleSummary(data) {
  return {
    'verification-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';

  let summary = `\n${indent}Verification Flow - Load Test Summary\n`;
  summary += `${indent}${'='.repeat(60)}\n\n`;

  if (data.metrics.http_req_duration) {
    summary += `${indent}HTTP Request Duration:\n`;
    summary += `${indent}  avg: ${data.metrics.http_req_duration.values.avg.toFixed(2)}ms\n`;
    summary += `${indent}  p95: ${data.metrics.http_req_duration.values['p(95)'].toFixed(2)}ms\n`;
    summary += `${indent}  p99: ${data.metrics.http_req_duration.values['p(99)'].toFixed(2)}ms\n\n`;
  }

  if (data.metrics.http_reqs) {
    summary += `${indent}Total Requests: ${data.metrics.http_reqs.values.count}\n`;
    summary += `${indent}Request Rate: ${data.metrics.http_reqs.values.rate.toFixed(2)}/s\n\n`;
  }

  if (data.metrics.http_req_failed) {
    const failRate = (data.metrics.http_req_failed.values.rate * 100).toFixed(2);
    summary += `${indent}Failed Requests: ${failRate}%\n\n`;
  }

  if (data.metrics.errors) {
    const errorRateValue = (data.metrics.errors.values.rate * 100).toFixed(2);
    summary += `${indent}Custom Error Rate: ${errorRateValue}%\n\n`;
  }

  return summary;
}
