import { Knex } from 'knex';

/**
 * Migración 062 - Normalizar tipos de componentes
 *
 * Corrige todos los tipos de componentes en componentes_web
 * para que coincidan exactamente con los definidos en ComponentRenderer.astro
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Normalizando tipos de componentes en componentes_web...\n');

  // Mapeo completo de nombres incorrectos -> nombres correctos
  // Basado en los imports del ComponentRenderer.astro
  const mappings: Array<{ from: string; to: string; fromVariant?: string; toVariant?: string }> = [
    // Correcciones de nombres genéricos a nombres específicos
    { from: 'Componente', to: 'contact-info', fromVariant: 'Default', toVariant: 'default' },
    { from: 'layout', to: 'hero', fromVariant: 'Simple', toVariant: 'simple' },
    { from: 'forms', to: 'contact-form', fromVariant: 'Default', toVariant: 'default' },

    // Normalización de guiones bajos a guiones
    { from: 'contact_form', to: 'contact-form' },
    { from: 'contact_info', to: 'contact-info' },
    { from: 'property_list', to: 'property-list' },
    { from: 'property_card', to: 'property-card' },
    { from: 'property_detail', to: 'property-detail' },
    { from: 'property_grid', to: 'property-grid' },
    { from: 'search_bar', to: 'search-bar' },
    { from: 'filter_panel', to: 'filter-panel' },
    { from: 'blog_list', to: 'blog-list' },
    { from: 'team_grid', to: 'team-grid' },
    { from: 'article_grid', to: 'article-grid' },
    { from: 'article_detail', to: 'article-detail' },
    { from: 'article_hero', to: 'article-hero' },
    { from: 'article_category', to: 'article-category' },
    { from: 'asesor_detail', to: 'asesor-detail' },
    { from: 'agent_profile', to: 'asesor-detail' }, // agent_profile es alias de asesor_detail
    { from: 'video_hero', to: 'video-hero' },
    { from: 'video_gallery', to: 'video-gallery' },
    { from: 'video_detail', to: 'video-detail' },
    { from: 'video_category', to: 'video-category' },
    { from: 'testimonial_hero', to: 'testimonial-hero' },
    { from: 'testimonial_grid', to: 'testimonial-grid' },
    { from: 'testimonial_category', to: 'testimonial-category' },
    { from: 'testimonial_detail', to: 'testimonial-detail' },
    { from: 'property_carousel', to: 'property-carousel' },
    { from: 'location_discovery', to: 'location-discovery' },
    { from: 'about_founder', to: 'about-founder' },
    { from: 'youtube_channel', to: 'youtube-channel' },
    { from: 'knowledge_center', to: 'knowledge-center' },
    { from: 'related_articles', to: 'related-articles' },
    { from: 'popular_locations', to: 'popular-locations' },
    { from: 'dynamic_faqs', to: 'dynamic-faqs' },

    // Normalización de variantes
    { from: 'hero', fromVariant: 'Default', toVariant: 'default' },
    { from: 'hero', fromVariant: 'Variant1', toVariant: 'variant1' },
    { from: 'hero', fromVariant: 'Variant2', toVariant: 'variant2' },
    { from: 'hero', fromVariant: 'Variant3', toVariant: 'variant3' },
    { from: 'hero', fromVariant: 'Simple', toVariant: 'simple' },
    { from: 'hero', fromVariant: 'Search', toVariant: 'search' },
    { from: 'footer', fromVariant: 'Default', toVariant: 'default' },
    { from: 'header', fromVariant: 'Default', toVariant: 'default' },
    { from: 'testimonials', fromVariant: 'Clic', toVariant: 'clic' },
    { from: 'team-grid', fromVariant: 'Compact', toVariant: 'compact' },
    { from: 'property-carousel', fromVariant: 'Featured', toVariant: 'featured' },
    { from: 'property-carousel', fromVariant: 'Clic', toVariant: 'clic' },
  ];

  let totalUpdates = 0;

  for (const mapping of mappings) {
    try {
      let query = knex('componentes_web').where('tipo', mapping.from);

      if (mapping.fromVariant) {
        query = query.andWhere('variante', mapping.fromVariant);
      }

      const updates: any = { tipo: mapping.to };
      if (mapping.toVariant) {
        updates.variante = mapping.toVariant;
      } else if (!mapping.fromVariant) {
        // Si no se especifica variante origen pero sí destino, normalizar variantes
        updates.variante = knex.raw('LOWER(REPLACE(variante, \'_\', \'-\'))');
      }

      const result = await query.update(updates);

      if (result > 0) {
        const variantInfo = mapping.fromVariant
          ? ` (variante: ${mapping.fromVariant} → ${mapping.toVariant || 'sin cambio'})`
          : '';
        console.log(`✅ ${mapping.from} → ${mapping.to}${variantInfo}: ${result} componentes actualizados`);
        totalUpdates += result;
      }
    } catch (error) {
      console.error(`❌ Error actualizando ${mapping.from} → ${mapping.to}:`, error);
    }
  }

  // Normalizar todas las variantes que aún tengan mayúsculas o guiones bajos
  console.log('\n🔄 Normalizando todas las variantes restantes...');

  const variantNormalizationResult = await knex('componentes_web')
    .whereRaw('variante != LOWER(REPLACE(variante, \'_\', \'-\'))')
    .update({
      variante: knex.raw('LOWER(REPLACE(variante, \'_\', \'-\'))')
    });

  if (variantNormalizationResult > 0) {
    console.log(`✅ Normalizadas ${variantNormalizationResult} variantes adicionales`);
    totalUpdates += variantNormalizationResult;
  }

  console.log(`\n✅ Total: ${totalUpdates} componentes actualizados\n`);

  // Mostrar resumen de tipos actuales
  console.log('📊 Resumen de tipos de componentes después de la migración:\n');
  const summary = await knex('componentes_web')
    .select('tipo', 'variante')
    .count('* as count')
    .groupBy('tipo', 'variante')
    .orderBy('tipo')
    .orderBy('variante');

  summary.forEach((row: any) => {
    console.log(`   ${row.tipo}-${row.variante}: ${row.count} componentes`);
  });
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  Esta migración no se puede revertir de forma segura');
  console.log('   Los nombres originales se han perdido en la normalización');
}
