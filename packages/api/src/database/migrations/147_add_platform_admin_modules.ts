import { Knex } from 'knex';

/**
 * Migración 147 - Agregar módulos del panel de administración de plataforma
 *
 * El panel de administración de la plataforma (AdminLayout) tiene secciones
 * que no estaban definidas en la tabla de módulos. Estos son diferentes
 * a los módulos del CRM de cada tenant.
 *
 * Nueva categoría: platform-admin
 */
export async function up(knex: Knex): Promise<void> {
  // Insertar módulos del panel de administración de plataforma
  await knex('modulos').insert([
    // Platform Admin - Panel de Administración de la Plataforma
    {
      id: 'admin-dashboard',
      nombre: 'Dashboard Admin',
      descripcion: 'Dashboard principal del panel de administración de la plataforma',
      icono: 'layout-dashboard',
      categoria: 'platform-admin',
      orden: 1,
      activo: true
    },
    {
      id: 'admin-tenants',
      nombre: 'Gestión de Tenants',
      descripcion: 'Administración de todos los tenants de la plataforma',
      icono: 'building',
      categoria: 'platform-admin',
      orden: 2,
      activo: true
    },
    {
      id: 'admin-analytics',
      nombre: 'Analytics Plataforma',
      descripcion: 'Análisis y métricas globales de la plataforma',
      icono: 'chart-bar',
      categoria: 'platform-admin',
      orden: 3,
      activo: true
    },
    {
      id: 'admin-usuarios',
      nombre: 'Usuarios Globales',
      descripcion: 'Gestión de todos los usuarios de la plataforma',
      icono: 'users',
      categoria: 'platform-admin',
      orden: 4,
      activo: true
    },
    {
      id: 'admin-features',
      nombre: 'Gestión de Features',
      descripcion: 'Administración de features y sus asignaciones',
      icono: 'star',
      categoria: 'platform-admin',
      orden: 5,
      activo: true
    },
    {
      id: 'admin-memberships',
      nombre: 'Tipos de Membresía',
      descripcion: 'Gestión de tipos de membresía y sus precios',
      icono: 'crown',
      categoria: 'platform-admin',
      orden: 6,
      activo: true
    },
    {
      id: 'admin-usage',
      nombre: 'Uso y Costos',
      descripcion: 'Monitoreo de uso de recursos y costos por tenant',
      icono: 'activity',
      categoria: 'platform-admin',
      orden: 7,
      activo: true
    },
    {
      id: 'admin-paginas',
      nombre: 'Páginas Globales',
      descripcion: 'Gestión de páginas globales de la plataforma',
      icono: 'file-text',
      categoria: 'platform-admin',
      orden: 8,
      activo: true
    },
    {
      id: 'admin-plantillas',
      nombre: 'Plantillas',
      descripcion: 'Gestión de plantillas de páginas para tenants',
      icono: 'layout',
      categoria: 'platform-admin',
      orden: 9,
      activo: true
    },
    {
      id: 'admin-roles',
      nombre: 'Roles de Plataforma',
      descripcion: 'Gestión de roles del sistema',
      icono: 'shield',
      categoria: 'platform-admin',
      orden: 10,
      activo: true
    },
    {
      id: 'admin-permisos',
      nombre: 'Permisos de Módulos',
      descripcion: 'Configuración de permisos por rol y módulo',
      icono: 'lock',
      categoria: 'platform-admin',
      orden: 11,
      activo: true
    },
    {
      id: 'admin-facturacion',
      nombre: 'Facturación Plataforma',
      descripcion: 'Gestión de facturación y cobros de la plataforma',
      icono: 'credit-card',
      categoria: 'platform-admin',
      orden: 12,
      activo: true
    },
    {
      id: 'admin-ubicaciones',
      nombre: 'Ubicaciones',
      descripcion: 'Gestión de países, provincias, ciudades y sectores',
      icono: 'map-pin',
      categoria: 'platform-admin',
      orden: 13,
      activo: true
    },
    {
      id: 'admin-tags-global',
      nombre: 'Tags Globales',
      descripcion: 'Gestión de etiquetas globales de la plataforma',
      icono: 'tag',
      categoria: 'platform-admin',
      orden: 14,
      activo: true
    },
    {
      id: 'admin-configuracion',
      nombre: 'Configuración Plataforma',
      descripcion: 'Configuraciones generales de la plataforma',
      icono: 'settings',
      categoria: 'platform-admin',
      orden: 15,
      activo: true
    }
  ]);

  console.log('✅ Módulos del panel de administración de plataforma agregados');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar los módulos de platform-admin
  await knex('modulos')
    .whereIn('id', [
      'admin-dashboard',
      'admin-tenants',
      'admin-analytics',
      'admin-usuarios',
      'admin-features',
      'admin-memberships',
      'admin-usage',
      'admin-paginas',
      'admin-plantillas',
      'admin-roles',
      'admin-permisos',
      'admin-facturacion',
      'admin-ubicaciones',
      'admin-tags-global',
      'admin-configuracion'
    ])
    .delete();

  console.log('✅ Módulos del panel de administración de plataforma eliminados');
}
