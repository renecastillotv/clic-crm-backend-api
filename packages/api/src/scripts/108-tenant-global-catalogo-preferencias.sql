-- Migración 108: Crear tabla tenant_global_catalogo_preferencias
-- Esta tabla almacena las preferencias de activación por tenant para catálogos globales
-- (categorias_propiedades, operaciones) que NO tienen tenant_id pero necesitan toggle por tenant

-- Crear tabla de preferencias para catálogos globales
CREATE TABLE IF NOT EXISTS tenant_global_catalogo_preferencias (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    tabla VARCHAR(100) NOT NULL,  -- 'categorias_propiedades', 'operaciones', etc.
    item_id UUID NOT NULL,        -- ID del item en la tabla global
    activo BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Constraint único: un tenant solo puede tener una preferencia por item
    CONSTRAINT uq_tenant_global_pref UNIQUE (tenant_id, tabla, item_id)
);

-- Crear índices para búsquedas eficientes
CREATE INDEX IF NOT EXISTS idx_tenant_global_pref_tenant ON tenant_global_catalogo_preferencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_global_pref_tabla ON tenant_global_catalogo_preferencias(tabla);
CREATE INDEX IF NOT EXISTS idx_tenant_global_pref_item ON tenant_global_catalogo_preferencias(item_id);

-- Comentarios descriptivos
COMMENT ON TABLE tenant_global_catalogo_preferencias IS 'Preferencias de activación de catálogos globales (sin tenant_id) por tenant';
COMMENT ON COLUMN tenant_global_catalogo_preferencias.tabla IS 'Nombre de la tabla global: categorias_propiedades, operaciones';
COMMENT ON COLUMN tenant_global_catalogo_preferencias.item_id IS 'ID del item en la tabla global';
COMMENT ON COLUMN tenant_global_catalogo_preferencias.activo IS 'Estado de activación para este tenant (sobreescribe el default global)';

-- Inicializar preferencias para todos los tenants existentes
-- Para cada tenant, insertar preferencias para todos los items globales usando el estado actual
INSERT INTO tenant_global_catalogo_preferencias (tenant_id, tabla, item_id, activo, created_at)
SELECT
    t.id as tenant_id,
    'categorias_propiedades' as tabla,
    cp.id as item_id,
    cp.activo,
    NOW()
FROM tenants t
CROSS JOIN categorias_propiedades cp
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_global_catalogo_preferencias tgcp
    WHERE tgcp.tenant_id = t.id
      AND tgcp.tabla = 'categorias_propiedades'
      AND tgcp.item_id = cp.id
)
ON CONFLICT (tenant_id, tabla, item_id) DO NOTHING;

-- Inicializar preferencias para operaciones
INSERT INTO tenant_global_catalogo_preferencias (tenant_id, tabla, item_id, activo, created_at)
SELECT
    t.id as tenant_id,
    'operaciones' as tabla,
    o.id as item_id,
    o.activo,
    NOW()
FROM tenants t
CROSS JOIN operaciones o
WHERE NOT EXISTS (
    SELECT 1 FROM tenant_global_catalogo_preferencias tgcp
    WHERE tgcp.tenant_id = t.id
      AND tgcp.tabla = 'operaciones'
      AND tgcp.item_id = o.id
)
ON CONFLICT (tenant_id, tabla, item_id) DO NOTHING;

-- Nota: Esta migración se ejecuta manualmente con el script run-migration-108.mjs
