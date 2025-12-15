import { pool } from './src/config/database';

async function addFooterAndHero() {
  const client = await pool.connect();

  try {
    // IDs necesarios
    const TENANT_CLIC_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
    const TIPO_HOMEPAGE_ID = '209ff476-3e07-472c-8d89-04c0966ae4ce';

    console.log('=== BUSCANDO COMPONENTES HERO Y FOOTER ===\n');

    // Buscar el componente hero en el catálogo
    const heroComponent = await client.query(`
      SELECT id, tipo, nombre
      FROM catalogo_componentes
      WHERE tipo = 'hero'
      LIMIT 1
    `);

    console.log('Hero component:');
    console.table(heroComponent.rows);

    // Buscar el componente footer en el catálogo
    const footerComponent = await client.query(`
      SELECT id, tipo, nombre
      FROM catalogo_componentes
      WHERE tipo = 'footer'
      LIMIT 1
    `);

    console.log('\nFooter component:');
    console.table(footerComponent.rows);

    if (heroComponent.rows.length === 0 || footerComponent.rows.length === 0) {
      console.error('❌ No se encontraron los componentes en el catálogo');
      return;
    }

    const HERO_COMPONENT_ID = heroComponent.rows[0].id;
    const FOOTER_COMPONENT_ID = footerComponent.rows[0].id;

    console.log('\n=== AGREGANDO HERO (orden 2, después del header) ===\n');

    // Insertar Hero
    const heroResult = await client.query(`
      INSERT INTO componentes_web (
        tenant_id,
        componente_catalogo_id,
        tipo_pagina_id,
        nombre,
        orden,
        activo,
        datos
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING id, nombre, orden, activo
    `, [
      TENANT_CLIC_ID,
      HERO_COMPONENT_ID,
      TIPO_HOMEPAGE_ID,
      'Hero Principal',
      2, // orden: después del header
      true,
      JSON.stringify({
        title: 'Encuentra tu Hogar Ideal',
        subtitle: 'Miles de propiedades en venta y renta. Expertos en bienes raíces listos para ayudarte.',
        backgroundImage: '/images/hero-bg.jpg',
        cta: {
          primary: {
            label: 'Ver Propiedades',
            url: '/propiedades'
          },
          secondary: {
            label: 'Contactar Asesor',
            url: '/asesores'
          }
        },
        searchBar: true,
        overlay: true,
        height: 'large'
      })
    ]);

    console.log('✅ Hero agregado:');
    console.table(heroResult.rows);

    console.log('\n=== AGREGANDO FOOTER (orden 999, al final) ===\n');

    // Insertar Footer
    const footerResult = await client.query(`
      INSERT INTO componentes_web (
        tenant_id,
        componente_catalogo_id,
        tipo_pagina_id,
        nombre,
        orden,
        activo,
        datos
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7
      )
      RETURNING id, nombre, orden, activo
    `, [
      TENANT_CLIC_ID,
      FOOTER_COMPONENT_ID,
      TIPO_HOMEPAGE_ID,
      'Footer Principal',
      999, // orden: al final de la página
      true,
      JSON.stringify({
        logo: {
          src: '/images/logo-clic-white.png',
          alt: 'CLIC Inmobiliaria'
        },
        description: 'Tu aliado en bienes raíces. Más de 10 años conectando personas con sus hogares ideales.',
        sections: [
          {
            title: 'Navegación',
            links: [
              { label: 'Inicio', url: '/' },
              { label: 'Propiedades', url: '/propiedades' },
              { label: 'Asesores', url: '/asesores' },
              { label: 'Artículos', url: '/articulos' }
            ]
          },
          {
            title: 'Legal',
            links: [
              { label: 'Términos y Condiciones', url: '/terminos' },
              { label: 'Política de Privacidad', url: '/privacidad' },
              { label: 'Aviso Legal', url: '/aviso-legal' }
            ]
          },
          {
            title: 'Contacto',
            links: [
              { label: 'Contacto', url: '/contacto' },
              { label: 'Soporte', url: '/soporte' },
              { label: 'Trabaja con Nosotros', url: '/careers' }
            ]
          }
        ],
        social: [
          { platform: 'facebook', url: 'https://facebook.com/clic' },
          { platform: 'instagram', url: 'https://instagram.com/clic' },
          { platform: 'twitter', url: 'https://twitter.com/clic' },
          { platform: 'linkedin', url: 'https://linkedin.com/company/clic' }
        ],
        copyright: '© 2024 CLIC Inmobiliaria. Todos los derechos reservados.',
        theme: 'dark'
      })
    ]);

    console.log('✅ Footer agregado:');
    console.table(footerResult.rows);

    // Verificar todos los componentes de la homepage
    console.log('\n=== COMPONENTES FINALES EN LA HOMEPAGE ===\n');

    const allComponents = await client.query(`
      SELECT
        cw.id,
        cw.nombre,
        cw.orden,
        cw.activo,
        cc.tipo as componente_tipo,
        cc.nombre as componente_nombre
      FROM componentes_web cw
      JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
      WHERE cw.tipo_pagina_id = $1 AND cw.tenant_id = $2
      ORDER BY cw.orden
    `, [TIPO_HOMEPAGE_ID, TENANT_CLIC_ID]);

    console.table(allComponents.rows);
    console.log(`\n✅ Total componentes en homepage: ${allComponents.rows.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addFooterAndHero();
