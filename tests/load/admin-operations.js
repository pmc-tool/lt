import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration for admin operations
export const options = {
  stages: [
    { duration: '1m', target: 10 }, // Ramp up to 10 admin users
    { duration: '3m', target: 20 }, // Ramp up to 20 admin users
    { duration: '5m', target: 20 }, // Stay at 20 users
    { duration: '1m', target: 0 }, // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'], // 95% of requests should be below 3s
    http_req_failed: ['rate<0.02'], // Error rate should be below 2%
    errors: ['rate<0.02'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000/v1';
const ADMIN_EMAIL = __ENV.ADMIN_EMAIL || 'admin@lottery.com';
const ADMIN_PASSWORD = __ENV.ADMIN_PASSWORD || 'admin123';

let authToken = null;

export function setup() {
  // Login once to get auth token
  const loginPayload = JSON.stringify({
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
  });

  const loginHeaders = {
    'Content-Type': 'application/json',
  };

  const loginResponse = http.post(`${BASE_URL}/admin/auth/login`, loginPayload, {
    headers: loginHeaders,
  });

  if (loginResponse.status === 201) {
    return {
      token: loginResponse.json('access_token'),
    };
  }

  console.error('Failed to authenticate admin user');
  return { token: null };
}

export default function (data) {
  if (!data.token) {
    console.error('No auth token available, skipping test');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${data.token}`,
  };

  // 1. Get dashboard statistics
  const dashboardResponse = http.get(`${BASE_URL}/reports/dashboard`, {
    headers,
  });

  check(dashboardResponse, {
    'Dashboard status is 200': (r) => r.status === 200,
    'Dashboard has data': (r) => r.json('total_active_users') !== undefined,
    'Dashboard response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // 2. List draws
  const drawsResponse = http.get(`${BASE_URL}/admin/draws?page=1&limit=20`, {
    headers,
  });

  check(drawsResponse, {
    'Admin draws status is 200': (r) => r.status === 200,
    'Admin draws response time < 800ms': (r) => r.timings.duration < 800,
  }) || errorRate.add(1);

  sleep(2);

  // 3. Get COD tasks
  const codResponse = http.get(`${BASE_URL}/cod/tasks?status=PENDING&limit=50`, {
    headers,
  });

  check(codResponse, {
    'COD tasks status is 200': (r) => r.status === 200,
    'COD tasks response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // 4. Get COD statistics
  const codStatsResponse = http.get(`${BASE_URL}/cod/stats`, {
    headers,
  });

  check(codStatsResponse, {
    'COD stats status is 200': (r) => r.status === 200,
    'COD stats has data': (r) => r.json('total_tasks') !== undefined,
    'COD stats response time < 500ms': (r) => r.timings.duration < 500,
  }) || errorRate.add(1);

  sleep(2);

  // 5. List users
  const usersResponse = http.get(`${BASE_URL}/admin/users?page=1&limit=50`, {
    headers,
  });

  check(usersResponse, {
    'Users list status is 200': (r) => r.status === 200,
    'Users list response time < 1000ms': (r) => r.timings.duration < 1000,
  }) || errorRate.add(1);

  sleep(1);

  // 6. Get audit logs
  const auditResponse = http.get(`${BASE_URL}/audit?page=1&limit=100`, {
    headers,
  });

  check(auditResponse, {
    'Audit logs status is 200': (r) => r.status === 200,
    'Audit logs response time < 1500ms': (r) => r.timings.duration < 1500,
  }) || errorRate.add(1);

  sleep(3);

  // 7. Get sales report
  const salesReportResponse = http.get(`${BASE_URL}/reports/sales`, {
    headers,
  });

  check(salesReportResponse, {
    'Sales report status is 200': (r) => r.status === 200,
    'Sales report has data': (r) => r.json('total_orders') !== undefined,
    'Sales report response time < 2000ms': (r) => r.timings.duration < 2000,
  }) || errorRate.add(1);

  sleep(2);
}

export function handleSummary(data) {
  return {
    'admin-summary.json': JSON.stringify(data),
    stdout: textSummary(data, { indent: ' ', enableColors: true }),
  };
}

function textSummary(data, options) {
  const indent = options.indent || '';

  let summary = `\n${indent}Admin Operations - Load Test Summary\n`;
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
