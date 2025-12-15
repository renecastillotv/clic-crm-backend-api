import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde el directorio del script
dotenv.config({ path: join(__dirname, '.env') });

import pg from 'pg';
const { Pool } = pg;

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('=== Asignando header-clic a homepage de CLIC ===\n');

  try {
    // 1. Obtener tenant CLIC
    const tenantResult = await pool.query(
      "SELECT id, nombre FROM tenants WHERE slug = 'clic'"
    );
    if (tenantResult.rows.length === 0) {
      throw new Error('Tenant CLIC no encontrado');
    }
    const tenantId = tenantResult.rows[0].id;
    console.log('Tenant CLIC:', tenantId);

    // 2. Obtener tipo_pagina homepage
    const tipoPaginaResult = await pool.query(
      "SELECT id, codigo FROM tipos_pagina WHERE codigo = 'homepage'"
    );
    if (tipoPaginaResult.rows.length === 0) {
      throw new Error('Tipo página homepage no encontrado');
    }
    const tipoPaginaId = tipoPaginaResult.rows[0].id;
    console.log('Tipo página homepage:', tipoPaginaId);

    // 3. Obtener header-clic del catálogo
    const catalogoResult = await pool.query(
      "SELECT id, nombre, componente_key FROM catalogo_componentes WHERE componente_key = 'header-clic'"
    );
    if (catalogoResult.rows.length === 0) {
      throw new Error('header-clic no encontrado en catálogo');
    }
    const catalogoId = catalogoResult.rows[0].id;
    console.log('Catálogo header-clic:', catalogoId);

    // 4. Ver componente header actual de la homepage
    const componenteActualResult = await pool.query(`
      SELECT cw.id, cw.nombre, cc.componente_key, cw.orden
      FROM componentes_web cw
      JOIN catalogo_componentes cc ON cc.id = cw.componente_catalogo_id
      WHERE cw.tenant_id = $1
        AND cw.tipo_pagina_id = $2
        AND cc.tipo = 'header'
      ORDER BY cw.orden
    `, [tenantId, tipoPaginaId]);

    if (componenteActualResult.rows.length > 0) {
      console.log('\nHeader actual:', componenteActualResult.rows[0]);
      const componenteId = componenteActualResult.rows[0].id;

      // 5. Actualizar el componente para usar header-clic
      const updateResult = await pool.query(`
        UPDATE componentes_web
        SET
          componente_catalogo_id = $1,
          nombre = 'Header CLIC',
          datos = $2::jsonb,
          updated_at = NOW()
        WHERE id = $3
        RETURNING id, nombre
      `, [
        catalogoId,
        JSON.stringify({
          static_data: {
            logo: 'https://clicinmobiliaria.com/logo.png',
            logoAlt: 'CLIC Inmobiliaria',
            links: [
              { texto: 'Inicio', url: '/' },
              { texto: 'Comprar', url: '/propiedades?tipo=venta' },
              { texto: 'Rentar', url: '/propiedades?tipo=renta' },
              { texto: 'Asesores', url: '/asesores' },
              { texto: 'Blog', url: '/blog' }
            ],
            textoBotonContacto: 'Contacto',
            urlBotonContacto: '/contacto',
            telefono: '+52 55 1234 5678',
            idiomas: [
              { codigo: 'es', nombre: 'Español', bandera: '🇲🇽' },
              { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
              { codigo: 'fr', nombre: 'Français', bandera: '🇫🇷' }
            ]
          },
          toggles: {
            mostrarIdiomas: true,
            mostrarFavoritos: true,
            mostrarTelefono: false,
            mostrarBotonContacto: true
          },
          styles: {
            colorPrimario: '#f04e00'
          }
        }),
        componenteId
      ]);

      console.log('\nHeader actualizado a header-clic:', updateResult.rows[0]);
    } else {
      console.log('\nNo hay header en homepage, creando uno nuevo...');

      // Insertar nuevo componente
      const insertResult = await pool.query(`
        INSERT INTO componentes_web (
          id, tenant_id, componente_catalogo_id, tipo_pagina_id,
          nombre, datos, activo, orden
        ) VALUES (
          gen_random_uuid(), $1, $2, $3, $4, $5::jsonb, true, -2
        )
        RETURNING id, nombre
      `, [
        tenantId,
        catalogoId,
        tipoPaginaId,
        'Header CLIC',
        JSON.stringify({
          static_data: {
            logo: 'https://clicinmobiliaria.com/logo.png',
            logoAlt: 'CLIC Inmobiliaria',
            links: [
              { texto: 'Inicio', url: '/' },
              { texto: 'Comprar', url: '/propiedades?tipo=venta' },
              { texto: 'Rentar', url: '/propiedades?tipo=renta' },
              { texto: 'Asesores', url: '/asesores' },
              { texto: 'Blog', url: '/blog' }
            ],
            textoBotonContacto: 'Contacto',
            urlBotonContacto: '/contacto',
            idiomas: [
              { codigo: 'es', nombre: 'Español', bandera: '🇲🇽' },
              { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
              { codigo: 'fr', nombre: 'Français', bandera: '🇫🇷' }
            ]
          },
          toggles: {
            mostrarIdiomas: true,
            mostrarFavoritos: true,
            mostrarTelefono: false,
            mostrarBotonContacto: true
          },
          styles: {
            colorPrimario: '#f04e00'
          }
        })
      ]);

      console.log('\nHeader CLIC creado:', insertResult.rows[0]);
    }

    console.log('\n✅ Header CLIC asignado a homepage de CLIC');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
