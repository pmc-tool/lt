# Load Testing with k6

## Overview
Load testing scripts for the Provably-Fair Lottery Platform using k6. Tests simulate 100k DAU scenarios with peak loads of 2k-5k RPS.

## Prerequisites

### Install k6

**macOS:**
```bash
brew install k6
```

**Linux:**
```bash
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

**Windows:**
```powershell
choco install k6
```

Or download from: https://k6.io/docs/get-started/installation/

### Backend Running
Ensure the backend is running and accessible:
```bash
cd backend
npm run start:dev
```

Backend should be running on `http://localhost:3000`.

## Test Scripts

### 1. Quick Buy Flow (`quick-buy.js`)
**Simulates:** Anonymous users browsing draws and requesting OTP for purchase

**Load Profile:**
- Ramp up: 2 min to 100 users → 5 min to 500 → 10 min to 1000 → 5 min to 2000
- Peak: 2000 concurrent users for 10 minutes
- Ramp down: 5 minutes

**Endpoints Tested:**
- `POST /auth/otp/request` - OTP generation
- `GET /draws?status=STARTED` - Active draws list
- `GET /draws/:id` - Draw details

**Thresholds:**
- p95 response time < 2.5s
- Error rate < 5%

**Run:**
```bash
k6 run quick-buy.js
```

### 2. Admin Operations (`admin-operations.js`)
**Simulates:** Admin users managing the platform

**Load Profile:**
- Ramp up: 1 min to 10 users → 3 min to 20
- Peak: 20 concurrent admin users for 5 minutes
- Ramp down: 1 minute

**Endpoints Tested:**
- `POST /admin/auth/login` - Admin authentication
- `GET /reports/dashboard` - Dashboard stats
- `GET /admin/draws` - Draw management
- `GET /cod/tasks` - COD task list
- `GET /cod/stats` - COD statistics
- `GET /admin/users` - User list
- `GET /audit` - Audit logs
- `GET /reports/sales` - Sales reports

**Thresholds:**
- p95 response time < 3s
- Error rate < 2%

**Run:**
```bash
k6 run admin-operations.js
```

**Custom Configuration:**
```bash
k6 run \
  -e BASE_URL=http://localhost:3000/v1 \
  -e ADMIN_EMAIL=admin@lottery.com \
  -e ADMIN_PASSWORD=admin123 \
  admin-operations.js
```

### 3. Verification Flow (`verification.js`)
**Simulates:** Users verifying draw fairness

**Load Profile:**
- Ramp up: 2 min to 200 → 5 min to 500 → 5 min to 1000
- Peak: 1000 concurrent verifiers for 5 minutes
- Ramp down: 3 minutes

**Endpoints Tested:**
- `GET /fairness/verify/:drawId` - Verification data
- `GET /fairness/verify/:drawId/compute` - Server-side computation
- `GET /tickets?draw_id=X` - User tickets

**Thresholds:**
- p95 response time < 1.5s
- Error rate < 3%

**Run:**
```bash
k6 run verification.js
```

## Running Tests

### Basic Execution
```bash
# Run single test
k6 run quick-buy.js

# Run with custom configuration
k6 run -e BASE_URL=http://api.example.com/v1 quick-buy.js

# Run all tests sequentially
k6 run quick-buy.js
k6 run admin-operations.js
k6 run verification.js
```

### Advanced Options

**Custom VUs and Duration:**
```bash
# Override load profile
k6 run --vus 100 --duration 5m quick-buy.js
```

**Output to File:**
```bash
# JSON output
k6 run --out json=results.json quick-buy.js

# InfluxDB (for Grafana visualization)
k6 run --out influxdb=http://localhost:8086/k6 quick-buy.js
```

**Specific Stages:**
```bash
# Custom stages
k6 run --stage 1m:50,5m:100,2m:0 quick-buy.js
```

**Cloud Execution:**
```bash
# Run on k6 Cloud
k6 cloud quick-buy.js
```

## Understanding Results

### Key Metrics

**http_req_duration:** Request response time
- `avg` - Average response time
- `p(95)` - 95th percentile (most important)
- `p(99)` - 99th percentile
- `max` - Maximum response time

**http_reqs:** Request throughput
- `count` - Total requests made
- `rate` - Requests per second

**http_req_failed:** Failed requests
- `rate` - Percentage of failed requests

