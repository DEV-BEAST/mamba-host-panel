import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gamePanel/ui';

export default function ServersPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Servers</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>No servers yet</CardTitle>
            <CardDescription>Create your first server to get started</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Click the button below to create your first game server.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
