import { Knex } from 'knex';

/**
 * Seed 005 - Crear roles globales (antes eran templates)
 *
 * Define los roles globales que actúan como base para roles de tenant.
 * Cada rol global tiene módulos con permisos predefinidos.
 * Los tenants crean sub-roles (parent_id) basados en estos roles globales.
 */
export async function seed(knex: Knex): Promise<void> {
  // Roles globales (tenant_id=NULL, tipo='global')
  const globalRoles = [
    {
      codigo: 'global_asesor_inmobiliario',
      nombre: 'Asesor Inmobiliario',
      descripcion: 'Agente de ventas con acceso a propiedades, contactos, pipeline y herramientas de seguimiento',
      tipo: 'global',
      tenant_id: null,
      es_protegido: true,
      color: '#3B82F6',
      icono: 'briefcase',
      activo: true,
    },
    {
      codigo: 'global_gerente_ventas',
      nombre: 'Gerente de Ventas',
      descripcion: 'Líder de equipo con acceso a métricas, productividad y gestión de equipo',
      tipo: 'global',
      tenant_id: null,
      es_protegido: true,
      color: '#10B981',
      icono: 'trending-up',
      activo: true,
    },
    {
      codigo: 'global_content_creator',
      nombre: 'Content Creator',
      descripcion: 'Creador de contenido con acceso a blog, marketing y redes',
      tipo: 'global',
      tenant_id: null,
      es_protegido: true,
      color: '#8B5CF6',
      icono: 'edit-3',
      activo: true,
    },
    {
      codigo: 'global_coordinador',
      nombre: 'Coordinador',
      descripcion: 'Coordinador con acceso amplio pero sin permisos de eliminación',
      tipo: 'global',
      tenant_id: null,
      es_protegido: true,
      color: '#F59E0B',
      icono: 'clipboard',
      activo: true,
    },
    {
      codigo: 'global_usuario_basico',
      nombre: 'Usuario Básico',
      descripcion: 'Acceso mínimo: propiedades, contactos propios y entrenamiento',
      tipo: 'global',
      tenant_id: null,
      es_protegido: true,
      color: '#6B7280',
      icono: 'user',
      activo: true,
    },
  ];

  // Insertar roles globales
  for (const role of globalRoles) {
    const exists = await knex('roles').where('codigo', role.codigo).first();
    if (!exists) {
      await knex('roles').insert(role);
    }
  }

  // Obtener IDs de roles globales creados
  const createdRoles = await knex('roles')
    .whereIn('codigo', globalRoles.map(r => r.codigo))
    .select('id', 'codigo');

  const roleMap: Record<string, string> = {};
  for (const r of createdRoles) {
    roleMap[r.codigo] = r.id;
  }

  // Definir permisos por rol global

  // Asesor Inmobiliario: CRM completo (propios), propiedades (todos), seguimiento
  const asesorModulos = [
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
    { modulo_id: 'contactos', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'pipeline', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'propuestas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'actividades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'metas', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'finanzas', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'finanzas-ventas', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'finanzas-comisiones', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'finanzas-facturas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
  ];

  // Gerente de Ventas
  const gerenteModulos = [
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'contactos', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'pipeline', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'propuestas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'actividades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'metas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'finanzas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'finanzas-ventas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'finanzas-comisiones', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'finanzas-facturas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'sistema-fases', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'own' },
    { modulo_id: 'sistema-fases-dashboard', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'own' },
    { modulo_id: 'productividad', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'own' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'team' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'usuarios', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'team', alcance_editar: 'own' },
  ];

  // Content Creator
  const contentModulos = [
    { modulo_id: 'contenido', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'marketing', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
  ];

  // Coordinador
  const coordinadorModulos = [
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'contactos', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'pipeline', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'propuestas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'actividades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'metas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'finanzas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'finanzas-ventas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'finanzas-comisiones', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'finanzas-facturas', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'contenido', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'marketing', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'usuarios', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
  ];

  // Usuario Básico
  const basicoModulos = [
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
    { modulo_id: 'contactos', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'actividades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
  ];

  // Insertar permisos de roles globales
  const rolePermisos: Record<string, typeof asesorModulos> = {
    global_asesor_inmobiliario: asesorModulos,
    global_gerente_ventas: gerenteModulos,
    global_content_creator: contentModulos,
    global_coordinador: coordinadorModulos,
    global_usuario_basico: basicoModulos,
  };

  for (const [rolCodigo, modulos] of Object.entries(rolePermisos)) {
    const rolId = roleMap[rolCodigo];
    if (!rolId) continue;

    for (const mod of modulos) {
      const exists = await knex('roles_modulos')
        .where('rol_id', rolId)
        .where('modulo_id', mod.modulo_id)
        .first();

      if (!exists) {
        await knex('roles_modulos').insert({
          rol_id: rolId,
          ...mod,
          permisos_campos: '{}',
        });
      }
    }
  }

  // Vincular roles existentes de tenant a su rol global padre
  if (roleMap['global_asesor_inmobiliario']) {
    await knex('roles')
      .where('codigo', 'asesor')
      .where('tipo', 'tenant')
      .whereNotNull('tenant_id')
      .whereNull('parent_id')
      .update({ parent_id: roleMap['global_asesor_inmobiliario'] });
  }

  if (roleMap['global_content_creator']) {
    await knex('roles')
      .where('codigo', 'content-creator')
      .where('tipo', 'tenant')
      .whereNotNull('tenant_id')
      .whereNull('parent_id')
      .update({ parent_id: roleMap['global_content_creator'] });
  }
}
