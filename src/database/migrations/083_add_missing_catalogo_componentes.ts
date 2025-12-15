import { Knex } from 'knex';

/**
 * Migración 083: Agregar componentes faltantes al catálogo
 *
 * Añade los tipos de componentes que están siendo usados
 * en componentes_web pero que no existen en catalogo_componentes
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Agregando componentes faltantes al catálogo...\n');

  const componentesFaltantes = [
    {
      tipo: 'property_grid',
      nombre: 'Grilla de Propiedades',
      descripcion: 'Grilla para mostrar listado de propiedades',
      icono: '🏘️',
      categoria: 'display',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
    {
      tipo: 'article_grid',
      nombre: 'Grilla de Artículos',
      descripcion: 'Grilla para mostrar listado de artículos',
      icono: '📰',
      categoria: 'content',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
    {
      tipo: 'testimonials_grid',
      nombre: 'Grilla de Testimonios',
      descripcion: 'Grilla para mostrar testimonios',
      icono: '💬',
      categoria: 'content',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
    {
      tipo: 'team_grid',
      nombre: 'Grilla de Equipo',
      descripcion: 'Grilla para mostrar miembros del equipo',
      icono: '👥',
      categoria: 'content',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
    {
      tipo: 'agent_profile',
      nombre: 'Perfil de Asesor',
      descripcion: 'Componente para mostrar perfil de asesor',
      icono: '👤',
      categoria: 'content',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
    {
      tipo: 'article_detail',
      nombre: 'Detalle de Artículo',
      descripcion: 'Componente para mostrar detalle completo de un artículo',
      icono: '📄',
      categoria: 'content',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
    {
      tipo: 'search_box',
      nombre: 'Caja de Búsqueda',
      descripcion: 'Componente de búsqueda',
      icono: '🔍',
      categoria: 'forms',
      variantes: 1,
      campos_config: [],
      active: true,
      required_features: [],
    },
  ];

  for (const componente of componentesFaltantes) {
    // Verificar si ya existe
    const existe = await knex('catalogo_componentes')
      .where('tipo', componente.tipo)
      .first();

    if (!existe) {
      await knex.raw(`
        INSERT INTO catalogo_componentes (
          id, tipo, nombre, descripcion, icono, categoria,
          variantes, campos_config, active, required_features
        ) VALUES (
          gen_random_uuid(), ?, ?, ?, ?, ?, ?, ?, ?, ?
        )
      `, [
        componente.tipo,
        componente.nombre,
        componente.descripcion,
        componente.icono,
        componente.categoria,
        componente.variantes,
        JSON.stringify(componente.campos_config),
        componente.active,
        false // required_features es boolean
      ]);
      console.log(`✅ ${componente.tipo} agregado al catálogo`);
    } else {
      console.log(`↻ ${componente.tipo} ya existe en el catálogo`);
    }
  }

  console.log('\n✅ Componentes faltantes agregados al catálogo\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Eliminando componentes agregados...\n');

  const tiposAgregados = [
    'property_grid',
    'article_grid',
    'testimonials_grid',
    'team_grid',
    'agent_profile',
    'article_detail',
    'search_box',
  ];

  for (const tipo of tiposAgregados) {
    await knex('catalogo_componentes').where('tipo', tipo).delete();
    console.log(`✅ ${tipo} eliminado`);
  }

  console.log('\n✅ Rollback completado\n');
}
