import { pool } from './src/config/database';

async function addHeaderToHomepage() {
  const client = await pool.connect();

  try {
    // IDs obtenidos del script anterior
    const HEADER_COMPONENT_ID = '202234b7-3b6e-460a-9749-bd2f344b8500';
    const TENANT_CLIC_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
    const TIPO_HOMEPAGE_ID = '209ff476-3e07-472c-8d89-04c0966ae4ce';

    console.log('=== AGREGANDO HEADER A HOMEPAGE DE CLIC ===\n');

    // Insertar el componente header
    const result = await client.query(`
      INSERT INTO componentes_web (
        tenant_id,
        componente_catalogo_id,
        tipo_pagina_id,
        nombre,
        orden,
        activo,
        datos
      ) VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7
      )
      RETURNING id, nombre, orden, activo
    `, [
      TENANT_CLIC_ID,
      HEADER_COMPONENT_ID,
      TIPO_HOMEPAGE_ID,
      'Header Principal',
      1, // orden: primero en la página
      true, // activo
      JSON.stringify({
        logo: {
          src: '/images/logo-clic.png',
          alt: 'CLIC Inmobiliaria'
        },
        navigation: [
          { label: 'Inicio', url: '/', active: true },
          { label: 'Propiedades', url: '/propiedades' },
          { label: 'Asesores', url: '/asesores' },
          { label: 'Artículos', url: '/articulos' },
          { label: 'Contacto', url: '/contacto' }
        ],
        cta: {
          label: 'Publicar Propiedad',
          url: '/publicar',
          variant: 'primary'
        },
        sticky: true,
        transparent: false
      })
    ]);

    console.log('✅ Header agregado exitosamente:\n');
    console.table(result.rows);

    // Verificar que se agregó
    const verificacion = await client.query(`
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

    console.log('\n=== COMPONENTES EN HOMEPAGE (DESPUÉS DE AGREGAR) ===\n');
    console.table(verificacion.rows);
    console.log(`\nTotal componentes: ${verificacion.rows.length}`);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

addHeaderToHomepage();
