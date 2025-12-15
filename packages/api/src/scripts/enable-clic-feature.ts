/**
 * Script para habilitar el feature "CLIC Premium Variants" al tenant CLIC
 * 
 * Ejecutar: pnpm tsx -r dotenv/config src/scripts/enable-clic-feature.ts
 */

import { query, getClient } from '../utils/db.js';

async function enableClicFeature() {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');

    // 1. Buscar el tenant CLIC por slug
    const tenantResult = await client.query(
      `SELECT id, nombre, slug FROM tenants WHERE slug = 'clic' LIMIT 1`
    );

    if (tenantResult.rows.length === 0) {
      throw new Error('No se encontró el tenant CLIC con slug "clic"');
    }

    const tenant = tenantResult.rows[0];
    console.log(`✅ Tenant encontrado: ${tenant.nombre} (ID: ${tenant.id})`);

    // 2. Buscar el feature "CLIC Premium Variants"
    const featureResult = await client.query(
      `SELECT id, name FROM features WHERE name = 'CLIC Premium Variants' LIMIT 1`
    );

    if (featureResult.rows.length === 0) {
      throw new Error('No se encontró el feature "CLIC Premium Variants". Ejecuta primero la migración 022.');
    }

    const feature = featureResult.rows[0];
    console.log(`✅ Feature encontrado: ${feature.name} (ID: ${feature.id})`);

    // 3. Verificar si ya está habilitado
    const existingResult = await client.query(
      `SELECT id FROM tenants_features WHERE tenant_id = $1 AND feature_id = $2`,
      [tenant.id, feature.id]
    );

    if (existingResult.rows.length > 0) {
      console.log(`⚠️  El feature ya está habilitado para el tenant CLIC`);
      await client.query('COMMIT');
      return;
    }

    // 4. Habilitar el feature
    await client.query(
      `INSERT INTO tenants_features (tenant_id, feature_id, created_at) VALUES ($1, $2, NOW())`,
      [tenant.id, feature.id]
    );

    await client.query('COMMIT');
    console.log(`✅ Feature "CLIC Premium Variants" habilitado exitosamente para el tenant CLIC`);
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('❌ Error al habilitar feature:', error.message);
    process.exit(1);
  } finally {
    client.release();
  }
}

enableClicFeature();

