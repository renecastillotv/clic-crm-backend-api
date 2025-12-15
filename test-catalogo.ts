import { query } from './src/utils/db.js';

async function test() {
  console.log('\n=== TEST: Consulta de catalogo_componentes ===\n');

  try {
    const result = await query(
      `SELECT
        id,
        tipo,
        nombre,
        descripcion,
        icono,
        categoria,
        variantes,
        campos_config,
        active,
        required_features
      FROM catalogo_componentes
      WHERE active = true
      ORDER BY categoria, tipo
      LIMIT 5`,
      []
    );

    console.log(`✅ Consulta exitosa. Registros encontrados: ${result.rows.length}\n`);

    result.rows.forEach((row, index) => {
      console.log(`${index + 1}. ${row.nombre} (${row.tipo})`);
      console.log(`   Categoría: ${row.categoria}`);
      console.log(`   Variantes: ${row.variantes}`);
      console.log(`   Active: ${row.active}`);
      console.log(`   Required Features: ${row.required_features || 'N/A'}`);
      console.log('');
    });

  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }

  process.exit(0);
}

test();
