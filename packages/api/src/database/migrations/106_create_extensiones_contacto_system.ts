import { Knex } from 'knex';

/**
 * Migración 106: Sistema de Extensiones de Contacto Configurable
 *
 * Crea las tablas necesarias para un sistema flexible de extensiones de contacto:
 * - catalogo_extensiones_contacto: Define las extensiones disponibles (globales y por tenant)
 * - contacto_extensiones: Almacena los datos de extensiones de cada contacto
 * - tenant_extension_preferencias: Preferencias de activación por tenant
 *
 * ARQUITECTURA:
 * - Las extensiones de sistema (es_sistema=true) vienen predefinidas y no se pueden eliminar
 * - Los tenants pueden crear extensiones personalizadas
 * - Los tenants pueden activar/desactivar extensiones globales
 * - Cada extensión define su schema de campos en campos_schema (JSONB)
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA CATALOGO_EXTENSIONES_CONTACTO ====================
  const hasCatalogo = await knex.schema.hasTable('catalogo_extensiones_contacto');
  if (!hasCatalogo) {
    await knex.schema.createTable('catalogo_extensiones_contacto', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.string('codigo', 50).notNullable();
    table.string('nombre', 100).notNullable();
    table.text('descripcion').nullable();
    table.string('icono', 50).nullable();
    table.string('color', 20).nullable();

    // Schema de campos del formulario
    table.jsonb('campos_schema').notNullable().defaultTo('[]');

    table.integer('orden').defaultTo(0);
    table.boolean('activo').defaultTo(true);
    table.boolean('es_sistema').defaultTo(false);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_cat_ext_contacto_tenant');
    table.index('codigo', 'idx_cat_ext_contacto_codigo');
    table.index('activo', 'idx_cat_ext_contacto_activo');

    // Código único por tenant (o global si null)
    table.unique(['tenant_id', 'codigo'], { indexName: 'uq_cat_ext_contacto_tenant_codigo' });
    });
  }

  // ==================== TABLA CONTACTO_EXTENSIONES ====================
  const hasContactoExt = await knex.schema.hasTable('contacto_extensiones');
  if (!hasContactoExt) {
    await knex.schema.createTable('contacto_extensiones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('contacto_id').notNullable().references('id').inTable('contactos').onDelete('CASCADE');
    table.uuid('extension_id').notNullable().references('id').inTable('catalogo_extensiones_contacto').onDelete('CASCADE');

    // Datos del formulario
    table.jsonb('datos').notNullable().defaultTo('{}');

    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by').nullable().references('id').inTable('usuarios').onDelete('SET NULL');

    // Índices
    table.index('tenant_id', 'idx_contacto_ext_tenant');
    table.index('contacto_id', 'idx_contacto_ext_contacto');
    table.index('extension_id', 'idx_contacto_ext_extension');

    // Un contacto solo puede tener una vez cada extensión
    table.unique(['contacto_id', 'extension_id'], { indexName: 'uq_contacto_extension' });
    });
  }

  // ==================== TABLA TENANT_EXTENSION_PREFERENCIAS ====================
  const hasTenantPref = await knex.schema.hasTable('tenant_extension_preferencias');
  if (!hasTenantPref) {
    await knex.schema.createTable('tenant_extension_preferencias', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('extension_id').notNullable().references('id').inTable('catalogo_extensiones_contacto').onDelete('CASCADE');
    table.boolean('activo').notNullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_tenant_ext_pref_tenant');

    // Una preferencia por tenant/extensión
    table.unique(['tenant_id', 'extension_id'], { indexName: 'uq_tenant_extension_pref' });
    });
  }

  // ==================== SEED DE EXTENSIONES DE SISTEMA ====================
  // Solo insertar si no existen
  const existingExtensions = await knex('catalogo_extensiones_contacto').where({ es_sistema: true }).first();
  if (existingExtensions) {
    console.log('✅ Extensiones de sistema ya existen, saltando seed');
    return;
  }
  const extensionesSistema = [
    {
      codigo: 'lead',
      nombre: 'Lead',
      descripcion: 'Prospecto interesado en comprar/rentar',
      icono: 'UserPlus',
      color: '#3b82f6',
      orden: 1,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'fuente_lead', label: 'Fuente del Lead', tipo: 'select', opciones: ['web', 'referido', 'portal', 'redes_sociales', 'llamada', 'otro'], requerido: false, orden: 1 },
        { campo: 'interes_tipo', label: 'Tipo de Interés', tipo: 'select', opciones: ['compra', 'renta', 'inversion'], requerido: false, orden: 2 },
        { campo: 'presupuesto_min', label: 'Presupuesto Mínimo', tipo: 'currency', requerido: false, orden: 3 },
        { campo: 'presupuesto_max', label: 'Presupuesto Máximo', tipo: 'currency', requerido: false, orden: 4 },
        { campo: 'zona_interes', label: 'Zona de Interés', tipo: 'text', requerido: false, orden: 5 }
      ])
    },
    {
      codigo: 'cliente',
      nombre: 'Cliente',
      descripcion: 'Ha cerrado al menos una operación',
      icono: 'UserCheck',
      color: '#16a34a',
      orden: 2,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'fecha_primera_operacion', label: 'Fecha Primera Operación', tipo: 'date', requerido: false, orden: 1 },
        { campo: 'total_operaciones', label: 'Total de Operaciones', tipo: 'number', requerido: false, orden: 2 },
        { campo: 'valor_total_operaciones', label: 'Valor Total Operaciones', tipo: 'currency', requerido: false, orden: 3 },
        { campo: 'preferencias_contacto', label: 'Preferencia de Contacto', tipo: 'select', opciones: ['email', 'telefono', 'whatsapp'], requerido: false, orden: 4 }
      ])
    },
    {
      codigo: 'asesor_inmobiliario',
      nombre: 'Asesor Inmobiliario',
      descripcion: 'Asesor que trabaja con nosotros o externa',
      icono: 'Briefcase',
      color: '#7c3aed',
      orden: 3,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'licencia_inmobiliaria', label: 'Licencia Inmobiliaria', tipo: 'text', requerido: false, orden: 1 },
        { campo: 'inmobiliaria', label: 'Inmobiliaria', tipo: 'text', requerido: false, orden: 2 },
        { campo: 'especialidad', label: 'Especialidad', tipo: 'select', opciones: ['residencial', 'comercial', 'industrial', 'terrenos', 'lujo'], requerido: false, orden: 3 },
        { campo: 'zonas_trabajo', label: 'Zonas de Trabajo', tipo: 'text', requerido: false, orden: 4 },
        { campo: 'comision_default', label: 'Comisión Default (%)', tipo: 'percentage', requerido: false, orden: 5 }
      ])
    },
    {
      codigo: 'desarrollador',
      nombre: 'Desarrollador',
      descripcion: 'Empresa o persona que desarrolla proyectos',
      icono: 'Building2',
      color: '#4338ca',
      orden: 4,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'razon_social', label: 'Razón Social', tipo: 'text', requerido: false, orden: 1 },
        { campo: 'rfc', label: 'RFC/RNC', tipo: 'text', requerido: false, orden: 2 },
        { campo: 'tipo_desarrollos', label: 'Tipo de Desarrollos', tipo: 'select', opciones: ['residencial', 'comercial', 'mixto', 'industrial'], requerido: false, orden: 3 },
        { campo: 'proyectos_activos', label: 'Proyectos Activos', tipo: 'number', requerido: false, orden: 4 },
        { campo: 'sitio_web', label: 'Sitio Web', tipo: 'url', requerido: false, orden: 5 }
      ])
    },
    {
      codigo: 'referidor',
      nombre: 'Referidor',
      descripcion: 'Refiere clientes a cambio de comisión',
      icono: 'Users',
      color: '#be185d',
      orden: 5,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'tipo_referidor', label: 'Tipo de Referidor', tipo: 'select', opciones: ['particular', 'profesional', 'empresa'], requerido: false, orden: 1 },
        { campo: 'comision_referido', label: 'Comisión Referido (%)', tipo: 'percentage', requerido: false, orden: 2 },
        { campo: 'total_referidos', label: 'Total Referidos', tipo: 'number', requerido: false, orden: 3 },
        { campo: 'referidos_convertidos', label: 'Referidos Convertidos', tipo: 'number', requerido: false, orden: 4 },
        { campo: 'metodo_pago', label: 'Método de Pago', tipo: 'select', opciones: ['transferencia', 'cheque', 'efectivo'], requerido: false, orden: 5 }
      ])
    },
    {
      codigo: 'propietario',
      nombre: 'Propietario',
      descripcion: 'Dueño de propiedades en cartera',
      icono: 'Home',
      color: '#b45309',
      orden: 6,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'total_propiedades', label: 'Total Propiedades', tipo: 'number', requerido: false, orden: 1 },
        { campo: 'tipo_propiedades', label: 'Tipo de Propiedades', tipo: 'select', opciones: ['residencial', 'comercial', 'terreno', 'mixto'], requerido: false, orden: 2 },
        { campo: 'disponibilidad_visitas', label: 'Disponibilidad Visitas', tipo: 'select', opciones: ['flexible', 'solo_citas', 'restringido'], requerido: false, orden: 3 },
        { campo: 'exclusividad', label: 'Exclusividad', tipo: 'select', opciones: ['exclusiva', 'abierta', 'preferente'], requerido: false, orden: 4 }
      ])
    },
    {
      codigo: 'master_broker',
      nombre: 'Master Broker',
      descripcion: 'Broker principal o socio estratégico',
      icono: 'Award',
      color: '#0d9488',
      orden: 7,
      es_sistema: true,
      campos_schema: JSON.stringify([
        { campo: 'empresa_broker', label: 'Empresa/Broker', tipo: 'text', requerido: false, orden: 1 },
        { campo: 'territorios', label: 'Territorios', tipo: 'text', requerido: false, orden: 2 },
        { campo: 'comision_override', label: 'Comisión Override (%)', tipo: 'percentage', requerido: false, orden: 3 },
        { campo: 'nivel_acuerdo', label: 'Nivel de Acuerdo', tipo: 'select', opciones: ['oro', 'plata', 'bronce', 'basico'], requerido: false, orden: 4 }
      ])
    }
  ];

  // Insertar extensiones de sistema (tenant_id = NULL = global)
  for (const ext of extensionesSistema) {
    await knex('catalogo_extensiones_contacto').insert({
      tenant_id: null,
      ...ext,
      activo: true
    });
  }

  console.log(`✅ Creadas ${extensionesSistema.length} extensiones de sistema`);
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar en orden inverso por dependencias
  await knex.schema.dropTableIfExists('tenant_extension_preferencias');
  await knex.schema.dropTableIfExists('contacto_extensiones');
  await knex.schema.dropTableIfExists('catalogo_extensiones_contacto');
}
