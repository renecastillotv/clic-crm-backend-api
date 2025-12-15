import { pool } from './src/config/database';

async function runMigration() {
  console.log('🚀 Ejecutando migración 086 con SQL directo...\n');

  const client = await pool.connect();

  try {
    console.log('🗑️  1. Eliminando columnas obsoletas...');

    // Verificar y eliminar columnas obsoletas
    const obsoleteColumns = ['tipo', 'variante', 'scope', 'predeterminado', 'tipo_pagina', 'config_completa', 'default_data', 'pagina_id', 'es_activo'];

    for (const col of obsoleteColumns) {
      const check = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'componentes_web' AND column_name = $1
      `, [col]);

      if (check.rows.length > 0) {
        await client.query(`ALTER TABLE componentes_web DROP COLUMN IF EXISTS ${col}`);
        console.log(`  ✅ Columna ${col} eliminada`);
      }
    }

    console.log('\n🗑️  2. Limpiando datos existentes...');
    await client.query(`DELETE FROM componentes_web`);
    console.log('  ✅ Datos limpiados');

    console.log('\n➕ 3. Agregando componente_catalogo_id...');
    const hasCatalogoId = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'componentes_web' AND column_name = 'componente_catalogo_id'
    `);

    if (hasCatalogoId.rows.length === 0) {
      await client.query(`
        ALTER TABLE componentes_web
        ADD COLUMN componente_catalogo_id UUID NOT NULL
        REFERENCES catalogo_componentes(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `);
      console.log('  ✅ componente_catalogo_id agregado');

      await client.query(`
        CREATE INDEX idx_componentes_web_catalogo
        ON componentes_web(componente_catalogo_id)
      `);
      console.log('  ✅ Índice en componente_catalogo_id creado');
    }

    console.log('\n➕ 4. Agregando tipo_pagina_id...');
    const hasTipoPaginaId = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'componentes_web' AND column_name = 'tipo_pagina_id'
    `);

    if (hasTipoPaginaId.rows.length === 0) {
      await client.query(`
        ALTER TABLE componentes_web
        ADD COLUMN tipo_pagina_id UUID
        REFERENCES tipos_pagina(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `);
      console.log('  ✅ tipo_pagina_id agregado');

      await client.query(`
        CREATE INDEX idx_componentes_web_tipo_pagina
        ON componentes_web(tipo_pagina_id)
      `);
      console.log('  ✅ Índice en tipo_pagina_id creado');
    }

    console.log('\n➕ 5. Agregando tenant_rutas_config_custom_id...');
    const hasRutasCustomId = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'componentes_web' AND column_name = 'tenant_rutas_config_custom_id'
    `);

    if (hasRutasCustomId.rows.length === 0) {
      await client.query(`
        ALTER TABLE componentes_web
        ADD COLUMN tenant_rutas_config_custom_id UUID
        REFERENCES tenants_rutas_config_custom(id)
        ON DELETE CASCADE
        ON UPDATE CASCADE
      `);
      console.log('  ✅ tenant_rutas_config_custom_id agregado');

      await client.query(`
        CREATE INDEX idx_componentes_web_rutas_custom
        ON componentes_web(tenant_rutas_config_custom_id)
      `);
      console.log('  ✅ Índice en tenant_rutas_config_custom_id creado');
    }

    console.log('\n➕ 6. Agregando constraint CHECK...');
    await client.query(`
      ALTER TABLE componentes_web
      ADD CONSTRAINT chk_componentes_web_tipo_or_custom
      CHECK (
        (tipo_pagina_id IS NOT NULL AND tenant_rutas_config_custom_id IS NULL) OR
        (tipo_pagina_id IS NULL AND tenant_rutas_config_custom_id IS NOT NULL)
      )
    `);
    console.log('  ✅ Constraint CHECK agregado (tipo_pagina_id XOR tenant_rutas_config_custom_id)');

    console.log('\n➕ 7. Registrando migración...');
    await client.query(`
      INSERT INTO knex_migrations (name, batch, migration_time)
      VALUES ($1, (SELECT COALESCE(MAX(batch), 0) + 1 FROM knex_migrations), NOW())
    `, ['086_refactor_componentes_web_tipos_pagina.ts']);
    console.log('  ✅ Migración registrada');

    console.log('\n✅ Migración 086 completada exitosamente\n');
    console.log('Nueva estructura:');
    console.log('  • componente_catalogo_id → catalogo_componentes.id');
    console.log('  • tipo_pagina_id → tipos_pagina.id (para páginas estándar)');
    console.log('  • tenant_rutas_config_custom_id → tenants_rutas_config_custom.id (para custom)');
    console.log('  • Solo UNO de tipo_pagina_id o tenant_rutas_config_custom_id debe estar definido\n');

  } catch (error) {
    console.error('❌ Error ejecutando migración:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration();
