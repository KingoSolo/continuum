import { Injectable, Logger } from '@nestjs/common';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';

/**
 * Thin, optional Amazon S3 client (AWS SDK v3).
 *
 * Configuration is read entirely from environment variables. If the required
 * variables are absent the service stays disabled and callers skip archival —
 * the API and demo behave exactly as before.
 */
@Injectable()
export class S3Service {
  private readonly logger = new Logger(S3Service.name);
  private readonly bucket = process.env.S3_BUCKET ?? '';
  private readonly region = process.env.AWS_REGION ?? process.env.S3_REGION ?? '';
  private readonly client: S3Client | null;

  constructor() {
    if (!this.bucket || !this.region) {
      this.client = null;
      this.logger.log('S3 archival disabled (set S3_BUCKET and AWS_REGION to enable).');
      return;
    }

    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
    this.client = new S3Client({
      region: this.region,
      // Prefer explicit environment credentials; otherwise fall back to the AWS
      // default provider chain (e.g. an instance/role profile).
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
              sessionToken: process.env.AWS_SESSION_TOKEN,
            },
          }
        : {}),
      // Optional override for S3-compatible endpoints.
      ...(process.env.S3_ENDPOINT
        ? { endpoint: process.env.S3_ENDPOINT, forcePathStyle: true }
        : {}),
    });
    this.logger.log(`S3 archival enabled (bucket "${this.bucket}", region "${this.region}").`);
  }

  /** True when S3 is configured and uploads should be attempted. */
  isEnabled(): boolean {
    return this.client !== null;
  }

  /**
   * Uploads a UTF-8 JSON body under `key` and returns the canonical `s3://` URI.
   * Throws on failure; callers decide how to handle it.
   */
  async putJson(key: string, body: string): Promise<string> {
    if (!this.client) {
      throw new Error('S3 is not configured');
    }
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: 'application/json',
      }),
    );
    return `s3://${this.bucket}/${key}`;
  }
}
