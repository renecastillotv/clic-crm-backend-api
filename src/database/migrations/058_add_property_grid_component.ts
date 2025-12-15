import { Knex } from 'knex';

/**
 * Migración 058: Agregar componente property_grid para propiedades_listado
 *
 * Agrega el componente property_grid con configuración de datos dinámicos
 * para todas las páginas de tipo propiedades_listado
 */

export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants activos
  const tenants = await knex('tenants').select('id').where('activo', true);

  for (const tenant of tenants) {
    // Verificar si ya existe un property_grid para este tenant
    const existing = await knex('componentes_web')
      .where({
        tenant_id: tenant.id,
        tipo: 'property_grid',
        scope: 'page_type',
        tipo_pagina: 'propiedades_listado',
      })
      .first();

    if (!existing) {
      // Insertar el componente property_grid
      await knex('componentes_web').insert({
        tenant_id: tenant.id,
        tipo: 'property_grid',
        variante: 'default',
        nombre: 'Grid de Propiedades',
        scope: 'page_type',
        tipo_pagina: 'propiedades_listado',
        datos: JSON.stringify({
          static_data: {
            titulo: 'Propiedades Disponibles',
            subtitulo: 'Encuentra tu propiedad ideal',
          },
          toggles: {
            mostrarFiltros: true,
            mostrarPaginacion: true,
            mostrarOrdenamiento: true,
          },
          styles: {
            columnas: 3,
            gap: '2rem',
          },
          dynamic_data: {
            dataType: 'propiedades',
            limit: 12,
            filters: {},
          },
        }),
        activo: true,
        orden: 1, // Después del header (0) y antes del footer (999)
      });

      console.log(`✅ Componente property_grid creado para tenant ${tenant.id}`);
    } else {
      console.log(`ℹ️  Componente property_grid ya existe para tenant ${tenant.id}`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar todos los componentes property_grid de tipo page_type
  await knex('componentes_web')
    .where({
      tipo: 'property_grid',
      scope: 'page_type',
      tipo_pagina: 'propiedades_listado',
    })
    .delete();

  console.log('✅ Componentes property_grid eliminados');
}
