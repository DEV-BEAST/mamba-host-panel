import { NotificationTemplate } from './types';

/**
 * Template data interface
 */
export interface TemplateData {
  [key: string]: any;
}

/**
 * Email template renderer
 */
export class TemplateRenderer {
  /**
   * Render template with data
   */
  render(template: NotificationTemplate, data: TemplateData): { subject: string; body: string; html?: string } {
    switch (template) {
      case NotificationTemplate.SERVER_CREATED:
        return {
          subject: `Server "${data.serverName}" created`,
          body: `Your server "${data.serverName}" has been successfully created and is now installing.`,
          html: `<p>Your server <strong>${data.serverName}</strong> has been successfully created and is now installing.</p>`,
        };

      case NotificationTemplate.SERVER_STARTED:
        return {
          subject: `Server "${data.serverName}" started`,
          body: `Your server "${data.serverName}" has been started.`,
          html: `<p>Your server <strong>${data.serverName}</strong> has been started.</p>`,
        };

      case NotificationTemplate.SERVER_FAILED:
        return {
          subject: `Server "${data.serverName}" failed`,
          body: `Your server "${data.serverName}" has failed: ${data.reason}`,
          html: `<p>Your server <strong>${data.serverName}</strong> has failed: ${data.reason}</p>`,
        };

      case NotificationTemplate.BACKUP_COMPLETED:
        return {
          subject: `Backup completed for "${data.serverName}"`,
          body: `A backup has been successfully created for server "${data.serverName}".`,
          html: `<p>A backup has been successfully created for server <strong>${data.serverName}</strong>.</p>`,
        };

      case NotificationTemplate.INVOICE_PAID:
        return {
          subject: `Invoice paid - $${data.amount}`,
          body: `Your invoice for $${data.amount} has been paid successfully.`,
          html: `<p>Your invoice for <strong>$${data.amount}</strong> has been paid successfully.</p>`,
        };

      case NotificationTemplate.WELCOME:
        return {
          subject: 'Welcome to Mamba Host',
          body: `Welcome to Mamba Host! We're excited to have you on board.`,
          html: `<h1>Welcome to Mamba Host!</h1><p>We're excited to have you on board.</p>`,
        };

      case NotificationTemplate.EMAIL_VERIFICATION:
        return {
          subject: 'Verify your email address',
          body: `Please verify your email address by clicking this link: ${data.verificationUrl}`,
          html: `<p>Please verify your email address by clicking this link: <a href="${data.verificationUrl}">Verify Email</a></p>`,
        };

      default:
        return {
          subject: 'Notification',
          body: 'You have a new notification.',
        };
    }
  }
}
