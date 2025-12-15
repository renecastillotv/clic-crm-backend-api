import type { Knex } from 'knex';

/**
 * Migración: Seed de rutas estándar para todos los tenants
 *
 * Paquete básico de rutas que todo tenant debe tener:
 * - homepage (/)
 * - propiedades (listado)
 * - propiedades/single
 * - contacto
 * - politicas-de-privacidad
 * - terminos-y-condiciones
 * - asesores (directorio + single)
 * - blog (directorio + single) - alias de artículos
 * - vende-con-nosotros
 */

const RUTAS_ESTANDAR = [
  // Páginas estáticas (nivel 0)
  {
    prefijo: 'contacto',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'contact', fr: 'contact', pt: 'contato' },
  },
  {
    prefijo: 'politicas-de-privacidad',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'privacy-policy', fr: 'politique-confidentialite', pt: 'politica-privacidade' },
  },
  {
    prefijo: 'terminos-y-condiciones',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'terms-and-conditions', fr: 'termes-et-conditions', pt: 'termos-e-condicoes' },
  },
  {
    prefijo: 'vende-con-nosotros',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'sell-with-us', fr: 'vendez-avec-nous', pt: 'venda-conosco' },
  },

  // Directorio + Single (nivel 1)
  {
    prefijo: 'asesores',
    nivel_navegacion: 1,
    alias_idiomas: { en: 'advisors', fr: 'conseillers', pt: 'assessores' },
  },
  {
    prefijo: 'blog',
    nivel_navegacion: 1,
    alias_idiomas: { en: 'blog', fr: 'blog', pt: 'blog' },
  },
];

export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants
  const tenants = await knex('tenants').select('id');

  for (const tenant of tenants) {
    // Verificar qué rutas ya tiene este tenant
    const existingRutas = await knex('tenants_rutas_config')
      .where('tenant_id', tenant.id)
      .select('prefijo');
    const existingPrefijos = existingRutas.map((r: any) => r.prefijo);

    // Insertar solo las que no existen
    for (const ruta of RUTAS_ESTANDAR) {
      if (!existingPrefijos.includes(ruta.prefijo)) {
        await knex('tenants_rutas_config').insert({
          tenant_id: tenant.id,
          prefijo: ruta.prefijo,
          nivel_navegacion: ruta.nivel_navegacion,
          alias_idiomas: JSON.stringify(ruta.alias_idiomas),
          habilitado: true,
          orden: 0,
        });
        console.log(`   ✅ Ruta "${ruta.prefijo}" agregada a tenant ${tenant.id}`);
      }
    }
  }

  console.log('✅ Rutas estándar seedeadas para todos los tenants');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar solo las rutas que insertamos
  const prefijosEstandar = RUTAS_ESTANDAR.map(r => r.prefijo);

  await knex('tenants_rutas_config')
    .whereIn('prefijo', prefijosEstandar)
    .delete();

  console.log('✅ Rutas estándar eliminadas');
}
