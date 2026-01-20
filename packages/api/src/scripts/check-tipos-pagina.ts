import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  console.log('Tipos de página existentes:');
  const result = await query('SELECT codigo FROM tipos_pagina ORDER BY codigo');
  result.rows.forEach((r: any) => console.log('  -', r.codigo));
  process.exit(0);
}

main().catch(console.error);
