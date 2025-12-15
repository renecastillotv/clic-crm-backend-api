-- =====================================================
-- Migración 097: Crear tabla tenant_catalogo_preferencias
--
-- Esta tabla permite a los tenants desactivar items del
-- catálogo global sin duplicar los registros completos.
-- Solo guarda preferencias de activación.
-- =====================================================

-- Crear tabla de preferencias
CREATE TABLE IF NOT EXISTS tenant_catalogo_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  catalogo_id UUID NOT NULL REFERENCES catalogos(id) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(tenant_id, catalogo_id)
);

-- Índices para búsquedas rápidas
CREATE INDEX IF NOT EXISTS idx_tenant_catalogo_pref_tenant ON tenant_catalogo_preferencias(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_catalogo_pref_catalogo ON tenant_catalogo_preferencias(catalogo_id);

-- Comentarios
COMMENT ON TABLE tenant_catalogo_preferencias IS 'Preferencias de activación de catálogos globales por tenant';
COMMENT ON COLUMN tenant_catalogo_preferencias.catalogo_id IS 'Referencia al catálogo global (tenant_id = NULL en catalogos)';
COMMENT ON COLUMN tenant_catalogo_preferencias.activo IS 'Estado de activación para este tenant (sobreescribe el default)';

-- Migrar datos existentes: convertir copias de tenant en preferencias
-- Solo migrar aquellos que tienen activo = false (desactivaciones)
INSERT INTO tenant_catalogo_preferencias (tenant_id, catalogo_id, activo, created_at)
SELECT
  t.tenant_id,
  g.id as catalogo_id,
  t.activo,
  t.created_at
FROM catalogos t
JOIN catalogos g ON g.tenant_id IS NULL AND g.tipo = t.tipo AND g.codigo = t.codigo
WHERE t.tenant_id IS NOT NULL
  AND t.activo = false  -- Solo las desactivaciones
  AND NOT EXISTS (
    SELECT 1 FROM tenant_catalogo_preferencias p
    WHERE p.tenant_id = t.tenant_id AND p.catalogo_id = g.id
  );

-- Eliminar los registros duplicados de tenant que eran solo para toggle
-- (aquellos que son copia exacta de un global excepto por activo)
DELETE FROM catalogos t
WHERE t.tenant_id IS NOT NULL
  AND EXISTS (
    SELECT 1 FROM catalogos g
    WHERE g.tenant_id IS NULL
      AND g.tipo = t.tipo
      AND g.codigo = t.codigo
  )
  -- Solo eliminar si ya se migró a preferencias o si estaba activo (no necesita preferencia)
  AND (
    EXISTS (
      SELECT 1 FROM tenant_catalogo_preferencias p
      JOIN catalogos g ON p.catalogo_id = g.id
      WHERE p.tenant_id = t.tenant_id
        AND g.tipo = t.tipo
        AND g.codigo = t.codigo
    )
    OR t.activo = true  -- Los activos no necesitan preferencia, usan el default
  );
