'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@mambaPanel/ui';
import { useNodes, useCreateServer } from '@/hooks/use-api';

// Mock blueprints for now (would come from API in full implementation)
const mockBlueprints = [
  {
    id: 'blueprint-minecraft-vanilla',
    name: 'Minecraft Vanilla',
    gameSlug: 'minecraft',
    description: 'Official Minecraft Java Edition server',
  },
  {
    id: 'blueprint-minecraft-paper',
    name: 'Minecraft Paper',
    gameSlug: 'minecraft',
    description: 'High-performance Minecraft server',
  },
  {
    id: 'blueprint-valheim',
    name: 'Valheim',
    gameSlug: 'valheim',
    description: 'Valheim dedicated server',
  },
];

export default function NewServerPage() {
  const router = useRouter();
  const { data: nodes = [] } = useNodes();
  const createServer = useCreateServer();

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    blueprintId: '',
    nodeId: '',
    cpuLimitMillicores: 2000,
    memLimitMb: 2048,
    diskGb: 10,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const server = await createServer.mutateAsync(formData);
      router.push(`/servers/${server.id}`);
    } catch (error) {
      console.error('Failed to create server:', error);
    }
  };

  return (
    <div className="max-w-2xl">
      <div className="mb-6">
        <Link href="/servers" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Servers
        </Link>
      </div>

      <h1 className="text-3xl font-bold mb-2">Create New Server</h1>
      <p className="text-muted-foreground mb-6">
        Configure and deploy a new game server
      </p>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Server Details</CardTitle>
            <CardDescription>Basic information about your server</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Server Name *</Label>
              <Input
                id="name"
                placeholder="My Awesome Server"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="A fun survival server for friends"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Game & Blueprint</CardTitle>
            <CardDescription>Select the game and server type</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="blueprint">Blueprint *</Label>
              <Select
                value={formData.blueprintId}
                onValueChange={(value) => setFormData({ ...formData, blueprintId: value })}
              >
                <SelectTrigger id="blueprint">
                  <SelectValue placeholder="Select a blueprint" />
                </SelectTrigger>
                <SelectContent>
                  {mockBlueprints.map((blueprint) => (
                    <SelectItem key={blueprint.id} value={blueprint.id}>
                      <div>
                        <div className="font-medium">{blueprint.name}</div>
                        <div className="text-sm text-muted-foreground">{blueprint.description}</div>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Node & Resources</CardTitle>
            <CardDescription>Select node and allocate resources</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="node">Node *</Label>
              <Select
                value={formData.nodeId}
                onValueChange={(value) => setFormData({ ...formData, nodeId: value })}
              >
                <SelectTrigger id="node">
                  <SelectValue placeholder="Select a node" />
                </SelectTrigger>
                <SelectContent>
                  {nodes.map((node: any) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.name} ({node.location})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="cpu">CPU (millicores)</Label>
                <Input
                  id="cpu"
                  type="number"
                  min={100}
                  step={100}
                  value={formData.cpuLimitMillicores}
                  onChange={(e) =>
                    setFormData({ ...formData, cpuLimitMillicores: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {(formData.cpuLimitMillicores / 1000).toFixed(1)} cores
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="memory">Memory (MB)</Label>
                <Input
                  id="memory"
                  type="number"
                  min={256}
                  step={256}
                  value={formData.memLimitMb}
                  onChange={(e) =>
                    setFormData({ ...formData, memLimitMb: parseInt(e.target.value) })
                  }
                />
                <p className="text-xs text-muted-foreground">
                  {(formData.memLimitMb / 1024).toFixed(1)} GB
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="disk">Disk (GB)</Label>
                <Input
                  id="disk"
                  type="number"
                  min={1}
                  value={formData.diskGb}
                  onChange={(e) =>
                    setFormData({ ...formData, diskGb: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Link href="/servers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            disabled={
              !formData.name ||
              !formData.blueprintId ||
              !formData.nodeId ||
              createServer.isPending
            }
          >
            {createServer.isPending ? 'Creating...' : 'Create Server'}
          </Button>
        </div>
      </form>
    </div>
  );
}
