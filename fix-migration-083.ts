import { query } from './src/utils/db.js';

async function fixMigration() {
  console.log('\n=== INVESTIGANDO COMPONENTES SIN MAPEO ===\n');

  // 1. Verificar qué tipos no tienen match
  const unmapped = await query(`
    SELECT DISTINCT cw.tipo, COUNT(*) as cantidad
    FROM componentes_web cw
    WHERE cw.tipo NOT IN (SELECT tipo FROM catalogo_componentes)
    GROUP BY cw.tipo
    ORDER BY cantidad DESC;
  `);

  console.log('Tipos sin coincidencia en catálogo:');
  unmapped.rows.forEach((row: any) => {
    console.log(`  - ${row.tipo}: ${row.cantidad} registro(s)`);
  });

  console.log('\n=== LIMPIANDO MIGRACIÓN FALLIDA ===\n');

  // 2. Eliminar columna componente_catalogo_id agregada
  try {
    await query(`ALTER TABLE componentes_web DROP COLUMN IF EXISTS componente_catalogo_id`);
    console.log('✅ Columna componente_catalogo_id eliminada');
  } catch (error: any) {
    console.log('⚠️  Error eliminando componente_catalogo_id:', error.message);
  }

  // 3. Eliminar registro de migración fallida
  try {
    await query(`DELETE FROM knex_migrations WHERE name = '083_refactor_componentes_web.ts'`);
    console.log('✅ Registro de migración 083 eliminado');
  } catch (error: any) {
    console.log('⚠️  Error eliminando registro:', error.message);
  }

  console.log('\n✅ Limpieza completada\n');
  process.exit(0);
}

fixMigration().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
