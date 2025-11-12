export interface WingsNode {
  id: string;
  name: string;
  fqdn: string;
  daemonToken: string;
  scheme: 'http' | 'https';
  port: number;
  isOnline: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWingsNodeInput {
  name: string;
  fqdn: string;
  scheme?: 'http' | 'https';
  port?: number;
}

export interface UpdateWingsNodeInput {
  name?: string;
  fqdn?: string;
  scheme?: 'http' | 'https';
  port?: number;
}

export interface SystemStatus {
  version: string;
  uptime: number;
  cpuCount: number;
  memoryTotal: number;
  memoryAvailable: number;
  diskTotal: number;
  diskAvailable: number;
}

export interface ContainerConfig {
  name: string;
  image: string;
  cpu: number;
  memory: number;
  disk: number;
  ports: PortMapping[];
  environment: Record<string, string>;
}

export interface PortMapping {
  host: number;
  container: number;
  protocol: 'tcp' | 'udp';
}

export interface WingsApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}
