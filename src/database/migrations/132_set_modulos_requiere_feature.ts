import { Knex } from 'knex';

/**
 * Migración 132 - Vincular módulos a features requeridos
 *
 * Configura `requiere_feature` en los módulos que son features,
 * para que el sistema de permisos los filtre automáticamente
 * si el tenant no tiene la feature habilitada.
 */
export async function up(knex: Knex): Promise<void> {
  // clic-connect requiere feature "Connect"
  await knex('modulos')
    .where('id', 'clic-connect')
    .update({ requiere_feature: 'Connect' });

  // university y mi-entrenamiento requieren feature "University"
  await knex('modulos')
    .whereIn('id', ['university', 'mi-entrenamiento'])
    .update({ requiere_feature: 'University' });

  // sistema-fases y productividad requieren feature "Sistema de Fases"
  await knex('modulos')
    .whereIn('id', ['sistema-fases-dashboard', 'sistema-fases-config', 'productividad', 'productividad-config'])
    .update({ requiere_feature: 'Sistema de Fases' });

  console.log('✅ requiere_feature configurado en 7 módulos');
}

export async function down(knex: Knex): Promise<void> {
  await knex('modulos')
    .whereIn('id', [
      'clic-connect',
      'university',
      'mi-entrenamiento',
      'sistema-fases-dashboard',
      'sistema-fases-config',
      'productividad',
      'productividad-config',
    ])
    .update({ requiere_feature: null });

  console.log('✅ requiere_feature eliminado de módulos');
}
