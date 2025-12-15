import { query } from './src/utils/db.js';

async function main() {
  try {
    const r = await query('SELECT id, tipo, nombre FROM catalogo_componentes ORDER BY tipo');
    console.log('=== CATALOGO COMPONENTES ===');
    console.log(JSON.stringify(r.rows, null, 2));
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
