# StatisticsService Dual Publishing

## Overview

The `publishStatistics` method now performs **dual publishing** - it both stores statistics to MongoDB AND publishes them to the OpenTelemetry metrics system via `context.telemetry`. This creates a unified interface for metrics regardless of whether they're stored in the database or only exposed via Prometheus.

## How It Works

When you call `publishStatistics`, each statistic entry is processed based on its `type` field:

```typescript
await statisticsService.publishStatistics([
  { name: 'api_requests', type: 'counter', value: 1, attributes: { endpoint: '/api/users' } },
  { name: 'response_time', type: 'histogram', value: 0.234, attributes: { endpoint: '/api/users' } },
  { name: 'memory_usage', type: 'gauge', value: 524288000, attributes: { type: 'heap' } },
  { name: 'queue_size', type: 'updowncounter', value: 5, attributes: { queue: 'jobs' } },
]);
```

Each entry is:
1. **Validated** against the Mongoose schema
2. **Published to Telemetry** based on type (counter, histogram, gauge, etc.)
3. **Stored to MongoDB** (if `DO_STORE_STATISTICS=true`)

## Metric Type Mapping

### Counter → `context.telemetry.createCounter()`
```typescript
{
  name: 'requests_total',
  type: 'counter',
  value: 1,
  attributes: { method: 'GET', status: '200' }
}
```
**Result:** Increments the counter by the specified value

### UpDownCounter → `context.telemetry.createUpDownCounter()`
```typescript
{
  name: 'active_connections',
  type: 'updowncounter',
  value: 1,  // or -1 to decrement
  attributes: { type: 'websocket' }
}
```
**Result:** Adds (or subtracts) the value from the counter

### Histogram → `context.telemetry.createHistogram()`
```typescript
{
  name: 'request_duration_seconds',
  type: 'histogram',
  value: 0.234,
  unit: 'seconds',
  attributes: { endpoint: '/api/users' }
}
```
**Result:** Records the value in the histogram distribution

**Alternative with histogramData:**
```typescript
{
  name: 'request_duration_seconds',
  type: 'histogram',
  histogramData: {
    sum: 12.5,
    count: 50,
    buckets: [...]
  }
}
```

### Gauge → `context.telemetry.createGauge()`
```typescript
{
  name: 'memory_usage_bytes',
  type: 'gauge',
  value: 524288000,
  unit: 'bytes',
  attributes: { type: 'heap' }
}
```
**Result:** Sets the gauge to the specified value

