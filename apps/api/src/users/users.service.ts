import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { DATABASE_CONNECTION } from '../common/database/database.module';
import { users } from '@gamePanel/db';
import { eq } from 'drizzle-orm';
import type { Database } from '@gamePanel/db';

@Injectable()
export class UsersService {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private dbConnection: { db: Database }
  ) {}

  async create(data: { email: string; password: string; name?: string }) {
    const [user] = await this.dbConnection.db
      .insert(users)
      .values({
        email: data.email,
        passwordHash: data.password,
        name: data.name,
      })
      .returning();

    return user;
  }

  async findByEmail(email: string) {
    const [user] = await this.dbConnection.db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    return user;
  }

  async findById(id: string) {
    const [user] = await this.dbConnection.db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findAll() {
    return this.dbConnection.db.select().from(users);
  }

  async update(id: string, data: Partial<{ name: string; email: string }>) {
    const [user] = await this.dbConnection.db
      .update(users)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async remove(id: string) {
    const [user] = await this.dbConnection.db
      .delete(users)
      .where(eq(users.id, id))
      .returning();

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }
}
