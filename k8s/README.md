# Continuum Kubernetes Deployment

This directory contains a production-ready **Helm chart** for deploying Continuum to Kubernetes.

## Quick Start

### Prerequisites

- Kubernetes 1.20+
- Helm 3.0+
- A CockroachDB cluster (managed service or external)

### Install

```bash
# Create namespace
kubectl create namespace continuum

# Create secrets (required)
kubectl create secret generic continuum-secrets \
  --from-literal=databaseUrl='postgresql://root@cockroachdb-public:26257/defaultdb?sslmode=disable' \
  --from-literal=awsAccessKeyId='YOUR_AWS_KEY' \
  --from-literal=awsSecretAccessKey='YOUR_AWS_SECRET' \
  --from-literal=s3Bucket='your-bucket-name' \
  -n continuum

# Install chart
helm install continuum ./continuum -n continuum
```

### Verify Deployment

```bash
# Check pods
kubectl get pods -n continuum

# Check services
kubectl get svc -n continuum

# View API logs
kubectl logs -n continuum -l app=continuum-api -f
```

## Architecture

The Helm chart deploys:

- **2+ API instances** (horizontally scalable, coordinated via CockroachDB row-level locks)
- **2+ Web instances** (stateless, behind ClusterIP service)
- **ConfigMap** for non-sensitive configuration
- **Secret** for sensitive data (database URL, AWS credentials)
- **HorizontalPodAutoscaler** for automatic scaling
- **PodDisruptionBudget** for high availability

```
┌─────────────────────────────┐
│   Ingress (optional)        │
├─────────────┬───────────────┤
│   Web ×2    │   API ×2-5    │
│ (Stateless) │ (HPA Enabled) │
└─────────────┴───────────────┘
        │
    [CockroachDB External]
```

## Configuration

Edit `continuum/values.yaml` to customize:

### API Scaling

```yaml
api:
  replicaCount: 2  # Start with 2 instances
  autoscaling:
    enabled: true
    minReplicas: 2
    maxReplicas: 5
    targetCPUUtilizationPercentage: 70
```

### Database Connection

Set `DATABASE_URL` as a secret:

```bash
kubectl set env deployment/continuum-api \
  DATABASE_URL='postgresql://user:pass@cockroachdb:26257/defaultdb?sslmode=disable' \
  -n continuum
```

### AWS Integration

```bash
kubectl set env deployment/continuum-api \
  AWS_ACCESS_KEY_ID='...' \
  AWS_SECRET_ACCESS_KEY='...' \
  S3_BUCKET='your-bucket' \
  -n continuum
```

### Slack Notifications (Optional)

```bash
kubectl set env deployment/continuum-api \
  SLACK_WEBHOOK_URL='https://hooks.slack.com/services/...' \
  -n continuum
```

## Advanced Configuration

### Enable Ingress

```yaml
ingress:
  enabled: true
  className: nginx
  hosts:
    - host: continuum.example.com
      paths:
        - path: /
          pathType: Prefix
          service:
            name: continuum-web
            port: 3000
        - path: /api
          pathType: Prefix
          service:
            name: continuum-api
            port: 3001
```

Then apply:

```bash
helm upgrade continuum ./continuum -n continuum -f values.yaml
```

### TLS/HTTPS

```yaml
ingress:
  tls:
    enabled: true
    secretName: continuum-tls
```

Create the secret:

```bash
kubectl create secret tls continuum-tls \
  --cert=path/to/cert.crt \
  --key=path/to/key.key \
  -n continuum
```

### Network Policy

Enable to restrict pod-to-pod communication:

```yaml
networkPolicy:
  enabled: true
```

## Monitoring & Observability

### Health Checks

All pods include:
- **Liveness probe**: Checks `/swagger` endpoint every 10s
- **Readiness probe**: Checks `/swagger` endpoint every 5s with 10s initial delay

### Metrics

Configure Prometheus scraping:

```yaml
api:
  # Annotations enable Prometheus scraping
  # prometheus.io/scrape: "true"
  # prometheus.io/port: "3001"
```

### Viewing Logs

```bash
# Tail API logs
kubectl logs -n continuum -l app=continuum-api -f

# Tail Web logs
kubectl logs -n continuum -l app=continuum-web -f

# View logs from all pods
kubectl logs -n continuum --all-containers=true -f
```

## High Availability

This chart is configured for HA:

- **Minimum 2 replicas** for API and Web
- **Pod Anti-Affinity**: Spreads pods across nodes
- **Pod Disruption Budget**: Ensures 1 pod always runs during disruptions
- **Health checks**: Automatically restart unhealthy pods
- **HorizontalPodAutoscaler**: Scales to handle load

## Scaling

### Manual Scaling

```bash
# Scale API to 5 instances
kubectl scale deployment continuum-api -n continuum --replicas=5
```

### Automatic Scaling

Already enabled in values.yaml. Pods scale between `minReplicas` and `maxReplicas` based on CPU utilization.

Monitor scaling:

```bash
kubectl get hpa -n continuum -w
```

## Troubleshooting

### Pods Not Starting

```bash
# Check pod status
kubectl describe pod continuum-api-xxx -n continuum

# Check container logs
kubectl logs continuum-api-xxx -n continuum

# Check events
kubectl get events -n continuum --sort-by='.lastTimestamp'
```

### Database Connection Issues

```bash
# Verify secret exists
kubectl get secret continuum-secrets -n continuum

# Check if DATABASE_URL is set correctly
kubectl exec -it continuum-api-xxx -n continuum -- env | grep DATABASE_URL
```

### Service Not Accessible

```bash
# Verify services are running
kubectl get svc -n continuum

# Test DNS from within a pod
kubectl run -it debug --image=busybox -n continuum -- sh
# Inside pod: nslookup continuum-api
```

## Uninstall

```bash
helm uninstall continuum -n continuum
kubectl delete namespace continuum
```

## Production Recommendations

Before deploying to production:

1. **Use a managed CockroachDB service** (CockroachDB Cloud, AWS RDS, etc.)
2. **Enable TLS/HTTPS** via Ingress
3. **Set resource requests/limits** appropriately for your workload
4. **Configure Prometheus & Grafana** for monitoring
5. **Enable Pod Security Policies** for security
6. **Set up log aggregation** (ELK, Datadog, CloudWatch)
7. **Use Sealed Secrets** or External Secrets instead of plain secrets
8. **Test disaster recovery** (pod failure, zone failure, etc.)

## Support

For issues or questions, see [DEPLOYMENT.md](../DEPLOYMENT.md) or the main [README.md](../README.md).