### Summary → `context.telemetry.createHistogram()`
```typescript
{
  name: 'response_size',
  type: 'summary',
  value: 1024,
  unit: 'bytes'
}
```
**Result:** Recorded as histogram (OpenTelemetry doesn't have native summary type)

## Key Design Decisions

### 1. Non-Persistent Telemetry
All metrics published through `publishStatistics` have `persist: false` for their telemetry options:

```typescript
const metricOptions: Reactory.Telemetry.MetricOptions = {
  description: stat.description,
  unit: stat.unit,
  persist: false, // Already persisting via StatisticsService!
  resource: stat.resource,
};
```

**Why?** To avoid infinite recursion:
- StatisticsService stores metrics → MongoDB
- If telemetry metrics were persisted → StatisticsService
- This would call StatisticsService again → infinite loop

### 2. Graceful Degradation
Telemetry errors don't fail the entire operation:

```typescript
try {
  // Publish to telemetry
} catch (error) {
  telemetryErrors.push({ index, entry: stat, error });
  // Continue processing other statistics
}
```

**Benefits:**
- Validation errors still fail (data integrity)
- Telemetry errors are logged but don't break storage
- Operation succeeds even if telemetry is unavailable

### 3. Validation First
Statistics are validated before telemetry processing:

```typescript
try {
  const doc = new StatisticModel(stat);
  await doc.validate();
} catch (error) {
  validationErrors.push(...);
  continue; // Skip telemetry for invalid entries
}
```

**Why?** Don't pollute metrics with invalid data

## Usage Examples

### Example 1: Simple Counter

```typescript
const statisticsService = context.getService('core.ReactoryStatisticsService@1.0.0');

await statisticsService.publishStatistics([
  {
    name: 'user_registrations',
    type: 'counter',
    value: 1,
    description: 'New user registrations',
    attributes: {
      source: 'web',
      plan: 'free'
    }
  }
]);
```

**Result:**
- ✅ Stored in MongoDB
- ✅ Published to Prometheus as `reactory_user_registrations`
- ✅ Available for GraphQL queries
- ✅ Available for Grafana dashboards

### Example 2: Request Timing

```typescript
const startTime = Date.now();
// ... handle request ...
const duration = (Date.now() - startTime) / 1000;

await statisticsService.publishStatistics([
  {
    name: 'api_request_duration_seconds',
    type: 'histogram',
    value: duration,
    unit: 'seconds',
    description: 'API request duration',
    attributes: {
      method: 'POST',
      endpoint: '/api/data',
      status: '200'
    }
  },
  {
    name: 'api_requests_total',
    type: 'counter',
    value: 1,
    attributes: {
      method: 'POST',
      endpoint: '/api/data',
      status: '200'
    }
  }
]);
```

**Result:**
- ✅ Histogram records distribution of request times
- ✅ Counter tracks total requests
- ✅ Both stored and exposed via Prometheus

### Example 3: System Metrics

```typescript
const memInfo = process.memoryUsage();

await statisticsService.publishStatistics([
  {
    name: 'memory_heap_used_bytes',
    type: 'gauge',
    value: memInfo.heapUsed,
    unit: 'bytes',
    attributes: { type: 'heap' }
  },
  {
    name: 'memory_external_bytes',
    type: 'gauge',
    value: memInfo.external,
    unit: 'bytes',
    attributes: { type: 'external' }
  }
]);
```

**Result:**
- ✅ Current memory values set in gauges
- ✅ Historical data stored in MongoDB
- ✅ Real-time values available in Prometheus

### Example 4: Queue Management

```typescript
// Items added to queue
await statisticsService.publishStatistics([{
  name: 'job_queue_size',
  type: 'updowncounter',
  value: 5, // 5 items added
  attributes: { queue: 'email' }
}]);

// Items processed from queue
await statisticsService.publishStatistics([{
  name: 'job_queue_size',
  type: 'updowncounter',
  value: -3, // 3 items removed
  attributes: { queue: 'email' }
}]);
```

**Result:**
- ✅ Queue size tracked dynamically
- ✅ Historical changes stored
- ✅ Current size available in real-time

## Comparison: Direct vs Service Publishing

### Direct Telemetry (No Storage)
```typescript
// Only exposed via Prometheus
const counter = context.telemetry.createCounter('my_metric');
counter.add(1);

// ❌ Not stored in MongoDB
// ❌ Not queryable via GraphQL
// ✅ Low overhead
// ✅ Real-time only
```

### Service Publishing (Dual Publishing)
```typescript
// Stored AND exposed
await statisticsService.publishStatistics([{
  name: 'my_metric',
  type: 'counter',
  value: 1
}]);

// ✅ Stored in MongoDB
// ✅ Queryable via GraphQL
// ✅ Exposed via Prometheus
// ✅ Historical analysis possible
```

## When to Use Each Approach

### Use Direct Telemetry When:
- ✅ You need low-overhead real-time metrics
- ✅ Historical data isn't important
- ✅ Metrics are high-frequency (thousands per second)
- ✅ You only need Prometheus/Grafana visibility

**Example:**
```typescript
// High-frequency request counter
const counter = context.telemetry.createCounter('http_requests_total');
counter.add(1, { method: req.method, status: res.statusCode });
```

### Use StatisticsService When:
- ✅ You need historical data for analysis
- ✅ Metrics should be queryable via GraphQL
- ✅ You want both storage and real-time exposure
- ✅ You need to process/aggregate metrics later
- ✅ Metrics are business-critical KPIs

**Example:**
```typescript
// Business metrics that need analysis
await statisticsService.publishStatistics([{
  name: 'revenue_usd',
  type: 'counter',
  value: 99.99,
  attributes: { product: 'premium_plan', currency: 'USD' }
}]);
```

## Error Handling

### Validation Errors (Fatal)
```typescript
await statisticsService.publishStatistics([{
  name: '', // Invalid - name required
  type: 'counter',
  value: 1
}]);
// ❌ Throws error: "Validation failed for 1 statistic(s)"
// ❌ Nothing stored
// ❌ Nothing published to telemetry
```

### Telemetry Errors (Non-Fatal)
```typescript
await statisticsService.publishStatistics([{
  name: 'my_metric',
  type: 'counter',
  value: 1
}]);
// If telemetry fails:
// ✅ Still stored to MongoDB
// ⚠️ Warning logged about telemetry failure
// ✅ Operation succeeds
```

## Monitoring

### Check Dual Publishing Status

```bash
# Check Prometheus for live metrics
curl http://localhost:9464/metrics | grep my_metric

# Query MongoDB for historical data
db.reactory_statistics.find({ name: 'my_metric' })
```

### Verify Both Systems
```typescript
// Publish a test metric
await statisticsService.publishStatistics([{
  name: 'test_metric_' + Date.now(),
  type: 'counter',
  value: 1,
  attributes: { test: 'true' }
}]);

// Check Prometheus (immediately available)
// curl http://localhost:9464/metrics | grep test_metric

// Query database (should appear within seconds)
// db.reactory_statistics.find({ name: /test_metric/ }).sort({ _id: -1 }).limit(1)
```

## Performance Considerations

### Storage Enabled (`DO_STORE_STATISTICS=true`)
- Validation: ~1-2ms per statistic
- Telemetry: ~0.1-0.5ms per statistic
- MongoDB Insert: ~5-10ms per batch
- **Total: ~10-20ms for batch of 10 statistics**

### Storage Disabled (`DO_STORE_STATISTICS=false`)
- Validation: ~1-2ms per statistic
- Telemetry: ~0.1-0.5ms per statistic
- **Total: ~2-5ms for batch of 10 statistics**

### Recommendations
- Batch statistics when possible (10-100 per call)
- For high-frequency metrics, use direct telemetry
- For business metrics, use dual publishing
- Monitor `statistics_publish_duration_seconds` histogram

## Configuration

```bash
# Enable database storage (dual publishing)
DO_STORE_STATISTICS=true

# Disable database storage (telemetry only)
DO_STORE_STATISTICS=false
```

When storage is disabled:
- ✅ Statistics still validated
- ✅ Statistics still published to telemetry
- ❌ Statistics NOT stored in MongoDB
- ✅ Faster operation (no database write)

## Summary

The StatisticsService now provides **dual publishing**:

1. **Validates** all statistics against schema
2. **Publishes** to OpenTelemetry (Prometheus) based on type
3. **Stores** to MongoDB for historical analysis (optional)

**Benefits:**
- ✅ Unified interface for all metrics
- ✅ Both real-time and historical data
- ✅ Graceful degradation if telemetry fails
- ✅ Flexible storage control
- ✅ Type-appropriate metric handling

This gives you the best of both worlds: real-time metrics via Prometheus and historical data via MongoDB!

