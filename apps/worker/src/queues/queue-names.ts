export const QUEUE_NAMES = {
  SERVERS: 'servers',
  BACKUPS: 'backups',
  METRICS: 'metrics',
  NOTIFICATIONS: 'notifications',
} as const;

export const JOB_NAMES = {
  // Server jobs
  INSTALL_SERVER: 'install-server',
  UPDATE_SERVER: 'update-server',
  RESTART_SERVER: 'restart-server',
  DELETE_SERVER: 'delete-server',

  // Backup jobs
  BACKUP_SERVER: 'backup-server',
  RESTORE_BACKUP: 'restore-backup',

  // Metrics jobs
  AGGREGATE_METRICS: 'aggregate-metrics',
  REPORT_USAGE: 'report-usage',

  // Notification jobs
  SEND_EMAIL: 'send-email',
  SEND_DISCORD: 'send-discord',
} as const;
