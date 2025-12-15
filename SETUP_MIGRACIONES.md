# 🔧 Setup de Migraciones y Seeds

## Problema Actual

Las migraciones están fallando debido a la configuración de SSL con Neon PostgreSQL. 

## Solución Temporal

Para ejecutar las migraciones manualmente, puedes usar una de estas opciones:

### Opción 1: Usar psql directamente

```bash
# Conectar a la base de datos
psql "postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require"

# Luego ejecutar el SQL de la migración manualmente
```

### Opción 2: Ejecutar SQL directamente

El archivo de migración `004_create_componentes_web.ts` contiene el SQL necesario. Puedes ejecutarlo directamente en la base de datos.

### Opción 3: Usar un cliente de base de datos

Usa DBeaver, pgAdmin o cualquier cliente PostgreSQL para ejecutar las migraciones.

## Estructura Creada

### Migración: `004_create_componentes_web.ts`

Crea la tabla `componentes_web` con los siguientes campos:
- `id` (uuid, PK)
- `tenant_id` (uuid, FK a tenants)
- `tipo` (string): Tipo de componente (header, hero, footer, etc.)
- `variante` (string): Variante del componente (default, variant1, etc.)
- `datos` (jsonb): Datos/configuración del componente
- `activo` (boolean): Si el componente está activo
- `orden` (integer): Orden de visualización
- `pagina_id` (uuid, nullable): Página específica (null = todas las páginas)

### Seed: `001_seed_componentes_web.ts`

Inserta datos de prueba:
- Header (default)
- Hero (default)
- Footer (default)
- Tema por defecto

## SQL para Ejecutar Manualmente

```sql
-- Crear tabla componentes_web
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
CREATE INDEX idx_componentes_web_tenant ON componentes_web(tenant_id);
CREATE INDEX idx_componentes_web_pagina ON componentes_web(pagina_id);
CREATE INDEX idx_componentes_web_tenant_activo ON componentes_web(tenant_id, activo);
CREATE INDEX idx_componentes_web_tenant_orden ON componentes_web(tenant_id, orden);
```

## Próximos Pasos

1. Ejecutar la migración manualmente (usando una de las opciones arriba)
2. Ejecutar el seed para insertar datos de prueba
3. Probar los endpoints de la API
4. Verificar que el frontend renderiza correctamente

## Nota

Una vez que las migraciones funcionen correctamente, el sistema estará completamente funcional. La API ya está lista para devolver componentes con toda su configuración.



