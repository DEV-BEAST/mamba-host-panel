/**
 * API Client for Mamba Host Panel
 *
 * Provides typed fetch functions for all API endpoints
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'APIError';
  }
}

async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: response.statusText }));
    throw new APIError(
      error.message || 'API request failed',
      response.status,
      error
    );
  }

  return response.json();
}

// Tenant APIs
export const tenantAPI = {
  list: () => fetchAPI<any[]>('/tenants'),
  getCurrent: () => fetchAPI<any>('/tenants/current'),
  create: (data: { name: string; slug?: string; planTier?: string }) =>
    fetchAPI<any>('/tenants', { method: 'POST', body: JSON.stringify(data) }),
  switch: (tenantId: string) =>
    fetchAPI<{ success: boolean }>(`/tenants/${tenantId}/switch`, { method: 'POST' }),
  getMembers: (tenantId: string) =>
    fetchAPI<any[]>(`/tenants/${tenantId}/members`),
  inviteMember: (tenantId: string, data: { email: string; role: string }) =>
    fetchAPI<any>(`/tenants/${tenantId}/members/invite`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateMemberRole: (tenantId: string, userId: string, role: string) =>
    fetchAPI<any>(`/tenants/${tenantId}/members/${userId}`, {
      method: 'PATCH',
      body: JSON.stringify({ role }),
    }),
  removeMember: (tenantId: string, userId: string) =>
    fetchAPI<void>(`/tenants/${tenantId}/members/${userId}`, { method: 'DELETE' }),
};

// Server APIs
export const serverAPI = {
  list: () => fetchAPI<any[]>('/servers'),
  get: (serverId: string) => fetchAPI<any>(`/servers/${serverId}`),
  create: (data: {
    name: string;
    description?: string;
    blueprintId: string;
    nodeId: string;
    cpuLimitMillicores: number;
    memLimitMb: number;
    diskGb: number;
  }) => fetchAPI<any>('/servers', { method: 'POST', body: JSON.stringify(data) }),
  update: (serverId: string, data: Partial<{
    name: string;
    description: string;
    cpuLimitMillicores: number;
    memLimitMb: number;
    diskGb: number;
  }>) =>
    fetchAPI<any>(`/servers/${serverId}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
  delete: (serverId: string) =>
    fetchAPI<void>(`/servers/${serverId}`, { method: 'DELETE' }),
  powerAction: (serverId: string, action: 'start' | 'stop' | 'restart' | 'kill') =>
    fetchAPI<{ success: boolean }>(`/servers/${serverId}/power`, {
      method: 'POST',
      body: JSON.stringify({ action }),
    }),
  getStats: (serverId: string) => fetchAPI<any>(`/servers/${serverId}/stats`),
};

// Backup APIs
export const backupAPI = {
  list: (serverId: string) => fetchAPI<any[]>(`/servers/${serverId}/backups`),
  create: (serverId: string) =>
    fetchAPI<any>(`/servers/${serverId}/backups`, { method: 'POST' }),
  restore: (serverId: string, backupId: string) =>
    fetchAPI<{ success: boolean }>(`/servers/${serverId}/backups/${backupId}/restore`, {
      method: 'POST',
    }),
  delete: (serverId: string, backupId: string) =>
    fetchAPI<void>(`/servers/${serverId}/backups/${backupId}`, { method: 'DELETE' }),
};

// Metrics APIs
export const metricsAPI = {
  getServerMetrics: (serverId: string, start?: Date, end?: Date) => {
    const params = new URLSearchParams();
    if (start) params.append('start', start.toISOString());
    if (end) params.append('end', end.toISOString());
    return fetchAPI<any[]>(`/metrics/servers/${serverId}?${params}`);
  },
  getCurrentMetrics: (serverId: string) =>
    fetchAPI<any>(`/metrics/servers/${serverId}/current`),
};

// Node APIs
export const nodeAPI = {
  list: () => fetchAPI<any[]>('/nodes'),
  get: (nodeId: string) => fetchAPI<any>(`/nodes/${nodeId}`),
};

// Billing APIs
export const billingAPI = {
  getProducts: () => fetchAPI<any[]>('/billing/products'),
  getSubscriptions: () => fetchAPI<any[]>('/billing/subscriptions'),
  getInvoices: () => fetchAPI<any[]>('/billing/invoices'),
  createPortalSession: () => fetchAPI<{ url: string }>('/billing/portal', { method: 'POST' }),
};

// Audit APIs
export const auditAPI = {
  getLogs: (limit = 50, offset = 0) =>
    fetchAPI<any[]>(`/audit/logs?limit=${limit}&offset=${offset}`),
};

// Admin APIs
export const adminAPI = {
  getSystemOverview: () => fetchAPI<any>('/admin/system/overview'),
  getAllTenants: () => fetchAPI<any[]>('/admin/tenants'),
  getAllNodes: () => fetchAPI<any[]>('/admin/nodes'),
};

export { APIError };
