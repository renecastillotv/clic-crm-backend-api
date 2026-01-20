import { Knex } from 'knex';

/**
 * Migración 126: Agregar plantillas faltantes para tipos de página
 *
 * Agrega plantillas para:
 * - listados_propiedades (el listado de propiedades)
 * - directorio_articulos (el listado de artículos)
 *
 * Estas plantillas permiten que las páginas funcionen como fallback
 * cuando un tenant no tiene componentes personalizados.
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Agregando plantillas faltantes...\n');

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
    // Tomar el primero de cada tipo
    if (!componentesMap[c.tipo]) {
      componentesMap[c.tipo] = c.id;
    }
  }

  // 3. Definir plantillas faltantes (usando tipos que existen en BD)
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
    // PROPIEDADES LISTADO
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
    // ARTICULOS LISTADO
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
    // VIDEOS LISTADO
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

    for (const comp of plantilla.componentes) {
      const componenteId = componentesMap[comp.tipo];

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
        console.log(`    ✅ ${plantilla.tipoPagina} -> ${comp.tipo}`);
      } else {
        console.log(`    ⏭️  ${plantilla.tipoPagina} -> ${comp.tipo} (ya existe)`);
      }
    }
  }

  console.log(`\n✅ Migración completada:`);
  console.log(`   - ${insertCount} plantillas insertadas`);
  console.log(`   - ${skipCount} omitidas`);
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Eliminando plantillas agregadas...');

  // Obtener IDs de tipos_pagina
  const tiposPagina = await knex('tipos_pagina')
    .whereIn('codigo', ['propiedades_listado', 'articulos_listado', 'videos_listado'])
    .select('id');

  const tipoPaginaIds = tiposPagina.map(tp => tp.id);

  if (tipoPaginaIds.length > 0) {
    const deleted = await knex('plantillas_pagina')
      .whereIn('tipo_pagina_id', tipoPaginaIds)
      .del();

    console.log(`✅ ${deleted} plantillas eliminadas`);
  }
}
