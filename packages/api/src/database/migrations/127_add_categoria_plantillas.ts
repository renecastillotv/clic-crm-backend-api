import { Knex } from 'knex';

/**
 * Migración 127: Agregar plantillas para páginas de categorías
 *
 * Agrega plantillas para:
 * - videos_categoria
 * - articulos_categoria
 * - testimonios_categoria
 * - ubicaciones_single
 * - tipos_propiedades_single
 * - single_proyecto
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Agregando plantillas de categorías y singles faltantes...\n');

  // 1. Obtener IDs de tipos_pagina
  const tiposPagina = await knex('tipos_pagina').select('id', 'codigo');
  const tiposPaginaMap: Record<string, string> = {};
  for (const tp of tiposPagina) {
    tiposPaginaMap[tp.codigo] = tp.id;
  }

  // 2. Obtener IDs de catalogo_componentes
  const componentes = await knex('catalogo_componentes').select('id', 'tipo');
  const componentesMap: Record<string, string> = {};
  for (const c of componentes) {
    if (!componentesMap[c.tipo]) {
      componentesMap[c.tipo] = c.id;
    }
  }

  // 3. Definir plantillas faltantes
  const plantillasFaltantes: Array<{
    tipoPagina: string;
    componentes: Array<{
      tipo: string;
      orden: number;
      esGlobal?: boolean;
      datosDefault?: Record<string, any>;
    }>;
  }> = [
    // ========================================
    // VIDEOS CATEGORÍA
    // ========================================
    {
      tipoPagina: 'videos_categoria',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Videos por Categoría',
              subtitulo: 'Explora nuestros videos organizados por tema'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'videos_por_categoria'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // ARTÍCULOS CATEGORÍA
    // ========================================
    {
      tipoPagina: 'articulos_categoria',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Artículos por Categoría',
              subtitulo: 'Explora nuestro contenido organizado por tema'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'articulos_por_categoria'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // TESTIMONIOS CATEGORÍA
    // ========================================
    {
      tipoPagina: 'testimonios_categoria',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Testimonios por Categoría',
              subtitulo: 'Lo que dicen nuestros clientes'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'testimonios_por_categoria'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // UBICACIONES SINGLE
    // ========================================
    {
      tipoPagina: 'ubicaciones_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Propiedades en esta Ubicación',
              subtitulo: 'Descubre las mejores opciones'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'ubicacion_detalle'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // TIPOS PROPIEDADES SINGLE
    // ========================================
    {
      tipoPagina: 'tipos_propiedades_single',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'hero',
          orden: 1,
          datosDefault: {
            static_data: {
              titulo: 'Propiedades por Tipo',
              subtitulo: 'Encuentra el tipo de propiedad que buscas'
            }
          }
        },
        {
          tipo: 'content',
          orden: 2,
          datosDefault: {
            dynamic_data: {
              dataType: 'tipo_propiedad_detalle'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    },

    // ========================================
    // SINGLE PROYECTO
    // ========================================
    {
      tipoPagina: 'single_proyecto',
      componentes: [
        { tipo: 'header', orden: 0, esGlobal: true },
        {
          tipo: 'content',
          orden: 1,
          datosDefault: {
            dynamic_data: {
              dataType: 'proyecto_detalle'
            }
          }
        },
        { tipo: 'footer', orden: 999, esGlobal: true }
      ]
    }
  ];

  // 4. Insertar plantillas
  let insertCount = 0;
  let skipCount = 0;

  for (const plantilla of plantillasFaltantes) {
    const tipoPaginaId = tiposPaginaMap[plantilla.tipoPagina];

    if (!tipoPaginaId) {
      console.log(`  ⚠️  Tipo de página no encontrado: ${plantilla.tipoPagina}`);
      skipCount++;
      continue;
    }

    console.log(`\n📄 ${plantilla.tipoPagina}:`);

    for (const comp of plantilla.componentes) {
      const componenteId = componentesMap[comp.tipo];

      if (!componenteId) {
        console.log(`    ⚠️  Componente no encontrado en catálogo: ${comp.tipo}`);
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
        console.log(`    ✅ ${comp.tipo} (orden: ${comp.orden})`);
      } else {
        console.log(`    ⏭️  ${comp.tipo} (ya existe)`);
      }
    }
  }

  console.log(`\n✅ Migración completada:`);
  console.log(`   - ${insertCount} plantillas insertadas`);
  console.log(`   - ${skipCount} omitidas`);
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Eliminando plantillas de categorías...');

  const tiposToDelete = [
    'videos_categoria',
    'articulos_categoria',
    'testimonios_categoria',
    'ubicaciones_single',
    'tipos_propiedades_single',
    'single_proyecto'
  ];

  const tiposPagina = await knex('tipos_pagina')
    .whereIn('codigo', tiposToDelete)
    .select('id');

  const tipoPaginaIds = tiposPagina.map(tp => tp.id);

  if (tipoPaginaIds.length > 0) {
    const deleted = await knex('plantillas_pagina')
      .whereIn('tipo_pagina_id', tipoPaginaIds)
      .del();

    console.log(`✅ ${deleted} plantillas eliminadas`);
  }
}
