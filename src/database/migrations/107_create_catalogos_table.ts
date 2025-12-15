import { Knex } from 'knex';

/**
 * Tabla unificada de catálogos configurables por tenant
 *
 * Esta tabla permite a cada tenant personalizar elementos como:
 * - Tipos de propiedad (casa, apartamento, local, etc.)
 * - Tipos de operación (venta, alquiler, etc.)
 * - Tipos de contacto (cliente, propietario, desarrollador, etc.)
 * - Tipos de actividad (llamada, reunión, visita, etc.)
 * - Etiquetas de propiedad (exclusiva, destacada, rebajada, etc.)
 * - Tipos de documento (contrato, cédula, pasaporte, etc.)
 * - Especialidades de asesor (residencial, comercial, etc.)
 * - Tipos de asesor con % de comisión (senior, junior, etc.)
 *
 * Cada tenant hereda los valores globales (tenant_id = NULL) pero puede:
 * - Agregar sus propios valores personalizados
 * - Desactivar valores globales (activo = false en su tenant)
 *
 * La ubicaciones ya tienen su propia tabla dedicada (095_create_ubicaciones_table)
 */
export async function up(knex: Knex): Promise<void> {
  const hasTable = await knex.schema.hasTable('catalogos');

  if (!hasTable) {
    await knex.schema.createTable('catalogos', (table) => {
      table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

      // tenant_id NULL = valores globales de plataforma
      // tenant_id específico = valores personalizados del tenant
      table.uuid('tenant_id').nullable().references('id').inTable('tenants').onDelete('CASCADE');

      // Tipo de catálogo
      table.string('tipo', 50).notNullable().comment(
        'Tipo de catálogo: tipo_propiedad, tipo_operacion, tipo_contacto, tipo_actividad, etiqueta_propiedad, tipo_documento, especialidad_asesor, tipo_asesor, amenidad_custom'
      );

      // Información básica
      table.string('codigo', 50).notNullable().comment('Código único dentro del tipo y tenant (ej: "apartamento", "venta", "cliente")');
      table.string('nombre', 100).notNullable().comment('Nombre para mostrar');
      table.string('nombre_plural', 100).nullable().comment('Nombre en plural (ej: "Apartamentos")');
      table.text('descripcion').nullable();

      // Visualización
      table.string('icono', 100).nullable().comment('Nombre del icono (Lucide) o URL');
      table.string('color', 20).nullable().comment('Color en formato hex (#RRGGBB)');
      table.integer('orden').defaultTo(0).comment('Orden de visualización');

      // Estado
      table.boolean('activo').defaultTo(true);
      table.boolean('es_default').defaultTo(false).comment('Si es el valor por defecto para este tipo');

      // Configuración adicional (específico por tipo)
      // Para tipo_asesor: { comision_porcentaje: 50, nivel: 'senior' }
      // Para tipo_actividad: { requiere_fecha: true, requiere_contacto: true }
      // Para etiqueta_propiedad: { badge_style: 'success', mostrar_en_listado: true }
      table.jsonb('config').nullable().comment('Configuración adicional específica del tipo');

      // Traducciones multiidioma
      table.jsonb('traducciones').nullable().comment('{ es: { nombre: "...", descripcion: "..." }, en: {...}, pt: {...} }');

      // Metadata
      table.jsonb('metadata').nullable().comment('Campos adicionales libres');

      // Timestamps
      table.timestamp('created_at', { useTz: true }).defaultTo(knex.fn.now());
      table.timestamp('updated_at', { useTz: true }).defaultTo(knex.fn.now());

      // Índices
      table.index(['tenant_id', 'tipo']);
      table.index(['tipo', 'codigo']);
      table.index(['tipo', 'activo']);

      // Único por tenant + tipo + codigo
      table.unique(['tenant_id', 'tipo', 'codigo']);
    });

    console.log('✅ Created catalogos table');

    // Seed datos globales de plataforma (tenant_id = NULL)
    await knex('catalogos').insert([
      // === TIPOS DE PROPIEDAD ===
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'apartamento', nombre: 'Apartamento', nombre_plural: 'Apartamentos', icono: 'Building2', orden: 1, es_default: true },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'casa', nombre: 'Casa', nombre_plural: 'Casas', icono: 'Home', orden: 2 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'villa', nombre: 'Villa', nombre_plural: 'Villas', icono: 'Castle', orden: 3 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'penthouse', nombre: 'Penthouse', nombre_plural: 'Penthouses', icono: 'Building', orden: 4 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'local', nombre: 'Local Comercial', nombre_plural: 'Locales Comerciales', icono: 'Store', orden: 5 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'oficina', nombre: 'Oficina', nombre_plural: 'Oficinas', icono: 'Briefcase', orden: 6 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'terreno', nombre: 'Terreno', nombre_plural: 'Terrenos', icono: 'Map', orden: 7 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'nave', nombre: 'Nave Industrial', nombre_plural: 'Naves Industriales', icono: 'Warehouse', orden: 8 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'finca', nombre: 'Finca', nombre_plural: 'Fincas', icono: 'Trees', orden: 9 },
      { tenant_id: null, tipo: 'tipo_propiedad', codigo: 'solar', nombre: 'Solar', nombre_plural: 'Solares', icono: 'Square', orden: 10 },

      // === TIPOS DE OPERACIÓN ===
      { tenant_id: null, tipo: 'tipo_operacion', codigo: 'venta', nombre: 'Venta', nombre_plural: 'Ventas', icono: 'DollarSign', orden: 1, es_default: true },
      { tenant_id: null, tipo: 'tipo_operacion', codigo: 'alquiler', nombre: 'Alquiler', nombre_plural: 'Alquileres', icono: 'Key', orden: 2 },
      { tenant_id: null, tipo: 'tipo_operacion', codigo: 'alquiler_vacacional', nombre: 'Alquiler Vacacional', nombre_plural: 'Alquileres Vacacionales', icono: 'Umbrella', orden: 3 },
      { tenant_id: null, tipo: 'tipo_operacion', codigo: 'traspaso', nombre: 'Traspaso', nombre_plural: 'Traspasos', icono: 'ArrowRightLeft', orden: 4 },

      // === TIPOS DE CONTACTO ===
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'cliente', nombre: 'Cliente', nombre_plural: 'Clientes', icono: 'User', orden: 1, es_default: true, config: JSON.stringify({ puede_ser_comprador: true, puede_ser_inquilino: true }) },
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'propietario', nombre: 'Propietario', nombre_plural: 'Propietarios', icono: 'UserCheck', orden: 2, config: JSON.stringify({ puede_ser_vendedor: true, puede_ser_arrendador: true }) },
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'desarrollador', nombre: 'Desarrollador', nombre_plural: 'Desarrolladores', icono: 'Building2', orden: 3, config: JSON.stringify({ es_empresa: true }) },
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'inversionista', nombre: 'Inversionista', nombre_plural: 'Inversionistas', icono: 'TrendingUp', orden: 4 },
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'referido', nombre: 'Referido', nombre_plural: 'Referidos', icono: 'Users', orden: 5 },
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'proveedor', nombre: 'Proveedor', nombre_plural: 'Proveedores', icono: 'Truck', orden: 6 },
      { tenant_id: null, tipo: 'tipo_contacto', codigo: 'colaborador', nombre: 'Colaborador', nombre_plural: 'Colaboradores', icono: 'Handshake', orden: 7, config: JSON.stringify({ es_asesor_externo: true }) },

      // === TIPOS DE ACTIVIDAD ===
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'llamada', nombre: 'Llamada', icono: 'Phone', orden: 1, config: JSON.stringify({ requiere_nota: false, color: '#3B82F6' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'reunion', nombre: 'Reunión', icono: 'Users', orden: 2, config: JSON.stringify({ requiere_fecha: true, color: '#8B5CF6' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'visita', nombre: 'Visita a Propiedad', icono: 'MapPin', orden: 3, config: JSON.stringify({ requiere_propiedad: true, color: '#10B981' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'email', nombre: 'Email', icono: 'Mail', orden: 4, config: JSON.stringify({ color: '#F59E0B' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'whatsapp', nombre: 'WhatsApp', icono: 'MessageCircle', orden: 5, config: JSON.stringify({ color: '#22C55E' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'nota', nombre: 'Nota', icono: 'StickyNote', orden: 6, config: JSON.stringify({ color: '#6B7280' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'tarea', nombre: 'Tarea', icono: 'CheckSquare', orden: 7, config: JSON.stringify({ requiere_fecha_limite: true, color: '#EF4444' }) },
      { tenant_id: null, tipo: 'tipo_actividad', codigo: 'seguimiento', nombre: 'Seguimiento', icono: 'Clock', orden: 8, config: JSON.stringify({ requiere_fecha: true, color: '#0EA5E9' }) },

      // === ETIQUETAS DE PROPIEDAD ===
      { tenant_id: null, tipo: 'etiqueta_propiedad', codigo: 'exclusiva', nombre: 'Exclusiva', icono: 'Star', orden: 1, color: '#F59E0B', config: JSON.stringify({ badge_style: 'warning', mostrar_en_listado: true, mostrar_en_detalle: true }) },
      { tenant_id: null, tipo: 'etiqueta_propiedad', codigo: 'destacada', nombre: 'Destacada', icono: 'Award', orden: 2, color: '#8B5CF6', config: JSON.stringify({ badge_style: 'primary', mostrar_en_listado: true, mostrar_en_detalle: true }) },
      { tenant_id: null, tipo: 'etiqueta_propiedad', codigo: 'rebajada', nombre: 'Rebajada', icono: 'ArrowDown', orden: 3, color: '#EF4444', config: JSON.stringify({ badge_style: 'danger', mostrar_en_listado: true, mostrar_en_detalle: true }) },
      { tenant_id: null, tipo: 'etiqueta_propiedad', codigo: 'nueva', nombre: 'Nueva', icono: 'Sparkles', orden: 4, color: '#10B981', config: JSON.stringify({ badge_style: 'success', mostrar_en_listado: true }) },
      { tenant_id: null, tipo: 'etiqueta_propiedad', codigo: 'oportunidad', nombre: 'Oportunidad', icono: 'Zap', orden: 5, color: '#0EA5E9', config: JSON.stringify({ badge_style: 'info', mostrar_en_listado: true }) },

      // === TIPOS DE DOCUMENTO ===
      { tenant_id: null, tipo: 'tipo_documento', codigo: 'cedula', nombre: 'Cédula', orden: 1 },
      { tenant_id: null, tipo: 'tipo_documento', codigo: 'pasaporte', nombre: 'Pasaporte', orden: 2 },
      { tenant_id: null, tipo: 'tipo_documento', codigo: 'rnc', nombre: 'RNC', orden: 3, config: JSON.stringify({ es_empresa: true }) },
      { tenant_id: null, tipo: 'tipo_documento', codigo: 'licencia', nombre: 'Licencia de Conducir', orden: 4 },

      // === ESPECIALIDADES DE ASESOR ===
      { tenant_id: null, tipo: 'especialidad_asesor', codigo: 'residencial', nombre: 'Residencial', icono: 'Home', orden: 1, es_default: true },
      { tenant_id: null, tipo: 'especialidad_asesor', codigo: 'comercial', nombre: 'Comercial', icono: 'Store', orden: 2 },
      { tenant_id: null, tipo: 'especialidad_asesor', codigo: 'industrial', nombre: 'Industrial', icono: 'Warehouse', orden: 3 },
      { tenant_id: null, tipo: 'especialidad_asesor', codigo: 'terrenos', nombre: 'Terrenos', icono: 'Map', orden: 4 },
      { tenant_id: null, tipo: 'especialidad_asesor', codigo: 'lujo', nombre: 'Lujo', icono: 'Crown', orden: 5 },
      { tenant_id: null, tipo: 'especialidad_asesor', codigo: 'proyectos', nombre: 'Proyectos Nuevos', icono: 'Building2', orden: 6 },

      // === TIPOS DE ASESOR (con % comisión) ===
      { tenant_id: null, tipo: 'tipo_asesor', codigo: 'senior', nombre: 'Asesor Senior', orden: 1, config: JSON.stringify({ comision_porcentaje: 60, descripcion: 'Más de 5 años de experiencia' }) },
      { tenant_id: null, tipo: 'tipo_asesor', codigo: 'pleno', nombre: 'Asesor Pleno', orden: 2, config: JSON.stringify({ comision_porcentaje: 50, descripcion: '2-5 años de experiencia' }) },
      { tenant_id: null, tipo: 'tipo_asesor', codigo: 'junior', nombre: 'Asesor Junior', orden: 3, es_default: true, config: JSON.stringify({ comision_porcentaje: 40, descripcion: 'Menos de 2 años de experiencia' }) },
      { tenant_id: null, tipo: 'tipo_asesor', codigo: 'trainee', nombre: 'Asesor en Entrenamiento', orden: 4, config: JSON.stringify({ comision_porcentaje: 30, descripcion: 'En período de capacitación' }) },
      { tenant_id: null, tipo: 'tipo_asesor', codigo: 'asociado', nombre: 'Asociado Externo', orden: 5, config: JSON.stringify({ comision_porcentaje: 35, descripcion: 'Colaborador de otra inmobiliaria' }) },
    ]);

    console.log('✅ Seeded global catalog values');
  } else {
    console.log('ℹ️ Table catalogos already exists');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('catalogos');
}
