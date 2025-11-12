'use client';

import { useState } from 'react';
import { FileText, Filter, Calendar, User, Server } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Alert,
  AlertDescription,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mambaPanel/ui';
import { useCurrentTenant, useAuditLogs } from '@/hooks/use-api';

const actionConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' }> = {
  'server.create': { label: 'Created Server', variant: 'default' },
  'server.delete': { label: 'Deleted Server', variant: 'destructive' },
  'server.start': { label: 'Started Server', variant: 'default' },
  'server.stop': { label: 'Stopped Server', variant: 'secondary' },
  'server.restart': { label: 'Restarted Server', variant: 'default' },
  'server.update': { label: 'Updated Server', variant: 'secondary' },
  'tenant.member.invite': { label: 'Invited Member', variant: 'default' },
  'tenant.member.remove': { label: 'Removed Member', variant: 'destructive' },
  'tenant.member.role': { label: 'Changed Role', variant: 'secondary' },
  'backup.create': { label: 'Created Backup', variant: 'default' },
  'backup.restore': { label: 'Restored Backup', variant: 'default' },
  'backup.delete': { label: 'Deleted Backup', variant: 'destructive' },
};

export default function AuditPage() {
  const { data: currentTenant } = useCurrentTenant();
  const [actionFilter, setActionFilter] = useState<string>('all');
  const { data: logs = [], isLoading, error } = useAuditLogs(50, 0);

  if (!currentTenant) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
        <Alert>
          <AlertDescription>
            Please select a tenant to view audit logs.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {[...Array(5)].map((_, i) => (
                <div key={i} className="flex gap-4 p-4 border rounded-lg">
                  <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 w-48 bg-muted animate-pulse rounded" />
                    <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Audit Logs</h1>
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load audit logs'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const filteredLogs = actionFilter === 'all'
    ? logs
    : logs.filter((log: any) => log.action === actionFilter);

  const uniqueActions = Array.from(new Set(logs.map((log: any) => log.action)));

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <p className="text-muted-foreground">
            Track all activity in {currentTenant.name}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={actionFilter} onValueChange={setActionFilter}>
            <SelectTrigger className="w-[200px]">
              <Filter className="mr-2 h-4 w-4" />
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Actions</SelectItem>
              {uniqueActions.map((action) => (
                <SelectItem key={action} value={action}>
                  {actionConfig[action]?.label || action}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Activity Log</CardTitle>
          <CardDescription>
            {filteredLogs.length} {filteredLogs.length === 1 ? 'entry' : 'entries'}
            {actionFilter !== 'all' && ` for ${actionConfig[actionFilter]?.label || actionFilter}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                {actionFilter === 'all'
                  ? 'No audit logs yet. Activity will appear here.'
                  : 'No logs found for this action.'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log: any) => {
                const config = actionConfig[log.action] || {
                  label: log.action,
                  variant: 'secondary' as const
                };

                return (
                  <div
                    key={log.id}
                    className="flex items-start gap-4 p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center flex-shrink-0">
                      {log.action.startsWith('server') ? (
                        <Server className="h-5 w-5 text-muted-foreground" />
                      ) : log.action.startsWith('tenant') ? (
                        <User className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <FileText className="h-5 w-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <Badge variant={config.variant}>{config.label}</Badge>
                        <span className="text-sm font-medium truncate">
                          {log.user?.name || log.user?.email || 'Unknown User'}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">
                        {log.description || `Performed ${log.action}`}
                      </p>
                      {log.metadata && Object.keys(log.metadata).length > 0 && (
                        <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2 mb-2">
                          <code className="whitespace-pre-wrap">
                            {JSON.stringify(log.metadata, null, 2)}
                          </code>
                        </div>
                      )}
                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(log.createdAt).toLocaleString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </div>
                        {log.ipAddress && (
                          <div className="flex items-center gap-1">
                            IP: {log.ipAddress}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertDescription>
          Audit logs are retained for 90 days and automatically purged after that period.
        </AlertDescription>
      </Alert>
    </div>
  );
}
