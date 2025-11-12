import type { Blueprint } from '../types';
import { VariableType } from '../types';

export const minecraftPaper: Blueprint = {
  gameSlug: 'minecraft',
  name: 'Minecraft Paper',
  version: '1.20.4',
  description: 'High-performance Minecraft server (Paper/Spigot)',
  dockerImage: 'itzg/minecraft-server:java17',
  startupCommand: 'java -Xms{{MEMORY}}M -Xmx{{MEMORY}}M -jar paper.jar nogui',
  stopCommand: 'stop',
  variables: [
    {
      key: 'VERSION',
      name: 'Minecraft Version',
      description: 'The Minecraft server version',
      type: VariableType.STRING,
      default: '1.20.4',
      required: true,
    },
    {
      key: 'MEMORY',
      name: 'Memory Allocation (MB)',
      description: 'Amount of RAM to allocate',
      type: VariableType.INTEGER,
      default: 2048,
      required: true,
      validation: {
        min: 1024,
        max: 16384,
      },
    },
    {
      key: 'MAX_PLAYERS',
      name: 'Max Players',
      type: VariableType.INTEGER,
      default: 50,
      required: true,
      validation: {
        min: 1,
        max: 500,
      },
    },
    {
      key: 'DIFFICULTY',
      name: 'Difficulty',
      type: VariableType.SELECT,
      default: 'normal',
      required: true,
      options: ['peaceful', 'easy', 'normal', 'hard'],
    },
    {
      key: 'GAMEMODE',
      name: 'Game Mode',
      type: VariableType.SELECT,
      default: 'survival',
      required: true,
      options: ['survival', 'creative', 'adventure', 'spectator'],
    },
    {
      key: 'VIEW_DISTANCE',
      name: 'View Distance',
      description: 'Server view distance (chunks)',
      type: VariableType.INTEGER,
      default: 10,
      required: false,
      validation: {
        min: 3,
        max: 32,
      },
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
view-distance={{VIEW_DISTANCE}}
online-mode=true
pvp=true
enable-command-block=true
motd=Mamba Host - Paper Server
      `.trim(),
    },
    {
      path: 'eula.txt',
      content: 'eula=true',
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
echo "Installing Paper {{VERSION}}..."
curl -o paper.jar https://api.papermc.io/v2/projects/paper/versions/{{VERSION}}/builds/latest/downloads/paper-{{VERSION}}.jar
echo "Installation complete!"
  `.trim(),
  minCpu: 2000, // 2 CPU cores (Paper is more demanding)
  minMemory: 1024,
  minDisk: 10,
};
