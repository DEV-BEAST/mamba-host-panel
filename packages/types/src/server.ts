export interface Server {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  wingsNodeId: string;
  containerId: string | null;
  status: ServerStatus;
  cpu: number;
  memory: number;
  disk: number;
  port: number;
  image: string;
  createdAt: Date;
  updatedAt: Date;
}

export enum ServerStatus {
  OFFLINE = 'offline',
  STARTING = 'starting',
  ONLINE = 'online',
  STOPPING = 'stopping',
  INSTALLING = 'installing',
  FAILED = 'failed',
}

export interface CreateServerInput {
  name: string;
  description?: string;
  wingsNodeId: string;
  cpu: number;
  memory: number;
  disk: number;
  port: number;
  image: string;
}

export interface UpdateServerInput {
  name?: string;
  description?: string;
  cpu?: number;
  memory?: number;
  disk?: number;
}

export interface ServerStats {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkRx: number;
  networkTx: number;
  uptime: number;
}

export interface PowerAction {
  action: 'start' | 'stop' | 'restart' | 'kill';
}