**Custom Metrics:**
- `errors` - Application-level errors (failed checks)

### Success Criteria

**Quick Buy Flow:**
- ✅ p95 < 2500ms
- ✅ Error rate < 5%
- ✅ Handles 2000 concurrent users

**Admin Operations:**
- ✅ p95 < 3000ms
- ✅ Error rate < 2%
- ✅ Handles 20 concurrent admins

**Verification Flow:**
- ✅ p95 < 1500ms
- ✅ Error rate < 3%
- ✅ Handles 1000 concurrent verifiers

## Interpreting Results

### Example Output
```
Quick Buy Flow - Load Test Summary
============================================================

HTTP Request Duration:
  avg: 456.23ms
  p95: 1823.45ms
  p99: 2456.78ms

Total Requests: 45678
Request Rate: 76.13/s

Failed Requests: 2.34%

Custom Error Rate: 1.89%
```

### What to Look For

**Good Performance:**
- p95 below threshold
- Error rate below threshold
- Consistent response times throughout test
- No timeouts

**Problems:**
- p95 exceeds threshold → Database queries need optimization
- High error rate → Application crashes or rate limiting too aggressive
- Increasing response times → Memory leak or resource exhaustion
- Timeouts → Connection pool exhausted or long-running queries

## Performance Optimization Tips

### If Tests Fail

**Database:**
- Check connection pool size (should be ~20)
- Add indexes on frequently queried columns
- Use database partitioning for large tables
- Enable query caching in TypeORM

**Redis:**
- Increase Redis memory limit
- Check cache hit rate
- Optimize cache key expiration

**Application:**
- Enable Node.js clustering
- Increase memory limit: `NODE_OPTIONS=--max-old-space-size=4096`
- Profile with `clinic` or `0x` tools
- Check for N+1 query problems

**Network:**
- Increase nginx worker connections
- Enable HTTP/2
- Add CDN for static assets

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Load Tests

on:
  schedule:
    - cron: '0 2 * * *' # Daily at 2 AM
  workflow_dispatch:

jobs:
  load-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Install k6
        run: |
          sudo gpg -k
          sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
          echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
          sudo apt-get update
          sudo apt-get install k6

      - name: Start Backend
        run: |
          cd backend
          npm ci
          npm run start &
          sleep 10

      - name: Run Load Tests
        run: |
          cd tests/load
          k6 run quick-buy.js
          k6 run admin-operations.js
          k6 run verification.js

      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: load-test-results
          path: tests/load/*.json
```

## Monitoring During Tests

### Real-Time Monitoring
```bash
# Watch backend logs
cd backend
npm run start:dev

# Monitor system resources
htop  # or top

# Watch database connections
docker exec -it lottery-postgres psql -U lottery_user -d lottery -c "SELECT count(*) FROM pg_stat_activity;"

# Monitor Redis
docker exec -it lottery-redis redis-cli INFO stats
```

### Metrics to Watch
- CPU usage (should stay < 80%)
- Memory usage (should not grow indefinitely)
- Database connections (should not exceed pool size)
- Redis memory (should be stable)
- Network I/O (check for bottlenecks)

## Advanced Scenarios

### Custom Scenarios
Create your own test by copying a template:
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '1m', target: 50 },
    { duration: '3m', target: 50 },
    { duration: '1m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<2000'],
    http_req_failed: ['rate<0.05'],
  },
};

export default function () {
  // Your test logic here
  const response = http.get('http://localhost:3000/v1/your-endpoint');

  check(response, {
    'status is 200': (r) => r.status === 200,
  }) || errorRate.add(1);

  sleep(1);
}
```

## Troubleshooting

### k6 Command Not Found
```bash
# Verify installation
k6 version

# Reinstall if needed
brew reinstall k6  # macOS
```

### Connection Refused
- Ensure backend is running on correct port
- Check firewall settings
- Verify BASE_URL environment variable

### High Error Rate
- Check backend logs for errors
- Verify database is running and accessible
- Check Redis connection
- Ensure sufficient system resources

### Inconsistent Results
- Run tests multiple times and average results
- Ensure no other processes consuming resources
- Use dedicated test environment
- Increase warm-up duration in stages

## Next Steps
- Set up continuous load testing in CI/CD
- Integrate with monitoring tools (Grafana, DataDog)
- Create alerts for performance regressions
- Establish performance budgets
- Test with production-like data volumes
