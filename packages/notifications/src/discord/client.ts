import type { DiscordNotification } from '../types';

/**
 * Discord webhook client
 */
export class DiscordClient {
  async send(notification: DiscordNotification): Promise<{ id: string }> {
    const payload: any = {
      content: notification.body,
    };

    if (notification.embeds && notification.embeds.length > 0) {
      payload.embeds = notification.embeds;
    }

    const response = await fetch(notification.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`Discord webhook error: ${response.statusText}`);
    }

    // Discord doesn't return an ID, generate one
    return { id: `discord-${Date.now()}` };
  }
}
