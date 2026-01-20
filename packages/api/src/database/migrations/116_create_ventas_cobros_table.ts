/**
 * Migración 116: Crear tabla ventas_cobros
 *
 * Registra los cobros que hace la empresa al cliente.
 * Separado de los pagos a asesores para mantener claridad contable.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // Crear tabla ventas_cobros
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ventas_cobros (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,

      -- Monto del cobro
      monto DECIMAL(15,2) NOT NULL,
      moneda VARCHAR(3) DEFAULT 'USD',

      -- Información del cobro
      fecha_cobro DATE NOT NULL,
      metodo_pago VARCHAR(50),
      referencia VARCHAR(100),
      banco VARCHAR(100),

      -- Documentación
      recibo_url VARCHAR(500),
      notas TEXT,

      -- Auditoría
      registrado_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      fecha_registro TIMESTAMP DEFAULT NOW(),

      -- Control
      activo BOOLEAN DEFAULT true,
      created_at TIMESTAMP DEFAULT NOW(),
      updated_at TIMESTAMP DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_ventas_cobros_tenant ON ventas_cobros(tenant_id);
    CREATE INDEX IF NOT EXISTS idx_ventas_cobros_venta ON ventas_cobros(venta_id);
    CREATE INDEX IF NOT EXISTS idx_ventas_cobros_fecha ON ventas_cobros(fecha_cobro);
    CREATE INDEX IF NOT EXISTS idx_ventas_cobros_activo ON ventas_cobros(activo);

    -- Comentarios
    COMMENT ON TABLE ventas_cobros IS 'Registra los cobros que hace la empresa (inmobiliaria) al cliente';
    COMMENT ON COLUMN ventas_cobros.monto IS 'Monto cobrado al cliente';
    COMMENT ON COLUMN ventas_cobros.metodo_pago IS 'transferencia, cheque, efectivo, tarjeta';
    COMMENT ON COLUMN ventas_cobros.referencia IS 'Número de referencia, cheque o transacción';
  `);

  console.log('✅ Tabla ventas_cobros creada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS ventas_cobros CASCADE;
  `);
  console.log('✅ Tabla ventas_cobros eliminada');
}
