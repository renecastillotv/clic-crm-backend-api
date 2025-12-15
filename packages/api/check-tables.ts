import { query } from './src/utils/db.js';

async function main() {
  try {
    // Listar tablas de componentes
    const tables = await query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND (table_name LIKE '%component%' OR table_name LIKE '%catalogo%')
      ORDER BY table_name
    `);
    console.log('\n=== Tablas de componentes ===');
    console.log(tables.rows.map((r: any) => r.table_name).join('\n'));

    // Verificar header en catalogo_componentes
    const cat1 = await query(`
      SELECT tipo, nombre, componente_key, campos_config
      FROM catalogo_componentes
      WHERE tipo = 'header'
      LIMIT 1
    `);
    console.log('\n=== catalogo_componentes (header) ===');
    if (cat1.rows[0]) {
      console.log('tipo:', cat1.rows[0].tipo);
      console.log('nombre:', cat1.rows[0].nombre);
      console.log('componente_key:', cat1.rows[0].componente_key);
      console.log('campos_config:', JSON.stringify(cat1.rows[0].campos_config, null, 2));
    } else {
      console.log('No encontrado');
    }

    // Verificar si existe componentes_catalogo
    const cat2 = await query(`
      SELECT codigo, nombre, schema_config
      FROM componentes_catalogo
      WHERE codigo LIKE '%header%' OR codigo = 'header'
      LIMIT 3
    `);
    console.log('\n=== componentes_catalogo (header) ===');
    if (cat2.rows.length > 0) {
      cat2.rows.forEach((r: any) => {
        console.log('codigo:', r.codigo);
        console.log('nombre:', r.nombre);
        console.log('schema_config:', JSON.stringify(r.schema_config, null, 2));
      });
    } else {
      console.log('No encontrado');
    }
  } catch (e: any) {
    console.error('Error:', e.message);
  }
  process.exit(0);
}

main();
