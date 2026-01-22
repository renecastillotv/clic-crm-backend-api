-- Script para agregar alias_rutas a propuestas y listados_curados
-- Ejecutar en la base de datos NEON

-- 1. Agregar alias para propuestas (main page)
UPDATE tipos_pagina
SET alias_rutas = jsonb_set(
  COALESCE(alias_rutas, '{}'::jsonb),
  '{en}',
  '"proposals"'::jsonb,
  true
)
WHERE codigo = 'propuestas';

-- 2. Agregar alias para listados_curados (listados-de-propiedades)
-- Nota: El ruta_patron es /listados-de-propiedades/:slug, así que el alias también debe incluir el parámetro
UPDATE tipos_pagina
SET alias_rutas = jsonb_set(
  COALESCE(alias_rutas, '{}'::jsonb),
  '{en}',
  '"property-lists/:slug"'::jsonb,
  true
)
WHERE codigo = 'listados_curados';

-- Verificar los cambios
SELECT codigo, ruta_patron, alias_rutas 
FROM tipos_pagina 
WHERE codigo IN ('propuestas', 'listados_curados');




