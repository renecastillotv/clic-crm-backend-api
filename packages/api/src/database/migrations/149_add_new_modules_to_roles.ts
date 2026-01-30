import { Knex } from 'knex';

/**
 * Migración 149 - Agregar permisos de nuevos módulos a roles existentes
 *
 * Los módulos agregados en migración 148 necesitan tener entradas en roles_modulos
 * para que los usuarios puedan verlos según sus roles.
 *
 * Esta migración agrega permisos a:
 * - tenant_owner: Acceso completo a todos los nuevos módulos
 * - tenant_admin: Acceso casi completo (sin config de algunos módulos)
 * - tenant_user: Acceso limitado (solo ver y crear en módulos básicos)
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener IDs de los roles base
  const roles = await knex('roles')
    .whereIn('codigo', ['tenant_owner', 'tenant_admin', 'tenant_user'])
    .select('id', 'codigo');

  const roleMap: Record<string, string> = {};
  roles.forEach((r: any) => {
    roleMap[r.codigo] = r.id;
  });

  if (!roleMap['tenant_owner']) {
    console.log('⚠️ No se encontró el rol tenant_owner, buscando roles globales...');
    // Buscar roles globales (tenant_id = NULL)
    const globalRoles = await knex('roles')
      .whereNull('tenant_id')
      .whereIn('codigo', ['tenant_owner', 'tenant_admin', 'tenant_user'])
      .select('id', 'codigo');

    globalRoles.forEach((r: any) => {
      roleMap[r.codigo] = r.id;
    });
  }

  console.log('📋 Roles encontrados:', Object.keys(roleMap));

  // Obtener módulos existentes
  const existingModules = await knex('modulos').select('id');
  const moduleIds = new Set(existingModules.map((m: any) => m.id));

  // Definir permisos por módulo y rol
  const permisosConfig = [
    // ==================== CRM ====================
    {
      modulo_id: 'planes-pago',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: false, puede_eliminar: false },
      }
    },

    // ==================== MENSAJERÍA ====================
    {
      modulo_id: 'mensajeria-chats',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'mensajeria-correo',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'mensajeria-config',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
        tenant_user: { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },

    // ==================== DOCUMENTOS ====================
    {
      modulo_id: 'mis-documentos',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
      }
    },
    {
      modulo_id: 'documentos-config',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
        tenant_user: { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },

    // ==================== MARKETING ====================
    {
      modulo_id: 'marketing-centro',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'marketing-creativos',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'marketing-campanas',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'marketing-redes-sociales',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'marketing-leads',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'marketing-analytics',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
        tenant_admin: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'marketing-config',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
        tenant_user: { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },

    // ==================== OTROS MÓDULOS QUE PUEDEN FALTAR ====================
    {
      modulo_id: 'contactos',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'pipeline',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'propuestas',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'actividades',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
      }
    },
    {
      modulo_id: 'metas',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },

    // ==================== FINANZAS ====================
    {
      modulo_id: 'finanzas-ventas',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: true, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'finanzas-comisiones',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'finanzas-facturas',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'finanzas-config',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
        tenant_user: { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },

    // ==================== SISTEMA FASES ====================
    {
      modulo_id: 'sistema-fases',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'productividad',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_user: { puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'sistema-fases-config',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
        tenant_user: { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
    {
      modulo_id: 'productividad-config',
      roles: {
        tenant_owner: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true },
        tenant_admin: { puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false },
        tenant_user: { puede_ver: false, puede_crear: false, puede_editar: false, puede_eliminar: false },
      }
    },
  ];

  let insertedCount = 0;
  let skippedCount = 0;

  for (const config of permisosConfig) {
    // Verificar que el módulo existe
    if (!moduleIds.has(config.modulo_id)) {
      console.log(`⚠️ Módulo ${config.modulo_id} no existe, saltando...`);
      skippedCount++;
      continue;
    }

    for (const [rolCodigo, permisos] of Object.entries(config.roles)) {
      const rolId = roleMap[rolCodigo];
      if (!rolId) {
        console.log(`⚠️ Rol ${rolCodigo} no encontrado, saltando...`);
        continue;
      }

      // Solo insertar si tiene al menos puede_ver = true
      if (!permisos.puede_ver) continue;

      // Verificar si ya existe
      const existing = await knex('roles_modulos')
        .where({ rol_id: rolId, modulo_id: config.modulo_id })
        .first();

      if (!existing) {
        await knex('roles_modulos').insert({
          rol_id: rolId,
          modulo_id: config.modulo_id,
          puede_ver: permisos.puede_ver,
          puede_crear: permisos.puede_crear,
          puede_editar: permisos.puede_editar,
          puede_eliminar: permisos.puede_eliminar,
          alcance_ver: 'all',
          alcance_editar: 'all',
        });
        insertedCount++;
      } else {
        skippedCount++;
      }
    }
  }

  console.log(`✅ Permisos insertados: ${insertedCount}, ya existentes: ${skippedCount}`);

  // Incrementar versión de permisos para invalidar caché en clientes
  // Para todos los tenants que tienen estos roles
  const tenantsWithRoles = await knex('usuarios_roles')
    .distinct('tenant_id')
    .whereNotNull('tenant_id');

  for (const { tenant_id } of tenantsWithRoles) {
    await knex.raw(`
      INSERT INTO permisos_version (tenant_id, version, updated_at)
      VALUES (?, 1, CURRENT_TIMESTAMP)
      ON CONFLICT (tenant_id)
      DO UPDATE SET version = permisos_version.version + 1, updated_at = CURRENT_TIMESTAMP
    `, [tenant_id]);
  }

  console.log(`✅ Versión de permisos incrementada para ${tenantsWithRoles.length} tenants`);
}

export async function down(knex: Knex): Promise<void> {
  // Esta migración es aditiva, no necesita rollback completo
  // Solo limpiar los módulos específicos que se agregaron
  const modulosAgregados = [
    'planes-pago',
    'mensajeria-chats', 'mensajeria-correo', 'mensajeria-config',
    'mis-documentos', 'documentos-config',
    'marketing-centro', 'marketing-creativos', 'marketing-campanas',
    'marketing-redes-sociales', 'marketing-leads', 'marketing-analytics', 'marketing-config',
    'contactos', 'pipeline', 'propuestas', 'actividades', 'metas',
    'finanzas-ventas', 'finanzas-comisiones', 'finanzas-facturas', 'finanzas-config',
    'sistema-fases', 'productividad', 'sistema-fases-config', 'productividad-config',
  ];

  // Obtener roles base
  const roles = await knex('roles')
    .whereIn('codigo', ['tenant_owner', 'tenant_admin', 'tenant_user'])
    .select('id');

  const roleIds = roles.map((r: any) => r.id);

  if (roleIds.length > 0) {
    await knex('roles_modulos')
      .whereIn('modulo_id', modulosAgregados)
      .whereIn('rol_id', roleIds)
      .delete();

    console.log('✅ Permisos de nuevos módulos eliminados de roles base');
  }
}
