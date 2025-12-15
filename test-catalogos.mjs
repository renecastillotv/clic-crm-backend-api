/**
 * Test del nuevo sistema de preferencias de catálogos
 */
import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const { Pool } = pg;
const dbUrl = process.env.DATABASE_URL;
const isLocalhost = dbUrl?.includes('localhost') || dbUrl?.includes('127.0.0.1');
const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

const API = 'http://localhost:3001/api';

async function test() {
  // Primero obtenemos un tenant directamente de la BD
  const tenantResult = await pool.query('SELECT id, nombre FROM tenants LIMIT 1');
  const tenant = tenantResult.rows[0];
  console.log('Tenant:', tenant.nombre, '(', tenant.id, ')');

  // Obtener catalogos de tipo_contacto (todos, activos e inactivos)
  const catRes = await fetch(`${API}/tenants/${tenant.id}/catalogos/tipo_contacto?activo=false`);
  const catData = await catRes.json();
  console.log('\n📋 Tipos de contacto:');
  catData.items.forEach(c => {
    console.log(` - ${c.codigo} | activo: ${c.activo} | origen: ${c.origen} | tiene_preferencia: ${c.tiene_preferencia}`);
  });

  // Buscar un item global para probar toggle
  const globalItem = catData.items.find(i => i.origen === 'global' && i.activo);
  if (globalItem) {
    console.log('\n--- Probando toggle de', globalItem.codigo, '---');
    console.log('Estado actual: activo=', globalItem.activo);

    // Toggle: desactivar
    console.log('\n1. Desactivando...');
    const toggleRes1 = await fetch(`${API}/tenants/${tenant.id}/catalogos/tipo_contacto/toggle/${globalItem.codigo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: false })
    });
    const toggleData1 = await toggleRes1.json();
    console.log('   Resultado:', toggleData1.source, '-', toggleData1.message || '');
    console.log('   Nuevo estado: activo=', toggleData1.catalogo.activo, 'tiene_preferencia:', toggleData1.catalogo.tiene_preferencia);

    // Verificar que quedó desactivado
    const verifyRes1 = await fetch(`${API}/tenants/${tenant.id}/catalogos/tipo_contacto?activo=false`);
    const verifyData1 = await verifyRes1.json();
    const updated1 = verifyData1.items.find(i => i.codigo === globalItem.codigo);
    console.log('   Verificación en lista: activo=', updated1.activo, 'tiene_preferencia=', updated1.tiene_preferencia);

    // Toggle: reactivar (debe eliminar la preferencia y volver al default)
    console.log('\n2. Reactivando (volver al default)...');
    const toggleRes2 = await fetch(`${API}/tenants/${tenant.id}/catalogos/tipo_contacto/toggle/${globalItem.codigo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ activo: true })
    });
    const toggleData2 = await toggleRes2.json();
    console.log('   Resultado:', toggleData2.source, '-', toggleData2.message || '');
    console.log('   Estado restaurado: activo=', toggleData2.catalogo.activo, 'tiene_preferencia:', toggleData2.catalogo.tiene_preferencia);

    // Verificar que está activo y sin preferencia
    const verifyRes2 = await fetch(`${API}/tenants/${tenant.id}/catalogos/tipo_contacto?activo=false`);
    const verifyData2 = await verifyRes2.json();
    const updated2 = verifyData2.items.find(i => i.codigo === globalItem.codigo);
    console.log('   Verificación final: activo=', updated2.activo, 'tiene_preferencia=', updated2.tiene_preferencia);
  }

  console.log('\n✅ Test completado');
  await pool.end();
}

test().catch(e => { console.error(e); pool.end(); });
