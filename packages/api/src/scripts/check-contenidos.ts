import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;

  const articulos = await query(
    `SELECT id, titulo, estado FROM contenidos WHERE tenant_id = $1 AND tipo = 'articulo'`,
    [clicId]
  );
  console.log('Artículos en CLIC:', articulos.rows.length);
  articulos.rows.forEach((a: any) => console.log('  -', a.titulo, '| estado:', a.estado));

  const videos = await query(
    `SELECT id, titulo, estado FROM contenidos WHERE tenant_id = $1 AND tipo = 'video'`,
    [clicId]
  );
  console.log('\nVideos en CLIC:', videos.rows.length);
  videos.rows.forEach((v: any) => console.log('  -', v.titulo, '| estado:', v.estado));

  process.exit(0);
}

main().catch(console.error);
