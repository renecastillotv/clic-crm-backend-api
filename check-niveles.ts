import { pool } from './src/config/database';

async function checkNiveles() {
  const client = await pool.connect();

  const result = await client.query(`
    SELECT codigo, ruta_patron, nivel
    FROM tipos_pagina
    WHERE codigo LIKE '%testimonio%'
       OR codigo LIKE '%video%'
       OR codigo LIKE '%articulo%'
       OR codigo LIKE '%asesor%'
    ORDER BY codigo
  `);

  console.table(result.rows);

  client.release();
  await pool.end();
}

checkNiveles();
