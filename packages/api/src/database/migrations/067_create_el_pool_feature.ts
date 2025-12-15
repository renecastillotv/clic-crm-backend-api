import { Knex } from 'knex';

/**
 * Migración 067 - Crear feature "Sistema de Fases"
 * 
 * Feature que permite al tenant:
 * - Invertir en un proyecto específico la campaña publicitaria
 * - Repartir bajo sus reglas los clientes
 * - Tener un sistema de medición especial de productividad
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar si el feature ya existe
  const existing = await knex('features')
    .where('name', 'Sistema de Fases')
    .first();

  if (!existing) {
    await knex('features').insert({
      name: 'Sistema de Fases',
      description: 'Sistema que permite al tenant invertir en un proyecto específico la campaña publicitaria, repartir bajo sus reglas los clientes y tener un sistema de medición especial de productividad.',
      icon: 'chart-bar',
      category: 'addon',
      is_public: false,
      is_premium: true,
      available_in_plans: JSON.stringify(['pro', 'premium', 'enterprise']),
      created_at: knex.fn.now(),
      updated_at: knex.fn.now(),
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex('features')
    .where('name', 'Sistema de Fases')
    .delete();
}

