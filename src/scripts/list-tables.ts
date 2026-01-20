/**
 * Script para listar todas las tablas y sus columnas en la BD
 */
import { query } from '../utils/db.js';

async function listTables() {
  console.log('=== TABLAS EN LA BASE DE DATOS ===\n');

  const tables = await query(
    "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' ORDER BY table_name",
    []
  );

  console.log('Tablas encontradas:', tables.rows.length);
  tables.rows.forEach(r => console.log('  -', r.table_name));

  // Mostrar columnas de tablas clave
  const tablasRelevantes = [
    'videos', 'articulos', 'testimonios', 'faqs',
    'propiedades', 'properties', 'perfiles_asesor', 'asesores',
    'usuarios', 'usuarios_tenant', 'categorias_contenido',
    'contenido_categorias', 'tags_globales'
  ];

  console.log('\n=== COLUMNAS DE TABLAS CLAVE ===\n');

  for (const tabla of tablasRelevantes) {
    try {
      const cols = await query(
        `SELECT column_name, data_type FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = 'public'
         ORDER BY ordinal_position`,
        [tabla]
      );

      if (cols.rows.length > 0) {
        console.log(`\n📋 ${tabla.toUpperCase()} (${cols.rows.length} columnas):`);
        cols.rows.forEach(c => console.log(`   - ${c.column_name} (${c.data_type})`));
      }
    } catch (err) {
      // Tabla no existe
    }
  }

  process.exit(0);
}

listTables().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
