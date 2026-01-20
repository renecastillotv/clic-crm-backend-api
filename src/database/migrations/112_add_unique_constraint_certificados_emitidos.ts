import { Knex } from 'knex';

/**
 * Migración 112: Agregar constraint UNIQUE a university_certificados_emitidos
 * Previene duplicados cuando dos requests llegan al mismo tiempo
 */
export async function up(knex: Knex): Promise<void> {
  // Primero eliminar duplicados existentes (mantener el más antiguo)
  await knex.raw(`
    DELETE FROM university_certificados_emitidos ce1
    WHERE EXISTS (
      SELECT 1 FROM university_certificados_emitidos ce2
      WHERE ce2.inscripcion_id = ce1.inscripcion_id
        AND ce2.certificado_id = ce1.certificado_id
        AND ce2.created_at < ce1.created_at
    )
  `);

  // Agregar constraint único
  await knex.raw(`
    ALTER TABLE university_certificados_emitidos
    ADD CONSTRAINT uk_certificados_emitidos_inscripcion_certificado
    UNIQUE (inscripcion_id, certificado_id)
  `);
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    ALTER TABLE university_certificados_emitidos
    DROP CONSTRAINT IF EXISTS uk_certificados_emitidos_inscripcion_certificado
  `);
}
