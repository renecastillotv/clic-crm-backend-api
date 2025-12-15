import { Knex } from 'knex';

/**
 * Migración - Configuración independiente por variante
 *
 * Cambios:
 * 1. Actualizar catálogo a SOLO variantes implementadas
 * 2. Permitir guardar config independiente por variante (no por tipo)
 * 3. Agregar campo 'es_activo' para marcar qué variante está activa
 * 4. Agregar descripcion por variante para la UI
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar columna 'es_activo' para marcar la variante activa por tipo
  // y 'config_completa' para indicar si tiene todos los campos requeridos
  const hasEsActivo = await knex.schema.hasColumn('componentes_web', 'es_activo');
  if (!hasEsActivo) {
    await knex.schema.alterTable('componentes_web', (table) => {
      table.boolean('es_activo').defaultTo(false).comment('Si esta variante es la activa para este tipo');
      table.boolean('config_completa').defaultTo(false).comment('Si la configuración está completa');
    });
  }

  // 2. Eliminar constraint único de (tenant_id, tipo, pagina_id) si existe
  // Ahora permitimos múltiples registros: uno por variante
  await knex.raw(`
    DROP INDEX IF EXISTS idx_componentes_web_tenant_tipo;
  `);

  // 3. LIMPIAR DUPLICADOS antes de crear índice único
  // Mantener solo el registro más reciente de cada combinación (usando ctid)
  await knex.raw(`
    DELETE FROM componentes_web a
    WHERE a.ctid NOT IN (
      SELECT MIN(b.ctid)
      FROM componentes_web b
      GROUP BY b.tenant_id, b.tipo, b.variante, b.scope, b.pagina_id
    )
  `);

  // 4. Crear nuevo índice único para (tenant_id, tipo, variante, scope, pagina_id)
  await knex.raw(`
    DROP INDEX IF EXISTS idx_componentes_web_variante_unica;
  `);
  await knex.raw(`
    CREATE UNIQUE INDEX idx_componentes_web_variante_unica
    ON componentes_web(tenant_id, tipo, variante, scope, COALESCE(pagina_id, '00000000-0000-0000-0000-000000000000'));
  `);

  // 4. Actualizar catálogo con SOLO variantes implementadas
  // Basado en ComponentRenderer.astro

  // Header - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'header')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Clásico', descripcion: 'Logo a la izquierda, navegación centrada, botón CTA a la derecha' }
      ]),
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image', required: true },
        { key: 'logoAlt', label: 'Texto alternativo del logo', type: 'text', required: false },
        { key: 'links', label: 'Enlaces de navegación', type: 'array', required: false },
        { key: 'mostrarBotonContacto', label: 'Mostrar botón contacto', type: 'boolean', default: true },
        { key: 'textoBotonContacto', label: 'Texto del botón', type: 'text', default: 'Contactar' },
        { key: 'urlBotonContacto', label: 'URL del botón', type: 'text', default: '/contacto' },
      ]),
    });

  // Footer - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'footer')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Completo', descripcion: 'Footer con logo, columnas de enlaces, redes sociales y copyright' }
      ]),
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image', required: false },
        { key: 'descripcion', label: 'Descripción de la empresa', type: 'textarea', required: false },
        { key: 'copyright', label: 'Texto copyright', type: 'text', required: true },
        { key: 'columnas', label: 'Columnas de enlaces', type: 'array', required: false },
        { key: 'redesSociales', label: 'Redes sociales', type: 'array', required: false },
        { key: 'direccion', label: 'Dirección', type: 'text', required: false },
        { key: 'telefono', label: 'Teléfono', type: 'text', required: false },
        { key: 'email', label: 'Email', type: 'email', required: false },
      ]),
    });

  // Hero - 4 variantes implementadas
  await knex('catalogo_componentes')
    .where('tipo', 'hero')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Centrado', descripcion: 'Imagen de fondo con texto centrado y botones CTA' },
        { id: 'variant1', nombre: 'Dividido', descripcion: 'Texto a la izquierda, imagen a la derecha' },
        { id: 'variant2', nombre: 'Con búsqueda', descripcion: 'Hero con barra de búsqueda integrada' },
        { id: 'variant3', nombre: 'Lateral', descripcion: 'Imagen de fondo con texto alineado a la izquierda' },
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: true },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text', required: false },
        { key: 'urlBoton', label: 'URL del botón', type: 'text', required: false },
        { key: 'textoBoton2', label: 'Texto botón secundario', type: 'text', required: false },
        { key: 'urlBoton2', label: 'URL botón secundario', type: 'text', required: false },
        { key: 'imagenFondo', label: 'Imagen de fondo', type: 'image', required: true },
        { key: 'imagenLateral', label: 'Imagen lateral (variant1)', type: 'image', required: false },
      ]),
    });

  // CTA - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'cta')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Estándar', descripcion: 'Sección con fondo de color, título, descripción y botón' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: true },
        { key: 'descripcion', label: 'Descripción', type: 'textarea', required: false },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text', required: true },
        { key: 'urlBoton', label: 'URL del botón', type: 'text', required: true },
        { key: 'colorFondo', label: 'Color de fondo', type: 'color', required: false },
      ]),
    });

  // Features - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'features')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Grid', descripcion: 'Características en grid con iconos' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título de sección', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'items', label: 'Características', type: 'array', required: true },
      ]),
    });

  // Testimonials - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'testimonials')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Carrusel', descripcion: 'Testimonios en carrusel con fotos y citas' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'testimonios', label: 'Testimonios', type: 'array', required: true },
      ]),
    });

  // Property List - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'property_list')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Grid', descripcion: 'Listado de propiedades en grid con paginación' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'itemsPorPagina', label: 'Items por página', type: 'number', default: 12, required: false },
        { key: 'mostrarFiltros', label: 'Mostrar filtros', type: 'boolean', default: true },
      ]),
    });

  // Property Card - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'property_card')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Vertical', descripcion: 'Tarjeta vertical con imagen, precio y características' }
      ]),
      campos_config: JSON.stringify([
        { key: 'mostrarPrecio', label: 'Mostrar precio', type: 'boolean', default: true },
        { key: 'mostrarUbicacion', label: 'Mostrar ubicación', type: 'boolean', default: true },
        { key: 'mostrarCaracteristicas', label: 'Mostrar características', type: 'boolean', default: true },
        { key: 'mostrarFavoritos', label: 'Botón favoritos', type: 'boolean', default: false },
      ]),
    });

  // Property Detail - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'property_detail')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Completo', descripcion: 'Galería, descripción, características y formulario de contacto' }
      ]),
      campos_config: JSON.stringify([
        { key: 'mostrarMapa', label: 'Mostrar mapa', type: 'boolean', default: true },
        { key: 'mostrarFormContacto', label: 'Mostrar formulario', type: 'boolean', default: true },
        { key: 'mostrarPropiedadesSimilares', label: 'Propiedades similares', type: 'boolean', default: true },
        { key: 'mostrarAgente', label: 'Mostrar info del agente', type: 'boolean', default: true },
      ]),
    });

  // Contact Form - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'contact_form')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Estándar', descripcion: 'Formulario con nombre, email, teléfono y mensaje' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text', default: 'Enviar' },
        { key: 'emailDestino', label: 'Email destino', type: 'email', required: true },
        { key: 'mostrarTelefono', label: 'Campo teléfono', type: 'boolean', default: true },
        { key: 'mensajeExito', label: 'Mensaje de éxito', type: 'text', default: '¡Mensaje enviado!' },
      ]),
    });

  // Search Bar - solo 'default' implementado
  await knex('catalogo_componentes')
    .where('tipo', 'search_bar')
    .update({
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Completa', descripcion: 'Barra de búsqueda con filtros de tipo, ubicación y precio' }
      ]),
      campos_config: JSON.stringify([
        { key: 'placeholder', label: 'Placeholder', type: 'text', default: 'Buscar propiedades...' },
        { key: 'mostrarTipoOperacion', label: 'Filtro tipo operación', type: 'boolean', default: true },
        { key: 'mostrarUbicacion', label: 'Filtro ubicación', type: 'boolean', default: true },
        { key: 'mostrarPrecio', label: 'Filtro precio', type: 'boolean', default: true },
      ]),
    });

  // Agregar Filter Panel y Blog List si existen
  const filterPanelExists = await knex('catalogo_componentes').where('tipo', 'filter_panel').first();
  if (!filterPanelExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'filter_panel',
      nombre: 'Panel de Filtros',
      descripcion: 'Panel lateral con filtros avanzados',
      icono: '🔧',
      categoria: 'forms',
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Lateral', descripcion: 'Panel de filtros desplegable a la izquierda' }
      ]),
      campos_config: JSON.stringify([
        { key: 'mostrarTipoPropiedad', label: 'Filtro tipo', type: 'boolean', default: true },
        { key: 'mostrarPrecio', label: 'Filtro precio', type: 'boolean', default: true },
        { key: 'mostrarHabitaciones', label: 'Filtro habitaciones', type: 'boolean', default: true },
        { key: 'mostrarSuperficie', label: 'Filtro superficie', type: 'boolean', default: true },
      ]),
      es_global: false,
      orden: 12,
    });
  } else {
    await knex('catalogo_componentes')
      .where('tipo', 'filter_panel')
      .update({
        variantes: JSON.stringify([
          { id: 'default', nombre: 'Lateral', descripcion: 'Panel de filtros desplegable a la izquierda' }
        ]),
      });
  }

  const blogListExists = await knex('catalogo_componentes').where('tipo', 'blog_list').first();
  if (!blogListExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'blog_list',
      nombre: 'Listado de Blog',
      descripcion: 'Lista de artículos del blog',
      icono: '📰',
      categoria: 'display',
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Grid', descripcion: 'Artículos en grid con imagen y extracto' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'itemsPorPagina', label: 'Items por página', type: 'number', default: 9 },
        { key: 'mostrarFecha', label: 'Mostrar fecha', type: 'boolean', default: true },
        { key: 'mostrarAutor', label: 'Mostrar autor', type: 'boolean', default: true },
      ]),
      es_global: false,
      orden: 10,
    });
  } else {
    await knex('catalogo_componentes')
      .where('tipo', 'blog_list')
      .update({
        variantes: JSON.stringify([
          { id: 'default', nombre: 'Grid', descripcion: 'Artículos en grid con imagen y extracto' }
        ]),
      });
  }

  // Pagination
  const paginationExists = await knex('catalogo_componentes').where('tipo', 'pagination').first();
  if (!paginationExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'pagination',
      nombre: 'Paginación',
      descripcion: 'Controles de paginación',
      icono: '📄',
      categoria: 'display',
      variantes: JSON.stringify([
        { id: 'default', nombre: 'Numérica', descripcion: 'Paginación con números de página' }
      ]),
      campos_config: JSON.stringify([
        { key: 'itemsPorPagina', label: 'Items por página', type: 'number', default: 12 },
        { key: 'mostrarTotal', label: 'Mostrar total', type: 'boolean', default: true },
      ]),
      es_global: false,
      orden: 11,
    });
  } else {
    await knex('catalogo_componentes')
      .where('tipo', 'pagination')
      .update({
        variantes: JSON.stringify([
          { id: 'default', nombre: 'Numérica', descripcion: 'Paginación con números de página' }
        ]),
      });
  }

  // 5. Marcar componentes existentes como 'es_activo' si son el único de su tipo
  await knex.raw(`
    UPDATE componentes_web cw1
    SET es_activo = true
    WHERE NOT EXISTS (
      SELECT 1 FROM componentes_web cw2
      WHERE cw2.tenant_id = cw1.tenant_id
      AND cw2.tipo = cw1.tipo
      AND cw2.scope = cw1.scope
      AND cw2.id != cw1.id
    )
  `);
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar nuevas columnas
  await knex.schema.alterTable('componentes_web', (table) => {
    table.dropColumn('es_activo');
    table.dropColumn('config_completa');
  });

  // Restaurar índice anterior (si es necesario)
  await knex.raw(`
    DROP INDEX IF EXISTS idx_componentes_web_variante_unica;
  `);

  // Restaurar variantes originales del catálogo
  // (esto es una simplificación - en producción sería más cuidadoso)
  await knex('catalogo_componentes')
    .update({
      variantes: JSON.stringify(['default']),
    });
}
