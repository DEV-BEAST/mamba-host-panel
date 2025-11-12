import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@gamePanel/ui';

export default function SettingsPage() {
  return (
    <div>
      <h1 className="text-3xl font-bold mb-6">Settings</h1>
      <Card>
        <CardHeader>
          <CardTitle>Account Settings</CardTitle>
          <CardDescription>Manage your account settings and preferences</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Settings panel coming soon...</p>
        </CardContent>
      </Card>
    </div>
  );
}
