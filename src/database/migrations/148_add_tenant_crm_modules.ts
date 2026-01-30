import { Knex } from 'knex';

/**
 * Migración 148 - Agregar módulos faltantes del CRM de tenant
 *
 * Agrega nuevos módulos que se han creado en el CRM de tenants:
 * - CRM: planes-pago, metas
 * - Finanzas: ventas, comisiones, facturas, config
 * - Sistema Fases: fases, productividad, configs
 * - Mensajería: chats, correo, config (antes era un solo módulo)
 * - Documentos: mis-documentos, config
 * - Marketing: centro, creativos, campañas, redes sociales, leads, analytics, config
 */
export async function up(knex: Knex): Promise<void> {
  // Verificar módulos existentes para evitar duplicados
  const existingModules = await knex('modulos').select('id');
  const existingIds = new Set(existingModules.map(m => m.id));

  const newModules = [
    // ==================== CRM ====================
    {
      id: 'contactos',
      nombre: 'Contactos',
      descripcion: 'Gestión de contactos y leads del CRM',
      icono: 'users',
      categoria: 'crm',
      orden: 3,
      activo: true
    },
    {
      id: 'pipeline',
      nombre: 'Pipeline',
      descripcion: 'Pipeline de ventas y oportunidades',
      icono: 'git-branch',
      categoria: 'crm',
      orden: 4,
      activo: true
    },
    {
      id: 'propuestas',
      nombre: 'Propuestas',
      descripcion: 'Gestión de propuestas comerciales',
      icono: 'file-text',
      categoria: 'crm',
      orden: 5,
      activo: true
    },
    {
      id: 'planes-pago',
      nombre: 'Planes de Pago',
      descripcion: 'Gestión de planes de pago y financiamiento',
      icono: 'calendar',
      categoria: 'crm',
      orden: 6,
      activo: true
    },
    {
      id: 'actividades',
      nombre: 'Seguimiento',
      descripcion: 'Seguimiento de actividades y tareas',
      icono: 'check-square',
      categoria: 'crm',
      orden: 7,
      activo: true
    },
    {
      id: 'metas',
      nombre: 'Metas',
      descripcion: 'Gestión de metas y objetivos de ventas',
      icono: 'target',
      categoria: 'crm',
      orden: 8,
      activo: true
    },

    // ==================== FINANZAS ====================
    {
      id: 'finanzas-ventas',
      nombre: 'Ventas',
      descripcion: 'Gestión de ventas y transacciones',
      icono: 'dollar-sign',
      categoria: 'finanzas',
      orden: 40,
      activo: true
    },
    {
      id: 'finanzas-comisiones',
      nombre: 'Comisiones',
      descripcion: 'Gestión de comisiones de asesores',
      icono: 'percent',
      categoria: 'finanzas',
      orden: 41,
      activo: true
    },
    {
      id: 'finanzas-facturas',
      nombre: 'Mis Facturas',
      descripcion: 'Visualización de facturas propias',
      icono: 'file-invoice',
      categoria: 'finanzas',
      orden: 42,
      activo: true
    },
    {
      id: 'finanzas-config',
      nombre: 'Config. Finanzas',
      descripcion: 'Configuración del módulo de finanzas',
      icono: 'settings',
      categoria: 'finanzas',
      orden: 43,
      activo: true
    },

    // ==================== SISTEMA FASES Y PRODUCTIVIDAD ====================
    {
      id: 'sistema-fases',
      nombre: 'Sistema de Fases',
      descripcion: 'Dashboard y gestión de sistema de fases',
      icono: 'layers',
      categoria: 'sistema-fases',
      orden: 50,
      activo: true
    },
    {
      id: 'productividad',
      nombre: 'Productividad',
      descripcion: 'Métricas y dashboard de productividad',
      icono: 'trending-up',
      categoria: 'sistema-fases',
      orden: 51,
      activo: true
    },
    {
      id: 'sistema-fases-config',
      nombre: 'Config. Fases',
      descripcion: 'Configuración del sistema de fases',
      icono: 'settings',
      categoria: 'sistema-fases',
      orden: 52,
      activo: true
    },
    {
      id: 'productividad-config',
      nombre: 'Config. Productividad',
      descripcion: 'Configuración del módulo de productividad',
      icono: 'settings',
      categoria: 'sistema-fases',
      orden: 53,
      activo: true
    },

    // ==================== MENSAJERÍA ====================
    {
      id: 'mensajeria-chats',
      nombre: 'Chats',
      descripcion: 'Chat y mensajería con clientes',
      icono: 'message-circle',
      categoria: 'mensajeria',
      orden: 60,
      activo: true
    },
    {
      id: 'mensajeria-correo',
      nombre: 'Correo',
      descripcion: 'Gestión de correos electrónicos',
      icono: 'mail',
      categoria: 'mensajeria',
      orden: 61,
      activo: true
    },
    {
      id: 'mensajeria-config',
      nombre: 'Config. Mensajería',
      descripcion: 'Configuración del módulo de mensajería',
      icono: 'settings',
      categoria: 'mensajeria',
      orden: 62,
      activo: true
    },

    // ==================== DOCUMENTOS ====================
    {
      id: 'mis-documentos',
      nombre: 'Mis Documentos',
      descripcion: 'Biblioteca de documentos personales',
      icono: 'folder',
      categoria: 'documentos',
      orden: 70,
      activo: true
    },
    {
      id: 'documentos-config',
      nombre: 'Config. Documentos',
      descripcion: 'Configuración del módulo de documentos',
      icono: 'settings',
      categoria: 'documentos',
      orden: 71,
      activo: true
    },

    // ==================== MARKETING ====================
    {
      id: 'marketing-centro',
      nombre: 'Centro de Marketing',
      descripcion: 'Dashboard principal de marketing',
      icono: 'megaphone',
      categoria: 'marketing',
      orden: 80,
      activo: true
    },
    {
      id: 'marketing-creativos',
      nombre: 'Creativos',
      descripcion: 'Gestión de creativos y branding',
      icono: 'palette',
      categoria: 'marketing',
      orden: 81,
      activo: true
    },
    {
      id: 'marketing-campanas',
      nombre: 'Campañas',
      descripcion: 'Gestión de campañas de marketing',
      icono: 'zap',
      categoria: 'marketing',
      orden: 82,
      activo: true
    },
    {
      id: 'marketing-redes-sociales',
      nombre: 'Redes Sociales',
      descripcion: 'Gestión de redes sociales',
      icono: 'share-2',
      categoria: 'marketing',
      orden: 83,
      activo: true
    },
    {
      id: 'marketing-leads',
      nombre: 'Leads Marketing',
      descripcion: 'Gestión de leads de marketing',
      icono: 'user-plus',
      categoria: 'marketing',
      orden: 84,
      activo: true
    },
    {
      id: 'marketing-analytics',
      nombre: 'Analytics Marketing',
      descripcion: 'Análisis y métricas de marketing',
      icono: 'bar-chart-2',
      categoria: 'marketing',
      orden: 85,
      activo: true
    },
    {
      id: 'marketing-config',
      nombre: 'Config. Marketing',
      descripcion: 'Configuración del módulo de marketing',
      icono: 'settings',
      categoria: 'marketing',
      orden: 86,
      activo: true
    },
  ];

  // Filtrar módulos que no existen
  const modulesToInsert = newModules.filter(m => !existingIds.has(m.id));

  if (modulesToInsert.length > 0) {
    await knex('modulos').insert(modulesToInsert);
    console.log(`✅ ${modulesToInsert.length} módulos de tenant CRM agregados: ${modulesToInsert.map(m => m.id).join(', ')}`);
  } else {
    console.log('ℹ️ Todos los módulos ya existen, no se insertaron nuevos');
  }
}

export async function down(knex: Knex): Promise<void> {
  const moduleIds = [
    // CRM
    'contactos', 'pipeline', 'propuestas', 'planes-pago', 'actividades', 'metas',
    // Finanzas
    'finanzas-ventas', 'finanzas-comisiones', 'finanzas-facturas', 'finanzas-config',
    // Sistema Fases
    'sistema-fases', 'productividad', 'sistema-fases-config', 'productividad-config',
    // Mensajería
    'mensajeria-chats', 'mensajeria-correo', 'mensajeria-config',
    // Documentos
    'mis-documentos', 'documentos-config',
    // Marketing
    'marketing-centro', 'marketing-creativos', 'marketing-campanas',
    'marketing-redes-sociales', 'marketing-leads', 'marketing-analytics', 'marketing-config'
  ];

  await knex('modulos').whereIn('id', moduleIds).delete();
  console.log('✅ Módulos de tenant CRM eliminados');
}
