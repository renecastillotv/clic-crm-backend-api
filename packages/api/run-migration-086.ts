import { pool } from './src/config/database';

async function runMigration() {
  console.log('🚀 Ejecutando migración 086...\n');

  const client = await pool.connect();

  try {
    // Importar la migración dinámicamente
    const migrationModule = await import('./src/database/migrations/086_refactor_componentes_web_tipos_pagina.js');

    const { up } = migrationModule;

    // Ejecutar el up de la migración
    const knexInterface = {
      schema: {
        hasColumn: async (table: string, column: string) => {
          const result = await client.query(`
            SELECT column_name
            FROM information_schema.columns
            WHERE table_name = $1 AND column_name = $2
          `, [table, column]);
          return result.rows.length > 0;
        },
        alterTable: (table: string, callback: any) => {
          // Implementación mock - las operaciones reales se hacen con SQL directo
          return Promise.resolve();
        }
      },
      raw: (sql: string, params?: any[]) => client.query(sql, params),
      query: (builder: any) => {
        throw new Error('Use client.query directamente');
      }
    };

    await up(knexInterface as any);

    // Insertar registro en knex_migrations
    await client.query(`
      INSERT INTO knex_migrations (name, batch, migration_time)
      VALUES ($1, (SELECT COALESCE(MAX(batch), 0) + 1 FROM knex_migrations), NOW())
    `, ['086_refactor_componentes_web_tipos_pagina.ts']);

    console.log('\n✅ Migración 086 ejecutada y registrada exitosamente\n');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
