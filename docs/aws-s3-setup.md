# Amazon S3 setup for Mission Snapshot archival

Continuum can archive every generated **Mission Snapshot** to Amazon S3. The
integration is **optional and additive**: if the environment variables below are
absent, archival is skipped and the API behaves exactly as before. An upload
failure never rolls back CockroachDB or fails the `POST /snapshots` request.

When enabled, each snapshot is serialized to formatted JSON and uploaded to:

```
s3://$S3_BUCKET/mission/{missionId}/snapshots/{snapshotId}.json
```

The object URI is stored on the snapshot's `archiveUri` column and the outcome
on `archiveStatus` (`UPLOADED`, `FAILED`, or `SKIPPED`).

## 1. Create a bucket

```bash
aws s3api create-bucket \
  --bucket continuum-mission-snapshots \
  --region eu-central-1 \
  --create-bucket-configuration LocationConstraint=eu-central-1
```

The bucket can stay fully private — Continuum only writes objects; nothing needs
public access.

## 2. Create an IAM policy (least privilege)

Continuum only performs `PutObject`. Attach this policy to the IAM user or role
whose credentials the API uses:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ContinuumSnapshotPut",
      "Effect": "Allow",
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::continuum-mission-snapshots/mission/*"
    }
  ]
}
```

(If you later add snapshot download/verification, add `s3:GetObject` on the same
resource — not required for archival.)

## 3. Provide credentials via environment variables

Add to the root `.env` (see `.env.example`). Credentials are read from the
environment; if omitted, the AWS SDK default provider chain is used (e.g. an
instance/role profile).

```bash
S3_BUCKET=continuum-mission-snapshots
AWS_REGION=eu-central-1
AWS_ACCESS_KEY_ID=your-access-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
# AWS_SESSION_TOKEN=          # optional, for temporary credentials
# S3_ENDPOINT=                # optional, for S3-compatible endpoints
```

Both `S3_BUCKET` and `AWS_REGION` must be set for archival to activate.

## 4. Verify

Start the API and generate a snapshot (press **Start Demo**, or run the
simulator). On success the API logs:

```
[S3Service] S3 archival enabled (bucket "continuum-mission-snapshots", region "eu-central-1").
[SnapshotArchiveService] Archived snapshot <id> to s3://continuum-mission-snapshots/mission/<missionId>/snapshots/<id>.json.
```

Confirm the object and the recorded status:

```bash
aws s3 ls "s3://continuum-mission-snapshots/mission/" --recursive | tail
```

```sql
SELECT id, "archiveStatus", "archiveUri" FROM "MissionSnapshot" ORDER BY "createdAt" DESC LIMIT 5;
```

If credentials or permissions are wrong, snapshot creation still succeeds and the
snapshot is recorded with `archiveStatus = 'FAILED'` (see the API log for the
underlying S3 error).
