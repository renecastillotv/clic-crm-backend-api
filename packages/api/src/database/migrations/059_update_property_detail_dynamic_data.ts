import { Knex } from 'knex';

/**
 * Migración 059: Actualizar property_detail con dynamic_data
 *
 * Agrega configuración de datos dinámicos al componente property_detail
 * para que pueda resolver los datos de la propiedad usando el slug/id
 */

export async function up(knex: Knex): Promise<void> {
  // Buscar todos los componentes property_detail con scope='page_type'
  const propertyDetails = await knex('componentes_web')
    .where({
      tipo: 'property_detail',
      scope: 'page_type',
    })
    .select('id', 'datos', 'tenant_id');

  console.log(`📝 Encontrados ${propertyDetails.length} componentes property_detail para actualizar`);

  for (const component of propertyDetails) {
    // Parsear datos existentes
    const datosActuales = typeof component.datos === 'string'
      ? JSON.parse(component.datos)
      : component.datos;

    // Agregar dynamic_data si no existe
    if (!datosActuales.dynamic_data) {
      const nuevosDatos = {
        ...datosActuales,
        dynamic_data: {
          dataType: 'propiedad_single',
          // El id y slug se pasarán dinámicamente desde el resolver
        },
      };

      await knex('componentes_web')
        .where('id', component.id)
        .update({
          datos: JSON.stringify(nuevosDatos),
          updated_at: knex.fn.now(),
        });

      console.log(`   ✅ Actualizado property_detail para tenant ${component.tenant_id}`);
    } else {
      console.log(`   ℹ️  property_detail ya tiene dynamic_data para tenant ${component.tenant_id}`);
    }
  }
}

export async function down(knex: Knex): Promise<void> {
  // Remover dynamic_data de property_detail
  const propertyDetails = await knex('componentes_web')
    .where({
      tipo: 'property_detail',
      scope: 'page_type',
    })
    .select('id', 'datos');

  for (const component of propertyDetails) {
    const datosActuales = typeof component.datos === 'string'
      ? JSON.parse(component.datos)
      : component.datos;

    if (datosActuales.dynamic_data) {
      const { dynamic_data, ...restoData } = datosActuales;

      await knex('componentes_web')
        .where('id', component.id)
        .update({
          datos: JSON.stringify(restoData),
          updated_at: knex.fn.now(),
        });
    }
  }

  console.log('✅ dynamic_data removido de property_detail');
}
