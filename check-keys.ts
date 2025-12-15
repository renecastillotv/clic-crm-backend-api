import { query } from './src/utils/db.js';

async function main() {
  try {
    const r = await query('SELECT tipo, componente_key FROM catalogo_componentes ORDER BY tipo');
    console.log('=== CATALOGO: tipo -> componente_key ===');
    for (const row of r.rows) {
      console.log(`${row.tipo} -> ${row.componente_key}`);
    }
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

main();
