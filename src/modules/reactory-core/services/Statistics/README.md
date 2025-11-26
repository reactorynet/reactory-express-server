# Reactory Statistics Service

OpenTelemetry-compatible statistics and metrics management service for Reactory.

## Overview

The Statistics service provides comprehensive support for collecting, storing, and querying metrics following the OpenTelemetry specification. It's fully compatible with Prometheus exporters and Jaeger tracing integration.

## Architecture

- **Model**: `StatisticModel` - Mongoose schema with OTEL-compliant fields
- **Service**: `ReactoryStatisticsService` - Business logic and data access
- **Resolver**: `StatisticsResolver` - GraphQL interface
- **GraphQL Schema**: Comprehensive OTEL types and operations

## Metric Types

### Counter
Monotonically increasing values (e.g., total requests, errors)

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "http_requests_total"
    type: COUNTER
    value: 1
    attributes: {
      method: "GET"
      status: "200"
      endpoint: "/api/users"
    }
    unit: "1"
    description: "Total HTTP requests"
  }]) {
    id
    statistics {
      id
      name
      value
    }
  }
}
```

### Gauge
Point-in-time values that can go up or down (e.g., memory usage, active connections)

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "memory_usage_bytes"
    type: GAUGE
    value: 1048576
    attributes: {
      process: "node"
      type: "heap_used"
    }
    unit: "bytes"
    description: "Current memory usage"
  }]) {
    id
    statistics {
      id
      name
      value
    }
  }
}
```

### Histogram
Distribution of values (e.g., request duration, response sizes)

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "http_request_duration_ms"
    type: HISTOGRAM
    histogramData: {
      count: 100
      sum: 5000
      min: 10
      max: 500
      buckets: [
        { upperBound: 10, count: 20 }
        { upperBound: 50, count: 60 }
        { upperBound: 100, count: 85 }
        { upperBound: 500, count: 100 }
      ]
    }
    attributes: {
      endpoint: "/api/users"
      method: "GET"
    }
    unit: "ms"
    description: "HTTP request duration distribution"
  }]) {
    id
    statistics {
      id
      name
      histogramData {
        count
        sum
        buckets {
          upperBound
          count
        }
      }
    }
  }
}
```

### Summary
Statistical summary with quantiles (e.g., latency percentiles)

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "response_time_summary"
    type: SUMMARY
    summaryData: {
      count: 1000
      sum: 50000
      quantiles: [
        { quantile: 0.5, value: 45 }
        { quantile: 0.9, value: 95 }
        { quantile: 0.99, value: 150 }
      ]
    }
    attributes: {
      service: "api"
    }
    unit: "ms"
  }]) {
    id
    statistics {
      id
      name
      summaryData {
        count
        sum
        quantiles {
          quantile
          value
        }
      }
    }
  }
}
```

### UpDownCounter
Counter that can increase or decrease (e.g., active sessions, queue depth)

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "active_connections"
    type: UPDOWNCOUNTER
    value: 42
    attributes: {
      service: "database"
      pool: "main"
    }
    unit: "1"
    description: "Current active database connections"
  }]) {
    id
    statistics {
      id
      name
      value
    }
  }
}
```

## Querying Statistics

### Basic Query

```graphql
query {
  CoreGetStatistics(filter: {
    names: ["http_requests_total"]
    from: "2025-01-01T00:00:00Z"
    till: "2025-01-31T23:59:59Z"
  }) {
    id
    name
    type
    value
    attributes
    timestamp
    resource {
      serviceName
      deploymentEnvironment
    }
  }
}
```

### Filter by Service and Attributes

```graphql
query {
  CoreGetStatistics(filter: {
    serviceName: "reactory-server"
    attributes: {
      method: "GET"
      status: "200"
    }
    types: [COUNTER, GAUGE]
  }) {
    id
    name
    type
    value
    attributes
    timestamp
  }
}
```

## Resource Attributes

Resource attributes identify the source of metrics:

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "cpu_usage_percent"
    type: GAUGE
    value: 45.5
    resource: {
      serviceName: "reactory-server"
      serviceVersion: "1.0.0"
      serviceInstanceId: "instance-1"
      deploymentEnvironment: "production"
      hostName: "server-01"
    }
    unit: "percent"
  }]) {
    id
  }
}
```

## Trace Correlation

