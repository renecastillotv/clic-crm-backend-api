import { Knex } from 'knex';

/**
 * Migración: Crear tabla plantillas_pagina
 *
 * Sistema de plantillas/variantes visuales para tipos de página.
 * Permite tener múltiples diseños para un mismo tipo (ej: homepage_luxury, homepage_modern)
 * Cada plantilla define qué componentes usa y su configuración predeterminada.
 */
export async function up(knex: Knex): Promise<void> {
  // Crear tabla de plantillas de página
  const hasTable = await knex.schema.hasTable('plantillas_pagina');
  if (!hasTable) {
    await knex.schema.createTable('plantillas_pagina', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
      table.string('codigo', 100).notNullable().unique();
      table.string('tipo_pagina', 50).notNullable()
        .references('codigo').inTable('tipos_pagina')
        .onDelete('CASCADE');
      table.string('nombre', 200).notNullable();
      table.text('descripcion');
      table.string('preview_image', 500).comment('URL de imagen de preview');
      table.string('categoria', 50).comment('luxury, modern, classic, minimal, etc.');

      // Componentes que incluye esta plantilla
      table.jsonb('componentes').defaultTo('[]')
        .comment('Array de {componenteId, orden, configuracion}');

      // Configuración default para la página
      table.jsonb('configuracion_default').defaultTo('{}')
        .comment('Configuración predeterminada de la página');

      // Estilos/tema específico de la plantilla
      table.jsonb('estilos').defaultTo('{}')
        .comment('Variables CSS, colores, tipografía específica');

      // Control de acceso
      table.uuid('feature_requerido')
        .references('id').inTable('features')
        .onDelete('SET NULL')
        .comment('Feature requerido para usar esta plantilla');

      table.boolean('visible').defaultTo(true);
      table.boolean('featured').defaultTo(false);
      table.boolean('es_premium').defaultTo(false).comment('Solo para planes premium');
      table.integer('orden').defaultTo(100);

      // Auditoría
      table.timestamp('created_at').defaultTo(knex.fn.now());
      table.timestamp('updated_at').defaultTo(knex.fn.now());
    });

    console.log('✅ Tabla plantillas_pagina creada');
  }

  // Agregar campo plantilla_id a paginas_web para vincular con la plantilla usada
  const hasPaginasPlantilla = await knex.schema.hasColumn('paginas_web', 'plantilla_id');
  if (!hasPaginasPlantilla) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.uuid('plantilla_id')
        .references('id').inTable('plantillas_pagina')
        .onDelete('SET NULL')
        .comment('Plantilla visual usada para esta página');
    });
    console.log('✅ Campo plantilla_id agregado a paginas_web');
  }

  // Crear algunas plantillas de ejemplo
  const plantillasEjemplo = [
    // Homepage
    {
      codigo: 'homepage_luxury',
      tipo_pagina: 'homepage',
      nombre: 'Homepage Luxury',
      descripcion: 'Diseño elegante y sofisticado para inmobiliarias premium',
      categoria: 'luxury',
      componentes: JSON.stringify([
        { codigo: 'hero_fullscreen', orden: 1 },
        { codigo: 'propiedades_destacadas', orden: 2 },
        { codigo: 'servicios_luxury', orden: 3 },
        { codigo: 'testimonios_carousel', orden: 4 },
        { codigo: 'contacto_elegante', orden: 5 }
      ]),
      visible: true,
      featured: true,
      es_premium: true,
      orden: 1
    },
    {
      codigo: 'homepage_modern',
      tipo_pagina: 'homepage',
      nombre: 'Homepage Moderna',
      descripcion: 'Diseño minimalista y contemporáneo',
      categoria: 'modern',
      componentes: JSON.stringify([
        { codigo: 'hero_split', orden: 1 },
        { codigo: 'buscador_propiedades', orden: 2 },
        { codigo: 'propiedades_grid', orden: 3 },
        { codigo: 'estadisticas', orden: 4 },
        { codigo: 'cta_section', orden: 5 }
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 2
    },
    {
      codigo: 'homepage_classic',
      tipo_pagina: 'homepage',
      nombre: 'Homepage Clásica',
      descripcion: 'Diseño tradicional y profesional',
      categoria: 'classic',
      componentes: JSON.stringify([
        { codigo: 'hero_slider', orden: 1 },
        { codigo: 'propiedades_carousel', orden: 2 },
        { codigo: 'sobre_nosotros', orden: 3 },
        { codigo: 'equipo', orden: 4 },
        { codigo: 'contacto_simple', orden: 5 }
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 3
    },
    // Blog
    {
      codigo: 'blog_magazine',
      tipo_pagina: 'blog',
      nombre: 'Blog Estilo Magazine',
      descripcion: 'Layout tipo revista con artículos destacados',
      categoria: 'magazine',
      componentes: JSON.stringify([
        { codigo: 'articulo_destacado', orden: 1 },
        { codigo: 'articulos_grid', orden: 2 },
        { codigo: 'categorias_sidebar', orden: 3 }
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1
    },
    {
      codigo: 'blog_minimal',
      tipo_pagina: 'blog',
      nombre: 'Blog Minimalista',
      descripcion: 'Diseño limpio y enfocado en contenido',
      categoria: 'minimal',
      componentes: JSON.stringify([
        { codigo: 'articulos_lista', orden: 1 },
        { codigo: 'paginacion', orden: 2 }
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 2
    },
    // Contacto
    {
      codigo: 'contacto_completo',
      tipo_pagina: 'contacto',
      nombre: 'Contacto Completo',
      descripcion: 'Formulario con mapa, horarios y múltiples canales',
      categoria: 'complete',
      componentes: JSON.stringify([
        { codigo: 'mapa_ubicacion', orden: 1 },
        { codigo: 'formulario_contacto', orden: 2 },
        { codigo: 'info_contacto', orden: 3 },
        { codigo: 'horarios_atencion', orden: 4 }
      ]),
      visible: true,
      featured: true,
      es_premium: false,
      orden: 1
    },
    {
      codigo: 'contacto_simple',
      tipo_pagina: 'contacto',
      nombre: 'Contacto Simple',
      descripcion: 'Formulario básico y directo',
      categoria: 'simple',
      componentes: JSON.stringify([
        { codigo: 'formulario_contacto', orden: 1 },
        { codigo: 'info_contacto_basica', orden: 2 }
      ]),
      visible: true,
      featured: false,
      es_premium: false,
      orden: 2
    }
  ];

  for (const plantilla of plantillasEjemplo) {
    // Verificar que el tipo_pagina existe
    const tipoExiste = await knex('tipos_pagina').where('codigo', plantilla.tipo_pagina).first();
    if (tipoExiste) {
      const existe = await knex('plantillas_pagina').where('codigo', plantilla.codigo).first();
      if (!existe) {
        await knex('plantillas_pagina').insert(plantilla);
        console.log(`  ✓ Plantilla ${plantilla.codigo} creada`);
      }
    }
  }

  console.log('✅ Plantillas de ejemplo creadas');
}

export async function down(knex: Knex): Promise<void> {
  // Remover campo plantilla_id de paginas_web
  const hasColumn = await knex.schema.hasColumn('paginas_web', 'plantilla_id');
  if (hasColumn) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.dropColumn('plantilla_id');
    });
  }

  // Eliminar tabla plantillas_pagina
  await knex.schema.dropTableIfExists('plantillas_pagina');
  console.log('✅ Tabla plantillas_pagina eliminada');
}
