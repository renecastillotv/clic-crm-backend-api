import { Knex } from 'knex';

/**
 * Migración: Agregar idioma Portugués y mejorar soporte multi-idioma
 *
 * 1. Agrega idioma Portugués (pt) a la tabla idiomas
 * 2. Actualiza idiomas_disponibles de tenants existentes
 */
export async function up(knex: Knex): Promise<void> {
  // 1. Agregar idioma Portugués si no existe
  const ptExists = await knex('idiomas').where('codigo', 'pt').first();
  if (!ptExists) {
    await knex('idiomas').insert({
      codigo: 'pt',
      nombre: 'Português',
      nombre_nativo: 'Português',
      prioridad: 4,
      activo: true,
    });
    console.log('✅ Idioma Portugués (pt) agregado');
  }

  // 2. Actualizar idiomas disponibles en tenants para incluir pt
  const tenants = await knex('tenants').select('id', 'idiomas_disponibles');
  for (const tenant of tenants) {
    let idiomas = tenant.idiomas_disponibles;
    if (typeof idiomas === 'string') {
      idiomas = JSON.parse(idiomas);
    }
    if (Array.isArray(idiomas) && !idiomas.includes('pt')) {
      idiomas.push('pt');
      await knex('tenants')
        .where('id', tenant.id)
        .update({
          idiomas_disponibles: JSON.stringify(idiomas),
          updated_at: knex.fn.now(),
        });
    }
  }
  console.log('✅ Idiomas disponibles actualizados en tenants');
}

export async function down(knex: Knex): Promise<void> {
  // No eliminamos el idioma porque podría haber datos asociados
  console.log('ℹ️ El idioma Portugués no se elimina automáticamente');
}
