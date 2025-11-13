'use client';

export const dynamic = 'force-dynamic';

import Link from 'next/link';
import { Plus, Server as ServerIcon, Play, Square, RotateCw, AlertCircle } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@mambaPanel/ui';
import { useServers } from '@/hooks/use-api';

const statusConfig = {
  offline: { label: 'Offline', variant: 'secondary' as const, icon: Square },
  online: { label: 'Online', variant: 'default' as const, icon: Play },
  starting: { label: 'Starting', variant: 'default' as const, icon: RotateCw },
  stopping: { label: 'Stopping', variant: 'secondary' as const, icon: RotateCw },
  installing: { label: 'Installing', variant: 'default' as const, icon: RotateCw },
  failed: { label: 'Failed', variant: 'destructive' as const, icon: AlertCircle },
};

export default function ServersPage() {
  const { data: servers = [], isLoading, error } = useServers();

  if (isLoading) {
    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Servers</h1>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-16 bg-muted animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Servers</h1>
        <Card>
          <CardHeader>
            <CardTitle>Error loading servers</CardTitle>
            <CardDescription>
              {error instanceof Error ? error.message : 'Failed to load servers'}
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Servers</h1>
        <Link href="/servers/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Create Server
          </Button>
        </Link>
      </div>

      {servers.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>No servers yet</CardTitle>
            <CardDescription>Create your first server to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              Click the button above to create your first game server.
            </p>
            <Link href="/servers/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Server
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {servers.map((server: any) => {
            const status = statusConfig[server.status as keyof typeof statusConfig] || statusConfig.offline;
            const StatusIcon = status.icon;

            return (
              <Link key={server.id} href={`/servers/${server.id}`}>
                <Card className="hover:bg-accent/50 transition-colors cursor-pointer">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <ServerIcon className="h-5 w-5 text-muted-foreground" />
                        <CardTitle className="text-lg">{server.name}</CardTitle>
                      </div>
                      <Badge variant={status.variant} className="flex items-center gap-1">
                        <StatusIcon className="h-3 w-3" />
                        {status.label}
                      </Badge>
                    </div>
                    {server.description && (
                      <CardDescription className="line-clamp-2">
                        {server.description}
                      </CardDescription>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-1 text-sm text-muted-foreground">
                      <div className="flex justify-between">
                        <span>CPU:</span>
                        <span>{(server.cpuLimitMillicores / 1000).toFixed(1)} cores</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Memory:</span>
                        <span>{server.memLimitMb} MB</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Disk:</span>
                        <span>{server.diskGb} GB</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
