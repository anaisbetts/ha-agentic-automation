import { Kysely } from 'kysely'

import { Schema } from '../db-schema'

export async function up(db: Kysely<Schema>): Promise<void> {
  await db.schema
    .createTable('signals')
    .addColumn('id', 'integer', (c) => c.primaryKey())
    .addColumn('createdAt', 'varchar(30)')
    .addColumn('automationHash', 'varchar(64)')
    .execute()

  await db.schema
    .createTable('automationLogs')
    .addColumn('id', 'integer', (c) => c.primaryKey())
    .addColumn('createdAt', 'varchar(30)')
    .addColumn('type', 'varchar(64)')
    .addColumn('automationHash', 'varchar(64)')
    .addColumn('signalId', 'integer', (c) => c.references('signals.id'))
    .addColumn('messageLog', 'text')
    .execute()
}

export async function down(db: Kysely<Schema>): Promise<void> {
  await db.schema.dropTable('automationLogs').execute()
  await db.schema.dropTable('signals').execute()
}
