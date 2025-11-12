import type { Blueprint } from '../types';
import { VariableType } from '../types';

export const valheim: Blueprint = {
  gameSlug: 'valheim',
  name: 'Valheim',
  version: 'latest',
  description: 'Valheim dedicated server',
  dockerImage: 'lloesche/valheim-server:latest',
  startupCommand: '/start_server.sh',
  stopCommand: 'supervisorctl stop valheim-server',
  variables: [
    {
      key: 'SERVER_NAME',
      name: 'Server Name',
      description: 'The name of your Valheim server',
      type: VariableType.STRING,
      default: 'Mamba Host Valheim',
      required: true,
    },
    {
      key: 'WORLD_NAME',
      name: 'World Name',
      description: 'The name of the world/save file',
      type: VariableType.STRING,
      default: 'MambaWorld',
      required: true,
      validation: {
        pattern: '^[a-zA-Z0-9_]+$',
      },
    },
    {
      key: 'SERVER_PASSWORD',
      name: 'Server Password',
      description: 'Password to join the server (min 5 characters)',
      type: VariableType.STRING,
      required: true,
      validation: {
        min: 5,
      },
    },
    {
      key: 'SERVER_PUBLIC',
      name: 'Public Server',
      description: 'List server in the public server browser',
      type: VariableType.BOOLEAN,
      default: false,
      required: false,
    },
  ],
  configFiles: [],
  ports: [
    {
      protocol: 'udp',
      count: 3,
      description: 'Valheim server ports (game + 2)',
    },
  ],
  requiresAllocation: true,
  installScript: `
#!/bin/bash
echo "Valheim server will download on first start..."
echo "This may take several minutes."
  `.trim(),
  minCpu: 2000, // 2 cores
  minMemory: 4096, // 4GB
  minDisk: 20,
};
