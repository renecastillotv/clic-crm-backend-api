require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const tenantId = 'ec0f1d48-57c7-4e2a-bb8b-9daf0cedf471';

async function fixVideoPages() {
  console.log('Limpiando páginas de videos...\n');

  // Ver que tenemos
  const all = await pool.query(`
    SELECT id, tipo_pagina, slug, activa, tenant_id
    FROM paginas_web
    WHERE (tipo_pagina LIKE 'videos%' OR tipo_pagina LIKE '%video%' OR slug LIKE '%video%')
    AND tenant_id = $1
    ORDER BY tipo_pagina
  `, [tenantId]);

  console.log('Páginas existentes:');
  all.rows.forEach(r => console.log(`  ${r.tipo_pagina}: slug=${r.slug}, activa=${r.activa}`));

  // Eliminar las duplicadas y mal configuradas
  console.log('\nEliminando páginas incorrectas...');

  const deleted = await pool.query(`
    DELETE FROM paginas_web
    WHERE tenant_id = $1
    AND (
      tipo_pagina IN ('directorio_videos', 'video_category', 'video_single', 'videos', 'custom', 'videos_categoria', 'videos_single', 'videos_listado')
      OR (slug LIKE '/%video%')
      OR (slug = 'videos' AND tipo_pagina != 'videos_listado')
    )
    RETURNING id, tipo_pagina, slug
  `, [tenantId]);

  console.log(`Eliminadas ${deleted.rows.length} páginas:`);
  deleted.rows.forEach(r => console.log(`  ${r.tipo_pagina}: slug=${r.slug}`));

  // Ahora crear las páginas correctas
  console.log('\nCreando páginas correctas...');

  // 1. Página de listado de videos
  try {
    const listado = await pool.query(`
      INSERT INTO paginas_web (tenant_id, tipo_pagina, variante, titulo, slug, descripcion, contenido, meta, publica, activa, orden)
      VALUES ($1, 'videos_listado', 'default', 'Galería de Videos', 'videos', 'Descubre nuestro contenido exclusivo en video',
              '{"componentes": ["header", "video_hero", "video_gallery", "footer"]}',
              '{"title": "Videos - Inmobiliaria"}', true, true, 50)
      RETURNING id, slug
    `, [tenantId]);
    console.log(`✅ Página listado creada: slug=${listado.rows[0].slug}`);
  } catch (e) {
    console.log(`⚠️ Página listado ya existe o error: ${e.message}`);
  }

  // 2. Página de categoría de videos (template dinámico)
  try {
    const categoria = await pool.query(`
      INSERT INTO paginas_web (tenant_id, tipo_pagina, variante, titulo, slug, descripcion, contenido, meta, publica, activa, orden)
      VALUES ($1, 'videos_categoria', 'default', 'Videos por Categoría', '_template_videos_categoria', 'Videos filtrados por categoría',
              '{"componentes": ["header", "video_category", "footer"]}',
              '{"title": "Categoría - Videos"}', true, true, 51)
      RETURNING id, slug
    `, [tenantId]);
    console.log(`✅ Página categoría creada: slug=${categoria.rows[0].slug}`);
  } catch (e) {
    console.log(`⚠️ Página categoría ya existe o error: ${e.message}`);
  }

  // 3. Página single de video (template dinámico)
  try {
    const single = await pool.query(`
      INSERT INTO paginas_web (tenant_id, tipo_pagina, variante, titulo, slug, descripcion, contenido, meta, publica, activa, orden)
      VALUES ($1, 'videos_single', 'default', 'Detalle de Video', '_template_video_single', 'Página de detalle de video',
              '{"componentes": ["header", "video_detail", "footer"]}',
              '{"title": "Video - Inmobiliaria"}', true, true, 52)
      RETURNING id, slug
    `, [tenantId]);
    console.log(`✅ Página single creada: slug=${single.rows[0].slug}`);
  } catch (e) {
    console.log(`⚠️ Página single ya existe o error: ${e.message}`);
  }

  // Verificar resultado
  console.log('\nVerificando páginas actuales:');
  const final = await pool.query(`
    SELECT id, tipo_pagina, slug, activa
    FROM paginas_web
    WHERE tenant_id = $1 AND tipo_pagina LIKE 'videos%' AND activa = true
    ORDER BY tipo_pagina
  `, [tenantId]);

  final.rows.forEach(r => console.log(`  ${r.tipo_pagina}: slug=${r.slug}, activa=${r.activa}`));

  console.log('\n✅ Páginas de videos configuradas correctamente');
  await pool.end();
}

fixVideoPages().catch(e => { console.error(e); process.exit(1); });
