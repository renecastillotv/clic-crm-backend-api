import {query} from './src/utils/db.js';

async function main() {
  const r = await query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_name = 'componentes_web'
    ORDER BY ordinal_position
  `);

  console.log('\n=== Columns in componentes_web ===');
  r.rows.forEach((row: any) => {
    console.log(`  ${row.column_name}: ${row.data_type}`);
  });
  console.log('');

  process.exit(0);
}

main();
