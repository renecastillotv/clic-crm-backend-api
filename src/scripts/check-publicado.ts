import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;

  const articulos = await query('SELECT id, titulo, publicado FROM articulos WHERE tenant_id = $1', [clicId]);
  console.log('Artículos CLIC:');
  articulos.rows.forEach((a: any) => console.log('  -', a.titulo, '| publicado:', a.publicado));

  const videos = await query('SELECT id, titulo, publicado FROM videos WHERE tenant_id = $1', [clicId]);
  console.log('\nVideos CLIC:');
  videos.rows.forEach((v: any) => console.log('  -', v.titulo, '| publicado:', v.publicado));

  process.exit(0);
}

main().catch(console.error);
