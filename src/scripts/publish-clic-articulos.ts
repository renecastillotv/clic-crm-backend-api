import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;

  // Publicar todos los artículos de CLIC
  const result = await query(
    'UPDATE articulos SET publicado = true WHERE tenant_id = $1',
    [clicId]
  );
  console.log('Artículos publicados:', result.rowCount);

  // Verificar
  const articulos = await query(
    'SELECT titulo, publicado FROM articulos WHERE tenant_id = $1',
    [clicId]
  );
  console.log('\nEstado actual:');
  articulos.rows.forEach((a: any) => console.log('  -', a.titulo, '| publicado:', a.publicado));

  process.exit(0);
}

main().catch(console.error);
