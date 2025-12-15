import knex from 'knex';
import dotenv from 'dotenv';
import config from '../config/knexfile.js';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  console.error(`No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(knexConfig);

async function crearHomepageCLIC() {
  try {
    console.log('📝 Creando homepage para tenant CLIC Inmobiliaria...');
    
    // Obtener el tenant clic
    const tenant = await db('tenants').where({ slug: 'clic' }).first();
    
    if (!tenant) {
      console.error('❌ No se encontró el tenant con slug "clic"');
      process.exit(1);
    }
    
    console.log(`   Tenant encontrado: ${tenant.nombre} (ID: ${tenant.id})`);
    
    // Verificar si ya existe una homepage
    const homepageExistente = await db('paginas_web')
      .where({ 
        tenant_id: tenant.id, 
        tipo_pagina: 'homepage' 
      })
      .first();
    
    let paginaId: string;
    
    if (homepageExistente) {
      console.log('⚠️ Ya existe una homepage para este tenant');
      console.log(`   ID: ${homepageExistente.id}`);
      console.log(`   Título: ${homepageExistente.titulo}`);
      paginaId = homepageExistente.id;
      console.log('   Verificando componentes...');
    } else {
      // Crear la homepage
      const [homepage] = await db('paginas_web')
        .insert({
          tenant_id: tenant.id,
          tipo_pagina: 'homepage',
          titulo: 'Inicio - CLIC Inmobiliaria',
          slug: '/',
          descripcion: 'Página principal de CLIC Inmobiliaria',
          contenido: JSON.stringify({}),
          meta: JSON.stringify({
            title: 'CLIC Inmobiliaria - Tu aliado en bienes raíces',
            description: 'Encuentra la propiedad de tus sueños con CLIC Inmobiliaria',
            keywords: ['inmobiliaria', 'propiedades', 'bienes raíces', 'CLIC'],
          }),
          publica: true,
          activa: true,
          orden: 0,
        })
        .returning(['id', 'titulo', 'slug']);
      
      console.log('✅ Homepage creada exitosamente:');
      console.log(`   ID: ${homepage.id}`);
      console.log(`   Título: ${homepage.titulo}`);
      console.log(`   Slug: ${homepage.slug}`);
      
      paginaId = homepage.id;
    }
    
    // Verificar componentes existentes
    const componentesExistentes = await db('componentes_web')
      .where({ tenant_id: tenant.id })
      .select('tipo');
    
    const tiposExistentes = componentesExistentes.map((c: any) => c.tipo);
    console.log(`   Componentes existentes: ${tiposExistentes.join(', ') || 'ninguno'}`);
    
    // Crear componentes básicos para la homepage (solo si no existen)
    console.log('📦 Creando componentes básicos...');
    
    // 1. Header (global)
    if (!tiposExistentes.includes('header')) {
      await db('componentes_web').insert({
        tenant_id: tenant.id,
        pagina_id: null, // Global
        tipo: 'header',
        variante: 'default',
        datos: JSON.stringify({
          static_data: {
            logo: 'CLIC Inmobiliaria',
            menuItems: [
              { label: 'Inicio', url: '/' },
              { label: 'Propiedades', url: '/propiedades' },
              { label: 'Nosotros', url: '/nosotros' },
              { label: 'Contacto', url: '/contacto' },
            ],
          },
          dynamic_data: {},
          styles: {},
          toggles: {
            mostrarLogo: true,
            mostrarMenu: true,
          },
        }),
        activo: true,
        predeterminado: true,
        orden: 1,
      });
      console.log('   ✓ Header creado');
    } else {
      console.log('   ⏭️ Header ya existe, omitiendo...');
    }
    
    // 2. Hero
    if (!tiposExistentes.includes('hero')) {
      await db('componentes_web').insert({
        tenant_id: tenant.id,
        pagina_id: paginaId,
        tipo: 'hero',
        variante: 'default',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Bienvenido a CLIC Inmobiliaria',
            subtitulo: 'Encuentra la propiedad perfecta para ti',
            descripcion: 'Tu aliado confiable en bienes raíces. Más de 10 años ayudando a familias y empresas a encontrar su hogar ideal.',
            imagenFondo: null,
            botonPrimario: {
              texto: 'Ver Propiedades',
              url: '/propiedades',
            },
            botonSecundario: {
              texto: 'Contáctanos',
              url: '/contacto',
            },
          },
          dynamic_data: {},
          styles: {},
          toggles: {
            mostrarBotonPrimario: true,
            mostrarBotonSecundario: true,
          },
        }),
        activo: true,
        predeterminado: true,
        orden: 2,
      });
      console.log('   ✓ Hero creado');
    } else {
      console.log('   ⏭️ Hero ya existe, omitiendo...');
    }
    
    // 3. Features/Servicios
    if (!tiposExistentes.includes('features')) {
      await db('componentes_web').insert({
        tenant_id: tenant.id,
        pagina_id: paginaId,
        tipo: 'features',
        variante: 'default',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Nuestros Servicios',
            subtitulo: 'Todo lo que necesitas en un solo lugar',
            items: [
              {
                icono: '🏠',
                titulo: 'Compra de Propiedades',
                descripcion: 'Encuentra tu hogar ideal con nuestro catálogo exclusivo',
              },
              {
                icono: '💰',
                titulo: 'Venta de Propiedades',
                descripcion: 'Vende tu propiedad de forma rápida y segura',
              },
              {
                icono: '🔑',
                titulo: 'Alquiler',
                descripcion: 'Encuentra el alquiler perfecto para ti',
              },
              {
                icono: '📋',
                titulo: 'Asesoría Legal',
                descripcion: 'Te acompañamos en todo el proceso legal',
              },
            ],
          },
          dynamic_data: {},
          styles: {},
          toggles: {},
        }),
        activo: true,
        predeterminado: true,
        orden: 3,
      });
      console.log('   ✓ Features/Servicios creado');
    } else {
      console.log('   ⏭️ Features ya existe, omitiendo...');
    }
    
    // 4. Property List (con datos dinámicos)
    if (!tiposExistentes.includes('property_list')) {
      await db('componentes_web').insert({
        tenant_id: tenant.id,
        pagina_id: paginaId,
        tipo: 'property_list',
        variante: 'default',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Propiedades Destacadas',
            subtitulo: 'Las mejores opciones para ti',
          },
          dynamic_data: {
            dataType: 'properties',
            pagination: {
              page: 1,
              limit: 6,
            },
          },
          styles: {},
          toggles: {
            mostrarFiltros: true,
            mostrarPaginacion: true,
          },
        }),
        activo: true,
        predeterminado: true,
        orden: 4,
      });
      console.log('   ✓ Property List creado');
    } else {
      console.log('   ⏭️ Property List ya existe, omitiendo...');
    }
    
    // 5. CTA
    if (!tiposExistentes.includes('cta')) {
      await db('componentes_web').insert({
        tenant_id: tenant.id,
        pagina_id: paginaId,
        tipo: 'cta',
        variante: 'default',
        datos: JSON.stringify({
          static_data: {
            titulo: '¿Listo para encontrar tu propiedad ideal?',
            descripcion: 'Contáctanos hoy y te ayudaremos a encontrar la propiedad perfecta',
            botonTexto: 'Contáctanos Ahora',
            botonUrl: '/contacto',
          },
          dynamic_data: {},
          styles: {},
          toggles: {
            mostrarBoton: true,
          },
        }),
        activo: true,
        predeterminado: true,
        orden: 5,
      });
      console.log('   ✓ CTA creado');
    } else {
      console.log('   ⏭️ CTA ya existe, omitiendo...');
    }
    
    // 6. Footer (global)
    if (!tiposExistentes.includes('footer')) {
      await db('componentes_web').insert({
        tenant_id: tenant.id,
        pagina_id: null, // Global
        tipo: 'footer',
        variante: 'default',
        datos: JSON.stringify({
          static_data: {
            texto: '© 2024 CLIC Inmobiliaria. Todos los derechos reservados.',
            enlaces: [
              { label: 'Políticas de Privacidad', url: '/politicas-privacidad' },
              { label: 'Términos y Condiciones', url: '/terminos-condiciones' },
            ],
            redesSociales: [],
          },
          dynamic_data: {},
          styles: {},
          toggles: {},
        }),
        activo: true,
        predeterminado: true,
        orden: 6,
      });
      console.log('   ✓ Footer creado');
    } else {
      console.log('   ⏭️ Footer ya existe, omitiendo...');
    }
    
    console.log('✅ Proceso de componentes completado');
    
    await db.destroy();
    console.log('✅ Proceso completado');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    console.error(error);
    await db.destroy();
    process.exit(1);
  }
}

crearHomepageCLIC();

