import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { wingsNodes } from '@mambaPanel/db';
import { eq } from 'drizzle-orm';
import type { Database } from '@mambaPanel/db';
import type { CreateWingsNodeInput, UpdateWingsNodeInput } from '@mambaPanel/types';

@Injectable()
export class WingsService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database }
  ) {}

  async create(data: CreateWingsNodeInput & { daemonToken: string }) {
    const [node] = await this.dbConnection.db.insert(wingsNodes).values(data).returning();

    return node;
  }

  async findAll() {
    return this.dbConnection.db.select().from(wingsNodes);
  }

  async findById(id: string) {
    const [node] = await this.dbConnection.db
      .select()
      .from(wingsNodes)
      .where(eq(wingsNodes.id, id))
      .limit(1);

    if (!node) {
      throw new NotFoundException('Wings node not found');
    }

    return node;
  }

  async update(id: string, data: UpdateWingsNodeInput) {
    const [node] = await this.dbConnection.db
      .update(wingsNodes)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(wingsNodes.id, id))
      .returning();

    if (!node) {
      throw new NotFoundException('Wings node not found');
    }

    return node;
  }

  async remove(id: string) {
    const [node] = await this.dbConnection.db
      .delete(wingsNodes)
      .where(eq(wingsNodes.id, id))
      .returning();

    if (!node) {
      throw new NotFoundException('Wings node not found');
    }

    return node;
  }

  async sendRequest(nodeId: string, path: string, method = 'GET', body?: any) {
    const node = await this.findById(nodeId);
    const url = `${node.scheme}://${node.fqdn}:${node.port}${path}`;

    const response = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${node.daemonToken}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      throw new Error(`Wings request failed: ${response.statusText}`);
    }

    return response.json();
  }
}
