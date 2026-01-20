import { Knex } from 'knex';

/**
 * Migración 110: Crear tabla plantillas_pagina (v2)
 *
 * Define qué componentes lleva cada tipo de página por defecto,
 * incluyendo su configuración inicial. Cuando se crea un tenant,
 * se usa esta plantilla para crear sus componentes_web.
 *
 * Estructura:
 * - tipo_pagina_id: FK a tipos_pagina
 * - componente_catalogo_id: FK a catalogo_componentes
 * - orden: posición del componente en la página
 * - datos_default: configuración por defecto del componente
 * - es_global: si el componente es global (header/footer) o específico de página
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Creando tabla plantillas_pagina...\n');

  // 1. Crear la tabla
  const hasTable = await knex.schema.hasTable('plantillas_pagina');
  if (!hasTable) {
    await knex.schema.createTable('plantillas_pagina', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

      table.uuid('tipo_pagina_id')
        .notNullable()
        .references('id')
        .inTable('tipos_pagina')
        .onDelete('CASCADE');

      table.uuid('componente_catalogo_id')
        .notNullable()
        .references('id')
        .inTable('catalogo_componentes')
        .onDelete('CASCADE');

      table.integer('orden').notNullable().defaultTo(0);

      table.jsonb('datos_default').defaultTo('{}')
        .comment('Configuración por defecto del componente');

      table.boolean('es_global').defaultTo(false)
        .comment('Si es true, el componente es global (sin tipo_pagina_id en componentes_web)');

      table.boolean('activo').defaultTo(true);

      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());

      // Índices
      table.index('tipo_pagina_id', 'idx_plantillas_tipo_pagina');
      table.index('componente_catalogo_id', 'idx_plantillas_componente');

      // Un componente solo puede aparecer una vez por tipo de página
      table.unique(['tipo_pagina_id', 'componente_catalogo_id'], {
        indexName: 'unique_tipo_pagina_componente'
      });
    });

    console.log('✅ Tabla plantillas_pagina creada\n');
  } else {
    console.log('⏭️  Tabla plantillas_pagina ya existe\n');
  }

  // 2. Obtener IDs de tipos_pagina
  const tiposPagina = await knex('tipos_pagina').select('id', 'codigo');
  const tiposPaginaMap: Record<string, string> = {};
  for (const tp of tiposPagina) {
    tiposPaginaMap[tp.codigo] = tp.id;
  }

  // 3. Obtener IDs de catalogo_componentes
  const componentes = await knex('catalogo_componentes').select('id', 'tipo', 'nombre');
  const componentesMap: Record<string, { id: string; nombre: string }[]> = {};
  for (const c of componentes) {
    if (!componentesMap[c.tipo]) {
      componentesMap[c.tipo] = [];
    }
    componentesMap[c.tipo].push({ id: c.id, nombre: c.nombre });
  }

  // Helper para obtener el primer componente de un tipo (variante genérica)
  function getComponenteId(tipo: string, preferClic: boolean = false): string | null {
    const comps = componentesMap[tipo];
    if (!comps || comps.length === 0) return null;

    if (preferClic) {
      // Buscar variante CLIC primero
      const clicComp = comps.find(c => c.nombre.toLowerCase().includes('clic'));
      if (clicComp) return clicComp.id;
    }

    // Buscar variante genérica (sin "CLIC" en el nombre)
    const genericComp = comps.find(c => !c.nombre.toLowerCase().includes('clic'));
    return genericComp?.id || comps[0].id;
  }

  console.log('📋 Insertando plantillas por defecto...\n');

  // 4. Definir plantillas por tipo de página
  const plantillas: Array<{
    tipoPagina: string;
    componentes: Array<{
      tipo: string;
      orden: number;
      esGlobal?: boolean;
      datosDefault?: Record<string, any>;
    }>;
  }> = [
    // ========================================
    // HOMEPAGE
    // ========================================
    {
      tipoPagina: 'homepage',
      componentes: [
        {
          tipo: 'header',
          orden: 0,
          esGlobal: true,
          datosDefault: {
            static_data: {
              links: [
                { url: '/propiedades', texto: 'Propiedades' },
                { url: '/asesores', texto: 'Asesores' },
                { url: '/contacto', texto: 'Contacto' }
              ],
              mostrarTelefono: true,
              mostrarFavoritos: true,
              mostrarBotonContacto: true
            }
          }
        },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Encuentra tu hogar ideal',
              subtitulo: 'Las mejores propiedades te esperan',
              mostrarBuscador: true
            },
            styles: {
              backgroundColor: '#1a1a2e'
            }
          }
        },
        {
          tipo: 'property_carousel',
          orden: 2,
          datosDefault: {
            static_data: {
              titulo: 'Propiedades Destacadas',
              viewAllLink: '/propiedades'
            },
            dynamic_data: {
              dataType: 'properties',
              limit: 10
            }
          }
        },
        {
          tipo: 'testimonials',
          orden: 3,
          datosDefault: {
            static_data: {
              titulo: 'Lo que dicen nuestros clientes',
              subtitulo: 'Experiencias reales de personas que han confiado en nosotros',
              maxItems: 4
            },
            dynamic_data: {
              dataType: 'testimonials',
              limit: 6
            }
          }
        },
        {
          tipo: 'footer',
          orden: 999,
          esGlobal: true,
          datosDefault: {
            static_data: {
              copyright: '© {year} Todos los derechos reservados',
              mostrarRedesSociales: true,
              mostrarNewsletter: false
            }
          }
        }
      ]
    },

    // ========================================
    // PROPIEDADES - LISTADO
    // ========================================
    {
      tipoPagina: 'propiedades_listado',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Propiedades',
              subtitulo: 'Explora nuestra selección de propiedades',
              mostrarBuscador: true
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_propiedades'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // PROPIEDADES - SINGLE
    // ========================================
    {
      tipoPagina: 'propiedades_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            dynamic_data: {
              dataType: 'propiedad_single'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // CONTACTO
    // ========================================
    {
      tipoPagina: 'contacto',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Contáctanos',
              subtitulo: 'Estamos aquí para ayudarte'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            static_data: {
              mostrarFormulario: true,
              mostrarMapa: true,
              mostrarHorarios: true
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // ASESORES - LISTADO
    // ========================================
    {
      tipoPagina: 'listado_asesores',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Nuestro Equipo',
              subtitulo: 'Profesionales comprometidos con tu búsqueda'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_asesores'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // ASESORES - SINGLE
    // ========================================
    {
      tipoPagina: 'asesor_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            dynamic_data: {
              dataType: 'asesor_single'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // TESTIMONIOS - LISTADO
    // ========================================
    {
      tipoPagina: 'testimonios',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Testimonios',
              subtitulo: 'Historias de éxito de nuestros clientes'
            }
          }
        },
        {
          tipo: 'testimonials',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_testimonios'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // TESTIMONIOS - SINGLE
    // ========================================
    {
      tipoPagina: 'testimonio_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            dynamic_data: {
              dataType: 'testimonio_single'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // ARTICULOS - LISTADO
    // ========================================
    {
      tipoPagina: 'articulos_listado',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Blog',
              subtitulo: 'Noticias y consejos del mundo inmobiliario'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_articulos'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // ARTICULOS - SINGLE
    // ========================================
    {
      tipoPagina: 'articulos_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            dynamic_data: {
              dataType: 'articulo_single'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // VIDEOS - LISTADO
    // ========================================
    {
      tipoPagina: 'videos_listado',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Videos',
              subtitulo: 'Conoce nuestras propiedades en video'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_videos'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // VIDEOS - SINGLE
    // ========================================
    {
      tipoPagina: 'videos_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            dynamic_data: {
              dataType: 'video_single'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // FAVORITOS
    // ========================================
    {
      tipoPagina: 'favoritos',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Mis Favoritos',
              subtitulo: 'Propiedades que has guardado'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_favoritos'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // UBICACIONES - LISTADO
    // ========================================
    {
      tipoPagina: 'ubicaciones',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Ubicaciones',
              subtitulo: 'Explora propiedades por zona'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_ubicaciones'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // TIPOS DE PROPIEDADES
    // ========================================
    {
      tipoPagina: 'tipos_propiedades',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Tipos de Propiedades',
              subtitulo: 'Encuentra el tipo de propiedad ideal'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_tipos_propiedades'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // PROYECTOS - LISTADO
    // ========================================
    {
      tipoPagina: 'directorio_proyectos',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Proyectos',
              subtitulo: 'Descubre nuestros desarrollos inmobiliarios'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'lista_proyectos'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // LANDING PAGE
    // ========================================
    {
      tipoPagina: 'landing_page',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Landing Page',
              subtitulo: 'Contenido personalizado'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {}
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // POLÍTICAS DE PRIVACIDAD
    // ========================================
    {
      tipoPagina: 'politicas_privacidad',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Políticas de Privacidad'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // TÉRMINOS Y CONDICIONES
    // ========================================
    {
      tipoPagina: 'terminos_condiciones',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Términos y Condiciones'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    }
  ];

  // 5. Insertar plantillas
  let insertCount = 0;
  let skipCount = 0;

  for (const plantilla of plantillas) {
    const tipoPaginaId = tiposPaginaMap[plantilla.tipoPagina];

    if (!tipoPaginaId) {
      console.log(`  ⚠️  Tipo de página no encontrado: ${plantilla.tipoPagina}`);
      skipCount++;
      continue;
    }

    for (const comp of plantilla.componentes) {
      const componenteId = getComponenteId(comp.tipo);

      if (!componenteId) {
        console.log(`  ⚠️  Componente no encontrado en catálogo: ${comp.tipo}`);
        skipCount++;
        continue;
      }

      // Verificar si ya existe
      const exists = await knex('plantillas_pagina')
        .where({
          tipo_pagina_id: tipoPaginaId,
          componente_catalogo_id: componenteId
        })
        .first();

      if (!exists) {
        await knex('plantillas_pagina').insert({
          tipo_pagina_id: tipoPaginaId,
          componente_catalogo_id: componenteId,
          orden: comp.orden,
          datos_default: JSON.stringify(comp.datosDefault || {}),
          es_global: comp.esGlobal || false,
          activo: true
        });
        insertCount++;
      }
    }

    console.log(`  ✅ ${plantilla.tipoPagina}: componentes configurados`);
  }

  console.log(`\n✅ Migración completada:`);
  console.log(`   - ${insertCount} plantillas insertadas`);
  console.log(`   - ${skipCount} omitidas (ya existían o componente no encontrado)`);
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Eliminando tabla plantillas_pagina...');

  await knex.schema.dropTableIfExists('plantillas_pagina');

  console.log('✅ Tabla plantillas_pagina eliminada');
}
