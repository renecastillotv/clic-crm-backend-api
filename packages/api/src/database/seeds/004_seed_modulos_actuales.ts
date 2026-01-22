import { Knex } from 'knex';

/**
 * Seed 004 - Registrar módulos actuales del CRM
 *
 * Sincroniza la tabla `modulos` con los IDs reales del sidebar (CrmLayout.tsx).
 * Elimina módulos obsoletos y registra los módulos correctos con jerarquía.
 */
export async function seed(knex: Knex): Promise<void> {
  // IDs de módulos nuevos que vamos a insertar
  const newModuleIds = [
    'propiedades', 'contactos', 'pipeline', 'propuestas', 'actividades', 'metas',
    'finanzas', 'finanzas-ventas', 'finanzas-comisiones', 'finanzas-facturas', 'finanzas-config',
    'sistema-fases', 'sistema-fases-dashboard', 'sistema-fases-config',
    'productividad', 'productividad-config',
    'mensajeria', 'marketing',
    'contenido', 'clic-connect', 'university', 'mi-entrenamiento',
    'usuarios', 'configuracion', 'web-paginas', 'web-tema',
  ];

  // IDs obsoletos que ya no coinciden con el sidebar
  const oldModuleIds = [
    'dashboard', 'clientes', 'agenda', 'equipo', 'reportes',
    'web-componentes', 'blog', 'media',
    'roles', 'facturacion',
    'redes-sociales', 'cursos', 'certificaciones',
  ];

  // 1. Eliminar roles_modulos que referencien módulos obsoletos
  await knex('roles_modulos')
    .whereIn('modulo_id', oldModuleIds)
    .del();

  // 2. Eliminar roles_templates_modulos que referencien módulos obsoletos (si existen)
  const hasTemplatesModulos = await knex.schema.hasTable('roles_templates_modulos');
  if (hasTemplatesModulos) {
    await knex('roles_templates_modulos')
      .whereIn('modulo_id', oldModuleIds)
      .del();
  }

  // 3. Eliminar módulos obsoletos
  await knex('modulos')
    .whereIn('id', oldModuleIds)
    .del();

  // 4. Insertar/actualizar módulos actuales (sin padre primero para respetar FK)
  const modulosPadre = [
    // CRM
    { id: 'propiedades', nombre: 'Propiedades', descripcion: 'Gestión de propiedades inmobiliarias', icono: 'home', categoria: 'crm', orden: 1, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/propiedades' },
    { id: 'contactos', nombre: 'Contactos', descripcion: 'Gestión de contactos y leads', icono: 'users', categoria: 'crm', orden: 2, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/contactos' },
    { id: 'pipeline', nombre: 'Pipeline', descripcion: 'Pipeline de ventas', icono: 'columns', categoria: 'crm', orden: 3, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/pipeline' },
    { id: 'propuestas', nombre: 'Propuestas', descripcion: 'Gestión de propuestas comerciales', icono: 'file-text', categoria: 'crm', orden: 4, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/propuestas' },
    { id: 'actividades', nombre: 'Seguimiento', descripcion: 'Seguimiento de actividades y tareas', icono: 'activity', categoria: 'crm', orden: 5, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/actividades' },
    { id: 'metas', nombre: 'Metas', descripcion: 'Gestión de metas y objetivos', icono: 'target', categoria: 'crm', orden: 6, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/metas' },

    // Finanzas (padre)
    { id: 'finanzas', nombre: 'Finanzas', descripcion: 'Módulo financiero', icono: 'dollar-sign', categoria: 'finanzas', orden: 10, activo: true, es_submenu: false, modulo_padre_id: null, ruta: null },

    // Sistema Fases (padre)
    { id: 'sistema-fases', nombre: 'Sistema Fases', descripcion: 'Sistema de fases y rendimiento', icono: 'layers', categoria: 'rendimiento', orden: 20, activo: true, es_submenu: false, modulo_padre_id: null, ruta: null },

    // Productividad (padre)
    { id: 'productividad', nombre: 'Productividad', descripcion: 'Métricas de productividad', icono: 'bar-chart', categoria: 'rendimiento', orden: 23, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/productividad' },

    // Comunicación
    { id: 'mensajeria', nombre: 'Mensajería', descripcion: 'Centro de mensajes y comunicación', icono: 'message-square', categoria: 'comunicacion', orden: 30, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/mensajeria' },
    { id: 'marketing', nombre: 'Marketing', descripcion: 'Campañas y automatizaciones', icono: 'box', categoria: 'comunicacion', orden: 31, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/marketing' },

    // Features
    { id: 'contenido', nombre: 'Contenido', descripcion: 'Gestión de contenido y artículos', icono: 'file-text', categoria: 'features', orden: 40, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/contenido' },
    { id: 'clic-connect', nombre: 'CLIC Connect', descripcion: 'Red de conexión entre agentes', icono: 'globe', categoria: 'features', orden: 41, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/clic-connect' },
    { id: 'university', nombre: 'University', descripcion: 'Plataforma de formación y cursos', icono: 'book-open', categoria: 'features', orden: 42, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/university' },
    { id: 'mi-entrenamiento', nombre: 'Mi Entrenamiento', descripcion: 'Progreso personal de formación', icono: 'book', categoria: 'features', orden: 43, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/mi-entrenamiento' },

    // Admin
    { id: 'usuarios', nombre: 'Usuarios', descripcion: 'Gestión de usuarios del tenant', icono: 'users', categoria: 'admin', orden: 50, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/usuarios' },
    { id: 'configuracion', nombre: 'Configuración', descripcion: 'Configuración general del tenant', icono: 'settings', categoria: 'admin', orden: 51, activo: true, es_submenu: false, modulo_padre_id: null, ruta: '/crm/:tenantSlug/configuracion' },
  ];

  // Insertar padres primero
  for (const modulo of modulosPadre) {
    await knex.raw(`
      INSERT INTO modulos (id, nombre, descripcion, icono, categoria, orden, activo, es_submenu, modulo_padre_id, ruta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        icono = EXCLUDED.icono,
        categoria = EXCLUDED.categoria,
        orden = EXCLUDED.orden,
        activo = EXCLUDED.activo,
        es_submenu = EXCLUDED.es_submenu,
        modulo_padre_id = EXCLUDED.modulo_padre_id,
        ruta = EXCLUDED.ruta,
        updated_at = CURRENT_TIMESTAMP
    `, [
      modulo.id, modulo.nombre, modulo.descripcion, modulo.icono,
      modulo.categoria, modulo.orden, modulo.activo, modulo.es_submenu,
      modulo.modulo_padre_id, modulo.ruta
    ]);
  }

  // 5. Insertar sub-módulos (con modulo_padre_id)
  const modulosHijos = [
    // Finanzas hijos
    { id: 'finanzas-ventas', nombre: 'Ventas', descripcion: 'Ventas cerradas y en proceso', icono: 'shopping-cart', categoria: 'finanzas', orden: 11, activo: true, es_submenu: true, modulo_padre_id: 'finanzas', ruta: '/crm/:tenantSlug/finanzas/ventas' },
    { id: 'finanzas-comisiones', nombre: 'Comisiones', descripcion: 'Comisiones de agentes', icono: 'dollar-sign', categoria: 'finanzas', orden: 12, activo: true, es_submenu: true, modulo_padre_id: 'finanzas', ruta: '/crm/:tenantSlug/finanzas/comisiones' },
    { id: 'finanzas-facturas', nombre: 'Mis Facturas', descripcion: 'Facturas personales', icono: 'file-text', categoria: 'finanzas', orden: 13, activo: true, es_submenu: true, modulo_padre_id: 'finanzas', ruta: '/crm/:tenantSlug/finanzas/facturas' },
    { id: 'finanzas-config', nombre: 'Configuración Finanzas', descripcion: 'Configuración del módulo financiero', icono: 'settings', categoria: 'finanzas', orden: 14, activo: true, es_submenu: true, modulo_padre_id: 'finanzas', ruta: '/crm/:tenantSlug/finanzas/configuracion' },

    // Sistema Fases hijos
    { id: 'sistema-fases-dashboard', nombre: 'Fases', descripcion: 'Dashboard de fases del sistema', icono: 'layout-dashboard', categoria: 'rendimiento', orden: 21, activo: true, es_submenu: true, modulo_padre_id: 'sistema-fases', ruta: '/crm/:tenantSlug/sistema-fases' },
    { id: 'sistema-fases-config', nombre: 'Config. Fases', descripcion: 'Configuración del sistema de fases', icono: 'settings', categoria: 'rendimiento', orden: 22, activo: true, es_submenu: true, modulo_padre_id: 'sistema-fases', ruta: '/crm/:tenantSlug/sistema-fases/configuracion' },

    // Productividad hijo
    { id: 'productividad-config', nombre: 'Config. Productividad', descripcion: 'Configuración de productividad', icono: 'settings', categoria: 'rendimiento', orden: 24, activo: true, es_submenu: true, modulo_padre_id: 'productividad', ruta: '/crm/:tenantSlug/productividad/configuracion' },

    // Config hijos
    { id: 'web-paginas', nombre: 'Páginas Web', descripcion: 'Gestión de páginas del sitio web', icono: 'file', categoria: 'admin', orden: 52, activo: true, es_submenu: true, modulo_padre_id: 'configuracion', ruta: '/crm/:tenantSlug/web/paginas' },
    { id: 'web-tema', nombre: 'Tema', descripcion: 'Diseño y tema del sitio web', icono: 'palette', categoria: 'admin', orden: 53, activo: true, es_submenu: true, modulo_padre_id: 'configuracion', ruta: '/crm/:tenantSlug/web/tema' },
  ];

  for (const modulo of modulosHijos) {
    await knex.raw(`
      INSERT INTO modulos (id, nombre, descripcion, icono, categoria, orden, activo, es_submenu, modulo_padre_id, ruta)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET
        nombre = EXCLUDED.nombre,
        descripcion = EXCLUDED.descripcion,
        icono = EXCLUDED.icono,
        categoria = EXCLUDED.categoria,
        orden = EXCLUDED.orden,
        activo = EXCLUDED.activo,
        es_submenu = EXCLUDED.es_submenu,
        modulo_padre_id = EXCLUDED.modulo_padre_id,
        ruta = EXCLUDED.ruta,
        updated_at = CURRENT_TIMESTAMP
    `, [
      modulo.id, modulo.nombre, modulo.descripcion, modulo.icono,
      modulo.categoria, modulo.orden, modulo.activo, modulo.es_submenu,
      modulo.modulo_padre_id, modulo.ruta
    ]);
  }

  // 6. Asignar todos los módulos a roles de plataforma (super_admin, platform_admin)
  // y a tenant_owner con permisos completos
  const platformRoles = await knex('roles')
    .whereIn('codigo', ['super_admin', 'platform_admin', 'tenant_owner'])
    .select('id', 'codigo');

  const allModuleIds = [...modulosPadre.map(m => m.id), ...modulosHijos.map(m => m.id)];

  for (const rol of platformRoles) {
    for (const moduloId of allModuleIds) {
      await knex.raw(`
        INSERT INTO roles_modulos (rol_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar, alcance_ver, alcance_editar)
        VALUES (?, ?, true, true, true, true, 'all', 'all')
        ON CONFLICT (rol_id, modulo_id) DO UPDATE SET
          puede_ver = true,
          puede_crear = true,
          puede_editar = true,
          puede_eliminar = true,
          alcance_ver = 'all',
          alcance_editar = 'all',
          updated_at = CURRENT_TIMESTAMP
      `, [rol.id, moduloId]);
    }
  }

  // 7. Asignar módulos básicos a tenant_admin (todo excepto finanzas-config)
  const tenantAdmin = await knex('roles').where('codigo', 'tenant_admin').first();
  if (tenantAdmin) {
    const adminModules = allModuleIds.filter(id => id !== 'finanzas-config');
    for (const moduloId of adminModules) {
      await knex.raw(`
        INSERT INTO roles_modulos (rol_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar, alcance_ver, alcance_editar)
        VALUES (?, ?, true, true, true, ?, 'all', 'all')
        ON CONFLICT (rol_id, modulo_id) DO UPDATE SET
          puede_ver = true,
          puede_crear = true,
          puede_editar = true,
          alcance_ver = 'all',
          alcance_editar = 'all',
          updated_at = CURRENT_TIMESTAMP
      `, [tenantAdmin.id, moduloId, moduloId !== 'configuracion']);
    }
  }

  // 8. Asignar módulos básicos a tenant_user (CRM básico, solo propios)
  const tenantUser = await knex('roles').where('codigo', 'tenant_user').first();
  if (tenantUser) {
    const userModules = ['propiedades', 'contactos', 'pipeline', 'actividades', 'metas', 'mi-entrenamiento'];
    for (const moduloId of userModules) {
      await knex.raw(`
        INSERT INTO roles_modulos (rol_id, modulo_id, puede_ver, puede_crear, puede_editar, puede_eliminar, alcance_ver, alcance_editar)
        VALUES (?, ?, true, true, true, false, ?, 'own')
        ON CONFLICT (rol_id, modulo_id) DO UPDATE SET
          puede_ver = true,
          puede_crear = true,
          puede_editar = true,
          puede_eliminar = false,
          alcance_ver = EXCLUDED.alcance_ver,
          alcance_editar = 'own',
          updated_at = CURRENT_TIMESTAMP
      `, [tenantUser.id, moduloId, moduloId === 'propiedades' ? 'all' : 'own']);
    }
  }
}
