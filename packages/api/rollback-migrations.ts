import { pool } from './src/config/database';

async function rollback() {
  console.log('🔄 Iniciando rollback manual de migraciones 086 y 087...\n');

  const client = await pool.connect();

  try {
    // Paso 1: Verificar qué migraciones están aplicadas
    console.log('📋 Verificando migraciones aplicadas...');
    const migrations = await client.query(
      `SELECT * FROM knex_migrations ORDER BY id DESC LIMIT 5`
    );

    console.log('Últimas migraciones:');
    migrations.rows.forEach((m: any) => {
      console.log(`  - ${m.name} (batch: ${m.batch})`);
    });
    console.log('');

    // Paso 2: Hacer rollback de migración 087
    const has087 = migrations.rows.some((m: any) => m.name.includes('087'));
    if (has087) {
      console.log('🔙 Haciendo rollback de 087_refactor_tenants_rutas_config_global...');

      // Eliminar FK de componentes_web
      await client.query(`
        ALTER TABLE componentes_web
        DROP CONSTRAINT IF EXISTS componentes_web_tenant_rutas_config_id_foreign
      `);
      console.log('  ✅ FK componentes_web eliminada');

      // Eliminar constraint unique de prefijo
      await client.query(`
        ALTER TABLE tenants_rutas_config
        DROP CONSTRAINT IF EXISTS tenants_rutas_config_prefijo_unique
      `);
      console.log('  ✅ Constraint unique(prefijo) eliminado');

      // Limpiar datos
      await client.query(`DELETE FROM tenants_rutas_config`);
      console.log('  ✅ Datos limpiados');

      // Verificar si tenant_id existe
      const columnCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'tenants_rutas_config' AND column_name = 'tenant_id'
      `);

      if (columnCheck.rows.length === 0) {
        // Restaurar columna tenant_id
        await client.query(`
          ALTER TABLE tenants_rutas_config
          ADD COLUMN tenant_id UUID NOT NULL
          REFERENCES tenants(id) ON DELETE CASCADE
        `);
        console.log('  ✅ Columna tenant_id restaurada');

        // Crear índice de tenant_id
        await client.query(`
          CREATE INDEX idx_tenants_rutas_config_tenant ON tenants_rutas_config(tenant_id)
        `);
        console.log('  ✅ Índice tenant_id creado');

        // Crear constraint unique original
        await client.query(`
          ALTER TABLE tenants_rutas_config
          ADD CONSTRAINT tenants_rutas_config_tenant_id_prefijo_unique
          UNIQUE (tenant_id, prefijo)
        `);
        console.log('  ✅ Constraint unique(tenant_id, prefijo) creado');
      }

      // Recrear FK de componentes_web
      await client.query(`
        ALTER TABLE componentes_web
        ADD CONSTRAINT componentes_web_tenant_rutas_config_id_foreign
        FOREIGN KEY (tenant_rutas_config_id)
        REFERENCES tenants_rutas_config(id)
        ON DELETE SET NULL
        ON UPDATE CASCADE
      `);
      console.log('  ✅ FK componentes_web recreada');

      // Eliminar registro de la migración
      await client.query(`DELETE FROM knex_migrations WHERE name LIKE '%087%'`);
      console.log('  ✅ Registro de migración 087 eliminado\n');
    }

    // Paso 3: Hacer rollback de migración 086
    const has086 = migrations.rows.some((m: any) => m.name.includes('086'));
    if (has086) {
      console.log('🔙 Haciendo rollback de 086_refactor_componentes_web...');

      // Eliminar FKs
      await client.query(`
        ALTER TABLE componentes_web
        DROP CONSTRAINT IF EXISTS componentes_web_tenant_rutas_config_id_foreign
      `);
      await client.query(`
        ALTER TABLE componentes_web
        DROP CONSTRAINT IF EXISTS componentes_web_tenant_rutas_config_custom_id_foreign
      `);
      await client.query(`
        ALTER TABLE componentes_web
        DROP CONSTRAINT IF EXISTS componentes_web_componente_catalogo_id_foreign
      `);
      console.log('  ✅ FKs eliminadas');

      // Eliminar columnas nuevas
      const columnsCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'componentes_web'
          AND column_name IN ('tenant_rutas_config_id', 'tenant_rutas_config_custom_id', 'componente_catalogo_id')
      `);

      for (const col of columnsCheck.rows) {
        await client.query(`
          ALTER TABLE componentes_web DROP COLUMN IF EXISTS ${col.column_name}
        `);
      }
      console.log('  ✅ Columnas nuevas eliminadas');

      // Verificar si columnas antiguas existen
      const oldColumnsCheck = await client.query(`
        SELECT column_name
        FROM information_schema.columns
        WHERE table_name = 'componentes_web'
          AND column_name IN ('tipo', 'variante')
      `);

      const existingCols = oldColumnsCheck.rows.map((r: any) => r.column_name);

      // Restaurar columnas antiguas (si no existen)
      if (!existingCols.includes('tipo')) {
        await client.query(`
          ALTER TABLE componentes_web ADD COLUMN tipo VARCHAR(255)
        `);
      }
      if (!existingCols.includes('variante')) {
        await client.query(`
          ALTER TABLE componentes_web ADD COLUMN variante VARCHAR(255)
        `);
      }
      console.log('  ✅ Columnas antiguas restauradas');

      // Eliminar registro de la migración
      await client.query(`DELETE FROM knex_migrations WHERE name LIKE '%086%'`);
      console.log('  ✅ Registro de migración 086 eliminado\n');
    }

    console.log('✅ Rollback completado exitosamente\n');

  } catch (error) {
    console.error('❌ Error durante rollback:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

rollback();
