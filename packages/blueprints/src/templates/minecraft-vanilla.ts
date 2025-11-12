import type { Blueprint } from '../types';
import { VariableType } from '../types';

export const minecraftVanilla: Blueprint = {
  gameSlug: 'minecraft',
  name: 'Minecraft Vanilla',
  version: '1.20.4',
  description: 'Official Minecraft Java Edition server',
  dockerImage: 'itzg/minecraft-server:java17',
  startupCommand: 'java -Xms{{MEMORY}}M -Xmx{{MEMORY}}M -jar server.jar nogui',
  stopCommand: 'stop',
  variables: [
    {
      key: 'VERSION',
      name: 'Minecraft Version',
      description: 'The Minecraft server version to run',
      type: VariableType.STRING,
      default: '1.20.4',
      required: true,
    },
    {
      key: 'MEMORY',
      name: 'Memory Allocation (MB)',
      description: 'Amount of RAM to allocate to the server',
      type: VariableType.INTEGER,
      default: 2048,
      required: true,
      validation: {
        min: 512,
        max: 16384,
      },
    },
    {
      key: 'MAX_PLAYERS',
      name: 'Max Players',
      description: 'Maximum number of players',
      type: VariableType.INTEGER,
      default: 20,
      required: true,
      validation: {
        min: 1,
        max: 200,
      },
    },
    {
      key: 'DIFFICULTY',
      name: 'Difficulty',
      description: 'Game difficulty',
      type: VariableType.SELECT,
      default: 'normal',
      required: true,
      options: ['peaceful', 'easy', 'normal', 'hard'],
    },
    {
      key: 'GAMEMODE',
      name: 'Game Mode',
      description: 'Default game mode',
      type: VariableType.SELECT,
      default: 'survival',
      required: true,
      options: ['survival', 'creative', 'adventure', 'spectator'],
    },
    {
      key: 'ENABLE_WHITELIST',
      name: 'Enable Whitelist',
      description: 'Require players to be whitelisted',
      type: VariableType.BOOLEAN,
      default: false,
      required: false,
    },
  ],
  configFiles: [
    {
      path: 'server.properties',
      content: `
server-port={{PORT}}
max-players={{MAX_PLAYERS}}
difficulty={{DIFFICULTY}}
gamemode={{GAMEMODE}}
white-list={{ENABLE_WHITELIST}}
online-mode=true
pvp=true
enable-command-block=true
spawn-protection=16
motd=Mamba Host - Minecraft Server
      `.trim(),
      mode: '0644',
    },
    {
      path: 'eula.txt',
      content: 'eula=true',
      mode: '0644',
    },
  ],
  ports: [
    {
      protocol: 'tcp',
      count: 1,
      description: 'Minecraft server port',
    },
  ],
  requiresAllocation: true,
  installScript: `
#!/bin/bash
echo "Installing Minecraft {{VERSION}}..."
curl -o server.jar https://launcher.mojang.com/v1/objects/{{VERSION}}/server.jar
echo "Installation complete!"
  `.trim(),
  minCpu: 1000, // 1 CPU core
  minMemory: 512,
  minDisk: 5,
};
