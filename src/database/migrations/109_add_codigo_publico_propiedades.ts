import { Knex } from 'knex';

/**
 * Migración 109 - Agregar código público a propiedades
 *
 * El código público es un número secuencial único por tenant que se usa para:
 * - Publicar en la página web
 * - Compartir con clientes
 * - Referencia rápida externa
 *
 * El código interno (codigo) sigue siendo para uso interno de la empresa.
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar columna codigo_publico
  await knex.schema.alterTable('propiedades', (table) => {
    table.integer('codigo_publico').nullable()
      .comment('Código público secuencial para uso externo (1001, 1002, etc.)');
  });

  // 2. Crear índice único por tenant para evitar duplicados
  await knex.raw(`
    CREATE UNIQUE INDEX idx_propiedades_tenant_codigo_publico
    ON propiedades(tenant_id, codigo_publico)
    WHERE codigo_publico IS NOT NULL AND activo = true
  `);

  // 3. Crear secuencia para cada tenant existente y asignar códigos a propiedades existentes
  // Esto se hace con una función que asigna códigos empezando desde 1001
  await knex.raw(`
    -- Asignar códigos públicos a propiedades existentes por tenant
    WITH ranked_propiedades AS (
      SELECT
        id,
        tenant_id,
        ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) + 1000 as nuevo_codigo
      FROM propiedades
      WHERE activo = true
    )
    UPDATE propiedades p
    SET codigo_publico = rp.nuevo_codigo
    FROM ranked_propiedades rp
    WHERE p.id = rp.id
  `);

  // 4. Crear función para generar código público automáticamente
  await knex.raw(`
    CREATE OR REPLACE FUNCTION generar_codigo_publico_propiedad()
    RETURNS TRIGGER AS $$
    DECLARE
      next_codigo INTEGER;
    BEGIN
      -- Solo generar si no tiene código público asignado
      IF NEW.codigo_publico IS NULL THEN
        -- Obtener el próximo código para este tenant
        SELECT COALESCE(MAX(codigo_publico), 1000) + 1
        INTO next_codigo
        FROM propiedades
        WHERE tenant_id = NEW.tenant_id;

        NEW.codigo_publico := next_codigo;
      END IF;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // 5. Crear trigger para asignar código automáticamente en INSERT
  await knex.raw(`
    CREATE TRIGGER trg_generar_codigo_publico_propiedad
    BEFORE INSERT ON propiedades
    FOR EACH ROW
    EXECUTE FUNCTION generar_codigo_publico_propiedad();
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar trigger
  await knex.raw(`
    DROP TRIGGER IF EXISTS trg_generar_codigo_publico_propiedad ON propiedades;
  `);

  // Eliminar función
  await knex.raw(`
    DROP FUNCTION IF EXISTS generar_codigo_publico_propiedad();
  `);

  // Eliminar índice
  await knex.raw(`
    DROP INDEX IF EXISTS idx_propiedades_tenant_codigo_publico;
  `);

  // Eliminar columna
  await knex.schema.alterTable('propiedades', (table) => {
    table.dropColumn('codigo_publico');
  });
}
