'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { UserPlus, Trash2, Shield } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Badge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from '@mambaPanel/ui';
import { useCurrentTenant, useTenantMembers } from '@/hooks/use-api';
import { tenantAPI } from '@/lib/api-client';

const roleConfig = {
  owner: { label: 'Owner', variant: 'default' as const, description: 'Full access and control' },
  admin: { label: 'Admin', variant: 'default' as const, description: 'Manage servers and members' },
  support: { label: 'Support', variant: 'secondary' as const, description: 'View and manage servers' },
  member: { label: 'Member', variant: 'secondary' as const, description: 'View servers only' },
};

export default function TeamPage() {
  const { data: currentTenant } = useCurrentTenant();
  const { data: members = [], refetch } = useTenantMembers(currentTenant?.id || '');
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [isInviting, setIsInviting] = useState(false);
  const [inviteError, setInviteError] = useState('');

  const handleInviteMember = async () => {
    if (!currentTenant || !inviteEmail) return;

    setIsInviting(true);
    setInviteError('');

    try {
      await tenantAPI.inviteMember(currentTenant.id, {
        email: inviteEmail,
        role: inviteRole,
      });
      setInviteEmail('');
      setInviteRole('member');
      setShowInviteDialog(false);
      refetch();
    } catch (error: any) {
      setInviteError(error.message || 'Failed to invite member');
    } finally {
      setIsInviting(false);
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!currentTenant || !confirm('Are you sure you want to remove this member?')) return;

    try {
      await tenantAPI.removeMember(currentTenant.id, userId);
      refetch();
    } catch (error) {
      console.error('Failed to remove member:', error);
    }
  };

  const handleChangeRole = async (userId: string, newRole: string) => {
    if (!currentTenant) return;

    try {
      await tenantAPI.updateMemberRole(currentTenant.id, userId, newRole);
      refetch();
    } catch (error) {
      console.error('Failed to update role:', error);
    }
  };

  if (!currentTenant) {
    return (
      <div>
        <h1 className="text-3xl font-bold mb-6">Team Members</h1>
        <Alert>
          <AlertDescription>
            Please select a tenant to view team members.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Team Members</h1>
          <p className="text-muted-foreground">
            Manage who has access to {currentTenant.name}
          </p>
        </div>
        <Dialog open={showInviteDialog} onOpenChange={setShowInviteDialog}>
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="mr-2 h-4 w-4" />
              Invite Member
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Invite team member</DialogTitle>
              <DialogDescription>
                Send an invitation to join {currentTenant.name}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {inviteError && (
                <Alert variant="destructive">
                  <AlertDescription>{inviteError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="user@example.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger id="role">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="member">Member - View servers only</SelectItem>
                    <SelectItem value="support">Support - View and manage servers</SelectItem>
                    <SelectItem value="admin">Admin - Full management access</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowInviteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleInviteMember}
                disabled={!inviteEmail || isInviting}
              >
                {isInviting ? 'Inviting...' : 'Send Invitation'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Members ({members.length})</CardTitle>
          <CardDescription>
            People who have access to this tenant
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {members.map((member: any) => {
              const role = roleConfig[member.role as keyof typeof roleConfig] || roleConfig.member;
              const canModify = currentTenant.role === 'owner' || currentTenant.role === 'admin';
              const cannotRemove = member.role === 'owner';

              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between p-4 rounded-lg border"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-full bg-muted flex items-center justify-center">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <div>
                      <p className="font-medium">{member.user.name || member.user.email}</p>
                      <p className="text-sm text-muted-foreground">{member.user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {canModify && !cannotRemove ? (
                      <Select
                        value={member.role}
                        onValueChange={(value) => handleChangeRole(member.userId, value)}
                      >
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member</SelectItem>
                          <SelectItem value="support">Support</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <Badge variant={role.variant}>{role.label}</Badge>
                    )}
                    {canModify && !cannotRemove && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveMember(member.userId)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
