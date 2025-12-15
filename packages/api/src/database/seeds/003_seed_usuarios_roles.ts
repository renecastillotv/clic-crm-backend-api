import { Knex } from 'knex';

/**
 * Seed 003 - Usuarios y Roles de Prueba
 *
 * Crea usuarios de prueba para desarrollo:
 * - Platform admin
 * - Tenant owners
 * - Usuarios con múltiples roles
 *
 * IMPORTANTE: En producción, los usuarios se crean desde Clerk
 * Este seed es solo para desarrollo/testing
 */
export async function seed(knex: Knex): Promise<void> {
  // 1. Obtener tenant demo (debe existir)
  const tenant = await knex('tenants').where('slug', 'demo').first();

  if (!tenant) {
    console.log('⚠️ No se encontró tenant "demo". Ejecuta primero las migraciones y seeds anteriores.');
    return;
  }

  // 2. Obtener roles
  const roles = await knex('roles').select('id', 'codigo');
  const rolesMap = roles.reduce((acc: any, r: any) => {
    acc[r.codigo] = r.id;
    return acc;
  }, {});

  // 3. Crear usuarios de prueba
  const usuarios = [
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'admin@tusaas.com',
      nombre: 'Admin',
      apellido: 'Plataforma',
      es_platform_admin: true,
      activo: true,
      clerk_id: null, // Se llenará cuando se conecte con Clerk
    },
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'owner@demo.com',
      nombre: 'María',
      apellido: 'García',
      es_platform_admin: false,
      activo: true,
      clerk_id: null,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'agente@demo.com',
      nombre: 'Juan',
      apellido: 'Pérez',
      es_platform_admin: false,
      activo: true,
      clerk_id: null,
    },
    {
      id: knex.raw('gen_random_uuid()'),
      email: 'multi@demo.com',
      nombre: 'Carlos',
      apellido: 'López',
      es_platform_admin: false,
      activo: true,
      clerk_id: null,
    },
  ];

  // Insertar usuarios (ignorar si ya existen)
  for (const usuario of usuarios) {
    const exists = await knex('usuarios').where('email', usuario.email).first();
    if (!exists) {
      await knex('usuarios').insert(usuario);
    }
  }

  // 4. Obtener IDs de usuarios creados
  const usuariosCreados = await knex('usuarios')
    .whereIn('email', usuarios.map(u => u.email))
    .select('id', 'email', 'es_platform_admin');

  const usuariosMap = usuariosCreados.reduce((acc: any, u: any) => {
    acc[u.email] = u;
    return acc;
  }, {});

  // 5. Crear relaciones usuarios_tenants
  const relaciones = [
    // Owner del tenant demo
    {
      usuario_id: usuariosMap['owner@demo.com'].id,
      tenant_id: tenant.id,
      es_owner: true,
      activo: true,
    },
    // Agente del tenant demo
    {
      usuario_id: usuariosMap['agente@demo.com'].id,
      tenant_id: tenant.id,
      es_owner: false,
      activo: true,
    },
    // Usuario multi-rol del tenant demo
    {
      usuario_id: usuariosMap['multi@demo.com'].id,
      tenant_id: tenant.id,
      es_owner: false,
      activo: true,
    },
  ];

  for (const rel of relaciones) {
    const exists = await knex('usuarios_tenants')
      .where('usuario_id', rel.usuario_id)
      .where('tenant_id', rel.tenant_id)
      .first();
    if (!exists) {
      await knex('usuarios_tenants').insert(rel);
    }
  }

  // 6. Asignar roles a usuarios
  const asignaciones = [
    // Platform admin tiene rol super_admin (sin tenant)
    {
      usuario_id: usuariosMap['admin@tusaas.com'].id,
      tenant_id: null,
      rol_id: rolesMap['super_admin'],
      activo: true,
    },
    // Owner del demo tiene rol tenant_owner
    {
      usuario_id: usuariosMap['owner@demo.com'].id,
      tenant_id: tenant.id,
      rol_id: rolesMap['tenant_owner'],
      activo: true,
    },
    // Agente tiene rol tenant_user
    {
      usuario_id: usuariosMap['agente@demo.com'].id,
      tenant_id: tenant.id,
      rol_id: rolesMap['tenant_user'],
      activo: true,
    },
    // Usuario multi-rol tiene tenant_user (base)
    {
      usuario_id: usuariosMap['multi@demo.com'].id,
      tenant_id: tenant.id,
      rol_id: rolesMap['tenant_user'],
      activo: true,
    },
  ];

  for (const asig of asignaciones) {
    const exists = await knex('usuarios_roles')
      .where('usuario_id', asig.usuario_id)
      .where('tenant_id', asig.tenant_id)
      .where('rol_id', asig.rol_id)
      .first();
    if (!exists) {
      await knex('usuarios_roles').insert({
        ...asig,
        asignado_en: knex.fn.now(),
      });
    }
  }

  // 7. Crear roles custom para el tenant demo (ejemplo)
  const rolesCustom = [
    {
      nombre: 'Asesor Inmobiliario',
      codigo: 'asesor',
      descripcion: 'Agente de ventas con acceso a propiedades y clientes',
      tipo: 'tenant',
      tenant_id: tenant.id,
      es_protegido: false,
      color: '#3B82F6',
      icono: 'briefcase',
      activo: true,
    },
    {
      nombre: 'Content Creator',
      codigo: 'content-creator',
      descripcion: 'Creador de contenido para blog y redes',
      tipo: 'tenant',
      tenant_id: tenant.id,
      es_protegido: false,
      color: '#8B5CF6',
      icono: 'edit-3',
      activo: true,
    },
  ];

  for (const rol of rolesCustom) {
    const exists = await knex('roles')
      .where('codigo', rol.codigo)
      .where('tenant_id', tenant.id)
      .first();
    if (!exists) {
      await knex('roles').insert(rol);
    }
  }

  // 8. Obtener IDs de roles custom creados
  const rolesCustomCreados = await knex('roles')
    .where('tenant_id', tenant.id)
    .whereIn('codigo', ['asesor', 'content-creator'])
    .select('id', 'codigo');

  const rolesCustomMap = rolesCustomCreados.reduce((acc: any, r: any) => {
    acc[r.codigo] = r.id;
    return acc;
  }, {});

  // 9. Asignar permisos a roles custom
  if (rolesCustomMap['asesor']) {
    const asessorPermisos = [
      { modulo_id: 'dashboard', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
      { modulo_id: 'propiedades', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'own' },
      { modulo_id: 'clientes', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
      { modulo_id: 'agenda', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'own', alcance_editar: 'own' },
    ];

    for (const perm of asessorPermisos) {
      const exists = await knex('roles_modulos')
        .where('rol_id', rolesCustomMap['asesor'])
        .where('modulo_id', perm.modulo_id)
        .first();
      if (!exists) {
        await knex('roles_modulos').insert({
          rol_id: rolesCustomMap['asesor'],
          ...perm,
        });
      }
    }
  }

  if (rolesCustomMap['content-creator']) {
    const creatorPermisos = [
      { modulo_id: 'dashboard', puede_ver: true, puede_crear: false, puede_editar: false, puede_eliminar: false, alcance_ver: 'own', alcance_editar: 'own' },
      { modulo_id: 'blog', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'all', alcance_editar: 'all' },
      { modulo_id: 'media', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: true, alcance_ver: 'all', alcance_editar: 'all' },
      { modulo_id: 'redes-sociales', puede_ver: true, puede_crear: true, puede_editar: true, puede_eliminar: false, alcance_ver: 'all', alcance_editar: 'all' },
    ];

    for (const perm of creatorPermisos) {
      const exists = await knex('roles_modulos')
        .where('rol_id', rolesCustomMap['content-creator'])
        .where('modulo_id', perm.modulo_id)
        .first();
      if (!exists) {
        await knex('roles_modulos').insert({
          rol_id: rolesCustomMap['content-creator'],
          ...perm,
        });
      }
    }
  }

  // 10. Asignar roles custom al usuario multi-rol
  if (rolesCustomMap['asesor'] && rolesCustomMap['content-creator']) {
    const multiRolAsignaciones = [
      {
        usuario_id: usuariosMap['multi@demo.com'].id,
        tenant_id: tenant.id,
        rol_id: rolesCustomMap['asesor'],
        activo: true,
        asignado_en: knex.fn.now(),
      },
      {
        usuario_id: usuariosMap['multi@demo.com'].id,
        tenant_id: tenant.id,
        rol_id: rolesCustomMap['content-creator'],
        activo: true,
        asignado_en: knex.fn.now(),
      },
    ];

    for (const asig of multiRolAsignaciones) {
      const exists = await knex('usuarios_roles')
        .where('usuario_id', asig.usuario_id)
        .where('tenant_id', asig.tenant_id)
        .where('rol_id', asig.rol_id)
        .first();
      if (!exists) {
        await knex('usuarios_roles').insert(asig);
      }
    }
  }

  console.log('✅ Seed de usuarios y roles completado');
  console.log('   Usuarios creados:');
  console.log('   - admin@tusaas.com (Platform Admin)');
  console.log('   - owner@demo.com (Tenant Owner - Demo)');
  console.log('   - agente@demo.com (Tenant User - Demo)');
  console.log('   - multi@demo.com (Multi-rol: asesor + content-creator - Demo)');
}
