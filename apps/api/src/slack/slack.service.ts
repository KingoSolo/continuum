import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class SlackService {
  private readonly logger = new Logger(SlackService.name);
  private readonly webhookUrl = process.env.SLACK_WEBHOOK_URL ?? '';

  constructor() {
    if (!this.webhookUrl) {
      this.logger.log('Slack notifications disabled (set SLACK_WEBHOOK_URL to enable).');
      return;
    }
    this.logger.log(`Slack notifications enabled (webhook configured).`);
  }

  isEnabled(): boolean {
    return !!this.webhookUrl;
  }

  async postMessage(text: string, details?: string): Promise<void> {
    if (!this.webhookUrl) {
      throw new Error('Slack is not configured');
    }

    const payload = {
      text,
      blocks: details
        ? [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text: `*${text}*\n${details}`,
              },
            },
          ]
        : [
            {
              type: 'section',
              text: {
                type: 'mrkdwn',
                text,
              },
            },
          ],
    };

    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Slack webhook returned ${response.status}: ${await response.text()}`);
    }
  }
}
