import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const result = await query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND (table_name LIKE '%articulo%' OR table_name LIKE '%video%' OR table_name LIKE '%contenido%')
    ORDER BY table_name
  `);
  console.log('Tablas relacionadas con contenidos:');
  result.rows.forEach((r: any) => console.log('  -', r.table_name));
  process.exit(0);
}

main().catch(console.error);
