import pg from 'pg';
const { Client } = pg;

const client = new Client({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  await client.connect();
  console.log('Conectado a la base de datos');

  try {
    // 1. Verificar que hero-clic ya existe en catálogo
    const catalogoRes = await client.query(`
      SELECT id, componente_key FROM catalogo_componentes WHERE componente_key = 'hero-clic';
    `);

    if (catalogoRes.rows.length === 0) {
      console.log('hero-clic no existe en catálogo, insertando...');
      await client.query(`
        INSERT INTO catalogo_componentes (
          id, componente_key, nombre, tipo, categoria, descripcion, campos_config
        ) VALUES (
          gen_random_uuid(),
          'hero-clic',
          'Hero CLIC',
          'hero',
          'hero',
          'Hero estilo CLIC Inmobiliaria',
          '{}'::jsonb
        );
      `);
    }

    const heroClicCatalogo = await client.query(`
      SELECT id FROM catalogo_componentes WHERE componente_key = 'hero-clic';
    `);
    const catalogoId = heroClicCatalogo.rows[0].id;
    console.log('Hero CLIC catálogo ID:', catalogoId);

    // 2. Obtener tenant CLIC
    const tenantRes = await client.query(`
      SELECT id FROM tenants WHERE slug = 'clic' LIMIT 1;
    `);

    if (tenantRes.rows.length === 0) {
      console.log('No se encontró tenant CLIC');
      return;
    }

    const tenantId = tenantRes.rows[0].id;
    console.log('Tenant CLIC ID:', tenantId);

    // 3. Obtener tipo_pagina homepage
    const tipoPaginaRes = await client.query(`
      SELECT id FROM tipos_pagina WHERE codigo = 'homepage' LIMIT 1;
    `);

    if (tipoPaginaRes.rows.length === 0) {
      console.log('No se encontró tipo_pagina homepage');
      return;
    }

    const tipoPaginaId = tipoPaginaRes.rows[0].id;
    console.log('Tipo página homepage ID:', tipoPaginaId);

    // 4. Ver si existe un hero actual para este tenant/tipo_pagina
    const heroActual = await client.query(`
      SELECT cw.id, cw.orden, cc.componente_key
      FROM componentes_web cw
      JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
      WHERE cw.tenant_id = $1
        AND cw.tipo_pagina_id = $2
        AND cc.tipo = 'hero';
    `, [tenantId, tipoPaginaId]);

    console.log('Hero actual:', heroActual.rows);

    const heroData = JSON.stringify({
      static_data: {
        badgeTexto: 'Fundada por René Castillo',
        badgeSubtexto: 'Presentador TV 18 años',
        titulo: 'Encuentra Tu Propiedad Soñada en República Dominicana',
        subtitulo: 'La Inmobiliaria del Contenido',
        descripcion: 'Descubre casas de lujo, oportunidades de inversión y rentas vacacionales en el paraíso con René Castillo',
        imagenFondo: 'https://pacewqgypevfgjmdsorz.supabase.co/storage/v1/object/public/public-assets/images/hero-clic-drone.jpg',
        beneficios: [
          { texto: 'Asesoría personalizada', color: '#3b82f6' },
          { texto: 'Experiencia local', color: '#f59e0b' },
          { texto: 'Proceso transparente', color: '#10b981' }
        ]
      },
      styles: {
        colorPrimario: '#f04e00'
      },
      toggles: {
        mostrarBadge: true,
        mostrarSubtitulo: true,
        mostrarDescripcion: true,
        mostrarBeneficios: true
      }
    });

    if (heroActual.rows.length > 0) {
      // Actualizar el hero existente
      const updateRes = await client.query(`
        UPDATE componentes_web
        SET componente_catalogo_id = $1,
            nombre = 'Hero CLIC',
            datos = $2::jsonb,
            updated_at = NOW()
        WHERE id = $3
        RETURNING id;
      `, [catalogoId, heroData, heroActual.rows[0].id]);
      console.log('Hero actualizado a hero-clic:', updateRes.rows[0]);
    } else {
      // Insertar nuevo hero
      const insertRes = await client.query(`
        INSERT INTO componentes_web (
          id, tenant_id, componente_catalogo_id, tipo_pagina_id,
          nombre, datos, activo, orden
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, 'Hero CLIC', $4::jsonb, true, 0
        )
        RETURNING id;
      `, [tenantId, catalogoId, tipoPaginaId, heroData]);
      console.log('Hero insertado:', insertRes.rows[0]);
    }

    console.log('✅ Hero CLIC configurado correctamente');

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

main();
