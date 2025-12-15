-- Seed: Insertar componentes de prueba
-- Ejecutar este SQL después de la migración 004

-- Obtener el primer tenant (o crear uno si no existe)
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Obtener o crear tenant
  SELECT id INTO v_tenant_id FROM tenants LIMIT 1;
  
  IF v_tenant_id IS NULL THEN
    INSERT INTO tenants (nombre, slug, activo)
    VALUES ('Inmobiliaria Demo', 'demo', TRUE)
    RETURNING id INTO v_tenant_id;
  END IF;

  -- Crear tema por defecto si no existe
  INSERT INTO temas_tenant (tenant_id, nombre, colores, activo)
  VALUES (
    v_tenant_id,
    'Tema Personalizado',
    '{"primary":"#667eea","secondary":"#764ba2","accent":"#f56565","background":"#ffffff","text":"#1a202c","textSecondary":"#718096","border":"#e2e8f0","success":"#48bb78","warning":"#ed8936","error":"#f56565"}'::jsonb,
    TRUE
  )
  ON CONFLICT (tenant_id) DO NOTHING;

  -- Insertar componentes de ejemplo (solo si no existen)
  IF NOT EXISTS (SELECT 1 FROM componentes_web WHERE tenant_id = v_tenant_id) THEN
    INSERT INTO componentes_web (tenant_id, tipo, variante, datos, activo, orden, pagina_id)
    VALUES
      (
        v_tenant_id,
        'header',
        'default',
        '{"logo":"","mostrarBusqueda":true,"mostrarMenu":true}'::jsonb,
        TRUE,
        -1,
        NULL
      ),
      (
        v_tenant_id,
        'hero',
        'default',
        '{"titulo":"Bienvenido a Nuestra Inmobiliaria","subtitulo":"Encuentra la propiedad de tus sueños en el lugar perfecto","textoBoton":"Ver Propiedades","urlBoton":"/propiedades"}'::jsonb,
        TRUE,
        0,
        NULL
      ),
      (
        v_tenant_id,
        'footer',
        'default',
        '{"textoCopyright":"© 2024 Inmobiliaria. Todos los derechos reservados.","telefono":"+1 234 567 890","email":"contacto@inmobiliaria.com","direccion":"Calle Principal 123, Ciudad"}'::jsonb,
        TRUE,
        100,
        NULL
      );
    
    RAISE NOTICE '✅ Componentes de prueba insertados para tenant: %', v_tenant_id;
  ELSE
    RAISE NOTICE '⚠️ Ya existen componentes para este tenant';
  END IF;
END $$;



