/**
 * Verificar si la tabla pagos_comisiones existe
 */
import { query } from './dist/utils/db.js';

async function main() {
  try {
    console.log('Verificando tabla pagos_comisiones...\n');

    // Check if table exists
    const tableCheck = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'pagos_comisiones'
    `);

    if (tableCheck.rows.length === 0) {
      console.log('❌ La tabla pagos_comisiones NO existe');

      // Check for similar tables
      const similarTables = await query(`
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public' AND table_name LIKE '%pago%'
      `);
      console.log('\nTablas similares encontradas:');
      similarTables.rows.forEach(r => console.log(`  - ${r.table_name}`));
    } else {
      console.log('✅ La tabla pagos_comisiones EXISTE');

      // Check columns
      const columns = await query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns
        WHERE table_name = 'pagos_comisiones'
        ORDER BY ordinal_position
      `);

      console.log('\nColumnas:');
      columns.rows.forEach(c => console.log(`  - ${c.column_name}: ${c.data_type} (${c.is_nullable === 'YES' ? 'nullable' : 'required'})`));

      // Check if there are any records
      const countResult = await query('SELECT COUNT(*) FROM pagos_comisiones');
      console.log(`\nRegistros: ${countResult.rows[0].count}`);
    }

    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
