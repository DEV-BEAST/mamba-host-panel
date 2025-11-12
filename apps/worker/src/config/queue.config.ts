import { QueueOptions, WorkerOptions, JobsOptions } from 'bullmq';

/**
 * Redis connection configuration for BullMQ
 */
export const redisConnection = {
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null, // Important for BullMQ
  enableReadyCheck: false,
};

/**
 * Default queue options
 */
export const defaultQueueOptions: QueueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000, // Start with 1 second
    },
    removeOnComplete: {
      age: 24 * 3600, // Keep completed jobs for 24 hours
      count: 1000, // Keep max 1000 completed jobs
    },
    removeOnFail: {
      age: 7 * 24 * 3600, // Keep failed jobs for 7 days
      count: 5000, // Keep max 5000 failed jobs
    },
  },
};

/**
 * Default worker options
 */
export const defaultWorkerOptions: WorkerOptions = {
  connection: redisConnection,
  concurrency: 5, // Process 5 jobs concurrently
  limiter: {
    max: 10, // Max 10 jobs
    duration: 1000, // per second
  },
};

/**
 * Job-specific options
 * Note: Timeouts are typically handled via worker lockDuration or job delay, not via JobsOptions
 */
export const jobOptions: Record<string, Partial<JobsOptions>> = {
  // Server installation can take a long time
  'install-server': {
    attempts: 2, // Only retry once
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
  },

  // Server operations
  'update-server': {
    attempts: 3,
  },
  'restart-server': {
    attempts: 3,
  },
  'delete-server': {
    attempts: 2,
  },

  // Backup operations can be slow
  'backup-server': {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },
  'restore-backup': {
    attempts: 2,
    backoff: {
      type: 'exponential',
      delay: 10000,
    },
  },

  // Metrics jobs
  'aggregate-metrics': {
    attempts: 5, // Important for billing, retry more
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },
  'report-usage': {
    attempts: 5, // Important for billing, retry more
    backoff: {
      type: 'exponential',
      delay: 2000,
    },
  },

  // Notification jobs
  'send-email': {
    attempts: 3,
  },
  'send-discord': {
    attempts: 3,
  },
};
