'use client';

export const dynamic = 'force-dynamic';

import { use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Play, Square, RotateCw, Trash2 } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Alert,
  AlertDescription,
} from '@mambaPanel/ui';
import { useServer, useServerPowerAction, useServerStats, useBackups } from '@/hooks/use-api';

const statusConfig = {
  offline: { label: 'Offline', variant: 'secondary' as const },
  online: { label: 'Online', variant: 'default' as const },
  starting: { label: 'Starting', variant: 'default' as const },
  stopping: { label: 'Stopping', variant: 'secondary' as const },
  installing: { label: 'Installing', variant: 'default' as const },
  failed: { label: 'Failed', variant: 'destructive' as const },
};

export default function ServerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: server, isLoading, error } = useServer(id);
  const { data: stats } = useServerStats(id);
  const { data: backups = [] } = useBackups(id);
  const powerAction = useServerPowerAction(id);

  const handlePowerAction = async (action: 'start' | 'stop' | 'restart' | 'kill') => {
    try {
      await powerAction.mutateAsync(action);
    } catch (error) {
      console.error('Power action failed:', error);
    }
  };

  if (isLoading) {
    return (
      <div>
        <div className="h-8 w-32 bg-muted animate-pulse rounded mb-6" />
        <Card>
          <CardHeader>
            <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          </CardHeader>
          <CardContent>
            <div className="h-32 bg-muted animate-pulse rounded" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !server) {
    return (
      <div>
        <Link href="/servers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Servers
        </Link>
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Server not found'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const status = statusConfig[server.status as keyof typeof statusConfig] || statusConfig.offline;
  const isInstalling = server.installStatus !== 'completed';

  return (
    <div>
      <Link href="/servers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground mb-6">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Servers
      </Link>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            {server.name}
            <Badge variant={status.variant}>{status.label}</Badge>
          </h1>
          {server.description && (
            <p className="text-muted-foreground mt-1">{server.description}</p>
          )}
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="console">Console</TabsTrigger>
          <TabsTrigger value="backups">Backups</TabsTrigger>
          <TabsTrigger value="metrics">Metrics</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {isInstalling && (
            <Alert>
              <AlertDescription>
                Server is currently {server.installStatus}. Some features may be unavailable.
              </AlertDescription>
            </Alert>
          )}

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">CPU Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.cpuUsage?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {(server.cpuLimitMillicores / 1000).toFixed(1)} cores allocated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Memory</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.memoryUsage?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {server.memLimitMb} MB allocated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Disk</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.diskUsage?.toFixed(1) || 0}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {server.diskGb} GB allocated
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Uptime</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats?.uptime ? Math.floor(stats.uptime / 3600) : 0}h
                </div>
                <p className="text-xs text-muted-foreground">Hours running</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Power Controls</CardTitle>
              <CardDescription>Manage server power state</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Button
                  onClick={() => handlePowerAction('start')}
                  disabled={server.status === 'online' || isInstalling || powerAction.isPending}
                >
                  <Play className="mr-2 h-4 w-4" />
                  Start
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handlePowerAction('stop')}
                  disabled={server.status === 'offline' || isInstalling || powerAction.isPending}
                >
                  <Square className="mr-2 h-4 w-4" />
                  Stop
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => handlePowerAction('restart')}
                  disabled={server.status !== 'online' || isInstalling || powerAction.isPending}
                >
                  <RotateCw className="mr-2 h-4 w-4" />
                  Restart
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Server Information</CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Server ID</dt>
                  <dd className="font-mono text-xs">{server.id}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Docker Image</dt>
                  <dd className="font-mono text-xs">{server.image}</dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-muted-foreground">Created</dt>
                  <dd>{new Date(server.createdAt).toLocaleDateString()}</dd>
                </div>
              </dl>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="console">
          <Card>
            <CardHeader>
              <CardTitle>Console</CardTitle>
              <CardDescription>View server logs and send commands</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Console feature will be available once WebSocket integration is complete.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backups">
          <Card>
            <CardHeader>
              <CardTitle>Backups</CardTitle>
              <CardDescription>
                {backups.length} backup{backups.length !== 1 ? 's' : ''} available
              </CardDescription>
            </CardHeader>
            <CardContent>
              {backups.length === 0 ? (
                <p className="text-sm text-muted-foreground">No backups yet</p>
              ) : (
                <div className="space-y-2">
                  {backups.map((backup: any) => (
                    <div
                      key={backup.id}
                      className="flex items-center justify-between p-3 rounded-lg border"
                    >
                      <div>
                        <p className="font-medium">{new Date(backup.createdAt).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">Status: {backup.status}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metrics">
          <Card>
            <CardHeader>
              <CardTitle>Metrics</CardTitle>
              <CardDescription>Server performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription>
                  Metrics charts will be available once chart library is integrated.
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Danger Zone</CardTitle>
              <CardDescription>Irreversible and destructive actions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button variant="destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Server
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
