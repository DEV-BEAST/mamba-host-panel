/**
 * Notification channels
 */
export enum NotificationChannel {
  EMAIL = 'email',
  DISCORD = 'discord',
  WEB_PUSH = 'web_push',
}

/**
 * Notification templates
 */
export enum NotificationTemplate {
  // Server notifications
  SERVER_CREATED = 'server_created',
  SERVER_STARTED = 'server_started',
  SERVER_STOPPED = 'server_stopped',
  SERVER_FAILED = 'server_failed',
  SERVER_CRASHED = 'server_crashed',

  // Backup notifications
  BACKUP_COMPLETED = 'backup_completed',
  BACKUP_FAILED = 'backup_failed',

  // Billing notifications
  INVOICE_PAID = 'invoice_paid',
  INVOICE_FAILED = 'invoice_failed',
  SUBSCRIPTION_CANCELED = 'subscription_canceled',
  SUBSCRIPTION_EXPIRING = 'subscription_expiring',
  PAYMENT_METHOD_EXPIRING = 'payment_method_expiring',

  // Account notifications
  WELCOME = 'welcome',
  EMAIL_VERIFICATION = 'email_verification',
  PASSWORD_RESET = 'password_reset',
  TEAM_INVITE = 'team_invite',

  // Security notifications
  NEW_LOGIN = 'new_login',
  SUSPICIOUS_ACTIVITY = 'suspicious_activity',
}

/**
 * Notification status
 */
export enum NotificationStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
}

/**
 * Base notification interface
 */
export interface Notification {
  tenantId: string;
  userId: string;
  channel: NotificationChannel;
  template: NotificationTemplate;
  subject: string;
  body: string;
  metadata?: Record<string, any>;
}

/**
 * Email notification
 */
export interface EmailNotification extends Notification {
  channel: NotificationChannel.EMAIL;
  to: string;
  from?: string;
  replyTo?: string;
  html?: string;
}

/**
 * Discord notification
 */
export interface DiscordNotification extends Notification {
  channel: NotificationChannel.DISCORD;
  webhookUrl: string;
  embeds?: Array<{
    title?: string;
    description?: string;
    color?: number;
    fields?: Array<{ name: string; value: string; inline?: boolean }>;
  }>;
}

/**
 * Web push notification
 */
export interface WebPushNotification extends Notification {
  channel: NotificationChannel.WEB_PUSH;
  title: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}
