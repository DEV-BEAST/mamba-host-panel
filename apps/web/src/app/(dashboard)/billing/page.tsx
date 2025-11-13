'use client';

export const dynamic = 'force-dynamic';

import { CreditCard, Download, ExternalLink } from 'lucide-react';
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
import { useCurrentTenant, useSubscriptions, useInvoices, useProducts } from '@/hooks/use-api';
import { billingAPI } from '@/lib/api-client';

export default function BillingPage() {
  const { data: currentTenant } = useCurrentTenant();
  const { data: products = [] } = useProducts();
  const { data: subscriptions = [] } = useSubscriptions();
  const { data: invoices = [] } = useInvoices();

  const handleOpenPortal = async () => {
    try {
      const { url } = await billingAPI.createPortalSession();
      window.location.href = url;
    } catch (error) {
      console.error('Failed to open portal:', error);
    }
  };

  if (!currentTenant) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Billing</h1>
        <Alert>
          <AlertDescription>
            Please select a tenant to view billing information.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const activeSubscription = subscriptions.find((sub: any) => sub.status === 'active');

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Billing</h1>
          <p className="text-muted-foreground">
            Manage subscription and billing for {currentTenant.name}
          </p>
        </div>
        <Button onClick={handleOpenPortal}>
          <ExternalLink className="mr-2 h-4 w-4" />
          Billing Portal
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Current Plan</CardTitle>
            <CardDescription>Your active subscription</CardDescription>
          </CardHeader>
          <CardContent>
            {activeSubscription ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold capitalize">
                    {currentTenant.planTier} Plan
                  </span>
                  <Badge>{activeSubscription.status}</Badge>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Status</span>
                    <span className="capitalize">{activeSubscription.status}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Started</span>
                    <span>{new Date(activeSubscription.currentPeriodStart).toLocaleDateString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Renews</span>
                    <span>{new Date(activeSubscription.currentPeriodEnd).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-6">
                <p className="text-muted-foreground mb-4">No active subscription</p>
                <Badge variant="secondary" className="capitalize">
                  {currentTenant.planTier} Plan
                </Badge>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Available Products</CardTitle>
            <CardDescription>Upgrade or modify your plan</CardDescription>
          </CardHeader>
          <CardContent>
            {products.length > 0 ? (
              <div className="space-y-3">
                {products.map((product: any) => (
                  <div
                    key={product.id}
                    className="p-3 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                      </div>
                      {product.active && (
                        <Badge variant="default">Active</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No products available. Contact support to set up billing.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Invoices</CardTitle>
          <CardDescription>
            View and download past invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          {invoices.length > 0 ? (
            <div className="space-y-2">
              {invoices.map((invoice: any) => (
                <div
                  key={invoice.id}
                  className="flex items-center justify-between p-3 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <CreditCard className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">
                        {new Date(invoice.createdAt).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        ${(invoice.amountDue / 100).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={invoice.status === 'paid' ? 'default' : 'secondary'}
                    >
                      {invoice.status}
                    </Badge>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No invoices yet</p>
          )}
        </CardContent>
      </Card>

      <Alert className="mt-6">
        <AlertDescription>
          <strong>Note:</strong> Stripe integration is currently in development.
          Some features may be unavailable or display placeholder data.
        </AlertDescription>
      </Alert>
    </div>
  );
}
