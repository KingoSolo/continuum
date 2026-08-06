# Deployment Guide

## Local Development with Docker

### Prerequisites

- Docker and Docker Compose installed
- AWS credentials configured (optional, for S3/Bedrock)
- CockroachDB will start automatically in the Docker environment

### Quick Start

1. **Clone the repository** (if not already done)

   ```bash
   git clone <repo-url>
   cd continuum
   ```

2. **Set environment variables** (optional, for AWS services)

   ```bash
   # Create a .env.docker file or set in your shell:
   export AWS_ACCESS_KEY_ID=your-access-key
   export AWS_SECRET_ACCESS_KEY=your-secret-key
   export AWS_REGION=us-east-1
   export S3_BUCKET=your-bucket-name
   export BEDROCK_MODEL_ID=amazon.titan-embed-text-v2
   export SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
   ```

3. **Start all services**

   ```bash
   docker-compose up -d
   ```

   This will:
   - Start CockroachDB on port 26257
   - Run database migrations
   - Start the API on port 3001
   - Start the web app on port 3000

4. **Access the application**
   - Web UI: http://localhost:3000
   - API docs: http://localhost:3001/swagger
   - CockroachDB Admin: http://localhost:8080

### Verify Services

```bash
# Check container status
docker-compose ps

# View logs
docker-compose logs -f api      # API logs
docker-compose logs -f web      # Web logs
docker-compose logs -f cockroachdb  # Database logs
```

### Stop Services

```bash
docker-compose down

# Also remove volumes (database data)
docker-compose down -v
```

## Multi-Instance Deployment (Horizontal Scaling)

The Mission Context builds use CockroachDB row-level locks (`SELECT ... FOR UPDATE`) for coordination, enabling horizontal scale-out of the API layer.

### Architecture

```
┌─────────────────┐
│   Load Balancer │
└────────┬────────┘
         │
    ┌────┼────┐
    │    │    │
  ┌─▼──┐│ ┌──▼─┐
  │ API││ │ API│
  └────┘│ └────┘
        │
  ┌─────▼─────┐
  │CockroachDB │
  │  Cluster   │
  └────────────┘
```

Each API instance:

- Uses row-level locks on the Mission table
- Acquires locks at transaction start
- Releases on commit/abort
- Allows fair concurrent access without in-process state

### Deploy Multiple API Instances

1. **Using Docker Compose with scaling**

   ```bash
   docker-compose up -d --scale api=3
   ```

2. **Using Kubernetes**
   See `k8s/` directory for Helm charts (create if needed)

3. **Using Render, Railway, or similar PaaS**
   - Set `DATABASE_URL` environment variable
   - Ensure CockroachDB is accessible from all instances
   - Set AWS credentials as needed
   - Deploy 2+ instances behind a load balancer

### Health Checks

All services include health checks:

- **API**: `GET /swagger` (or any endpoint, e.g., `/missions/:id/context`)
- **Database**: CockroachDB SQL connectivity check
- **Web**: Next.js readiness check

## Environment Variables

| Variable                | Required | Purpose                                                           |
| ----------------------- | -------- | ----------------------------------------------------------------- |
| `DATABASE_URL`          | Yes      | PostgreSQL connection string to CockroachDB                       |
| `NODE_ENV`              | No       | `production` or `development` (default: `production`)             |
| `AWS_REGION`            | No       | AWS region for S3/Bedrock (default: `us-east-1`)                  |
| `AWS_ACCESS_KEY_ID`     | No       | AWS access key (required if using S3/Bedrock)                     |
| `AWS_SECRET_ACCESS_KEY` | No       | AWS secret key (required if using S3/Bedrock)                     |
| `S3_BUCKET`             | No       | S3 bucket name for snapshot archival                              |
| `BEDROCK_MODEL_ID`      | No       | Bedrock model for embeddings (e.g., `amazon.titan-embed-text-v2`) |
| `SLACK_WEBHOOK_URL`     | No       | Slack incoming webhook URL for incident notifications             |

## Troubleshooting

### CockroachDB Connection Refused

- Ensure `cockroachdb` service is healthy: `docker-compose ps`
- Wait for CockroachDB to fully start (check logs): `docker-compose logs cockroachdb`
- Reset: `docker-compose down -v && docker-compose up -d`

### Migration Failures

- Check database logs: `docker-compose logs cockroachdb`
- Verify `DATABASE_URL` is correct
- Manually inspect schema: `docker-compose exec cockroachdb cockroach sql --insecure`

### API Health Check Failing

- Check API logs: `docker-compose logs api`
- Ensure database migrations completed
- Verify `DATABASE_URL` environment variable

### Web App Cannot Connect to API

- Ensure API is healthy: `docker-compose logs api`
- Check API container is running: `docker-compose ps api`
- For external deployments, set `NEXT_PUBLIC_API_URL` to the API's public URL

## Performance Tuning

### CockroachDB

For production deployments, tune:

- `--max-sql-memory`: Memory limit per SQL statement
- `--cache`: Total memory for caching
- `--sql-instance-ca-cert`: TLS for secure communication

See [CockroachDB documentation](https://www.cockroachlabs.com/docs/stable/configure-replication-zones.html) for details.

### API

- Increase Node.js heap: `--max-old-space-size=2048`
- Connection pool sizing: tune `DATABASE_URL` pool parameters
- Enable compression: `gzip` middleware in production

### Web

- Enable caching headers in Next.js
- Use CDN for static assets
- Optimize images with Next.js Image component

## Monitoring & Observability

### Logs

All containers log to stdout. Aggregate with:

- Docker's built-in driver (`docker logs`)
- External tool (ELK, Datadog, CloudWatch)

### Metrics

Recommended integrations:

- **Prometheus** for API and CockroachDB metrics
- **Grafana** for dashboards
- **Jaeger** for distributed tracing

### Health Checks

Built-in health checks allow orchestrators (Kubernetes, Docker Swarm) to auto-restart failed instances.

## Backup & Recovery

### Database Backups

```bash
# Manual backup (when running locally)
docker-compose exec cockroachdb \
  cockroach dump defaultdb > backup.sql

# Restore from backup
docker-compose exec cockroachdb \
  cockroach sql --insecure < backup.sql
```

For production, use CockroachDB's [backup and restore features](https://www.cockroachlabs.com/docs/stable/backup-and-restore).

### S3 Snapshot Archival

Mission snapshots are automatically archived to S3. Ensure:

- S3 bucket has versioning enabled
- IAM policy grants `s3:PutObject` to the bucket
- Retention policy is configured per your compliance needs
