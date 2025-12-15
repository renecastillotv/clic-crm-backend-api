import { query } from './src/database/db.js';

async function main() {
  try {
    const res = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'componentes_web'
      ORDER BY ordinal_position
    `);
    console.log('=== ESTRUCTURA componentes_web ===');
    console.log(JSON.stringify(res.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
