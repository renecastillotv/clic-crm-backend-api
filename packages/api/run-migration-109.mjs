import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require',
  pool: { min: 0, max: 3 }
});

async function runMigration() {
  try {
    console.log('🚀 Ejecutando migración 109: Agregar código público a propiedades...');

    // 1. Verificar si la columna ya existe
    const columnExists = await db.raw(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name = 'codigo_publico'
    `);

    if (columnExists.rows.length > 0) {
      console.log('⚠️ La columna codigo_publico ya existe');
    } else {
      // Agregar columna codigo_publico
      await db.raw(`
        ALTER TABLE propiedades
        ADD COLUMN codigo_publico INTEGER
      `);
      console.log('✅ Columna codigo_publico agregada');
    }

    // 2. Verificar si el índice ya existe
    const indexExists = await db.raw(`
      SELECT indexname
      FROM pg_indexes
      WHERE indexname = 'idx_propiedades_tenant_codigo_publico'
    `);

    if (indexExists.rows.length > 0) {
      console.log('⚠️ El índice ya existe');
    } else {
      // Crear índice único por tenant
      await db.raw(`
        CREATE UNIQUE INDEX idx_propiedades_tenant_codigo_publico
        ON propiedades(tenant_id, codigo_publico)
        WHERE codigo_publico IS NOT NULL AND activo = true
      `);
      console.log('✅ Índice único creado');
    }

    // 3. Asignar códigos públicos a propiedades existentes que no tienen
    const result = await db.raw(`
      WITH ranked_propiedades AS (
        SELECT
          id,
          tenant_id,
          ROW_NUMBER() OVER (PARTITION BY tenant_id ORDER BY created_at) + 1000 as nuevo_codigo
        FROM propiedades
        WHERE activo = true AND codigo_publico IS NULL
      )
      UPDATE propiedades p
      SET codigo_publico = rp.nuevo_codigo
      FROM ranked_propiedades rp
      WHERE p.id = rp.id
      RETURNING p.id, p.codigo_publico
    `);
    console.log(`✅ Códigos públicos asignados a ${result.rows.length} propiedades existentes`);

    // 4. Verificar si la función ya existe
    const funcExists = await db.raw(`
      SELECT proname
      FROM pg_proc
      WHERE proname = 'generar_codigo_publico_propiedad'
    `);

    if (funcExists.rows.length > 0) {
      console.log('⚠️ La función ya existe, actualizando...');
    }

    // Crear o reemplazar la función para generar código público automáticamente
    await db.raw(`
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
    console.log('✅ Función generar_codigo_publico_propiedad creada/actualizada');

    // 5. Verificar si el trigger ya existe
    const triggerExists = await db.raw(`
      SELECT tgname
      FROM pg_trigger
      WHERE tgname = 'trg_generar_codigo_publico_propiedad'
    `);

    if (triggerExists.rows.length > 0) {
      console.log('⚠️ El trigger ya existe');
    } else {
      // Crear trigger para asignar código automáticamente en INSERT
      await db.raw(`
        CREATE TRIGGER trg_generar_codigo_publico_propiedad
        BEFORE INSERT ON propiedades
        FOR EACH ROW
        EXECUTE FUNCTION generar_codigo_publico_propiedad();
      `);
      console.log('✅ Trigger creado');
    }

    // Verificar propiedades con códigos asignados
    const verification = await db.raw(`
      SELECT id, titulo, codigo, codigo_publico
      FROM propiedades
      WHERE activo = true
      ORDER BY tenant_id, codigo_publico
      LIMIT 10
    `);
    console.log('\n📋 Ejemplo de propiedades con códigos:');
    verification.rows.forEach(row => {
      console.log(`  - ${row.titulo?.substring(0, 40)}... | Interno: ${row.codigo || 'N/A'} | Público: ${row.codigo_publico}`);
    });

    console.log('\n✅ Migración 109 completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

runMigration();
