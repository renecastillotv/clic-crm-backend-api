import { Knex } from 'knex';

/**
 * Migración: Crear páginas estándar para cada tenant
 *
 * Esta migración crea las páginas base que todo tenant debe tener disponibles.
 * Las páginas protegidas no se pueden eliminar, solo desactivar.
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants activos
  const tenants = await knex('tenants').where('activo', true).select('id', 'nombre');

  if (tenants.length === 0) {
    console.log('ℹ️ No hay tenants activos, saltando creación de páginas');
    return;
  }

  // Obtener tipos de página de nivel 0 (páginas directas, no plantillas dinámicas de nivel > 0)
  const tiposBase = await knex('tipos_pagina')
    .where('nivel', 0)
    .orWhere(function() {
      this.where('es_plantilla', true).where('nivel', 1);
    })
    .select('codigo', 'nombre', 'ruta_patron', 'nivel', 'es_plantilla', 'protegida', 'alias_rutas', 'configuracion');

  for (const tenant of tenants) {
    console.log(`\n📦 Procesando tenant: ${tenant.nombre}`);

    for (const tipo of tiposBase) {
      // Verificar si ya existe una página de este tipo para el tenant
      const existingPage = await knex('paginas_web')
        .where('tenant_id', tenant.id)
        .where('tipo_pagina', tipo.codigo)
        .first();

      if (existingPage) {
        console.log(`  ℹ️ Página ${tipo.codigo} ya existe`);
        continue;
      }

      // Determinar el slug según el tipo
      let slug = '';
      let titulo = tipo.nombre;
      const aliasRutas = typeof tipo.alias_rutas === 'string'
        ? JSON.parse(tipo.alias_rutas)
        : tipo.alias_rutas || {};
      const config = typeof tipo.configuracion === 'string'
        ? JSON.parse(tipo.configuracion)
        : tipo.configuracion || {};

      // Para páginas de nivel 0, usar el slug del alias en español o el default
      if (tipo.nivel === 0) {
        if (tipo.codigo === 'homepage') {
          slug = '/';
          titulo = 'Página Principal';
        } else {
          slug = aliasRutas.es || config.default_slug || tipo.codigo.replace(/_/g, '-');
        }
      } else if (tipo.es_plantilla && tipo.nivel === 1) {
        // Para plantillas de nivel 1, usar un slug interno
        slug = `_template_${tipo.codigo}`;
        titulo = `Plantilla: ${tipo.nombre}`;
      }

      // Verificar si ya existe una página con ese slug para este tenant
      const existingSlug = await knex('paginas_web')
        .where('tenant_id', tenant.id)
        .where('slug', slug)
        .first();

      if (existingSlug) {
        console.log(`  ⚠️ Página ${tipo.codigo} - slug "${slug}" ya existe, saltando`);
        continue;
      }

      // Crear la página
      await knex('paginas_web').insert({
        tenant_id: tenant.id,
        tipo_pagina: tipo.codigo,
        variante: 'default',
        titulo: titulo,
        slug: slug,
        descripcion: `${tipo.nombre} - Página del sitio web`,
        contenido: JSON.stringify({}),
        meta: JSON.stringify({
          title: titulo,
          description: `${tipo.nombre} - ${tenant.nombre}`,
        }),
        publica: true,
        activa: tipo.protegida ? true : false, // Las protegidas siempre activas, otras desactivadas por default
        orden: tipo.nivel === 0 ? getOrdenPorTipo(tipo.codigo) : 100,
      });
      console.log(`  ✅ Página ${tipo.codigo} creada (slug: ${slug})`)
    }
  }
}

/**
 * Determina el orden de visualización según el tipo de página
 */
function getOrdenPorTipo(codigo: string): number {
  const ordenes: Record<string, number> = {
    homepage: 0,
    listados_propiedades: 1,
    listado_asesores: 2,
    blog: 3,
    videos: 4,
    testimonios: 5,
    landing_page: 6,
    contacto: 7,
    politicas_privacidad: 90,
    terminos_condiciones: 91,
  };
  return ordenes[codigo] ?? 50;
}

export async function down(knex: Knex): Promise<void> {
  // No eliminamos páginas en down porque podrían tener contenido personalizado
  // Solo marcamos como nota
  console.log('ℹ️ Las páginas estándar creadas no se eliminan automáticamente');
  console.log('ℹ️ Para eliminar, use: DELETE FROM paginas_web WHERE slug LIKE \'_template_%\'');
}
