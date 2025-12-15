import { pool } from './src/config/database';

async function checkComponentesClic() {
  const client = await pool.connect();

  try {
    console.log('=== BUSCANDO COMPONENTES CON "CLIC" ===\n');

    // Buscar componentes que contengan "clic" en cualquier campo
    const result = await client.query(`
      SELECT
        id,
        tipo,
        nombre,
        descripcion,
        categoria,
        active
      FROM catalogo_componentes
      WHERE
        LOWER(tipo) LIKE '%clic%' OR
        LOWER(nombre) LIKE '%clic%' OR
        LOWER(descripcion) LIKE '%clic%' OR
        LOWER(categoria) LIKE '%clic%'
      ORDER BY nombre
    `);

    if (result.rows.length > 0) {
      console.log(`✅ Encontrados ${result.rows.length} componentes con "CLIC":\n`);
      console.table(result.rows);
    } else {
      console.log('❌ No se encontraron componentes con "CLIC" en el nombre o descripción\n');
    }

    // Mostrar todos los componentes para referencia
    console.log('\n=== TODOS LOS COMPONENTES DISPONIBLES ===\n');

    const allComponents = await client.query(`
      SELECT
        tipo,
        nombre,
        descripcion,
        categoria,
        active
      FROM catalogo_componentes
      ORDER BY categoria, nombre
    `);

    console.table(allComponents.rows);
    console.log(`\nTotal componentes en catálogo: ${allComponents.rows.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkComponentesClic();
