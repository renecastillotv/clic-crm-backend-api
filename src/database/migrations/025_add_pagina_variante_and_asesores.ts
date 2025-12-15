import { Knex } from 'knex';

/**
 * Migración para:
 * 1. Agregar campo variante a paginas_web
 * 2. Agregar tipos de página para asesores
 * 3. Marcar páginas estándar como protegidas
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar campo variante a paginas_web
  const hasVariante = await knex.schema.hasColumn('paginas_web', 'variante');
  if (!hasVariante) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.string('variante', 50).defaultTo('default').comment('Variante del layout de la página');
    });
    console.log('✅ Campo variante agregado a paginas_web');
  }

  // 2. Agregar tipos de página para asesores
  const existingTypes = await knex('tipos_pagina')
    .whereIn('codigo', ['listado_asesores', 'asesor_single'])
    .select('codigo');

  const existingCodes = existingTypes.map((t: any) => t.codigo);

  const tiposAsesores = [
    {
      codigo: 'listado_asesores',
      nombre: 'Listado de Asesores',
      descripcion: 'Página que muestra el listado de todos los asesores',
      es_estandar: true,
      requiere_slug: true,
      configuracion: JSON.stringify({
        default_slug: 'asesores',
        protected: true // No se puede eliminar
      }),
    },
    {
      codigo: 'asesor_single',
      nombre: 'Asesor Individual',
      descripcion: 'Página DINÁMICA que muestra cualquier asesor. Se reutiliza para todos los asesores según la URL (/asesores/[asesor-slug])',
      es_estandar: true,
      requiere_slug: false, // No requiere slug porque es dinámica
      configuracion: JSON.stringify({
        dynamic: true,
        is_template: true,
        route_pattern: '/asesores/:asesor',
        requires_asesor_slug: true,
        protected: true // No se puede eliminar
      }),
    },
  ];

  for (const tipo of tiposAsesores) {
    if (!existingCodes.includes(tipo.codigo)) {
      await knex('tipos_pagina').insert(tipo);
      console.log(`✅ Tipo de página agregado: ${tipo.codigo}`);
    } else {
      console.log(`ℹ️ Tipo de página ya existe: ${tipo.codigo}`);
    }
  }

  // 3. Marcar páginas estándar como protegidas en la configuración
  const tiposProtegidos = [
    'homepage',
    'listados_propiedades',
    'single_property',
    'contacto',
    'listado_asesores',
    'asesor_single',
  ];

  for (const codigo of tiposProtegidos) {
    await knex('tipos_pagina')
      .where('codigo', codigo)
      .update({
        configuracion: knex.raw(`
          jsonb_set(
            COALESCE(configuracion, '{}'::jsonb),
            '{protected}',
            'true'::jsonb
          )
        `)
      });
    console.log(`✅ Tipo ${codigo} marcado como protegido`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar campo variante
  const hasVariante = await knex.schema.hasColumn('paginas_web', 'variante');
  if (hasVariante) {
    await knex.schema.alterTable('paginas_web', (table) => {
      table.dropColumn('variante');
    });
  }

  // Eliminar tipos de página de asesores
  await knex('tipos_pagina')
    .whereIn('codigo', ['listado_asesores', 'asesor_single'])
    .delete();
}
