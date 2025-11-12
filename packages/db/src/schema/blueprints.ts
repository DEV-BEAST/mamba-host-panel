import { pgTable, text, timestamp, uuid, jsonb, boolean, index } from 'drizzle-orm/pg-core';

// Blueprints table
export const blueprints = pgTable(
  'blueprints',
  {
    id: uuid('id').defaultRandom().primaryKey(),
    gameSlug: text('game_slug').notNull(),
    name: text('name').notNull(),
    version: text('version'),
    dockerImage: text('docker_image').notNull(),
    startupCommand: text('startup_command').notNull(),
    configFiles: jsonb('config_files'), // [{path: string, content: string}]
    variables: jsonb('variables'), // [{key: string, type: string, default: any, validation: object}]
    installScript: text('install_script'),
    requiresAllocation: boolean('requires_allocation').notNull().default(true),
    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => ({
    gameSlugIdx: index('blueprints_game_slug_idx').on(table.gameSlug),
  })
);
