import type { Knex } from 'knex';

/**
 * Migración: Corregir campo_query en tags_propiedades
 *
 * Los campos en la tabla propiedades son:
 * - operacion (no tipo_operacion)
 * - tipo (no tipo_propiedad)
 * - habitaciones
 * - banos
 * - estacionamientos (no parqueos)
 */

export async function up(knex: Knex): Promise<void> {
  // Corregir operaciones
  await knex('tags_propiedades')
    .where('campo_query', 'tipo_operacion')
    .update({ campo_query: 'operacion' });

  // Corregir tipos de propiedad
  await knex('tags_propiedades')
    .where('campo_query', 'tipo_propiedad')
    .update({ campo_query: 'tipo' });

  // Corregir parqueos
  await knex('tags_propiedades')
    .where('campo_query', 'parqueos')
    .update({ campo_query: 'estacionamientos' });

  // Corregir valores de operación
  await knex('tags_propiedades')
    .where('slug', 'comprar')
    .update({ valor: 'venta' }); // Ya estaba bien pero aseguramos

  await knex('tags_propiedades')
    .where('slug', 'alquilar')
    .update({ valor: 'alquiler' }); // Ya estaba bien

  await knex('tags_propiedades')
    .where('slug', 'alquiler-temporal')
    .update({ valor: 'alquiler_temporal' }); // Ya estaba bien

  // Corregir amenidades - la tabla propiedades tiene jsonb 'amenidades'
  // pero puede que no exista, por ahora deshabilitamos esos tags
  await knex('tags_propiedades')
    .where('tipo', 'amenidad')
    .update({ activo: false });

  console.log('✅ Campos de query corregidos en tags_propiedades');
}

export async function down(knex: Knex): Promise<void> {
  // Revertir
  await knex('tags_propiedades')
    .where('campo_query', 'operacion')
    .update({ campo_query: 'tipo_operacion' });

  await knex('tags_propiedades')
    .where('campo_query', 'tipo')
    .update({ campo_query: 'tipo_propiedad' });

  await knex('tags_propiedades')
    .where('campo_query', 'estacionamientos')
    .update({ campo_query: 'parqueos' });

  await knex('tags_propiedades')
    .where('tipo', 'amenidad')
    .update({ activo: true });
}
