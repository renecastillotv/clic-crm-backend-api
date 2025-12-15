-- Script para restaurar permisos de administrador de plataforma
-- Usuario: renecastillotv@gmail.com
-- Fecha: 2025-12-01

-- 1. Actualizar permisos globales del usuario
UPDATE usuarios
SET
  es_superadmin = true,
  rol_global = 'platform_admin',
  updated_at = NOW()
WHERE email = 'renecastillotv@gmail.com';

-- 2. Verificar que el usuario tenga rol de admin en todos sus tenants
UPDATE tenant_usuarios
SET
  rol = 'admin',
  updated_at = NOW()
WHERE usuario_id = (SELECT id FROM usuarios WHERE email = 'renecastillotv@gmail.com')
  AND rol != 'admin';

-- 3. Verificar el resultado
SELECT
  u.id,
  u.email,
  u.rol_global,
  u.es_superadmin,
  COUNT(tu.tenant_id) as num_tenants,
  ARRAY_AGG(t.nombre ORDER BY t.nombre) as tenants,
  ARRAY_AGG(tu.rol ORDER BY t.nombre) as roles_por_tenant
FROM usuarios u
LEFT JOIN tenant_usuarios tu ON tu.usuario_id = u.id
LEFT JOIN tenants t ON t.id = tu.tenant_id
WHERE u.email = 'renecastillotv@gmail.com'
GROUP BY u.id, u.email, u.rol_global, u.es_superadmin;
