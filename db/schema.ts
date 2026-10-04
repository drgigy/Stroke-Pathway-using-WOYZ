import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
export const cases = sqliteTable('cases', {
 owner: text('owner').notNull(), episode: text('episode').notNull(),
 data: text('data').notNull(), version: integer('version').notNull(),
 updatedAt: text('updated_at').notNull(), mutationId: text('mutation_id').notNull(),
}, t=>[primaryKey({columns:[t.owner,t.episode]})]);
export const history = sqliteTable('case_history', {
 id: integer('id').primaryKey({autoIncrement:true}), owner:text('owner').notNull(),
 episode:text('episode').notNull(), data:text('data').notNull(),version:integer('version').notNull(),
 updatedAt:text('updated_at').notNull(),mutationId:text('mutation_id').notNull(),
});