Link metrics to distributed traces:

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "database_query_duration_ms"
    type: HISTOGRAM
    value: 150
    traceContext: {
      traceId: "4bf92f3577b34da6a3ce929d0e0e4736"
      spanId: "00f067aa0ba902b7"
      traceFlags: 1
    }
    attributes: {
      operation: "findUser"
      database: "mongodb"
    }
    unit: "ms"
  }]) {
    id
  }
}
```

## Instrumentation Scope

Track which library/instrumentation created the metric:

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "graphql_operation_duration_ms"
    type: HISTOGRAM
    value: 250
    scope: {
      name: "reactory-graphql-instrumentation"
      version: "1.0.0"
      schemaUrl: "https://opentelemetry.io/schemas/1.20.0"
    }
    attributes: {
      operationName: "GetUser"
      operationType: "query"
    }
    unit: "ms"
  }]) {
    id
  }
}
```

## Time-To-Live (TTL)

Automatically expire metrics after a period:

```graphql
mutation {
  CorePublishStatistics(entries: [{
    name: "temporary_counter"
    type: COUNTER
    value: 1
    ttl: 3600  # Expires after 1 hour
  }]) {
    id
  }
}
```

## Statistics Packages

Group related statistics together:

```graphql
mutation {
  CorePublishStatistics(entries: [
    {
      name: "request_count"
      type: COUNTER
      value: 100
    }
    {
      name: "error_count"
      type: COUNTER
      value: 5
    }
    {
      name: "avg_response_time_ms"
      type: GAUGE
      value: 150
    }
  ]) {
    id
    reference
    statistics {
      id
      name
      type
      value
    }
  }
}
```

## Integration with Existing OTEL Setup

The Statistics service integrates seamlessly with your existing Prometheus/Jaeger setup:

### 1. Publish metrics from your code:

```typescript
import { getStatisticsService } from '@reactory/server-core';

// In your resolver/service
const statisticsService = context.getService('core.ReactoryStatisticsService@1.0.0');

await statisticsService.publishStatistics([
  {
    name: 'graphql_operation_duration_ms',
    type: 'histogram',
    histogramData: {
      count: 1,
      sum: duration,
      min: duration,
      max: duration,
      buckets: calculateBuckets(duration),
    },
    attributes: {
      operationName,
      operationType: 'query',
    },
    timestamp: new Date(),
    resource: {
      serviceName: 'reactory-server',
      deploymentEnvironment: process.env.NODE_ENV,
    },
  },
]);
```

### 2. Query from Grafana/Prometheus:

The metrics are stored in MongoDB and can be exported to Prometheus via your existing OTEL exporter.

## Best Practices

### Naming Conventions

- Use snake_case: `http_requests_total`, `memory_usage_bytes`
- Include units in names: `_ms`, `_bytes`, `_total`, `_seconds`
- Use descriptive names: `graphql_operation_duration_ms` not `gql_time`

### Attribute Guidelines

- **Keep cardinality low**: Avoid high-cardinality values like user IDs or timestamps
- **Use consistent names**: `http.method` not sometimes `method` and sometimes `http_method`
- **Follow semantic conventions**: Use standard attribute names when possible

### Good Attributes:
```javascript
{
  method: 'GET',           // Low cardinality
  status: '200',           // Low cardinality
  endpoint: '/api/users',  // Medium cardinality
}
```

### Bad Attributes (High Cardinality):
```javascript
{
  user_id: '123456',       // Unique per user
  timestamp: '2025-01-01', // Unique per request
  request_id: 'uuid',      // Unique per request
}
```

## Service Methods

### `getStatistics(filter)`
Retrieve statistics with flexible filtering

### `getStatisticById(id)`
Get a single statistic by ID

### `publishStatistics(entries, packageOptions)`
Create new statistics

### `updateStatistic(id, updates)`
Update an existing statistic

### `getStatisticsPackage(reference)`
Get a package of statistics

### `getStatisticsPackages(filter)`
Get multiple packages

### `processStatistics(reference, processor, params)`
Process statistics with a custom processor

### `aggregateStatistics(name, from, till, groupBy)`
Aggregate statistics by time period

## Error Handling

All service methods throw errors that should be caught and logged:

```typescript
try {
  const stats = await statisticsService.getStatistics(filter);
} catch (error) {
  context.log('Error retrieving statistics', { error, filter }, 'error');
  throw error;
}
```

## Related Components

- **Telemetry Module**: OTEL instrumentation and Prometheus exporter
- **Prometheus**: Metrics scraping and storage
- **Jaeger**: Distributed tracing
- **Grafana**: Visualization and dashboards

## Migration from Legacy Statistics

The new schema includes legacy field support for backward compatibility:

- `key` → `name`
- `stat` → `value` / `histogramData` / `summaryData`
- `when` → `timestamp`

Old queries will continue to work during the migration period.
