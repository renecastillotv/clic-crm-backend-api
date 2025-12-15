import { query } from './src/utils/db.js';

async function checkStructure() {
  console.log('\n=== ESTRUCTURA DE catalogo_componentes ===\n');

  const result = await query(
    `SELECT column_name, data_type, is_nullable, column_default
     FROM information_schema.columns
     WHERE table_schema = 'public'
     AND table_name = 'catalogo_componentes'
     ORDER BY ordinal_position;`
  );

  console.log('Columnas:');
  result.rows.forEach((row) => {
    console.log(`  - ${row.column_name}: ${row.data_type} ${row.is_nullable === 'NO' ? 'NOT NULL' : 'NULL'}`);
  });

  process.exit(0);
}

checkStructure().catch(console.error);
