import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const clic = await query("SELECT id FROM tenants WHERE slug = 'clic'");
  const clicId = clic.rows[0].id;
  console.log('Tenant CLIC:', clicId);

  // Verificar estructura de tablas
  const articulosCols = await query(`
    SELECT column_name FROM information_schema.columns
    WHERE table_name = 'articulos' ORDER BY ordinal_position LIMIT 10
  `);
  console.log('\nColumnas de articulos:', articulosCols.rows.map((r: any) => r.column_name).join(', '));

  // Contar artículos por tenant
  const articulosCount = await query(`
    SELECT tenant_id, COUNT(*) as total
    FROM articulos
    GROUP BY tenant_id
  `);
  console.log('\nArtículos por tenant:');
  articulosCount.rows.forEach((r: any) => console.log('  -', r.tenant_id, ':', r.total));

  // Contar videos por tenant
  const videosCount = await query(`
    SELECT tenant_id, COUNT(*) as total
    FROM videos
    GROUP BY tenant_id
  `);
  console.log('\nVideos por tenant:');
  videosCount.rows.forEach((r: any) => console.log('  -', r.tenant_id, ':', r.total));

  // Ver artículos de CLIC específicamente
  const articulosClic = await query(`
    SELECT id, titulo, estado, publicado FROM articulos WHERE tenant_id = $1 LIMIT 5
  `, [clicId]);
  console.log('\nArtículos en CLIC:', articulosClic.rows.length);
  articulosClic.rows.forEach((a: any) => console.log('  -', a.titulo, '| estado:', a.estado, '| publicado:', a.publicado));

  process.exit(0);
}

main().catch(console.error);
