import { Knex } from 'knex';

/**
 * Migración - Tablas de Tracking de Uso
 *
 * Crea las tablas para monitorear el uso de recursos por tenant:
 * - uso_tenant: Contadores en tiempo real por período de facturación
 * - historial_uso: Log de eventos para auditoría y facturación detallada
 */
export async function up(knex: Knex): Promise<void> {
  // ==================== TABLA USO_TENANT ====================
  await knex.schema.createTable('uso_tenant', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Contadores actuales (se actualizan en tiempo real)
    table.integer('usuarios_activos').defaultTo(0).comment('Usuarios activos actualmente');
    table.integer('propiedades_activas').defaultTo(0).comment('Propiedades activas (no eliminadas)');
    table.integer('propiedades_publicadas').defaultTo(0).comment('Propiedades publicadas (estado != inactiva)');

    // Máximos del período (para facturación - se cobra el máximo alcanzado)
    table.integer('usuarios_max_periodo').defaultTo(0).comment('Máximo de usuarios en el período');
    table.integer('propiedades_max_periodo').defaultTo(0).comment('Máximo de propiedades publicadas en el período');

    // Features activos con costo adicional
    table.jsonb('features_activos').defaultTo('[]')
      .comment('Array: [{feature_id, nombre, fecha_activacion, precio_mensual}]');

    // Período de facturación
    table.date('periodo_inicio').notNullable().comment('Inicio del período de facturación');
    table.date('periodo_fin').notNullable().comment('Fin del período de facturación');

    // Cálculos pre-computados (se actualizan al calcular factura)
    table.decimal('costo_base_periodo', 10, 2).defaultTo(0);
    table.decimal('costo_usuarios_extra', 10, 2).defaultTo(0);
    table.decimal('costo_propiedades_extra', 10, 2).defaultTo(0);
    table.decimal('costo_features_extra', 10, 2).defaultTo(0);
    table.decimal('costo_total_periodo', 10, 2).defaultTo(0);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Restricciones
    table.unique(['tenant_id', 'periodo_inicio'], { indexName: 'idx_uso_tenant_periodo_unique' });

    // Índices
    table.index('tenant_id', 'idx_uso_tenant_tenant');
    table.index(['periodo_inicio', 'periodo_fin'], 'idx_uso_tenant_periodo');
  });

  // ==================== TABLA HISTORIAL_USO ====================
  await knex.schema.createTable('historial_uso', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    // Tipo de evento
    table.string('tipo_evento', 50).notNullable()
      .comment('usuario_creado, usuario_eliminado, propiedad_creada, propiedad_publicada, etc.');

    // Referencia al recurso afectado
    table.string('recurso_tipo', 50).nullable().comment('usuario, propiedad, feature');
    table.uuid('recurso_id').nullable().comment('ID del recurso afectado');
    table.string('recurso_nombre', 255).nullable().comment('Nombre/identificador del recurso para referencia');

    // Snapshot de contadores al momento del evento
    table.integer('usuarios_activos').nullable();
    table.integer('propiedades_activas').nullable();
    table.integer('propiedades_publicadas').nullable();

    // Impacto en facturación
    table.boolean('es_cobrable').defaultTo(false).comment('Si genera costo adicional');
    table.decimal('costo_impacto', 10, 2).defaultTo(0).comment('Costo adicional generado');
    table.string('moneda', 3).defaultTo('USD');

    // Metadata adicional
    table.jsonb('datos_extra').defaultTo('{}').comment('Datos adicionales del evento');
    table.uuid('usuario_ejecutor_id').nullable().comment('Usuario que realizó la acción');
    table.string('ip_address', 45).nullable();

    // Timestamp
    table.timestamp('created_at').defaultTo(knex.fn.now());

    // Índices
    table.index('tenant_id', 'idx_historial_uso_tenant');
    table.index('tipo_evento', 'idx_historial_uso_tipo');
    table.index('created_at', 'idx_historial_uso_fecha');
    table.index('recurso_tipo', 'idx_historial_uso_recurso_tipo');
    table.index(['tenant_id', 'created_at'], 'idx_historial_uso_tenant_fecha');
  });

  console.log('✅ Tablas uso_tenant e historial_uso creadas');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('historial_uso');
  await knex.schema.dropTableIfExists('uso_tenant');
}
