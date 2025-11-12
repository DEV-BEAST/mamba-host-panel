import { Injectable, Inject } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { tenants, nodes, servers, users } from '@mambaPanel/db';
import { sql } from 'drizzle-orm';
import type { Database } from '@mambaPanel/db';

@Injectable()
export class AdminService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database }
  ) {}

  /**
   * Get system overview statistics
   */
  async getSystemOverview() {
    const [tenantsCount] = await this.dbConnection.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tenants);

    const [serversCount] = await this.dbConnection.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(servers);

    const [usersCount] = await this.dbConnection.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(users);

    const [nodesCount] = await this.dbConnection.db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(nodes);

    return {
      tenants: tenantsCount?.count || 0,
      servers: serversCount?.count || 0,
      users: usersCount?.count || 0,
      nodes: nodesCount?.count || 0,
    };
  }

  /**
   * Get all tenants
   */
  async getAllTenants() {
    return this.dbConnection.db.select().from(tenants);
  }

  /**
   * Get all nodes
   */
  async getAllNodes() {
    return this.dbConnection.db.select().from(nodes);
  }
}
