'use client';

import { Shield, Server, Users, HardDrive, Activity } from 'lucide-react';
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
} from '@mambaPanel/ui';
import { useAdminOverview } from '@/hooks/use-api';

export default function AdminPage() {
  const { data: stats, isLoading, error } = useAdminOverview();

  if (isLoading) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-6 w-24 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="h-10 w-16 bg-muted animate-pulse rounded" />
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
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <Alert variant="destructive">
          <AlertDescription>
            {error instanceof Error ? error.message : 'Failed to load admin stats'}
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!stats) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Admin Dashboard</h1>
        <Alert>
          <AlertDescription>
            You do not have permission to view this page.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Tenants',
      value: stats.totalTenants,
      icon: Shield,
      description: 'Active organizations',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
    {
      title: 'Total Servers',
      value: stats.totalServers,
      icon: Server,
      description: 'Running game servers',
      color: 'text-green-600',
      bgColor: 'bg-green-100',
    },
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: Users,
      description: 'Registered users',
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
    },
    {
      title: 'Total Nodes',
      value: stats.totalNodes,
      icon: HardDrive,
      description: 'Wings nodes',
      color: 'text-orange-600',
      bgColor: 'bg-orange-100',
    },
  ];

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            System-wide overview and statistics
          </p>
        </div>
        <Badge variant="default" className="flex items-center gap-1">
          <Activity className="h-3 w-3" />
          System Healthy
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        {statCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.title}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <div className={`${stat.bgColor} p-2 rounded-lg`}>
                  <Icon className={`h-4 w-4 ${stat.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Server Status Breakdown</CardTitle>
            <CardDescription>Servers by current status</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.serversByStatus && Object.keys(stats.serversByStatus).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.serversByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div className="h-3 w-3 rounded-full bg-primary" />
                      <span className="font-medium capitalize">{status}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No server status data</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Node Health</CardTitle>
            <CardDescription>Wings nodes by status</CardDescription>
          </CardHeader>
          <CardContent>
            {stats.nodesByStatus && Object.keys(stats.nodesByStatus).length > 0 ? (
              <div className="space-y-3">
                {Object.entries(stats.nodesByStatus).map(([status, count]) => (
                  <div
                    key={status}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`h-3 w-3 rounded-full ${
                          status === 'online'
                            ? 'bg-green-500'
                            : status === 'offline'
                            ? 'bg-red-500'
                            : 'bg-yellow-500'
                        }`}
                      />
                      <span className="font-medium capitalize">{status}</span>
                    </div>
                    <Badge variant="secondary">{count}</Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No node status data</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>System Information</CardTitle>
          <CardDescription>Platform details and version</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Platform</span>
              <span className="font-medium">Mamba Host Panel</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Version</span>
              <span className="font-medium">Alpha v0.1.0</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">API Status</span>
              <Badge variant="default">Operational</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Database</span>
              <Badge variant="default">Connected</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
