/**
 * Migración 129: Agregar asesor_default_id a tenants
 *
 * Agrega la columna para almacenar el perfil de asesor por defecto del tenant.
 * Este asesor se usa como fallback cuando el asesor original de una propiedad
 * está inactivo o no existe.
 */

import { Kysely, sql } from 'kysely';

export async function up(db: Kysely<any>): Promise<void> {
  // Agregar columna asesor_default_id a tenants
  await db.schema
    .alterTable('tenants')
    .addColumn('asesor_default_id', 'uuid', (col) =>
      col.references('perfiles_asesor.id').onDelete('set null')
    )
    .execute();

  // Crear índice para búsquedas rápidas
  await sql`CREATE INDEX IF NOT EXISTS idx_tenants_asesor_default ON tenants(asesor_default_id)`.execute(db);

  // Para cada tenant que tenga asesores activos, asignar el primero como default
  await sql`
    UPDATE tenants t
    SET asesor_default_id = (
      SELECT pa.id
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = t.id
        AND pa.activo = true
        AND pa.visible_en_web = true
        AND u.activo = true
      ORDER BY pa.created_at ASC
      LIMIT 1
    )
    WHERE EXISTS (
      SELECT 1
      FROM perfiles_asesor pa
      INNER JOIN usuarios u ON pa.usuario_id = u.id
      WHERE pa.tenant_id = t.id
        AND pa.activo = true
        AND pa.visible_en_web = true
        AND u.activo = true
    )
  `.execute(db);

  console.log('✅ Columna asesor_default_id agregada a tenants');
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`DROP INDEX IF EXISTS idx_tenants_asesor_default`.execute(db);

  await db.schema
    .alterTable('tenants')
    .dropColumn('asesor_default_id')
    .execute();

  console.log('✅ Columna asesor_default_id eliminada de tenants');
}
