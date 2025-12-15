import { Knex } from 'knex';

/**
 * Migración: Crear Feature "CLIC Premium Variants" y agregar variantes exclusivas
 * 
 * Esta migración:
 * 1. Crea el feature "CLIC Premium Variants"
 * 2. Agrega nuevas variantes al catálogo de componentes (marcadas como exclusivas del feature)
 * 3. Las variantes solo estarán disponibles para tenants que tengan el feature habilitado
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Crear el feature "CLIC Premium Variants"
  const featureId = await knex('features').insert({
    name: 'CLIC Premium Variants',
    description: 'Desbloquea variantes exclusivas de componentes diseñadas específicamente para CLIC Inmobiliaria',
    icon: 'sparkles',
    category: 'addon',
    is_public: false,
    is_premium: true,
    available_in_plans: JSON.stringify(['premium', 'enterprise']),
    created_at: knex.fn.now(),
    updated_at: knex.fn.now(),
  }).returning('id').then(rows => rows[0]?.id);

  // 2. Agregar nuevos componentes y variantes al catálogo
  // Nota: Solo agregamos los que no existen aún, los existentes los actualizamos

  // Property Carousel - Nuevo componente
  const propertyCarouselExists = await knex('catalogo_componentes')
    .where('tipo', 'property_carousel')
    .first();

  if (!propertyCarouselExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'property_carousel',
      nombre: 'Carrusel de Propiedades',
      descripcion: 'Carrusel de propiedades destacadas con navegación',
      icono: 'img',
      categoria: 'display',
      variantes: JSON.stringify([
        { id: 'clic', nombre: 'CLIC Premium', descripcion: 'Carrusel premium con temas luxury/investment', requiresFeature: 'clic_premium_variants' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'theme', label: 'Tema', type: 'select', required: false, default: 'luxury', options: ['default', 'luxury', 'investment'] },
        { key: 'viewAllLink', label: 'URL Ver Todas', type: 'text', required: false },
      ]),
      es_global: false,
      disponible: true,
      orden: 50,
    });
  } else {
    // Agregar variante CLIC si no existe
    const variantesRaw = propertyCarouselExists.variantes;
    const existingVariantes = typeof variantesRaw === 'string' ? JSON.parse(variantesRaw) : (variantesRaw || []);
    const hasClicVariant = existingVariantes.some((v: any) => v.id === 'clic');
    if (!hasClicVariant) {
      existingVariantes.push({
        id: 'clic',
        nombre: 'CLIC Premium',
        descripcion: 'Carrusel premium con temas luxury/investment',
        requiresFeature: 'clic_premium_variants'
      });
      await knex('catalogo_componentes')
        .where('tipo', 'property_carousel')
        .update({ variantes: JSON.stringify(existingVariantes) });
    }
  }

  // Video Gallery - Nuevo componente
  const videoGalleryExists = await knex('catalogo_componentes')
    .where('tipo', 'video_gallery')
    .first();

  if (!videoGalleryExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'video_gallery',
      nombre: 'Galería de Videos',
      descripcion: 'Galería de videos con estadísticas y badges',
      icono: 'vid',
      categoria: 'content',
      variantes: JSON.stringify([
        { id: 'clic', nombre: 'CLIC Premium', descripcion: 'Galería de videos con estadísticas y badges exclusivos', requiresFeature: 'clic_premium_variants' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'layout', label: 'Layout', type: 'select', required: false, default: 'grid', options: ['grid', 'carousel', 'featured'] },
        { key: 'mostrarEstadisticas', label: 'Mostrar Estadísticas', type: 'boolean', default: true },
        { key: 'mostrarBadges', label: 'Mostrar Badges', type: 'boolean', default: true },
      ]),
      es_global: false,
      disponible: true,
      orden: 51,
    });
  }

  // Related Articles - Nuevo componente
  const relatedArticlesExists = await knex('catalogo_componentes')
    .where('tipo', 'related_articles')
    .first();

  if (!relatedArticlesExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'related_articles',
      nombre: 'Artículos Relacionados',
      descripcion: 'Listado de artículos relacionados con diseño avanzado',
      icono: 'doc',
      categoria: 'content',
      variantes: JSON.stringify([
        { id: 'clic', nombre: 'CLIC Premium', descripcion: 'Artículos relacionados con diseño avanzado y estadísticas', requiresFeature: 'clic_premium_variants' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'layout', label: 'Layout', type: 'select', required: false, default: 'featured', options: ['grid', 'featured'] },
        { key: 'mostrarAutor', label: 'Mostrar Autor', type: 'boolean', default: true },
        { key: 'mostrarFecha', label: 'Mostrar Fecha', type: 'boolean', default: true },
      ]),
      es_global: false,
      disponible: true,
      orden: 52,
    });
  }

  // Popular Locations - Nuevo componente
  const popularLocationsExists = await knex('catalogo_componentes')
    .where('tipo', 'popular_locations')
    .first();

  if (!popularLocationsExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'popular_locations',
      nombre: 'Ubicaciones Populares',
      descripcion: 'Ubicaciones populares estilo valla publicitaria',
      icono: 'map',
      categoria: 'display',
      variantes: JSON.stringify([
        { id: 'clic', nombre: 'CLIC Premium', descripcion: 'Ubicaciones populares con diseño premium y badges', requiresFeature: 'clic_premium_variants' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text', required: false },
        { key: 'showType', label: 'Tipo de Visualización', type: 'select', required: false, default: 'mixed', options: ['cities', 'sectors', 'mixed'] },
        { key: 'showBadges', label: 'Mostrar Badges', type: 'boolean', default: true },
        { key: 'maxItems', label: 'Máximo de Items', type: 'number', default: 12 },
      ]),
      es_global: false,
      disponible: true,
      orden: 53,
    });
  }

  // Dynamic FAQs - Nuevo componente
  const dynamicFaqsExists = await knex('catalogo_componentes')
    .where('tipo', 'dynamic_faqs')
    .first();

  if (!dynamicFaqsExists) {
    await knex('catalogo_componentes').insert({
      tipo: 'dynamic_faqs',
      nombre: 'FAQs Dinámicos',
      descripcion: 'Preguntas frecuentes dinámicas con contexto',
      icono: 'help',
      categoria: 'content',
      variantes: JSON.stringify([
        { id: 'clic', nombre: 'CLIC Premium', descripcion: 'FAQs dinámicos con contexto y categorías', requiresFeature: 'clic_premium_variants' }
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text', required: false },
        { key: 'context', label: 'Contexto', type: 'json', required: false },
      ]),
      es_global: false,
      disponible: true,
      orden: 54,
    });
  }

  // Testimonials - Agregar variante CLIC a componente existente
  const testimonialsExists = await knex('catalogo_componentes')
    .where('tipo', 'testimonials')
    .first();

  if (testimonialsExists) {
    const variantesRaw = testimonialsExists.variantes;
    const existingVariantes = typeof variantesRaw === 'string' ? JSON.parse(variantesRaw) : (variantesRaw || []);
    const hasClicVariant = existingVariantes.some((v: any) => v.id === 'clic');
    if (!hasClicVariant) {
      existingVariantes.push({
        id: 'clic',
        nombre: 'CLIC Premium',
        descripcion: 'Testimonios con información detallada de clientes, rating y ubicación',
        requiresFeature: 'clic_premium_variants'
      });
      await knex('catalogo_componentes')
        .where('tipo', 'testimonials')
        .update({ variantes: JSON.stringify(existingVariantes) });
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remover variantes CLIC de los componentes
  const componentsToUpdate = [
    'property_carousel',
    'video_gallery',
    'related_articles',
    'popular_locations',
    'dynamic_faqs',
    'testimonials'
  ];

  for (const tipo of componentsToUpdate) {
    const component = await knex('catalogo_componentes')
      .where('tipo', tipo)
      .first();

    if (component) {
      const variantes = JSON.parse(component.variantes || '[]');
      const filtered = variantes.filter((v: any) => v.id !== 'clic');
      await knex('catalogo_componentes')
        .where('tipo', tipo)
        .update({ variantes: JSON.stringify(filtered) });
    }
  }

  // Eliminar componentes nuevos si existen
  await knex('catalogo_componentes')
    .whereIn('tipo', ['property_carousel', 'video_gallery', 'related_articles', 'popular_locations', 'dynamic_faqs'])
    .delete();

  // Eliminar el feature
  await knex('features')
    .where('name', 'CLIC Premium Variants')
    .delete();
}

