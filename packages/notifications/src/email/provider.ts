import type { EmailNotification } from '../types';

/**
 * Email provider interface (Resend/Postmark)
 */
export interface EmailProvider {
  send(notification: EmailNotification): Promise<{ id: string }>;
}

/**
 * Resend email provider
 */
export class ResendProvider implements EmailProvider {
  constructor(private apiKey: string) {}

  async send(notification: EmailNotification): Promise<{ id: string }> {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: notification.from || 'noreply@mambahost.com',
        to: notification.to,
        subject: notification.subject,
        html: notification.html || notification.body,
        reply_to: notification.replyTo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Resend API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { id: data.id };
  }
}

/**
 * Postmark email provider
 */
export class PostmarkProvider implements EmailProvider {
  constructor(private serverToken: string) {}

  async send(notification: EmailNotification): Promise<{ id: string }> {
    const response = await fetch('https://api.postmarkapp.com/email', {
      method: 'POST',
      headers: {
        'X-Postmark-Server-Token': this.serverToken,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        From: notification.from || 'noreply@mambahost.com',
        To: notification.to,
        Subject: notification.subject,
        HtmlBody: notification.html || notification.body,
        TextBody: notification.body,
        ReplyTo: notification.replyTo,
      }),
    });

    if (!response.ok) {
      throw new Error(`Postmark API error: ${response.statusText}`);
    }

    const data = await response.json();
    return { id: data.MessageID };
  }
}
