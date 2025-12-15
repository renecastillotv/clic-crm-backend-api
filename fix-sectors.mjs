/**
 * Fix: Restore Ensanche Quisqueya as separate sector from Evaristo Morales
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();
  const dnId = '44e657f9-5af2-4a00-93d7-6fa52e9d3bf2';

  try {
    // 1. Limpiar alias incorrectos de Evaristo Morales
    await client.query(`
      UPDATE ubicaciones
      SET alias = NULL
      WHERE tipo = 'sector' AND parent_id = $1 AND LOWER(nombre) = 'evaristo morales'
    `, [dnId]);
    console.log('1. Cleared wrong aliases from Evaristo Morales');

    // 2. Verificar si Ensanche Quisqueya existe
    const exists = await client.query(`
      SELECT id FROM ubicaciones
      WHERE tipo = 'sector' AND parent_id = $1 AND LOWER(nombre) = 'ensanche quisqueya'
    `, [dnId]);

    if (exists.rows.length === 0) {
      // Crear Ensanche Quisqueya como sector separado
      await client.query(`
        INSERT INTO ubicaciones (parent_id, tipo, nivel, nombre, slug, alias, activo, mostrar_en_menu, mostrar_en_filtros, orden)
        VALUES ($1, 'sector', 4, 'Ensanche Quisqueya', 'ensanche-quisqueya', $2, true, true, true, 0)
      `, [dnId, JSON.stringify(['Ens. Quisqueya', 'Quisqueya'])]);
      console.log('2. Created Ensanche Quisqueya as separate sector');
    } else {
      console.log('2. Ensanche Quisqueya already exists');
    }

    // 3. Verificar resultado
    const check = await client.query(`
      SELECT nombre, alias FROM ubicaciones
      WHERE tipo = 'sector' AND parent_id = $1
      AND (LOWER(nombre) LIKE '%quisqueya%' OR LOWER(nombre) LIKE '%evaristo%')
    `, [dnId]);

    console.log('\n3. Current state:');
    check.rows.forEach(r => console.log(`  - ${r.nombre} | Alias: ${JSON.stringify(r.alias)}`));

    console.log('\n✅ Done!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
