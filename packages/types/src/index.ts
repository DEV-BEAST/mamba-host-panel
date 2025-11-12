export * from './user';
export * from './server';
export * from './wings';

// WebSocket message types
export interface WebSocketMessage<T = unknown> {
  event: string;
  data: T;
}

export interface ServerLogsMessage {
  serverId: string;
  logs: string[];
  timestamp: Date;
}

export interface ServerStatsMessage {
  serverId: string;
  stats: {
    cpuUsage: number;
    memoryUsage: number;
    diskUsage: number;
    networkRx: number;
    networkTx: number;
  };
  timestamp: Date;
}

export interface ServerStatusChangeMessage {
  serverId: string;
  status: string;
  timestamp: Date;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
}

export interface PaginatedResponse<T = unknown> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
