-- Migración 004: Crear tabla componentes_web
-- Ejecutar este SQL directamente en la base de datos si las migraciones fallan

CREATE TABLE IF NOT EXISTS componentes_web (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  tipo VARCHAR(50) NOT NULL,
  variante VARCHAR(50) NOT NULL DEFAULT 'default',
  datos JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN DEFAULT TRUE,
  orden INTEGER DEFAULT 0,
  pagina_id UUID REFERENCES paginas_web(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Índices
CREATE INDEX IF NOT EXISTS idx_componentes_web_tenant ON componentes_web(tenant_id);
CREATE INDEX IF NOT EXISTS idx_componentes_web_pagina ON componentes_web(pagina_id);
CREATE INDEX IF NOT EXISTS idx_componentes_web_tenant_activo ON componentes_web(tenant_id, activo);
CREATE INDEX IF NOT EXISTS idx_componentes_web_tenant_orden ON componentes_web(tenant_id, orden);

-- Comentarios
COMMENT ON TABLE componentes_web IS 'Componentes web configurados por tenant';
COMMENT ON COLUMN componentes_web.tipo IS 'Tipo de componente (header, hero, footer, etc.)';
COMMENT ON COLUMN componentes_web.variante IS 'Variante del componente (default, variant1, etc.)';
COMMENT ON COLUMN componentes_web.datos IS 'Datos/configuración del componente (JSON)';
COMMENT ON COLUMN componentes_web.activo IS 'Si el componente está activo';
COMMENT ON COLUMN componentes_web.orden IS 'Orden de visualización';
COMMENT ON COLUMN componentes_web.pagina_id IS 'Página específica (null = todas las páginas)';



