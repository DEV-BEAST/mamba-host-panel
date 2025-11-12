import type { MetricBatch, Heartbeat } from './types';

export interface HeartbeatClientOptions {
  apiUrl: string;
  nodeId: string;
  clientCert?: string;
  clientKey?: string;
  interval?: number; // milliseconds
}

/**
 * Client for Wings to send metrics and heartbeats to API
 */
export class HeartbeatClient {
  private interval: NodeJS.Timeout | null = null;

  constructor(private options: HeartbeatClientOptions) {}

  /**
   * Start sending heartbeats at regular intervals
   */
  start(getSystemInfo: () => Heartbeat['systemInfo'], getContainerCount: () => number): void {
    const intervalMs = this.options.interval || 60000; // Default 60s

    this.interval = setInterval(async () => {
      try {
        await this.sendHeartbeat(getSystemInfo(), getContainerCount());
      } catch (error) {
        console.error('Failed to send heartbeat:', error);
      }
    }, intervalMs);
  }

  /**
   * Stop sending heartbeats
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  /**
   * Send heartbeat to API
   */
  private async sendHeartbeat(
    systemInfo: Heartbeat['systemInfo'],
    containerCount: number
  ): Promise<void> {
    const heartbeat: Heartbeat = {
      nodeId: this.options.nodeId,
      timestamp: new Date(),
      systemInfo,
      containerCount,
    };

    const response = await fetch(
      `${this.options.apiUrl}/nodes/${this.options.nodeId}/heartbeat`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(heartbeat),
        // TODO: Add client cert for mTLS
      }
    );

    if (!response.ok) {
      throw new Error(`Heartbeat failed: ${response.statusText}`);
    }
  }

  /**
   * Send metric batch to API
   */
  async sendMetrics(batch: MetricBatch): Promise<void> {
    const response = await fetch(
      `${this.options.apiUrl}/nodes/${this.options.nodeId}/metrics`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(batch),
        // TODO: Add client cert for mTLS
      }
    );

    if (!response.ok) {
      throw new Error(`Metrics submission failed: ${response.statusText}`);
    }
  }
}
