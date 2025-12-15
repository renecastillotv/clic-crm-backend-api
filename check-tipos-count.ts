import { pool } from './src/config/database';

async function checkTipos() {
  const client = await pool.connect();

  try {
    const result = await client.query(`
      SELECT COUNT(*) as total FROM tipos_pagina
    `);

    console.log(`Total tipos_pagina en BD: ${result.rows[0].total}`);

    const todos = await client.query(`
      SELECT codigo, nombre, ruta_patron
      FROM tipos_pagina
      ORDER BY codigo
    `);

    console.log('\nTodos los tipos:');
    todos.rows.forEach(t => console.log(`- ${t.codigo}: ${t.nombre} (${t.ruta_patron})`));

  } finally {
    client.release();
    await pool.end();
  }
}

checkTipos();
