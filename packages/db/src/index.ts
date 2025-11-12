import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

export * from './schema';
export { eq, and, or, not, sql } from 'drizzle-orm';

export function createDatabaseConnection(connectionString: string) {
  const client = postgres(connectionString);
  const db = drizzle(client, { schema });
  return { db, client };
}

export type Database = ReturnType<typeof createDatabaseConnection>['db'];
export type NodeDatabase = Database; // Alias for backwards compatibility
