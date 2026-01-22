-- ============================================================================
-- Script de correcciones para tipos_pagina
-- Fecha: 2025-01-XX
-- Descripción: Corrige relaciones parent/child, niveles y elimina páginas innecesarias
-- ============================================================================

BEGIN;

-- ============================================================================
-- 1. ELIMINAR PÁGINAS INNECESARIAS
-- ============================================================================

-- Eliminar propuestas (directorio no necesario, solo se usa propuestas_token)
DELETE FROM tipos_pagina WHERE codigo = 'propuestas';

-- Eliminar landing_proyecto (solo debe existir landing_page)
DELETE FROM tipos_pagina WHERE codigo = 'landing_proyecto';

-- Eliminar landing_subpagina (solo debe existir landing_page)
DELETE FROM tipos_pagina WHERE codigo = 'landing_subpagina';

-- ============================================================================
-- 2. CORREGIR PÁGINAS EXISTENTES (UPDATE)
-- ============================================================================

-- favoritos_token: Agregar parent "favoritos", cambiar nivel a 1
UPDATE tipos_pagina 
SET ruta_padre = 'favoritos', nivel = 1, updated_at = NOW()
WHERE codigo = 'favoritos_token';

-- favoritos: Cambiar nivel a 0 (es directorio)
UPDATE tipos_pagina 
SET nivel = 0, updated_at = NOW()
WHERE codigo = 'favoritos';

-- propuestas_token: Cambiar nivel a 1 (ruta directa, no necesita directorio)
UPDATE tipos_pagina 
SET nivel = 1, updated_at = NOW()
WHERE codigo = 'propuestas_token';

-- ubicaciones: Cambiar nivel a 0 (es directorio)
UPDATE tipos_pagina 
SET nivel = 0, updated_at = NOW()
WHERE codigo = 'ubicaciones';

-- tipos_propiedades: Cambiar nivel a 0 (es directorio)
UPDATE tipos_pagina 
SET nivel = 0, updated_at = NOW()
WHERE codigo = 'tipos_propiedades';

-- single_proyecto: Agregar parent "directorio_proyectos"
UPDATE tipos_pagina 
SET ruta_padre = 'directorio_proyectos', updated_at = NOW()
WHERE codigo = 'single_proyecto';

-- testimonios_categoria: Agregar parent "testimonios"
UPDATE tipos_pagina 
SET ruta_padre = 'testimonios', updated_at = NOW()
WHERE codigo = 'testimonios_categoria';

-- ============================================================================
-- 3. CREAR NUEVAS PÁGINAS
-- ============================================================================

-- ubicaciones_single: Single de ubicación
INSERT INTO tipos_pagina (
    codigo,
    nombre,
    descripcion,
    es_estandar,
    requiere_slug,
    configuracion,
    ruta_patron,
    ruta_padre,
    nivel,
    fuente_datos,
    feature_requerido,
    es_plantilla,
    protegida,
    parametros,
    alias_rutas,
    visible,
    featured,
    publico,
    orden_catalogo,
    categoria,
    plan_minimo,
    is_visible_default,
    created_at,
    updated_at
) VALUES (
    'ubicaciones_single',
    'Ubicación Individual',
    'Página de detalle de una ubicación específica',
    true,
    false,
    '{"dynamic": true}'::jsonb,
    '/ubicaciones/:slug',
    'ubicaciones',
    1,
    NULL,
    NULL,
    true,
    false,
    '[{"tipo":"slug","campo":"slug","fuente":"ubicaciones","nombre":"slug","posicion":1}]'::jsonb,
    '{}'::jsonb,
    true,
    false,
    true,
    100,
    'estandar',
    NULL,
    true,
    NOW(),
    NOW()
);

-- tipos_propiedades_single: Single de tipo de propiedad
INSERT INTO tipos_pagina (
    codigo,
    nombre,
    descripcion,
    es_estandar,
    requiere_slug,
    configuracion,
    ruta_patron,
    ruta_padre,
    nivel,
    fuente_datos,
    feature_requerido,
    es_plantilla,
    protegida,
    parametros,
    alias_rutas,
    visible,
    featured,
    publico,
    orden_catalogo,
    categoria,
    plan_minimo,
    is_visible_default,
    created_at,
    updated_at
) VALUES (
    'tipos_propiedades_single',
    'Tipo de Propiedad Individual',
    'Página de detalle de un tipo de propiedad específico',
    true,
    false,
    '{"dynamic": true}'::jsonb,
    '/tipos-de-propiedades/:slug',
    'tipos_propiedades',
    1,
    NULL,
    NULL,
    true,
    false,
    '[{"tipo":"slug","campo":"slug","fuente":"tipos_propiedades","nombre":"slug","posicion":1}]'::jsonb,
    '{}'::jsonb,
    true,
    false,
    true,
    100,
    'estandar',
    NULL,
    true,
    NOW(),
    NOW()
);

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (ejecutar después para confirmar cambios)
-- ============================================================================

-- Verificar favoritos
SELECT codigo, ruta_patron, ruta_padre, nivel FROM tipos_pagina WHERE codigo IN ('favoritos', 'favoritos_token') ORDER BY codigo;

-- Verificar propuestas_token
SELECT codigo, ruta_patron, ruta_padre, nivel FROM tipos_pagina WHERE codigo = 'propuestas_token';

-- Verificar ubicaciones
SELECT codigo, ruta_patron, ruta_padre, nivel FROM tipos_pagina WHERE codigo IN ('ubicaciones', 'ubicaciones_single') ORDER BY codigo;

-- Verificar tipos_propiedades
SELECT codigo, ruta_patron, ruta_padre, nivel FROM tipos_pagina WHERE codigo IN ('tipos_propiedades', 'tipos_propiedades_single') ORDER BY codigo;

-- Verificar proyectos
SELECT codigo, ruta_patron, ruta_padre, nivel FROM tipos_pagina WHERE codigo IN ('directorio_proyectos', 'single_proyecto') ORDER BY codigo;

-- Verificar testimonios
SELECT codigo, ruta_patron, ruta_padre, nivel FROM tipos_pagina WHERE codigo LIKE 'testimonio%' ORDER BY nivel;

-- Verificar que se eliminaron las páginas de landing incorrectas
SELECT codigo, ruta_patron FROM tipos_pagina WHERE codigo LIKE 'landing%' ORDER BY codigo;

-- Verificar que propuestas fue eliminado
SELECT codigo, ruta_patron FROM tipos_pagina WHERE codigo = 'propuestas';




