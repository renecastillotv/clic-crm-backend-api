/**
 * Fix: Add Ensanche Quisqueya as alias to Evaristo Morales
 * Google calls this area "Ensanche Quisqueya" but locally it's known as "Evaristo Morales"
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  const client = await pool.connect();

  try {
    // 1. Ver qué tenemos
    console.log('1. Checking existing records...\n');

    const quisqueyas = await client.query(`
      SELECT u.id, u.nombre, u.alias, p.nombre as ciudad
      FROM ubicaciones u
      LEFT JOIN ubicaciones p ON u.parent_id = p.id
      WHERE u.tipo = 'sector'
      AND (LOWER(u.nombre) LIKE '%quisqueya%' OR LOWER(u.nombre) LIKE '%evaristo%')
    `);

    console.log('Found sectors:');
    quisqueyas.rows.forEach(r => {
      console.log(`  - ${r.nombre} | Ciudad: ${r.ciudad} | Alias: ${JSON.stringify(r.alias)}`);
    });

    // 2. Get Distrito Nacional ID
    const dn = await client.query(`SELECT id FROM ubicaciones WHERE nombre = 'Distrito Nacional' AND tipo = 'ciudad'`);
    const dnId = dn.rows[0]?.id;
    console.log('\nDistrito Nacional ID:', dnId);

    if (!dnId) {
      console.log('ERROR: Distrito Nacional not found!');
      return;
    }

    // 3. Find and update Evaristo Morales to add Ensanche Quisqueya as alias
    const evaristo = await client.query(`
      SELECT id, nombre, alias
      FROM ubicaciones
      WHERE tipo = 'sector'
      AND parent_id = $1
      AND LOWER(nombre) = 'evaristo morales'
    `, [dnId]);

    if (evaristo.rows[0]) {
      const currentAlias = evaristo.rows[0].alias || [];
      const newAliases = [...new Set([...currentAlias, 'Ensanche Quisqueya', 'Ens. Quisqueya', 'Quisqueya'])];

      await client.query(`
        UPDATE ubicaciones
        SET alias = $1
        WHERE id = $2
      `, [JSON.stringify(newAliases), evaristo.rows[0].id]);

      console.log(`\n✅ Updated Evaristo Morales with aliases: ${JSON.stringify(newAliases)}`);
    } else {
      console.log('\nEvaristo Morales not found in DN!');
    }

    // 4. Check if there's a duplicate Quisqueya and remove it if it only has Ensanche Quisqueya alias
    const duplicateQuisqueya = await client.query(`
      SELECT id, nombre, alias
      FROM ubicaciones
      WHERE tipo = 'sector'
      AND parent_id = $1
      AND LOWER(nombre) = 'quisqueya'
    `, [dnId]);

    if (duplicateQuisqueya.rows.length > 1) {
      console.log('\n⚠️ Found duplicate Quisqueya records:', duplicateQuisqueya.rows.length);
      // Keep the one with more aliases or the first one
      duplicateQuisqueya.rows.forEach(r => {
        console.log(`  - ID: ${r.id}, Alias: ${JSON.stringify(r.alias)}`);
      });
    }

    console.log('\n✅ Done!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
