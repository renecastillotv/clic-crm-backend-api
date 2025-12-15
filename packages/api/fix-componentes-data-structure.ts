import { pool } from './src/config/database';

async function fixComponentesDataStructure() {
  const client = await pool.connect();

  try {
    console.log('=== ACTUALIZANDO ESTRUCTURA DE DATOS DE COMPONENTES ===\n');

    const TENANT_CLIC_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
    const TIPO_HOMEPAGE_ID = '209ff476-3e07-472c-8d89-04c0966ae4ce';

    // 1. Actualizar HERO
    console.log('1️⃣ Actualizando Hero...');

    const heroDatosCorrectos = {
      static_data: {
        titulo: 'Encuentra tu Hogar Ideal',
        subtitulo: 'Miles de propiedades en venta y renta. Expertos en bienes raíces listos para ayudarte.',
        textoBoton: 'Ver Propiedades',
        urlBoton: '/propiedades',
        imagenFondo: '/images/hero-bg.jpg',
        buscador_tabs: [
          { valor: 'venta', etiqueta: 'Comprar' },
          { valor: 'renta', etiqueta: 'Rentar' }
        ],
        buscador_placeholder_ubicacion: 'Ciudad, colonia o código postal',
        buscador_label_tipo: 'Tipo de Propiedad',
        buscador_label_precio: 'Precio Máximo',
        buscador_texto_boton: 'Buscar Propiedades'
      },
      toggles: {
        mostrarBuscador: true,
        mostrarStats: false
      },
      styles: {
        colors: {
          primary: '#667eea'
        }
      }
    };

    const heroUpdate = await client.query(`
      UPDATE componentes_web
      SET datos = $1
      WHERE tenant_id = $2
        AND tipo_pagina_id = $3
        AND componente_catalogo_id = (
          SELECT id FROM catalogo_componentes WHERE tipo = 'hero'
        )
      RETURNING id, nombre
    `, [JSON.stringify(heroDatosCorrectos), TENANT_CLIC_ID, TIPO_HOMEPAGE_ID]);

    if (heroUpdate.rows.length > 0) {
      console.log(`   ✅ Hero actualizado: ${heroUpdate.rows[0].nombre}`);
    } else {
      console.log('   ❌ Hero no encontrado');
    }

    // 2. Actualizar FOOTER
    console.log('\n2️⃣ Actualizando Footer...');

    const footerDatosCorrectos = {
      static_data: {
        textoCopyright: '© 2024 CLIC Inmobiliaria. Todos los derechos reservados.',
        direccion: 'Tu aliado en bienes raíces. Más de 10 años conectando personas con sus hogares ideales.',
        telefono: '+52 123 456 7890',
        email: 'contacto@clic.com'
      },
      toggles: {
        mostrarTelefono: true,
        mostrarEmail: true
      }
    };

    const footerUpdate = await client.query(`
      UPDATE componentes_web
      SET datos = $1
      WHERE tenant_id = $2
        AND tipo_pagina_id = $3
        AND componente_catalogo_id = (
          SELECT id FROM catalogo_componentes WHERE tipo = 'footer'
        )
      RETURNING id, nombre
    `, [JSON.stringify(footerDatosCorrectos), TENANT_CLIC_ID, TIPO_HOMEPAGE_ID]);

    if (footerUpdate.rows.length > 0) {
      console.log(`   ✅ Footer actualizado: ${footerUpdate.rows[0].nombre}`);
    } else {
      console.log('   ❌ Footer no encontrado');
    }

    // 3. Verificar datos actualizados
    console.log('\n=== VERIFICANDO DATOS ACTUALIZADOS ===\n');

    const verificacion = await client.query(`
      SELECT
        cw.nombre,
        cc.tipo,
        cw.datos
      FROM componentes_web cw
      JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
      WHERE cw.tenant_id = $1
        AND cw.tipo_pagina_id = $2
        AND cc.tipo IN ('hero', 'footer')
      ORDER BY cw.orden
    `, [TENANT_CLIC_ID, TIPO_HOMEPAGE_ID]);

    verificacion.rows.forEach(row => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`${row.nombre} (${row.tipo})`);
      console.log('='.repeat(60));
      console.log(JSON.stringify(row.datos, null, 2));
    });

    console.log('\n\n✅ Actualización completada');

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

fixComponentesDataStructure();
