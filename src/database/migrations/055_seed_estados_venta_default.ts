import { Knex } from 'knex';

/**
 * Migración - Estados de Venta por Defecto
 * 
 * Crea estados de venta por defecto para todos los tenants existentes
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants activos
  const tenants = await knex('tenants').where('activo', true);
  
  if (tenants.length === 0) {
    console.log('No hay tenants activos, saltando creación de estados por defecto...');
    return;
  }

  // Estados por defecto
  const estadosDefault = [
    { nombre: 'En Proceso', descripcion: 'Venta en proceso de negociación', es_final: false, orden: 1 },
    { nombre: 'Contrato Pendiente', descripcion: 'Contrato en proceso de firma', es_final: false, orden: 2 },
    { nombre: 'Completada', descripcion: 'Venta completada exitosamente', es_final: true, orden: 3 },
    { nombre: 'Cancelada', descripcion: 'Venta cancelada', es_final: true, orden: 4 },
  ];

  // Insertar estados para cada tenant
  for (const tenant of tenants) {
    // Verificar si ya tiene estados
    const existingEstados = await knex('estados_venta')
      .where('tenant_id', tenant.id)
      .first();

    if (existingEstados) {
      console.log(`Tenant ${tenant.nombre} ya tiene estados de venta, saltando...`);
      continue;
    }

    // Insertar estados por defecto
    const estadosToInsert = estadosDefault.map(estado => ({
      tenant_id: tenant.id,
      nombre: estado.nombre,
      descripcion: estado.descripcion,
      es_final: estado.es_final,
      orden: estado.orden,
      activo: true,
    }));

    await knex('estados_venta').insert(estadosToInsert);
    console.log(`✅ Estados de venta creados para tenant: ${tenant.nombre}`);
  }
}

export async function down(knex: Knex): Promise<void> {
  // No eliminamos los estados porque pueden tener ventas asociadas
  // Solo los marcamos como inactivos
  await knex('estados_venta')
    .whereIn('nombre', ['En Proceso', 'Contrato Pendiente', 'Completada', 'Cancelada'])
    .update({ activo: false });
}

