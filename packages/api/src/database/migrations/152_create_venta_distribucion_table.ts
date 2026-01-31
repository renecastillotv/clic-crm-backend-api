/**
 * Migración 152: Crear tabla venta_distribucion
 *
 * Almacena el snapshot INMUTABLE de la distribución de comisiones
 * al momento de crear la venta. Este registro nunca se modifica,
 * solo se marca como "override" si el admin cambia la distribución.
 *
 * Beneficios:
 * 1. Una sola fuente de verdad para la distribución original
 * 2. Historial de quién cambió y por qué
 * 3. Auditoría completa
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migración 152: Creando tabla venta_distribucion\n');

  // Verificar si ya existe
  const exists = await knex.schema.hasTable('venta_distribucion');
  if (exists) {
    console.log('⏭️  Tabla venta_distribucion ya existe');
    return;
  }

  await knex.schema.createTable('venta_distribucion', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('venta_id').notNullable()
      .references('id').inTable('ventas').onDelete('CASCADE');

    // Referencia a la plantilla usada (opcional)
    table.uuid('plantilla_id').nullable()
      .references('id').inTable('catalogos').onDelete('SET NULL');

    // Contexto de la distribución
    table.string('tipo_propiedad', 50).nullable()
      .comment('lista, proyecto');
    table.string('escenario', 50).nullable()
      .comment('solo_capta, solo_vende, capta_y_vende');

    // Snapshot completo e INMUTABLE
    table.jsonb('distribucion_snapshot').notNullable()
      .comment('Snapshot completo de la distribución al crear la venta');
    /*
      Estructura del snapshot:
      {
        "porcentaje_comision": 5,
        "monto_comision_total": 5000,
        "participantes": [
          {
            "usuario_id": "uuid",
            "contacto_id": "uuid", // Si es externo
            "nombre": "Juan Pérez",
            "rol": "vendedor",
            "porcentaje": 50,
            "monto": 2500
          },
          ...
        ],
        "fees_aplicados": [
          {"rol": "mentor", "porcentaje": 5, "monto": 250}
        ],
        "plantilla_nombre": "Asesor Junior",
        "fecha_snapshot": "2026-01-31T..."
      }
    */

    // Control de modificaciones
    table.boolean('es_override').defaultTo(false)
      .comment('true si el admin modificó la distribución original');
    table.uuid('override_por_id').nullable()
      .references('id').inTable('usuarios').onDelete('SET NULL');
    table.timestamp('override_fecha').nullable();
    table.text('override_razon').nullable();

    // Distribución actual (puede diferir del snapshot si hay override)
    table.jsonb('distribucion_actual').nullable()
      .comment('Distribución actual si difiere del snapshot original');

    // Auditoría
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.unique(['venta_id'], { indexName: 'idx_venta_distribucion_venta_unique' });
    table.index('tenant_id', 'idx_venta_distribucion_tenant');
    table.index('plantilla_id', 'idx_venta_distribucion_plantilla');
    table.index('es_override', 'idx_venta_distribucion_override');
  });

  console.log('✅ Tabla venta_distribucion creada');

  // Agregar FK en comisiones hacia venta_distribucion
  console.log('➕ Agregando FK en comisiones...');
  await knex.raw(`
    ALTER TABLE comisiones ADD COLUMN IF NOT EXISTS
      venta_distribucion_id UUID REFERENCES venta_distribucion(id) ON DELETE SET NULL;
    CREATE INDEX IF NOT EXISTS idx_comisiones_venta_distribucion
      ON comisiones(venta_distribucion_id);
  `);

  // Migrar datos existentes: crear venta_distribucion para ventas que ya tienen comisiones
  console.log('🔄 Migrando distribuciones existentes...');

  const ventasConComisiones = await knex.raw(`
    SELECT DISTINCT
      v.id as venta_id,
      v.tenant_id,
      v.porcentaje_comision,
      v.monto_comision,
      p.tipo as tipo_propiedad
    FROM ventas v
    LEFT JOIN propiedades p ON v.propiedad_id = p.id
    WHERE EXISTS (SELECT 1 FROM comisiones c WHERE c.venta_id = v.id)
      AND NOT EXISTS (SELECT 1 FROM venta_distribucion vd WHERE vd.venta_id = v.id)
  `);

  let migradas = 0;
  for (const venta of ventasConComisiones.rows) {
    // Obtener participantes de esta venta
    const participantes = await knex('comisiones')
      .leftJoin('usuarios', 'comisiones.usuario_id', 'usuarios.id')
      .where('comisiones.venta_id', venta.venta_id)
      .select(
        'comisiones.id as comision_id',
        'comisiones.usuario_id',
        'comisiones.contacto_externo_id',
        'comisiones.monto',
        'comisiones.porcentaje',
        'comisiones.tipo_participante',
        'comisiones.escenario',
        'comisiones.snapshot_distribucion',
        'usuarios.nombre as usuario_nombre',
        'usuarios.apellido as usuario_apellido'
      );

    const participantesSnapshot = participantes.map(p => ({
      usuario_id: p.usuario_id,
      contacto_id: p.contacto_externo_id,
      nombre: p.usuario_nombre
        ? `${p.usuario_nombre} ${p.usuario_apellido || ''}`.trim()
        : 'Participante',
      rol: p.tipo_participante || 'vendedor',
      porcentaje: parseFloat(p.porcentaje) || 0,
      monto: parseFloat(p.monto) || 0
    }));

    const escenario = participantes[0]?.escenario || null;
    const tipoPropiedad = venta.tipo_propiedad?.toLowerCase().includes('proyecto')
      ? 'proyecto'
      : 'lista';

    const snapshot = {
      porcentaje_comision: parseFloat(venta.porcentaje_comision) || 0,
      monto_comision_total: parseFloat(venta.monto_comision) || 0,
      participantes: participantesSnapshot,
      fees_aplicados: [],
      fecha_snapshot: new Date().toISOString(),
      migrado_desde: 'comisiones_existentes'
    };

    // Insertar venta_distribucion
    const [distribucion] = await knex('venta_distribucion')
      .insert({
        tenant_id: venta.tenant_id,
        venta_id: venta.venta_id,
        tipo_propiedad: tipoPropiedad,
        escenario: escenario,
        distribucion_snapshot: JSON.stringify(snapshot),
        es_override: false
      })
      .returning('id');

    // Actualizar comisiones con la referencia
    await knex('comisiones')
      .where('venta_id', venta.venta_id)
      .update({ venta_distribucion_id: distribucion.id });

    migradas++;
  }

  console.log(`✅ ${migradas} distribuciones migradas`);
  console.log('\n✅ Migración 152 completada');
}

export async function down(knex: Knex): Promise<void> {
  // Eliminar FK de comisiones
  await knex.raw(`
    ALTER TABLE comisiones DROP COLUMN IF EXISTS venta_distribucion_id;
  `);

  // Eliminar tabla
  await knex.schema.dropTableIfExists('venta_distribucion');

  console.log('✅ Migración 152 revertida');
}
