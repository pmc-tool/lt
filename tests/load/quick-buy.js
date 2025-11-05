import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration for 100k DAU scenario
export const options = {
  stages: [
    { duration: '2m', target: 100 }, // Ramp up to 100 users
    { duration: '5m', target: 500 }, // Ramp up to 500 users
    { duration: '10m', target: 1000 }, // Ramp up to 1000 users
    { duration: '5m', target: 2000 }, // Peak load
    { duration: '10m', target: 2000 }, // Stay at peak
    { duration: '5m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<2500'], // 95% of requests should be below 2.5s
    http_req_failed: ['rate<0.05'], // Error rate should be below 5%
    errors: ['rate<0.05'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/v1';

export default function () {
  // Simulate quick buy user flow

  // 1. Request OTP
  const otpPayload = JSON.stringify({
    identifier: `+88017${Math.floor(Math.random() * 100000000)}`,
    language: 'EN',
  });

  const otpHeaders = {
    'Content-Type': 'application/json',
  };

  const otpResponse = http.post(`${BASE_URL}/auth/otp/request`, otpPayload, {
    headers: otpHeaders,
  });

  check(otpResponse, {
    'OTP request status is 201': (r) => r.status === 201,
    'OTP request has success message': (r) => r.json('message') !== undefined,
  }) || errorRate.add(1);

  sleep(1);

  // 2. Get list of active draws
  const drawsResponse = http.get(`${BASE_URL}/draws?status=STARTED&limit=10`);

  check(drawsResponse, {
    'Draws list status is 200': (r) => r.status === 200,
    'Draws list has data': (r) => r.json('draws') !== undefined || Array.isArray(r.json()),
    'Draws list response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  const draws = drawsResponse.json('draws') || drawsResponse.json();

  if (Array.isArray(draws) && draws.length > 0) {
    const randomDraw = draws[Math.floor(Math.random() * draws.length)];

    // 3. Get specific draw details
    const drawDetailResponse = http.get(`${BASE_URL}/draws/${randomDraw.id}`);

    check(drawDetailResponse, {
      'Draw detail status is 200': (r) => r.status === 200,
      'Draw detail has data': (r) => r.json('id') !== undefined,
      'Draw detail response time < 300ms': (r) => r.timings.duration < 300,
    }) || errorRate.add(1);

    sleep(2); // User reads draw details
  }

  sleep(1);
}

export function handleSummary(data) {
  return {
    'summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';
  const enableColors = options.enableColors || false;

  let summary = `\n${indent}Quick Buy Flow - Load Test Summary\n`;
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
