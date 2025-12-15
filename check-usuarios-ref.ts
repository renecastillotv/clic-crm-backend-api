import { pool } from './src/config/database';

/**
 * Script para verificar usuarios con ref en usuarios_tenants
 */

async function checkUsuariosRef() {
  console.log('=== VERIFICANDO USUARIOS CON REF ===\n');
  const client = await pool.connect();

  try {
    // 1. Ver estructura de usuarios_tenants
    console.log('1. ESTRUCTURA DE usuarios_tenants:');
    console.log('='.repeat(60));

    const columns = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'usuarios_tenants'
      ORDER BY ordinal_position
    `);

    console.log('Columnas:');
    console.table(columns.rows);

    // 2. Ver todos los registros de usuarios_tenants
    console.log('\n2. REGISTROS EN usuarios_tenants:');
    console.log('='.repeat(60));

    const usuarios = await client.query(`
      SELECT
        ut.usuario_id,
        ut.tenant_id,
        ut.ref,
        ut.es_owner,
        ut.activo,
        u.nombre,
        u.apellido,
        u.email
      FROM usuarios_tenants ut
      INNER JOIN usuarios u ON ut.usuario_id = u.id
      ORDER BY ut.created_at DESC
      LIMIT 20
    `);

    console.log(`Total registros: ${usuarios.rows.length}`);
    console.table(usuarios.rows);

    // 3. Ver solo usuarios con ref
    console.log('\n3. USUARIOS CON REF:');
    console.log('='.repeat(60));

    const usuariosConRef = await client.query(`
      SELECT
        ut.usuario_id,
        ut.tenant_id,
        ut.ref,
        ut.es_owner,
        u.nombre,
        u.apellido,
        u.email,
        t.nombre as tenant_nombre
      FROM usuarios_tenants ut
      INNER JOIN usuarios u ON ut.usuario_id = u.id
      INNER JOIN tenants t ON ut.tenant_id = t.id
      WHERE ut.ref IS NOT NULL
      ORDER BY ut.ref
    `);

    console.log(`Total con ref: ${usuariosConRef.rows.length}`);
    console.table(usuariosConRef.rows);

    // 4. Probar la búsqueda por ref específico
    console.log('\n4. PRUEBA DE BÚSQUEDA POR REF:');
    console.log('='.repeat(60));

    const refParaProbar = usuariosConRef.rows[0]?.ref || '123';
    const tenantId = await client.query(`SELECT id FROM tenants WHERE slug = 'clic' LIMIT 1`);

    if (tenantId.rows.length > 0) {
      console.log(`Buscando ref="${refParaProbar}" en tenant ${tenantId.rows[0].id}`);

      const resultado = await client.query(`
        SELECT
          ut.usuario_id,
          ut.tenant_id,
          ut.ref,
          ut.es_owner,
          u.nombre,
          u.apellido,
          u.email,
          pa.id as perfil_asesor_id,
          pa.slug as asesor_slug,
          pa.activo as es_asesor_activo
        FROM usuarios_tenants ut
        INNER JOIN usuarios u ON ut.usuario_id = u.id
        LEFT JOIN perfiles_asesor pa ON pa.usuario_id = u.id AND pa.tenant_id = ut.tenant_id
        WHERE ut.tenant_id = $1
          AND ut.ref = $2
          AND ut.activo = true
        LIMIT 1
      `, [tenantId.rows[0].id, refParaProbar]);

      console.log('Resultado:');
      console.table(resultado.rows);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

checkUsuariosRef();
