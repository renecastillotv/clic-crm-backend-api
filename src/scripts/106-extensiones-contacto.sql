-- Migración 106: Sistema de Extensiones de Contacto Configurable
--
-- Crea las tablas necesarias para un sistema flexible de extensiones de contacto

BEGIN;

-- ==================== TABLA CATALOGO_EXTENSIONES_CONTACTO ====================
CREATE TABLE IF NOT EXISTS catalogo_extensiones_contacto (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  codigo VARCHAR(50) NOT NULL,
  nombre VARCHAR(100) NOT NULL,
  descripcion TEXT,
  icono VARCHAR(50),
  color VARCHAR(20),
  campos_schema JSONB NOT NULL DEFAULT '[]',
  orden INTEGER DEFAULT 0,
  activo BOOLEAN DEFAULT true,
  es_sistema BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, codigo)
);

CREATE INDEX IF NOT EXISTS idx_cat_ext_contacto_tenant ON catalogo_extensiones_contacto(tenant_id);
CREATE INDEX IF NOT EXISTS idx_cat_ext_contacto_codigo ON catalogo_extensiones_contacto(codigo);
CREATE INDEX IF NOT EXISTS idx_cat_ext_contacto_activo ON catalogo_extensiones_contacto(activo);

-- ==================== TABLA CONTACTO_EXTENSIONES ====================
CREATE TABLE IF NOT EXISTS contacto_extensiones (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  contacto_id UUID NOT NULL REFERENCES contactos(id) ON DELETE CASCADE,
  extension_id UUID NOT NULL REFERENCES catalogo_extensiones_contacto(id) ON DELETE CASCADE,
  datos JSONB NOT NULL DEFAULT '{}',
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  created_by UUID REFERENCES usuarios(id) ON DELETE SET NULL,
  UNIQUE(contacto_id, extension_id)
);

CREATE INDEX IF NOT EXISTS idx_contacto_ext_tenant ON contacto_extensiones(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contacto_ext_contacto ON contacto_extensiones(contacto_id);
CREATE INDEX IF NOT EXISTS idx_contacto_ext_extension ON contacto_extensiones(extension_id);

-- ==================== TABLA TENANT_EXTENSION_PREFERENCIAS ====================
CREATE TABLE IF NOT EXISTS tenant_extension_preferencias (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  extension_id UUID NOT NULL REFERENCES catalogo_extensiones_contacto(id) ON DELETE CASCADE,
  activo BOOLEAN NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tenant_id, extension_id)
);

CREATE INDEX IF NOT EXISTS idx_tenant_ext_pref_tenant ON tenant_extension_preferencias(tenant_id);

