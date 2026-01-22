import { Knex } from 'knex';

/**
 * Seed 005 - Crear templates iniciales de roles
 *
 * Define los templates de rol que el platform admin gestiona.
 * Cada template tiene módulos con permisos por defecto (techo máximo).
 * Los tenants crean roles basados en estos templates.
 */
export async function seed(knex: Knex): Promise<void> {
  // 1. Crear templates de roles
  const templates = [
    {
      codigo: 'asesor_inmobiliario',
      nombre: 'Asesor Inmobiliario',
      descripcion: 'Agente de ventas con acceso a propiedades, contactos, pipeline y herramientas de seguimiento',
      categoria: 'operacional',
      icono: 'briefcase',
      color: '#3B82F6',
      es_activo: true,
      visible_para_tenants: true,
    },
    {
      codigo: 'gerente_ventas',
      nombre: 'Gerente de Ventas',
      descripcion: 'Líder de equipo con acceso a métricas, productividad y gestión de equipo',
      categoria: 'gerencial',
      icono: 'trending-up',
      color: '#10B981',
      es_activo: true,
      visible_para_tenants: true,
    },
    {
      codigo: 'content_creator',
      nombre: 'Content Creator',
      descripcion: 'Creador de contenido con acceso a blog, marketing y redes',
      categoria: 'operacional',
      icono: 'edit-3',
      color: '#8B5CF6',
      es_activo: true,
      visible_para_tenants: true,
    },
    {
      codigo: 'coordinador',
      nombre: 'Coordinador',
      descripcion: 'Coordinador con acceso amplio pero sin permisos de eliminación',
      categoria: 'gerencial',
      icono: 'clipboard',
      color: '#F59E0B',
      es_activo: true,
      visible_para_tenants: true,
    },
    {
      codigo: 'usuario_basico',
      nombre: 'Usuario Básico',
      descripcion: 'Acceso mínimo: propiedades, contactos propios y entrenamiento',
      categoria: 'operacional',
      icono: 'user',
      color: '#6B7280',
      es_activo: true,
      visible_para_tenants: true,
    },
  ];

  // Insertar templates
  for (const template of templates) {
    const exists = await knex('roles_templates').where('codigo', template.codigo).first();
    if (!exists) {
      await knex('roles_templates').insert(template);
    }
  }

  // 2. Obtener IDs de templates creados
  const createdTemplates = await knex('roles_templates')
    .whereIn('codigo', templates.map(t => t.codigo))
    .select('id', 'codigo');

  const templateMap: Record<string, string> = {};
  for (const t of createdTemplates) {
    templateMap[t.codigo] = t.id;
  }

  // 3. Definir permisos por template

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

  // Gerente de Ventas: Todo del asesor + equipo, productividad, metas editables, alcance team/all
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

  // Content Creator: Contenido, marketing, propiedades (solo ver)
  const contentModulos = [
    { modulo_id: 'contenido', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'marketing', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
  ];

  // Coordinador: Acceso amplio sin eliminar
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

  // Usuario Básico: Mínimo acceso
  const basicoModulos = [
    { modulo_id: 'propiedades', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
    { modulo_id: 'contactos', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'actividades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mi-entrenamiento', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
    { modulo_id: 'mensajeria', puede_ver: true, puede_crear: true, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
  ];

  // 4. Insertar permisos de templates
  const templatePermisos: Record<string, typeof asesorModulos> = {
    asesor_inmobiliario: asesorModulos,
    gerente_ventas: gerenteModulos,
    content_creator: contentModulos,
    coordinador: coordinadorModulos,
    usuario_basico: basicoModulos,
  };

  for (const [templateCodigo, modulos] of Object.entries(templatePermisos)) {
    const templateId = templateMap[templateCodigo];
    if (!templateId) continue;

    for (const mod of modulos) {
      const exists = await knex('roles_templates_modulos')
        .where('template_id', templateId)
        .where('modulo_id', mod.modulo_id)
        .first();

      if (!exists) {
        await knex('roles_templates_modulos').insert({
          template_id: templateId,
          ...mod,
          permisos_campos: '{}',
        });
      }
    }
  }

  // 5. Vincular roles custom existentes a templates
  // Si hay un rol 'asesor' en algún tenant, vincularlo al template asesor_inmobiliario
  if (templateMap['asesor_inmobiliario']) {
    await knex('roles')
      .where('codigo', 'asesor')
      .where('tipo', 'tenant')
      .whereNotNull('tenant_id')
      .whereNull('template_id')
      .update({ template_id: templateMap['asesor_inmobiliario'] });
  }

  // Vincular content-creator al template
  if (templateMap['content_creator']) {
    await knex('roles')
      .where('codigo', 'content-creator')
      .where('tipo', 'tenant')
      .whereNotNull('tenant_id')
      .whereNull('template_id')
      .update({ template_id: templateMap['content_creator'] });
  }
}
