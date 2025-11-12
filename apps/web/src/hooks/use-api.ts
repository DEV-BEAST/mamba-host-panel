/**
 * TanStack Query hooks for API operations
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  tenantAPI,
  serverAPI,
  backupAPI,
  metricsAPI,
  nodeAPI,
  billingAPI,
  auditAPI,
  adminAPI,
} from '@/lib/api-client';

// Query keys
export const queryKeys = {
  tenants: ['tenants'] as const,
  currentTenant: ['tenants', 'current'] as const,
  tenantMembers: (tenantId: string) => ['tenants', tenantId, 'members'] as const,
  servers: ['servers'] as const,
  server: (id: string) => ['servers', id] as const,
  serverStats: (id: string) => ['servers', id, 'stats'] as const,
  backups: (serverId: string) => ['servers', serverId, 'backups'] as const,
  metrics: (serverId: string) => ['metrics', serverId] as const,
  currentMetrics: (serverId: string) => ['metrics', serverId, 'current'] as const,
  nodes: ['nodes'] as const,
  node: (id: string) => ['nodes', id] as const,
  products: ['billing', 'products'] as const,
  subscriptions: ['billing', 'subscriptions'] as const,
  invoices: ['billing', 'invoices'] as const,
  auditLogs: ['audit', 'logs'] as const,
  adminOverview: ['admin', 'overview'] as const,
  adminTenants: ['admin', 'tenants'] as const,
  adminNodes: ['admin', 'nodes'] as const,
};

// Tenant hooks
export function useTenants() {
  return useQuery({
    queryKey: queryKeys.tenants,
    queryFn: tenantAPI.list,
  });
}

export function useCurrentTenant() {
  return useQuery({
    queryKey: queryKeys.currentTenant,
    queryFn: tenantAPI.getCurrent,
    retry: false,
  });
}

export function useSwitchTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantAPI.switch,
    onSuccess: () => {
      // Invalidate all queries after tenant switch
      queryClient.invalidateQueries();
    },
  });
}

export function useCreateTenant() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: tenantAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tenants });
      queryClient.invalidateQueries({ queryKey: queryKeys.currentTenant });
    },
  });
}

export function useTenantMembers(tenantId: string) {
  return useQuery({
    queryKey: queryKeys.tenantMembers(tenantId),
    queryFn: () => tenantAPI.getMembers(tenantId),
    enabled: !!tenantId,
  });
}

// Server hooks
export function useServers() {
  return useQuery({
    queryKey: queryKeys.servers,
    queryFn: serverAPI.list,
  });
}

export function useServer(serverId: string) {
  return useQuery({
    queryKey: queryKeys.server(serverId),
    queryFn: () => serverAPI.get(serverId),
    enabled: !!serverId,
  });
}

export function useCreateServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: serverAPI.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
}

export function useUpdateServer(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Parameters<typeof serverAPI.update>[1]) =>
      serverAPI.update(serverId, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.server(serverId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
}

export function useDeleteServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: serverAPI.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.servers });
    },
  });
}

export function useServerPowerAction(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (action: 'start' | 'stop' | 'restart' | 'kill') =>
      serverAPI.powerAction(serverId, action),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.server(serverId) });
    },
  });
}

export function useServerStats(serverId: string) {
  return useQuery({
    queryKey: queryKeys.serverStats(serverId),
    queryFn: () => serverAPI.getStats(serverId),
    enabled: !!serverId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

// Backup hooks
export function useBackups(serverId: string) {
  return useQuery({
    queryKey: queryKeys.backups(serverId),
    queryFn: () => backupAPI.list(serverId),
    enabled: !!serverId,
  });
}

export function useCreateBackup(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => backupAPI.create(serverId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.backups(serverId) });
    },
  });
}

export function useRestoreBackup(serverId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (backupId: string) => backupAPI.restore(serverId, backupId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.server(serverId) });
    },
  });
}

// Metrics hooks
export function useServerMetrics(serverId: string, start?: Date, end?: Date) {
  return useQuery({
    queryKey: [...queryKeys.metrics(serverId), start, end],
    queryFn: () => metricsAPI.getServerMetrics(serverId, start, end),
    enabled: !!serverId,
  });
}

export function useCurrentMetrics(serverId: string) {
  return useQuery({
    queryKey: queryKeys.currentMetrics(serverId),
    queryFn: () => metricsAPI.getCurrentMetrics(serverId),
    enabled: !!serverId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Node hooks
export function useNodes() {
  return useQuery({
    queryKey: queryKeys.nodes,
    queryFn: nodeAPI.list,
  });
}

// Billing hooks
export function useProducts() {
  return useQuery({
    queryKey: queryKeys.products,
    queryFn: billingAPI.getProducts,
  });
}

export function useSubscriptions() {
  return useQuery({
    queryKey: queryKeys.subscriptions,
    queryFn: billingAPI.getSubscriptions,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: billingAPI.getInvoices,
  });
}

// Audit hooks
export function useAuditLogs(limit = 50, offset = 0) {
  return useQuery({
    queryKey: [...queryKeys.auditLogs, limit, offset],
    queryFn: () => auditAPI.getLogs(limit, offset),
  });
}

// Admin hooks
export function useAdminOverview() {
  return useQuery({
    queryKey: queryKeys.adminOverview,
    queryFn: adminAPI.getSystemOverview,
  });
}

export function useAdminTenants() {
  return useQuery({
    queryKey: queryKeys.adminTenants,
    queryFn: adminAPI.getAllTenants,
  });
}

export function useAdminNodes() {
  return useQuery({
    queryKey: queryKeys.adminNodes,
    queryFn: adminAPI.getAllNodes,
  });
}
