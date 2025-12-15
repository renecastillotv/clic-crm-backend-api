import { Knex } from 'knex';

/**
 * Migración - Agregar campo predeterminado a componentes_web
 * 
 * Permite marcar qué componente de cada tipo es el predeterminado
 */
export async function up(knex: Knex): Promise<void> {
  await knex.schema.alterTable('componentes_web', (table) => {
    table.boolean('predeterminado').defaultTo(false).comment('Si este componente es el predeterminado para su tipo');
  });

  // Crear índice para mejorar consultas
  await knex.schema.raw(`
    CREATE INDEX idx_componentes_web_predeterminado 
    ON componentes_web(tenant_id, tipo, predeterminado) 
    WHERE predeterminado = true
  `);

  // Marcar el componente con menor orden de cada tipo como predeterminado
  await knex.raw(`
    UPDATE componentes_web c1
    SET predeterminado = true
    WHERE c1.id IN (
      SELECT DISTINCT ON (c2.tenant_id, c2.tipo) c2.id
      FROM componentes_web c2
      WHERE c2.activo = true
        AND c2.predeterminado = false
      ORDER BY c2.tenant_id, c2.tipo, c2.orden ASC, c2.created_at ASC
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropColumn('predeterminado');
  });
}



