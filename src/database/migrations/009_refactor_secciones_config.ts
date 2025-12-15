import { Knex } from 'knex';

/**
 * Migración - Refactorizar para Configuración de Secciones por Tenant
 *
 * Este cambio implementa:
 * 1. Configuración de secciones a nivel de tenant (header, footer, property_card, etc.)
 * 2. Herencia: las páginas heredan la config del tenant
 * 3. Excepciones: páginas específicas pueden sobrescribir
 *
 * Nuevo enfoque:
 * - componentes_web con scope='tenant' son las configuraciones por defecto
 * - componentes_web con scope='page' son excepciones para páginas específicas
 * - componentes_web con scope='page_type' son excepciones para tipos de página (single_property, etc.)
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar columna 'scope' para diferenciar configuración global vs específica
  await knex.schema.alterTable('componentes_web', (table) => {
    table.string('scope', 20).defaultTo('tenant').comment('Alcance: tenant (global), page_type (por tipo), page (específica)');
    table.string('tipo_pagina', 50).nullable().comment('Tipo de página para scope=page_type (ej: single_property, property_list)');
  });

  // 2. Agregar índices para el nuevo enfoque
  await knex.raw(`
    CREATE INDEX IF NOT EXISTS idx_componentes_web_scope ON componentes_web(tenant_id, scope);
    CREATE INDEX IF NOT EXISTS idx_componentes_web_tipo_pagina ON componentes_web(tenant_id, tipo_pagina) WHERE tipo_pagina IS NOT NULL;
  `);

  // 3. Migrar datos existentes:
  // - Componentes sin pagina_id -> scope = 'tenant' (configuración global)
  // - Componentes con pagina_id -> scope = 'page' (excepción por página)
  await knex.raw(`
    UPDATE componentes_web
    SET scope = CASE
      WHEN pagina_id IS NULL THEN 'tenant'
      ELSE 'page'
    END
    WHERE scope IS NULL OR scope = 'tenant'
  `);

  // 4. Crear tabla de catálogo de componentes disponibles (opcional - para UI)
  await knex.schema.createTable('catalogo_componentes', (table) => {
    table.string('tipo', 50).primary().comment('Tipo de componente');
    table.string('nombre', 100).notNullable().comment('Nombre legible');
    table.string('descripcion', 255).nullable();
    table.string('icono', 10).nullable().comment('Emoji o icono');
    table.string('categoria', 50).notNullable().comment('layout, content, display, forms, etc.');
    table.jsonb('variantes').notNullable().defaultTo('["default"]').comment('Array de variantes disponibles');
    table.jsonb('campos_config').notNullable().defaultTo('[]').comment('Campos configurables del componente');
    table.boolean('es_global').defaultTo(false).comment('Si es un componente global (header, footer)');
    table.boolean('disponible').defaultTo(true).comment('Si está disponible para uso');
    table.integer('orden').defaultTo(0);
  });

  // 5. Insertar catálogo inicial de componentes
  await knex('catalogo_componentes').insert([
    // Layout (globales)
    {
      tipo: 'header',
      nombre: 'Header / Navegación',
      descripcion: 'Barra de navegación superior',
      icono: '🔝',
      categoria: 'layout',
      variantes: JSON.stringify(['default', 'minimal', 'centered', 'transparent']),
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image' },
        { key: 'links', label: 'Enlaces', type: 'array' },
        { key: 'mostrarBotonContacto', label: 'Mostrar botón contacto', type: 'boolean', default: true },
      ]),
      es_global: true,
      orden: 1,
    },
    {
      tipo: 'footer',
      nombre: 'Footer / Pie de página',
      descripcion: 'Pie de página con información de contacto',
      icono: '🔻',
      categoria: 'layout',
      variantes: JSON.stringify(['default', 'simple', 'extended', 'minimal']),
      campos_config: JSON.stringify([
        { key: 'copyright', label: 'Texto copyright', type: 'text' },
        { key: 'redesSociales', label: 'Redes sociales', type: 'array' },
        { key: 'columnas', label: 'Columnas de enlaces', type: 'array' },
      ]),
      es_global: true,
      orden: 2,
    },
    // Content
    {
      tipo: 'hero',
      nombre: 'Hero / Banner principal',
      descripcion: 'Sección principal con imagen y CTA',
      icono: '🎯',
      categoria: 'content',
      variantes: JSON.stringify(['default', 'variant1', 'variant2', 'variant3', 'video', 'slider']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text' },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text' },
        { key: 'urlBoton', label: 'URL del botón', type: 'text' },
        { key: 'imagenFondo', label: 'Imagen de fondo', type: 'image' },
      ]),
      es_global: false,
      orden: 3,
    },
    {
      tipo: 'cta',
      nombre: 'Call to Action',
      descripcion: 'Sección de llamada a la acción',
      icono: '📢',
      categoria: 'content',
      variantes: JSON.stringify(['default', 'centered', 'split', 'with-image']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'descripcion', label: 'Descripción', type: 'textarea' },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text' },
        { key: 'urlBoton', label: 'URL del botón', type: 'text' },
      ]),
      es_global: false,
      orden: 4,
    },
    {
      tipo: 'features',
      nombre: 'Características',
      descripcion: 'Lista de características o servicios',
      icono: '✨',
      categoria: 'content',
      variantes: JSON.stringify(['default', 'grid', 'list', 'icons']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título de sección', type: 'text' },
        { key: 'items', label: 'Características', type: 'array' },
      ]),
      es_global: false,
      orden: 5,
    },
    {
      tipo: 'testimonials',
      nombre: 'Testimonios',
      descripcion: 'Testimonios de clientes',
      icono: '💬',
      categoria: 'content',
      variantes: JSON.stringify(['default', 'carousel', 'grid', 'quotes']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
      ]),
      es_global: false,
      orden: 6,
    },
    // Display - Propiedades
    {
      tipo: 'property_list',
      nombre: 'Listado de Propiedades',
      descripcion: 'Grid de propiedades con filtros',
      icono: '🏠',
      categoria: 'display',
      variantes: JSON.stringify(['default', 'grid', 'list', 'map']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'itemsPorPagina', label: 'Items por página', type: 'number', default: 12 },
        { key: 'mostrarFiltros', label: 'Mostrar filtros', type: 'boolean', default: true },
      ]),
      es_global: false,
      orden: 7,
    },
    {
      tipo: 'property_card',
      nombre: 'Tarjeta de Propiedad',
      descripcion: 'Estilo de tarjeta para mostrar propiedades',
      icono: '🏡',
      categoria: 'display',
      variantes: JSON.stringify(['default', 'compact', 'featured', 'horizontal', 'minimal']),
      campos_config: JSON.stringify([
        { key: 'mostrarPrecio', label: 'Mostrar precio', type: 'boolean', default: true },
        { key: 'mostrarUbicacion', label: 'Mostrar ubicación', type: 'boolean', default: true },
        { key: 'mostrarCaracteristicas', label: 'Mostrar características', type: 'boolean', default: true },
      ]),
      es_global: false,
      orden: 8,
    },
    {
      tipo: 'property_detail',
      nombre: 'Detalle de Propiedad',
      descripcion: 'Página de detalle de una propiedad',
      icono: '📋',
      categoria: 'display',
      variantes: JSON.stringify(['default', 'gallery-top', 'sidebar', 'fullwidth']),
      campos_config: JSON.stringify([
        { key: 'mostrarMapa', label: 'Mostrar mapa', type: 'boolean', default: true },
        { key: 'mostrarFormContacto', label: 'Mostrar formulario', type: 'boolean', default: true },
        { key: 'mostrarPropiedadesSimilares', label: 'Propiedades similares', type: 'boolean', default: true },
      ]),
      es_global: false,
      orden: 9,
    },
    // Forms
    {
      tipo: 'contact_form',
      nombre: 'Formulario de Contacto',
      descripcion: 'Formulario para contactar',
      icono: '📧',
      categoria: 'forms',
      variantes: JSON.stringify(['default', 'inline', 'modal', 'sidebar']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text', default: 'Enviar' },
        { key: 'emailDestino', label: 'Email destino', type: 'email' },
      ]),
      es_global: false,
      orden: 10,
    },
    {
      tipo: 'search_bar',
      nombre: 'Barra de Búsqueda',
      descripcion: 'Barra para buscar propiedades',
      icono: '🔍',
      categoria: 'forms',
      variantes: JSON.stringify(['default', 'expanded', 'minimal', 'floating']),
      campos_config: JSON.stringify([
        { key: 'placeholder', label: 'Placeholder', type: 'text' },
        { key: 'mostrarFiltrosAvanzados', label: 'Filtros avanzados', type: 'boolean', default: false },
      ]),
      es_global: false,
      orden: 11,
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar catálogo
  await knex.schema.dropTableIfExists('catalogo_componentes');

  // Eliminar columnas agregadas
  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropColumn('scope');
    table.dropColumn('tipo_pagina');
  });
}
