-- ============================================
-- Script: Registrar PropertyCarouselClic y TestimonialsClic en Homepage
-- Fecha: 2025-01-XX
-- ============================================

-- PASO 1: Verificar que los componentes estén en catalogo_componentes
-- Si no existen, crearlos primero

-- Verificar property-carousel-clic
DO $$
DECLARE
  v_componente_id UUID;
  v_tipo_pagina_id UUID;
  v_tenant_id UUID;
BEGIN
  -- Obtener tenant_id
  SELECT id INTO v_tenant_id FROM tenants WHERE slug = 'clic' LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    RAISE EXCEPTION 'Tenant "clic" no encontrado';
  END IF;

  -- Obtener tipo_pagina_id para homepage
  SELECT id INTO v_tipo_pagina_id FROM tipos_pagina WHERE codigo = 'homepage' LIMIT 1;
  
  IF v_tipo_pagina_id IS NULL THEN
    RAISE EXCEPTION 'Tipo de página "homepage" no encontrado';
  END IF;

  -- Verificar/Crear property-carousel-clic en catalogo_componentes
  SELECT id INTO v_componente_id 
  FROM catalogo_componentes 
  WHERE componente_key = 'property-carousel-clic' 
  LIMIT 1;

  IF v_componente_id IS NULL THEN
    INSERT INTO catalogo_componentes (
      id,
      tipo, 
      componente_key, 
      nombre, 
      categoria, 
      campos_config, 
      active,
      descripcion
    ) VALUES (
      gen_random_uuid(),
      'property_carousel',
      'property-carousel-clic',
      'Carrusel de Propiedades CLIC',
      'content',
      '{
        "static_data": {
          "titulo": {"type": "string", "label": "Título", "default": "Propiedades Destacadas"},
          "subtitulo": {"type": "string", "label": "Subtítulo", "optional": true},
          "viewAllLink": {"type": "string", "label": "URL Ver Todas", "default": "/propiedades"},
          "language": {"type": "string", "label": "Idioma", "default": "es", "options": ["es", "en", "fr"]}
        },
        "dynamic_data": {
          "dataType": {"type": "string", "label": "Tipo de Datos", "default": "properties"},
          "limit": {"type": "number", "label": "Límite", "default": 10}
        },
        "styles": {
          "colorPrimario": {"type": "string", "label": "Color Primario", "default": "#f04e00"},
          "colorTexto": {"type": "string", "label": "Color Texto", "default": "#111827"}
        }
      }'::jsonb,
      true,
      'Carrusel horizontal de propiedades destacadas con navegación de imágenes múltiples'
    ) RETURNING id INTO v_componente_id;
    
    RAISE NOTICE '✅ Componente property-carousel-clic creado en catálogo';
  ELSE
    RAISE NOTICE 'ℹ️ Componente property-carousel-clic ya existe en catálogo';
  END IF;

  -- Verificar si ya existe en componentes_web para homepage
  IF NOT EXISTS (
    SELECT 1 FROM componentes_web 
    WHERE tenant_id = v_tenant_id 
      AND componente_catalogo_id = v_componente_id
      AND tipo_pagina_id = v_tipo_pagina_id
  ) THEN
    -- Insertar en componentes_web
    INSERT INTO componentes_web (
      tenant_id,
      componente_catalogo_id,
      tipo_pagina_id,
      nombre,
      datos,
      activo,
      orden
    ) VALUES (
      v_tenant_id,
      v_componente_id,
      v_tipo_pagina_id,
      'Carrusel de Propiedades Homepage',
      '{
        "static_data": {
          "titulo": "Propiedades Destacadas",
          "viewAllLink": "/propiedades",
          "language": "es"
        },
        "dynamic_data": {
          "dataType": "properties",
          "limit": 10
        },
        "styles": {
          "colorPrimario": "#f04e00"
        }
      }'::jsonb,
      true,
      3  -- Orden: después de Popular Locations (2)
    );
    
    RAISE NOTICE '✅ PropertyCarouselClic agregado a homepage';
  ELSE
    RAISE NOTICE 'ℹ️ PropertyCarouselClic ya está en homepage';
  END IF;

  -- Verificar/Crear testimonials-clic en catalogo_componentes
  SELECT id INTO v_componente_id 
  FROM catalogo_componentes 
  WHERE componente_key = 'testimonials-clic' 
  LIMIT 1;

  IF v_componente_id IS NULL THEN
    INSERT INTO catalogo_componentes (
      id,
      tipo, 
      componente_key, 
      nombre, 
      categoria, 
      campos_config, 
      active,
      descripcion
    ) VALUES (
      gen_random_uuid(),
      'testimonials',
      'testimonials-clic',
      'Testimonios CLIC',
      'content',
      '{
        "static_data": {
          "titulo": {"type": "string", "label": "Título", "optional": true},
          "subtitulo": {"type": "string", "label": "Subtítulo", "optional": true},
          "showTitle": {"type": "boolean", "label": "Mostrar Título", "default": true},
          "layout": {"type": "string", "label": "Layout", "default": "minimal", "options": ["minimal", "default", "grid"]},
          "maxItems": {"type": "number", "label": "Máximo de Items", "default": 4},
          "language": {"type": "string", "label": "Idioma", "default": "es", "options": ["es", "en", "fr"]}
        },
        "dynamic_data": {
          "dataType": {"type": "string", "label": "Tipo de Datos", "default": "testimonials"},
          "limit": {"type": "number", "label": "Límite", "default": 6}
        },
        "styles": {
          "colorPrimario": {"type": "string", "label": "Color Primario", "default": "#f04e00"},
          "colorTexto": {"type": "string", "label": "Color Texto", "default": "#111827"}
        }
      }'::jsonb,
      true,
      'Sección de testimonios de clientes con múltiples layouts (minimal, default, grid)'
    ) RETURNING id INTO v_componente_id;
    
    RAISE NOTICE '✅ Componente testimonials-clic creado en catálogo';
  ELSE
    RAISE NOTICE 'ℹ️ Componente testimonials-clic ya existe en catálogo';
  END IF;

  -- Verificar si ya existe en componentes_web para homepage
  IF NOT EXISTS (
    SELECT 1 FROM componentes_web 
    WHERE tenant_id = v_tenant_id 
      AND componente_catalogo_id = v_componente_id
      AND tipo_pagina_id = v_tipo_pagina_id
  ) THEN
    -- Insertar en componentes_web
    INSERT INTO componentes_web (
      tenant_id,
      componente_catalogo_id,
      tipo_pagina_id,
      nombre,
      datos,
      activo,
      orden
    ) VALUES (
      v_tenant_id,
      v_componente_id,
      v_tipo_pagina_id,
      'Testimonios Homepage',
      '{
        "static_data": {
          "titulo": "Lo que dicen nuestros clientes",
          "subtitulo": "Experiencias reales de personas que han confiado en nosotros",
          "showTitle": true,
          "layout": "minimal",
          "maxItems": 4,
          "language": "es"
        },
        "dynamic_data": {
          "dataType": "testimonials",
          "limit": 6
        },
        "styles": {
          "colorPrimario": "#f04e00"
        }
      }'::jsonb,
      true,
      5  -- Orden: después de Founder Story (4)
    );
    
    RAISE NOTICE '✅ TestimonialsClic agregado a homepage';
  ELSE
    RAISE NOTICE 'ℹ️ TestimonialsClic ya está en homepage';
  END IF;

END $$;

-- PASO 2: Verificar el orden actual de componentes en homepage
SELECT 
  cw.orden,
  cw.nombre,
  cc.componente_key,
  cw.activo,
  jsonb_pretty(cw.datos) as datos_configurados
FROM componentes_web cw
JOIN catalogo_componentes cc ON cc.id = cw.componente_catalogo_id
JOIN tipos_pagina tp ON tp.id = cw.tipo_pagina_id
JOIN tenants t ON t.id = cw.tenant_id
WHERE t.slug = 'clic'
  AND tp.codigo = 'homepage'
  AND cw.activo = true
ORDER BY cw.orden ASC;

-- PASO 3: Si necesitas ajustar el orden, usa este UPDATE
-- UPDATE componentes_web 
-- SET orden = 3
-- WHERE id = (SELECT cw.id FROM componentes_web cw 
--             JOIN catalogo_componentes cc ON cc.id = cw.componente_catalogo_id 
--             WHERE cc.componente_key = 'property-carousel-clic' 
--             AND cw.tenant_id = (SELECT id FROM tenants WHERE slug = 'clic'));

