/**
 * Migración 155: Crear tabla ventas_cobros_adjuntos
 *
 * Permite agregar múltiples archivos adjuntos a cada cobro.
 * Útil cuando se olvida adjuntar un comprobante o se necesitan más documentos.
 */

import { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS ventas_cobros_adjuntos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      cobro_id UUID NOT NULL REFERENCES ventas_cobros(id) ON DELETE CASCADE,

      -- Información del archivo
      url VARCHAR(500) NOT NULL,
      nombre_archivo VARCHAR(255),
      tipo_archivo VARCHAR(100),
      tamaño_bytes BIGINT,

      -- Metadata
      descripcion TEXT,

      -- Auditoría
      subido_por_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Índices
    CREATE INDEX IF NOT EXISTS idx_ventas_cobros_adjuntos_cobro ON ventas_cobros_adjuntos(cobro_id);
    CREATE INDEX IF NOT EXISTS idx_ventas_cobros_adjuntos_tenant ON ventas_cobros_adjuntos(tenant_id);

    -- Comentarios
    COMMENT ON TABLE ventas_cobros_adjuntos IS 'Archivos adjuntos adicionales a los cobros de ventas';
    COMMENT ON COLUMN ventas_cobros_adjuntos.url IS 'URL del archivo en almacenamiento';
  `);

  console.log('✅ Tabla ventas_cobros_adjuntos creada');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS ventas_cobros_adjuntos CASCADE;
  `);
  console.log('✅ Tabla ventas_cobros_adjuntos eliminada');
}
