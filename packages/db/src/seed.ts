import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';
import { hash } from 'bcrypt';

async function seed() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL environment variable is not set');
  }

  const client = postgres(connectionString);
  const db = drizzle(client, { schema });

  console.log('🌱 Seeding database...');

  // Clean existing data (in reverse dependency order)
  console.log('🧹 Cleaning existing data...');
  await db.delete(schema.auditLogs);
  await db.delete(schema.notifications);
  await db.delete(schema.webhookEvents);
  await db.delete(schema.credits);
  await db.delete(schema.invoices);
  await db.delete(schema.usageRecords);
  await db.delete(schema.subscriptionItems);
  await db.delete(schema.subscriptions);
  await db.delete(schema.prices);
  await db.delete(schema.products);
  await db.delete(schema.metricsHourly);
  await db.delete(schema.backups);
  await db.delete(schema.servers);
  await db.delete(schema.allocations);
  await db.delete(schema.portPools);
  await db.delete(schema.ipPools);
  await db.delete(schema.blueprints);
  await db.delete(schema.nodes);
  await db.delete(schema.roleBindings);
  await db.delete(schema.rolePermissions);
  await db.delete(schema.permissions);
  await db.delete(schema.roles);
  await db.delete(schema.tenantMembers);
  await db.delete(schema.tenants);
  await db.delete(schema.sessions);
  await db.delete(schema.accounts);
  await db.delete(schema.users);

  // Create demo users
  console.log('👤 Creating demo users...');
  const passwordHash = await hash('password123', 10);

  const [ownerUser] = await db
    .insert(schema.users)
    .values({
      email: 'owner@democorp.com',
      name: 'Demo Owner',
      passwordHash,
      emailVerified: new Date(),
      role: 'admin',
    })
    .returning();

  const [memberUser] = await db
    .insert(schema.users)
    .values({
      email: 'member@democorp.com',
      name: 'Demo Member',
      passwordHash,
      emailVerified: new Date(),
      role: 'user',
    })
    .returning();

  // Create demo tenant
  console.log('🏢 Creating demo tenant...');
  const [demoTenant] = await db
    .insert(schema.tenants)
    .values({
      name: 'Demo Corp',
      slug: 'demo-corp',
      planTier: 'pro',
      status: 'active',
    })
    .returning();

  // Add users to tenant
  console.log('👥 Adding users to tenant...');
  await db.insert(schema.tenantMembers).values([
    {
      tenantId: demoTenant.id,
      userId: ownerUser.id,
      role: 'owner',
    },
    {
      tenantId: demoTenant.id,
      userId: memberUser.id,
      role: 'member',
      invitedBy: ownerUser.id,
    },
  ]);

  // Create RBAC roles
  console.log('🔐 Creating RBAC roles...');
  const [ownerRole] = await db
    .insert(schema.roles)
    .values({
      name: 'OWNER',
      description: 'Full access to tenant resources',
      systemRole: true,
    })
    .returning();

  const [adminRole] = await db
    .insert(schema.roles)
    .values({
      name: 'ADMIN',
      description: 'Administrative access',
      systemRole: true,
    })
    .returning();

  const [supportRole] = await db
    .insert(schema.roles)
    .values({
      name: 'SUPPORT',
      description: 'Support access',
      systemRole: true,
    })
    .returning();

  const [memberRole] = await db
    .insert(schema.roles)
    .values({
      name: 'MEMBER',
      description: 'Basic member access',
      systemRole: true,
    })
    .returning();

  // Create permissions
  console.log('🔑 Creating permissions...');
  const permissionsData = [
    { key: 'tenant:read', resource: 'tenant', action: 'read', description: 'View tenant details' },
    { key: 'tenant:update', resource: 'tenant', action: 'update', description: 'Update tenant' },
    { key: 'server:create', resource: 'server', action: 'create', description: 'Create servers' },
    { key: 'server:read', resource: 'server', action: 'read', description: 'View servers' },
    { key: 'server:update', resource: 'server', action: 'update', description: 'Update servers' },
    { key: 'server:delete', resource: 'server', action: 'delete', description: 'Delete servers' },
    { key: 'server:start', resource: 'server', action: 'start', description: 'Start servers' },
    { key: 'server:stop', resource: 'server', action: 'stop', description: 'Stop servers' },
    { key: 'backup:create', resource: 'backup', action: 'create', description: 'Create backups' },
    { key: 'backup:restore', resource: 'backup', action: 'restore', description: 'Restore backups' },
  ];

  const insertedPermissions = await db
    .insert(schema.permissions)
    .values(permissionsData)
    .returning();

  // Assign permissions to roles
  console.log('🔗 Assigning permissions to roles...');
  // Owner gets all permissions
  await db.insert(schema.rolePermissions).values(
    insertedPermissions.map((perm) => ({
      roleId: ownerRole.id,
      permissionId: perm.id,
    }))
  );

  // Admin gets most permissions (exclude tenant:update)
  await db.insert(schema.rolePermissions).values(
    insertedPermissions
      .filter((p) => p.key !== 'tenant:update')
      .map((perm) => ({
        roleId: adminRole.id,
        permissionId: perm.id,
      }))
  );

  // Member gets read and basic server operations
  await db.insert(schema.rolePermissions).values(
    insertedPermissions
      .filter((p) => ['server:read', 'server:start', 'server:stop', 'backup:create'].includes(p.key))
      .map((perm) => ({
        roleId: memberRole.id,
        permissionId: perm.id,
      }))
  );

  // Create demo nodes
  console.log('🖥️  Creating demo nodes...');
  const [usEast1Node] = await db
    .insert(schema.nodes)
    .values({
      name: 'us-east-1-node-01',
      fqdn: 'us-east-1.node.example.com',
      location: 'US East (Virginia)',
      capacityCpuMillicores: 16000,
      capacityMemMb: 32768,
      capacityDiskGb: 500,
      status: 'online',
      lastHeartbeat: new Date(),
      daemonToken: 'demo-token-us-east-1',
      scheme: 'https',
      port: 8080,
    })
    .returning();

  const [usWest1Node] = await db
    .insert(schema.nodes)
    .values({
      name: 'us-west-1-node-01',
      fqdn: 'us-west-1.node.example.com',
      location: 'US West (California)',
      capacityCpuMillicores: 16000,
      capacityMemMb: 32768,
      capacityDiskGb: 500,
      status: 'online',
      lastHeartbeat: new Date(),
      daemonToken: 'demo-token-us-west-1',
      scheme: 'https',
      port: 8080,
    })
    .returning();

  // Create IP pools for nodes
  console.log('🌐 Creating IP pools...');
  await db.insert(schema.ipPools).values([
    { nodeId: usEast1Node.id, ipAddress: '10.0.1.10', isAllocated: false },
    { nodeId: usEast1Node.id, ipAddress: '10.0.1.11', isAllocated: false },
    { nodeId: usWest1Node.id, ipAddress: '10.0.2.10', isAllocated: false },
    { nodeId: usWest1Node.id, ipAddress: '10.0.2.11', isAllocated: false },
  ]);

  // Create port pools for nodes
  console.log('🔌 Creating port pools...');
  const ports = [25565, 25566, 25567, 25568, 2456, 2457];
  const portPoolValues = [];
  for (const node of [usEast1Node, usWest1Node]) {
    for (const port of ports) {
      portPoolValues.push({
        nodeId: node.id,
        port,
        protocol: 'tcp' as const,
        isAllocated: false,
      });
    }
  }
  await db.insert(schema.portPools).values(portPoolValues);

  // Create blueprints
  console.log('📋 Creating blueprints...');
  const [minecraftBlueprint] = await db
    .insert(schema.blueprints)
    .values({
      gameSlug: 'minecraft',
      name: 'Minecraft Vanilla',
      version: '1.20.1',
      dockerImage: 'itzg/minecraft-server:java17',
      startupCommand: 'java -Xms{{MEMORY}}M -Xmx{{MEMORY}}M -jar server.jar nogui',
      variables: [
        { key: 'MEMORY', type: 'integer', default: 2048, validation: { min: 512, max: 16384 } },
        { key: 'MAX_PLAYERS', type: 'integer', default: 20, validation: { min: 1, max: 100 } },
      ],
      configFiles: [
        {
          path: 'server.properties',
          content: 'max-players={{MAX_PLAYERS}}\nmotd=Demo Minecraft Server',
        },
      ],
      requiresAllocation: true,
    })
    .returning();

  const [valheimBlueprint] = await db
    .insert(schema.blueprints)
    .values({
      gameSlug: 'valheim',
      name: 'Valheim Dedicated Server',
      version: 'latest',
      dockerImage: 'lloesche/valheim-server:latest',
      startupCommand: '/usr/local/bin/valheim-server',
      variables: [
        { key: 'SERVER_NAME', type: 'string', default: 'Demo Valheim Server' },
        { key: 'WORLD_NAME', type: 'string', default: 'DemoWorld' },
        { key: 'SERVER_PASS', type: 'string', default: 'secret123' },
      ],
      requiresAllocation: true,
    })
    .returning();

  // Create allocations and servers
  console.log('🎮 Creating demo servers...');

  // Allocation for Minecraft server
  const [minecraftAllocation] = await db
    .insert(schema.allocations)
    .values({
      serverId: '00000000-0000-0000-0000-000000000001', // temp, will be updated
      nodeId: usEast1Node.id,
      ipAddress: '10.0.1.10',
      ports: [{ port: 25565, protocol: 'tcp' }],
      status: 'allocated',
    })
    .returning();

  // Update port pool
  await db
    .update(schema.portPools)
    .set({ isAllocated: true, allocatedToServerId: minecraftAllocation.serverId })
    .where(schema.sql`node_id = ${usEast1Node.id} AND port = 25565`);

  // Create Minecraft server
  const [minecraftServer] = await db
    .insert(schema.servers)
    .values({
      name: 'Demo Minecraft Server',
      description: 'A demo Minecraft Vanilla server',
      tenantId: demoTenant.id,
      userId: ownerUser.id,
      nodeId: usEast1Node.id,
      allocationId: minecraftAllocation.id,
      blueprintId: minecraftBlueprint.id,
      image: 'itzg/minecraft-server:java17',
      cpuLimitMillicores: 2000,
      memLimitMb: 4096,
      diskGb: 10,
      status: 'online',
      installStatus: 'completed',
    })
    .returning();

  // Update allocation with real server ID
  await db
    .update(schema.allocations)
    .set({ serverId: minecraftServer.id })
    .where(schema.sql`id = ${minecraftAllocation.id}`);

  // Allocation for Valheim server
  const [valheimAllocation] = await db
    .insert(schema.allocations)
    .values({
      serverId: '00000000-0000-0000-0000-000000000002', // temp
      nodeId: usWest1Node.id,
      ipAddress: '10.0.2.10',
      ports: [
        { port: 2456, protocol: 'tcp' },
        { port: 2457, protocol: 'tcp' },
      ],
      status: 'allocated',
    })
    .returning();

  // Create Valheim server
  const [valheimServer] = await db
    .insert(schema.servers)
    .values({
      name: 'Demo Valheim Server',
      description: 'A demo Valheim dedicated server',
      tenantId: demoTenant.id,
      userId: ownerUser.id,
      nodeId: usWest1Node.id,
      allocationId: valheimAllocation.id,
      blueprintId: valheimBlueprint.id,
      image: 'lloesche/valheim-server:latest',
      cpuLimitMillicores: 3000,
      memLimitMb: 6144,
      diskGb: 15,
      status: 'offline',
      installStatus: 'completed',
    })
    .returning();

  // Update allocation with real server ID
  await db
    .update(schema.allocations)
    .set({ serverId: valheimServer.id })
    .where(schema.sql`id = ${valheimAllocation.id}`);

  // Create demo backup
  console.log('💾 Creating demo backup...');
  await db.insert(schema.backups).values({
    serverId: minecraftServer.id,
    tenantId: demoTenant.id,
    name: 'Pre-update backup',
    sizeBytes: 1024 * 1024 * 150, // 150MB
    status: 'completed',
    storagePath: '/backups/minecraft-server-2024-01-15.tar.gz',
    backupType: 'manual',
    completedAt: new Date(),
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
  });

  // Create hourly metrics (last 24 hours)
  console.log('📊 Creating demo metrics...');
  const now = new Date();
  const metricsData = [];
  for (let i = 0; i < 24; i++) {
    const hourTimestamp = new Date(now.getTime() - i * 60 * 60 * 1000);
    metricsData.push({
      serverId: minecraftServer.id,
      tenantId: demoTenant.id,
      nodeId: usEast1Node.id,
      hourTimestamp,
      cpuMillicoreAvg: 1500 + Math.floor(Math.random() * 500),
      memMbAvg: 3500 + Math.floor(Math.random() * 500),
      diskGbUsed: 8.5,
      egressMbTotal: Math.floor(Math.random() * 100),
      samplesCount: 60,
    });
  }
  await db.insert(schema.metricsHourly).values(metricsData);

  // Create Stripe test subscription
  console.log('💳 Creating demo subscription...');
  const [demoProduct] = await db
    .insert(schema.products)
    .values({
      stripeProductId: 'prod_demo_pro_plan',
      name: 'Pro Plan',
      description: 'Professional tier with advanced features',
      active: true,
    })
    .returning();

  const [demoPrice] = await db
    .insert(schema.prices)
    .values({
      productId: demoProduct.id,
      stripePriceId: 'price_demo_pro_monthly',
      amount: 4900, // $49.00
      currency: 'usd',
      billingPeriod: 'month',
      metered: false,
      active: true,
    })
    .returning();

  const [demoSubscription] = await db
    .insert(schema.subscriptions)
    .values({
      tenantId: demoTenant.id,
      stripeSubscriptionId: 'sub_demo_test_subscription',
      stripeCustomerId: 'cus_demo_test_customer',
      status: 'active',
      currentPeriodStart: new Date(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })
    .returning();

  await db.insert(schema.subscriptionItems).values({
    subscriptionId: demoSubscription.id,
    stripeSubscriptionItemId: 'si_demo_test_item',
    priceId: demoPrice.id,
    quantity: 1,
  });

  // Create audit log entries
  console.log('📝 Creating audit logs...');
  await db.insert(schema.auditLogs).values([
    {
      tenantId: demoTenant.id,
      actorId: ownerUser.id,
      actorType: 'user',
      action: 'server.created',
      resourceType: 'server',
      resourceId: minecraftServer.id,
      metadata: { serverName: minecraftServer.name },
      ipAddress: '192.168.1.100',
    },
    {
      tenantId: demoTenant.id,
      actorId: ownerUser.id,
      actorType: 'user',
      action: 'server.started',
      resourceType: 'server',
      resourceId: minecraftServer.id,
      metadata: { serverName: minecraftServer.name },
      ipAddress: '192.168.1.100',
    },
    {
      tenantId: demoTenant.id,
      actorId: memberUser.id,
      actorType: 'user',
      action: 'backup.created',
      resourceType: 'backup',
      metadata: { serverId: minecraftServer.id },
      ipAddress: '192.168.1.101',
    },
  ]);

  console.log('✅ Seeding completed successfully!');
  console.log('\n📋 Demo Credentials:');
  console.log('  Owner: owner@democorp.com / password123');
  console.log('  Member: member@democorp.com / password123');
  console.log('\n🏢 Demo Tenant: Demo Corp (slug: demo-corp)');
  console.log('\n🖥️  Nodes:');
  console.log('  - us-east-1-node-01 (US East)');
  console.log('  - us-west-1-node-01 (US West)');
  console.log('\n🎮 Servers:');
  console.log('  - Demo Minecraft Server (online)');
  console.log('  - Demo Valheim Server (offline)');

  await client.end();
}

seed()
  .catch((error) => {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  });