-- ==================== SEED DE EXTENSIONES DE SISTEMA ====================
INSERT INTO catalogo_extensiones_contacto (tenant_id, codigo, nombre, descripcion, icono, color, orden, es_sistema, activo, campos_schema)
VALUES
  (NULL, 'lead', 'Lead', 'Prospecto interesado en comprar/rentar', 'UserPlus', '#3b82f6', 1, true, true,
   '[{"campo":"fuente_lead","label":"Fuente del Lead","tipo":"select","opciones":["web","referido","portal","redes_sociales","llamada","otro"],"requerido":false,"orden":1},{"campo":"interes_tipo","label":"Tipo de Interés","tipo":"select","opciones":["compra","renta","inversion"],"requerido":false,"orden":2},{"campo":"presupuesto_min","label":"Presupuesto Mínimo","tipo":"currency","requerido":false,"orden":3},{"campo":"presupuesto_max","label":"Presupuesto Máximo","tipo":"currency","requerido":false,"orden":4},{"campo":"zona_interes","label":"Zona de Interés","tipo":"text","requerido":false,"orden":5}]'),

  (NULL, 'cliente', 'Cliente', 'Ha cerrado al menos una operación', 'UserCheck', '#16a34a', 2, true, true,
   '[{"campo":"fecha_primera_operacion","label":"Fecha Primera Operación","tipo":"date","requerido":false,"orden":1},{"campo":"total_operaciones","label":"Total de Operaciones","tipo":"number","requerido":false,"orden":2},{"campo":"valor_total_operaciones","label":"Valor Total Operaciones","tipo":"currency","requerido":false,"orden":3},{"campo":"preferencias_contacto","label":"Preferencia de Contacto","tipo":"select","opciones":["email","telefono","whatsapp"],"requerido":false,"orden":4}]'),

  (NULL, 'asesor_inmobiliario', 'Asesor Inmobiliario', 'Asesor que trabaja con nosotros o externa', 'Briefcase', '#7c3aed', 3, true, true,
   '[{"campo":"licencia_inmobiliaria","label":"Licencia Inmobiliaria","tipo":"text","requerido":false,"orden":1},{"campo":"inmobiliaria","label":"Inmobiliaria","tipo":"text","requerido":false,"orden":2},{"campo":"especialidad","label":"Especialidad","tipo":"select","opciones":["residencial","comercial","industrial","terrenos","lujo"],"requerido":false,"orden":3},{"campo":"zonas_trabajo","label":"Zonas de Trabajo","tipo":"text","requerido":false,"orden":4},{"campo":"comision_default","label":"Comisión Default (%)","tipo":"percentage","requerido":false,"orden":5}]'),

  (NULL, 'desarrollador', 'Desarrollador', 'Empresa o persona que desarrolla proyectos', 'Building2', '#4338ca', 4, true, true,
   '[{"campo":"razon_social","label":"Razón Social","tipo":"text","requerido":false,"orden":1},{"campo":"rfc","label":"RFC/RNC","tipo":"text","requerido":false,"orden":2},{"campo":"tipo_desarrollos","label":"Tipo de Desarrollos","tipo":"select","opciones":["residencial","comercial","mixto","industrial"],"requerido":false,"orden":3},{"campo":"proyectos_activos","label":"Proyectos Activos","tipo":"number","requerido":false,"orden":4},{"campo":"sitio_web","label":"Sitio Web","tipo":"url","requerido":false,"orden":5}]'),

  (NULL, 'referidor', 'Referidor', 'Refiere clientes a cambio de comisión', 'Users', '#be185d', 5, true, true,
   '[{"campo":"tipo_referidor","label":"Tipo de Referidor","tipo":"select","opciones":["particular","profesional","empresa"],"requerido":false,"orden":1},{"campo":"comision_referido","label":"Comisión Referido (%)","tipo":"percentage","requerido":false,"orden":2},{"campo":"total_referidos","label":"Total Referidos","tipo":"number","requerido":false,"orden":3},{"campo":"referidos_convertidos","label":"Referidos Convertidos","tipo":"number","requerido":false,"orden":4},{"campo":"metodo_pago","label":"Método de Pago","tipo":"select","opciones":["transferencia","cheque","efectivo"],"requerido":false,"orden":5}]'),

  (NULL, 'propietario', 'Propietario', 'Dueño de propiedades en cartera', 'Home', '#b45309', 6, true, true,
   '[{"campo":"total_propiedades","label":"Total Propiedades","tipo":"number","requerido":false,"orden":1},{"campo":"tipo_propiedades","label":"Tipo de Propiedades","tipo":"select","opciones":["residencial","comercial","terreno","mixto"],"requerido":false,"orden":2},{"campo":"disponibilidad_visitas","label":"Disponibilidad Visitas","tipo":"select","opciones":["flexible","solo_citas","restringido"],"requerido":false,"orden":3},{"campo":"exclusividad","label":"Exclusividad","tipo":"select","opciones":["exclusiva","abierta","preferente"],"requerido":false,"orden":4}]'),

  (NULL, 'master_broker', 'Master Broker', 'Broker principal o socio estratégico', 'Award', '#0d9488', 7, true, true,
   '[{"campo":"empresa_broker","label":"Empresa/Broker","tipo":"text","requerido":false,"orden":1},{"campo":"territorios","label":"Territorios","tipo":"text","requerido":false,"orden":2},{"campo":"comision_override","label":"Comisión Override (%)","tipo":"percentage","requerido":false,"orden":3},{"campo":"nivel_acuerdo","label":"Nivel de Acuerdo","tipo":"select","opciones":["oro","plata","bronce","basico"],"requerido":false,"orden":4}]')
ON CONFLICT (tenant_id, codigo) DO NOTHING;

COMMIT;
