import { query } from './src/utils/db.js';

async function testFeatureQuery() {
  const tenantId = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

  console.log('\n=== Testing Feature Query ===\n');

  // Get tenant info first
  const tenantResult = await query('SELECT id, nombre, plan FROM tenants WHERE id = $1', [tenantId]);
  console.log('Tenant:', tenantResult.rows[0]);
  console.log('');

  // Test the corrected query
  const sql = `
    SELECT
      f.id,
      f.name,
      f.description,
      f.icon,
      f.category,
      f.is_public as "isPublic",
      f.is_premium as "isPremium",
      f.available_in_plans as "availableInPlans",
      f.created_at as "createdAt",
      f.updated_at as "updatedAt",
      CASE
        WHEN tf.id IS NOT NULL THEN true
        WHEN t.plan = ANY(
          SELECT jsonb_array_elements_text(f.available_in_plans)::text
        ) THEN true
        ELSE false
      END as enabled
    FROM features f
    LEFT JOIN tenants t ON t.id = $1
    LEFT JOIN tenants_features tf ON f.id = tf.feature_id AND tf.tenant_id = $1
    ORDER BY f.name ASC
  `;

  const result = await query(sql, [tenantId]);

  console.log('Features found:', result.rows.length);
  console.log('');

  result.rows.forEach(feature => {
    console.log(`[${feature.enabled ? '✓' : ' '}] ${feature.name}`);
    console.log(`    Category: ${feature.category}`);
    console.log(`    Plans: ${JSON.stringify(feature.availableInPlans)}`);
    console.log('');
  });
}

testFeatureQuery()
  .then(() => {
    console.log('✅ Test completed');
    process.exit(0);
  })
  .catch(error => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
