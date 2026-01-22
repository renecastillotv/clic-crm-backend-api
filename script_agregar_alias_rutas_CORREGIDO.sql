-- Script para agregar alias_rutas faltantes en tipos_pagina
-- Fecha: 2025-01-XX
-- Descripción: Agrega traducciones SOLO para DIRECTORIOS y PÁGINAS ÚNICAS
-- 
-- IMPORTANTE: Las páginas single/categoría NO necesitan alias_rutas porque:
-- - El slug se busca directamente en sus tablas (ubicaciones, categoria_propiedades, etc.)
-- - Las tablas tienen campo slug_traducciones JSONB para buscar en diferentes idiomas
-- - Ejemplo: /en/locations/santo-domingo → detecta "locations" (alias) → busca "santo-domingo" en tabla ubicaciones usando slug_traducciones->>'en'

BEGIN;

-- ============================================================================
-- DIRECTORIOS: Necesitan alias_rutas porque son el prefijo de la URL
-- ============================================================================

-- ubicaciones: Directorio de ubicaciones
-- Ejemplo: /en/locations → detecta "locations" → encuentra alias_rutas["en"] = "locations" → es tipo "ubicaciones"
UPDATE tipos_pagina 
SET alias_rutas = '{"en":"locations","es":"ubicaciones","fr":"emplacements","pt":"localizacoes"}'::jsonb,
    updated_at = NOW()
WHERE codigo = 'ubicaciones';

-- tipos_propiedades: Directorio de tipos de propiedades
UPDATE tipos_pagina 
SET alias_rutas = '{"en":"property-types","es":"tipos-de-propiedades","fr":"types-proprietes","pt":"tipos-propriedades"}'::jsonb,
    updated_at = NOW()
WHERE codigo = 'tipos_propiedades';

-- directorio_proyectos: Directorio de proyectos
UPDATE tipos_pagina 
SET alias_rutas = '{"en":"projects","es":"proyectos","fr":"projets","pt":"projetos"}'::jsonb,
    updated_at = NOW()
WHERE codigo = 'directorio_proyectos';

-- videos_listado: Listado de videos
UPDATE tipos_pagina 
SET alias_rutas = '{"en":"videos","es":"videos","fr":"videos","pt":"videos"}'::jsonb,
    updated_at = NOW()
WHERE codigo = 'videos_listado';

-- ============================================================================
-- PÁGINAS ÚNICAS/ESTÁTICAS: Corregir landing_page
-- ============================================================================

-- landing_page: Corregir alias (actualmente dice "projects" pero debería ser "landing")
-- NOTA: Si landing_page es un directorio (/landing/:slug), solo necesita alias para "landing"
UPDATE tipos_pagina 
SET alias_rutas = '{"en":"landing","es":"landing","fr":"landing","pt":"landing"}'::jsonb,
    updated_at = NOW()
WHERE codigo = 'landing_page';

-- ============================================================================
-- NOTAS: Las siguientes páginas ya tienen alias_rutas correctos (no modificar)
-- ============================================================================
-- testimonios: Ya tiene {"en":"testimonials","es":"testimonios","fr":"temoignages","pt":"depoimentos"}
-- articulos_listado: Ya tiene {"en":"articles","es":"articulos","fr":"articles","pt":"artigos"}
-- propiedades_listado: Ya tiene {"en":"properties","es":"propiedades","fr":"proprietes","pt":"imoveis"}
-- contacto: Ya tiene {"en":"contact","es":"contacto","fr":"contact","pt":"contato"}
-- politicas_privacidad: Ya tiene {"en":"privacy-policy","es":"politicas-privacidad","fr":"politique-confidentialite","pt":"politica-privacidade"}
-- terminos_condiciones: Ya tiene {"en":"terms-conditions","es":"terminos-condiciones","fr":"termes-conditions","pt":"termos-condicoes"}

-- ============================================================================
-- PÁGINAS QUE NO NECESITAN alias_rutas (deben quedarse vacíos):
-- ============================================================================
-- Estas páginas NO deben tener alias_rutas porque el slug se busca en sus tablas:
-- 
-- SINGLES:
-- - ubicaciones_single: Busca slug en tabla "ubicaciones" usando slug_traducciones
-- - tipos_propiedades_single: Busca slug en tabla "categoria_propiedades" usando slug_traducciones
-- - single_proyecto: Busca slug en tabla "proyectos" usando slug_traducciones (cada proyecto tiene nombre único)
-- - articulos_single: Busca slug en tabla "articulos" usando slug_traducciones
-- - videos_single: Busca slug en tabla "mock_videos" usando slug_traducciones
-- - testimonio_single: Busca slug en tabla "mock_testimonios" usando slug_traducciones
-- - asesor_single: Busca slug en tabla "mock_asesores" usando slug_traducciones
-- - propiedades_single: Busca slug en tabla "propiedades" usando slug_traducciones
--
-- CATEGORÍAS:
-- - articulos_categoria: Busca slug en tabla "categorias_articulos" usando slug_traducciones
-- - videos_categoria: Busca slug en tabla "categorias_videos" usando slug_traducciones
-- - testimonios_categoria: Busca slug en tabla "categorias_testimonios" usando slug_traducciones
--
-- PRIVADAS/ESPECIALES:
-- - favoritos: Página privada, no necesita alias
-- - favoritos_token: Página compartida por token, no necesita alias
-- - propuestas_token: Página compartida por token, no necesita alias
-- - listados_curados: Si es /listados-de-propiedades/:slug, el slug se busca en su tabla

COMMIT;

-- ============================================================================
-- VERIFICACIÓN (ejecutar después para confirmar cambios)
-- ============================================================================

-- Verificar directorios que SÍ deben tener alias
SELECT codigo, ruta_patron, alias_rutas 
FROM tipos_pagina 
WHERE codigo IN (
  'ubicaciones', 'tipos_propiedades', 'directorio_proyectos', 
  'videos_listado', 'landing_page',
  'testimonios', 'articulos_listado', 'propiedades_listado',
  'contacto', 'politicas_privacidad', 'terminos_condiciones'
)
ORDER BY codigo;

-- Verificar páginas con alias_rutas vacíos (deberían ser solo single/categoría/privadas)
SELECT codigo, ruta_patron, alias_rutas 
FROM tipos_pagina 
WHERE alias_rutas = '{}'::jsonb 
  AND visible = true
  AND codigo NOT IN (
    'custom',  -- custom no necesita alias
    -- Singles que NO necesitan alias (el slug se busca en sus tablas)
    'ubicaciones_single', 'tipos_propiedades_single', 'single_proyecto',
    'articulos_single', 'videos_single', 'testimonio_single', 'asesor_single', 'propiedades_single',
    -- Categorías que NO necesitan alias (el slug se busca en sus tablas)
    'articulos_categoria', 'videos_categoria', 'testimonios_categoria',
    -- Páginas privadas/especiales que NO necesitan alias
    'favoritos', 'favoritos_token', 'propuestas_token', 'listados_curados'
  )
ORDER BY codigo;
