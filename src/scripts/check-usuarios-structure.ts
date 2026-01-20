import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  // Ver columnas de usuarios
  const cols = await query(`
    SELECT column_name
    FROM information_schema.columns
    WHERE table_name = 'usuarios'
    ORDER BY ordinal_position
  `);
  console.log('Columnas de usuarios:');
  cols.rows.forEach((c: any) => console.log('  -', c.column_name));

  // Ver si hay tabla usuarios_tenants
  const tables = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_name LIKE '%usuario%' OR table_name LIKE '%tenant%'
  `);
  console.log('\nTablas relacionadas con usuarios/tenants:');
  tables.rows.forEach((t: any) => console.log('  -', t.table_name));

  process.exit(0);
}

main().catch(console.error);
