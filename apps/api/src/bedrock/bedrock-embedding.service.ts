import { Injectable, Logger } from '@nestjs/common';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

/**
 * AWS Bedrock embedding service for vector memory.
 *
 * Generates vector embeddings for memory capsules using AWS Bedrock's Titan Embed models.
 * Gracefully disables if unconfigured — callers should check isEnabled()
 * before calling embed(), and handle embedding failures as non-blocking side-effects.
 */
@Injectable()
export class BedrockEmbeddingService {
  private readonly logger = new Logger(BedrockEmbeddingService.name);
  private readonly modelId = process.env.BEDROCK_MODEL_ID ?? '';
  private readonly client: BedrockRuntimeClient | null;

  constructor() {
    if (!this.modelId) {
      this.logger.log('Vector embeddings disabled (set BEDROCK_MODEL_ID to enable).');
      this.client = null;
      return;
    }

    const region = process.env.AWS_REGION ?? 'us-east-1';
    const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;

    this.client = new BedrockRuntimeClient({
      region,
      ...(accessKeyId && secretAccessKey
        ? {
            credentials: {
              accessKeyId,
              secretAccessKey,
              sessionToken: process.env.AWS_SESSION_TOKEN,
            },
          }
        : {}),
    });

    this.logger.log(`Vector embeddings enabled (model "${this.modelId}" in region "${region}").`);
  }

  isEnabled(): boolean {
    return !!this.client;
  }

  /**
   * Generate a vector embedding for text using AWS Bedrock Titan Embed.
   * Throws if embeddings are not configured.
   */
  async embed(text: string): Promise<number[]> {
    if (!this.client) {
      throw new Error('Bedrock embeddings are not configured');
    }

    try {
      const command = new InvokeModelCommand({
        modelId: this.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify({
          inputText: text,
        }),
      });

      const response = await this.client.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));

      // Titan Embed v2 returns { embedding: number[] }
      if (!Array.isArray(responseBody.embedding)) {
        throw new Error('Invalid response from Bedrock: missing embedding array');
      }

      return responseBody.embedding;
    } catch (error) {
      this.logger.error(
        `Failed to generate embedding via Bedrock (model "${this.modelId}")`,
        error instanceof Error ? error.message : String(error),
      );
      throw error;
    }
  }
}
