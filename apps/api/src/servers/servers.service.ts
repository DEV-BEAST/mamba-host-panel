import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { servers } from '@mambaPanel/db';
import { eq } from 'drizzle-orm';
import type { Database } from '@mambaPanel/db';
import type { CreateServerInput, UpdateServerInput } from '@mambaPanel/types';

@Injectable()
export class ServersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database }
  ) {}

  async create(userId: string, data: CreateServerInput) {
    const [server] = await this.dbConnection.db
      .insert(servers)
      .values({
        ...data,
        userId,
      })
      .returning();

    return server;
  }

  async findAll(userId?: string) {
    if (userId) {
      return this.dbConnection.db.select().from(servers).where(eq(servers.userId, userId));
    }
    return this.dbConnection.db.select().from(servers);
  }

  async findById(id: string) {
    const [server] = await this.dbConnection.db
      .select()
      .from(servers)
      .where(eq(servers.id, id))
      .limit(1);

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async update(id: string, data: UpdateServerInput) {
    const [server] = await this.dbConnection.db
      .update(servers)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(servers.id, id))
      .returning();

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }

  async remove(id: string) {
    const [server] = await this.dbConnection.db
      .delete(servers)
      .where(eq(servers.id, id))
      .returning();

    if (!server) {
      throw new NotFoundException('Server not found');
    }

    return server;
  }
}
