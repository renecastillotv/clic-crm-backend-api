/**
 * Migración 117: Crear tabla ventas_historial
 *
 * Audit log de todos los cambios en ventas, cobros, comisiones y pagos.
 * Permite trazabilidad completa y posibilidad de auditar cambios.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ventas_historial (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

      -- Tipo de cambio
      tipo_cambio VARCHAR(50) NOT NULL,
      -- Valores posibles:
      -- 'venta_creada', 'venta_editada', 'venta_cancelada', 'venta_completada',
      -- 'cobro_registrado', 'cobro_editado', 'cobro_eliminado',
      -- 'distribucion_creada', 'distribucion_modificada',
      -- 'comision_agregada', 'comision_editada', 'comision_eliminada',
      -- 'pago_registrado', 'pago_editado', 'pago_eliminado'

      -- Entidad afectada
      entidad VARCHAR(50),
      entidad_id UUID,

      -- Datos del cambio (para poder revertir si es necesario)
      datos_anteriores JSONB,
      datos_nuevos JSONB,

      -- Descripción legible para mostrar en UI
      descripcion TEXT NOT NULL,

      -- Quién hizo el cambio
      usuario_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      usuario_nombre VARCHAR(200),

      -- Metadata adicional
      ip_address VARCHAR(45),
      user_agent TEXT,

      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_ventas_historial_tenant ON ventas_historial(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ventas_historial_venta ON ventas_historial(venta_id);
    CREATE INDEX IF NOT EXISTS idx_ventas_historial_tipo ON ventas_historial(tipo_cambio);
    CREATE INDEX IF NOT EXISTS idx_ventas_historial_fecha ON ventas_historial(created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ventas_historial_usuario ON ventas_historial(usuario_id);

    -- Comentarios
    COMMENT ON TABLE ventas_historial IS 'Audit log de todos los cambios en ventas y comisiones';
    COMMENT ON COLUMN ventas_historial.tipo_cambio IS 'Tipo de operación realizada';
    COMMENT ON COLUMN ventas_historial.datos_anteriores IS 'Estado antes del cambio (para auditoría)';
    COMMENT ON COLUMN ventas_historial.datos_nuevos IS 'Estado después del cambio';
    COMMENT ON COLUMN ventas_historial.descripcion IS 'Descripción legible del cambio para mostrar en UI';
  `);

  console.log('✅ Tabla ventas_historial creada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS ventas_historial CASCADE;
  `);
  console.log('✅ Tabla ventas_historial eliminada');
}
