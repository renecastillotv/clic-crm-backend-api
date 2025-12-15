import { Knex } from 'knex';

/**
 * Migración: Crear tabla de configuración de plataforma
 * 
 * Almacena configuraciones globales de la plataforma
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de configuración de plataforma
  await knex.schema.createTable('platform_config', (table) => {
    table.string('clave').primary().comment('Clave única de la configuración');
    table.string('categoria', 50).notNullable().comment('Categoría: general, integraciones, seguridad, notificaciones, etc.');
    table.text('valor').nullable().comment('Valor de la configuración (JSON o texto)');
    table.string('tipo', 20).defaultTo('string').comment('Tipo: string, number, boolean, json');
    table.text('descripcion').nullable().comment('Descripción de la configuración');
    table.boolean('es_sensible').defaultTo(false).comment('Si es un valor sensible (no mostrar en logs)');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    
    table.index('categoria', 'idx_platform_config_categoria');
  });

  // Insertar configuraciones por defecto
  await knex('platform_config').insert([
    // General
    { 
      clave: 'platform_name', 
      categoria: 'general', 
      valor: 'CLIC Platform', 
      tipo: 'string',
      descripcion: 'Nombre de la plataforma' 
    },
    { 
      clave: 'platform_domain', 
      categoria: 'general', 
      valor: 'dominiosaas.com', 
      tipo: 'string',
      descripcion: 'Dominio base de la plataforma' 
    },
    { 
      clave: 'support_email', 
      categoria: 'general', 
      valor: 'soporte@dominiosaas.com', 
      tipo: 'string',
      descripcion: 'Email de soporte' 
    },
    
    // Seguridad
    { 
      clave: 'password_min_length', 
      categoria: 'seguridad', 
      valor: '8', 
      tipo: 'number',
      descripcion: 'Longitud mínima de contraseña' 
    },
    { 
      clave: 'password_require_uppercase', 
      categoria: 'seguridad', 
      valor: 'true', 
      tipo: 'boolean',
      descripcion: 'Requerir mayúsculas en contraseñas' 
    },
    { 
      clave: 'session_timeout', 
      categoria: 'seguridad', 
      valor: '3600', 
      tipo: 'number',
      descripcion: 'Timeout de sesión en segundos' 
    },
    
    // SMTP/Email
    { 
      clave: 'smtp_enabled', 
      categoria: 'integraciones', 
      valor: 'false', 
      tipo: 'boolean',
      descripcion: 'Habilitar envío de emails vía SMTP' 
    },
    { 
      clave: 'smtp_host', 
      categoria: 'integraciones', 
      valor: '', 
      tipo: 'string',
      descripcion: 'Servidor SMTP',
      es_sensible: true
    },
    { 
      clave: 'smtp_port', 
      categoria: 'integraciones', 
      valor: '587', 
      tipo: 'number',
      descripcion: 'Puerto SMTP' 
    },
    { 
      clave: 'smtp_user', 
      categoria: 'integraciones', 
      valor: '', 
      tipo: 'string',
      descripcion: 'Usuario SMTP',
      es_sensible: true
    },
    { 
      clave: 'smtp_password', 
      categoria: 'integraciones', 
      valor: '', 
      tipo: 'string',
      descripcion: 'Contraseña SMTP',
      es_sensible: true
    },
    
    // Pagos
    { 
      clave: 'payment_gateway', 
      categoria: 'integraciones', 
      valor: 'stripe', 
      tipo: 'string',
      descripcion: 'Proveedor de pagos: stripe, paypal, etc.' 
    },
    
    // Notificaciones
    { 
      clave: 'notifications_enabled', 
      categoria: 'notificaciones', 
      valor: 'true', 
      tipo: 'boolean',
      descripcion: 'Habilitar notificaciones' 
    },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('platform_config');
}

