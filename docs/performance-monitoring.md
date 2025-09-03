# Performance Monitoring and Analytics

## Overview

The EAI Schema Toolkit includes comprehensive performance monitoring and analytics capabilities to help you understand and optimize the application's behavior. This documentation covers the monitoring features, metrics collection, and how to use the analytics data.

## Features

### 1. Metrics Collection

The toolkit collects various types of metrics:

- **HTTP Request Metrics**: Duration and count of HTTP requests
- **System Metrics**: Memory and CPU usage
- **Garbage Collection Metrics**: GC duration and frequency
- **Connection Metrics**: Active connections count
- **Application Metrics**: Custom business metrics

### 2. Monitoring Endpoints

The toolkit exposes several endpoints for monitoring:

- `/api/performance/metrics`: Prometheus metrics endpoint
- `/api/performance/health`: Health check endpoint
- `/api/performance/summary`: Metrics summary endpoint

### 3. Real-time Monitoring

Real-time monitoring capabilities include:

- Live metrics streaming
- Alerting for threshold breaches
- Performance dashboard integration

## Metrics Reference

### HTTP Request Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `http_request_duration_seconds` | Histogram | Duration of HTTP requests in seconds |
| `http_requests_total` | Counter | Total number of HTTP requests |

Labels:
- `method`: HTTP method (GET, POST, etc.)
- `route`: Request route path
- `status_code`: HTTP status code

### System Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `process_memory_usage_bytes` | Gauge | Process memory usage in bytes |
| `process_cpu_usage_percent` | Gauge | Process CPU usage percentage |
| `active_connections` | Gauge | Number of active connections |

### Garbage Collection Metrics

| Metric Name | Type | Description |
|-------------|------|-------------|
| `gc_duration_seconds` | Histogram | Duration of garbage collection in seconds |

Labels:
- `type`: GC type (scavenge, mark-sweep-compact, etc.)

## Integration with Monitoring Tools

### Prometheus Integration

The toolkit exposes a Prometheus-compatible metrics endpoint at `/api/performance/metrics`. To integrate with Prometheus:

1. Add the endpoint to your Prometheus configuration:
```yaml
scrape_configs:
  - job_name: 'eai-schema-toolkit'
    static_configs:
      - targets: ['your-eai-toolkit-host:3001']
```

2. Configure the scrape interval:
```yaml
scrape_configs:
  - job_name: 'eai-schema-toolkit'
    scrape_interval: 15s
    static_configs:
      - targets: ['your-eai-toolkit-host:3001']
```

### Grafana Dashboard

Create a Grafana dashboard to visualize the metrics:

1. Add Prometheus as a data source
2. Create panels for key metrics:
   - HTTP request rate
   - HTTP error rate
   - Average response time
   - Memory usage
   - CPU usage

Example Grafana queries:
- Request rate: `rate(http_requests_total[5m])`
- Error rate: `rate(http_requests_total{status_code=~"5.."}[5m])`
- Average response time: `rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])`

### Alerting

Set up alerts for critical metrics:

1. High error rate:
```
rate(http_requests_total{status_code=~"5.."}[5m]) > 0.05
```

2. High response time:
```
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m]) > 1
```

3. High memory usage:
```
process_memory_usage_bytes / 1024 / 1024 > 500
```

## Custom Metrics

You can add custom metrics to track business-specific data:

```typescript
import client from "prom-client";

// Create a custom counter
const customCounter = new client.Counter({
  name: "custom_business_events_total",
  help: "Total number of custom business events",
  labelNames: ["event_type"],
});

// Increment the counter
customCounter.labels("user_login").inc();
```

## Performance Optimization

### Memory Optimization

Monitor memory usage patterns to identify leaks or inefficiencies:

1. Track heap usage over time
2. Monitor external memory usage
3. Set alerts for unusual memory growth

### CPU Optimization

Monitor CPU usage to identify performance bottlenecks:

1. Track CPU usage during peak hours
2. Correlate with request volume
3. Identify CPU-intensive operations

### Request Optimization

Optimize request handling performance:

1. Monitor request duration by endpoint
2. Identify slow endpoints
3. Optimize database queries and external calls

## Best Practices

### 1. Metric Naming

Follow Prometheus naming conventions:
- Use base units (seconds, bytes)
- Use plural forms for counts
- Use descriptive names

### 2. Label Usage

Use labels judiciously:
- Avoid high-cardinality labels
- Use consistent label names
- Limit the number of label combinations

### 3. Alerting

Set meaningful alerts:
- Avoid alert fatigue with too many alerts
- Set appropriate thresholds
- Include actionable information in alerts

### 4. Monitoring Dashboard

Create informative dashboards:
- Show key metrics prominently
- Include historical context
- Provide drill-down capabilities

## Troubleshooting

### Common Issues

1. **Metrics not appearing in Prometheus**
   - Check the scrape configuration
   - Verify the metrics endpoint is accessible
   - Ensure the correct port is used

2. **High memory usage**
   - Check for memory leaks
   - Monitor object allocation
   - Consider garbage collection tuning

3. **High CPU usage**
   - Profile CPU-intensive operations
   - Optimize algorithms
   - Consider horizontal scaling

### Debugging

Enable debug logging to troubleshoot monitoring issues:

```bash
LOG_LEVEL=debug npm start
```

## Security Considerations

### Access Control

Protect the metrics endpoint:
- Restrict access to trusted sources
- Use authentication for sensitive metrics
- Consider exposing metrics on a separate port

### Data Privacy

Ensure metrics don't contain sensitive information:
- Avoid including user data in labels
- Sanitize metric names and values
- Review custom metrics for privacy concerns

## Future Enhancements

Planned improvements to the monitoring system:

1. **Advanced Analytics**
   - Machine learning-based anomaly detection
   - Predictive performance modeling
   - Automated optimization suggestions

2. **Enhanced Visualization**
   - Real-time performance dashboards
   - Interactive metric exploration
   - Customizable alerting rules

3. **Distributed Tracing**
   - Request tracing across services
   - Performance bottleneck identification
   - End-to-end latency analysis

4. **Container Integration**
   - Kubernetes metrics integration
   - Docker container monitoring
   - Auto-scaling based on metrics

This comprehensive monitoring and analytics system ensures that the EAI Schema Toolkit maintains high performance and reliability while providing valuable insights for optimization and troubleshooting.