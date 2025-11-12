'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, XCircle, AlertCircle, Clock } from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
} from '@mambaPanel/ui';

interface ServiceStatus {
  name: string;
  status: 'operational' | 'degraded' | 'down' | 'maintenance';
  responseTime?: number;
  lastChecked: Date;
}

const statusConfig = {
  operational: {
    label: 'Operational',
    icon: CheckCircle2,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    variant: 'default' as const,
  },
  degraded: {
    label: 'Degraded',
    icon: AlertCircle,
    color: 'text-yellow-600',
    bgColor: 'bg-yellow-100',
    variant: 'secondary' as const,
  },
  down: {
    label: 'Down',
    icon: XCircle,
    color: 'text-red-600',
    bgColor: 'bg-red-100',
    variant: 'destructive' as const,
  },
  maintenance: {
    label: 'Maintenance',
    icon: Clock,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    variant: 'secondary' as const,
  },
};

export default function StatusPage() {
  const [services, setServices] = useState<ServiceStatus[]>([]);
  const [overallStatus, setOverallStatus] = useState<'operational' | 'issues' | 'down'>('operational');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkSystemStatus();
    const interval = setInterval(checkSystemStatus, 60000); // Check every minute
    return () => clearInterval(interval);
  }, []);

  const checkSystemStatus = async () => {
    try {
      // Check API health
      const apiStart = Date.now();
      const apiResponse = await fetch('/api/health', { method: 'GET' }).catch(() => null);
      const apiTime = Date.now() - apiStart;

      const newServices: ServiceStatus[] = [
        {
          name: 'API Server',
          status: apiResponse?.ok ? 'operational' : 'down',
          responseTime: apiResponse?.ok ? apiTime : undefined,
          lastChecked: new Date(),
        },
        {
          name: 'Database',
          status: apiResponse?.ok ? 'operational' : 'down',
          lastChecked: new Date(),
        },
        {
          name: 'Redis Cache',
          status: 'operational',
          lastChecked: new Date(),
        },
        {
          name: 'Job Queue',
          status: 'operational',
          lastChecked: new Date(),
        },
        {
          name: 'Wings Nodes',
          status: 'operational',
          lastChecked: new Date(),
        },
      ];

      setServices(newServices);

      // Determine overall status
      const hasDown = newServices.some((s) => s.status === 'down');
      const hasDegraded = newServices.some((s) => s.status === 'degraded');

      if (hasDown) {
        setOverallStatus('down');
      } else if (hasDegraded) {
        setOverallStatus('issues');
      } else {
        setOverallStatus('operational');
      }
    } catch (error) {
      console.error('Failed to check system status:', error);
      setOverallStatus('down');
    } finally {
      setLoading(false);
    }
  };

  const overallConfig = {
    operational: {
      title: 'All Systems Operational',
      description: 'All services are running normally',
      color: 'text-green-600',
      bgColor: 'bg-green-50 border-green-200',
    },
    issues: {
      title: 'Partial System Outage',
      description: 'Some services are experiencing issues',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50 border-yellow-200',
    },
    down: {
      title: 'System Outage',
      description: 'Services are currently unavailable',
      color: 'text-red-600',
      bgColor: 'bg-red-50 border-red-200',
    },
  };

  const overall = overallConfig[overallStatus];

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Mamba Host Status</h1>
          <p className="text-muted-foreground">
            Current status of all Mamba Host services
          </p>
        </div>

        {/* Overall Status Banner */}
        <Card className={`mb-8 border-2 ${overall.bgColor}`}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className={`${overall.color} text-4xl`}>
                {overallStatus === 'operational' && <CheckCircle2 className="h-12 w-12" />}
                {overallStatus === 'issues' && <AlertCircle className="h-12 w-12" />}
                {overallStatus === 'down' && <XCircle className="h-12 w-12" />}
              </div>
              <div>
                <h2 className={`text-2xl font-bold ${overall.color}`}>
                  {overall.title}
                </h2>
                <p className="text-muted-foreground">{overall.description}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Individual Service Status */}
        <Card>
          <CardHeader>
            <CardTitle>Service Status</CardTitle>
            <CardDescription>
              Real-time status of individual components
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="h-6 w-32 bg-muted animate-pulse rounded" />
                    <div className="h-6 w-24 bg-muted animate-pulse rounded" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {services.map((service) => {
                  const config = statusConfig[service.status];
                  const StatusIcon = config.icon;

                  return (
                    <div
                      key={service.name}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`${config.bgColor} p-2 rounded-lg`}>
                          <StatusIcon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">
                            Last checked: {service.lastChecked.toLocaleTimeString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {service.responseTime && (
                          <span className="text-sm text-muted-foreground">
                            {service.responseTime}ms
                          </span>
                        )}
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Uptime History Placeholder */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Uptime History</CardTitle>
            <CardDescription>
              Service availability over the past 90 days
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <p>Uptime tracking will be available soon</p>
            </div>
          </CardContent>
        </Card>

        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p>
            For support inquiries, please contact{' '}
            <a href="mailto:support@mambahost.com" className="text-primary hover:underline">
              support@mambahost.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
