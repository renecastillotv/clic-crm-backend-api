import { query } from './src/utils/db.js';

async function checkManualFeatures() {
  const tenantId = '9763dd67-1b33-40b1-ae78-73e5bcafc2b7'; // Demo tenant

  console.log('\n=== Checking Manually Enabled Features ===\n');

  const result = await query(
    `SELECT tf.id, tf.tenant_id, f.name as feature_name, f.available_in_plans
     FROM tenants_features tf
     JOIN features f ON tf.feature_id = f.id
     WHERE tf.tenant_id = $1`,
    [tenantId]
  );

  console.log(`Found ${result.rows.length} manually enabled features:\n`);

  result.rows.forEach(row => {
    console.log(`  - ${row.feature_name}`);
    console.log(`    Available in plans: ${JSON.stringify(row.available_in_plans)}`);
    console.log('');
  });
}

checkManualFeatures()
  .then(() => process.exit(0))
  .catch(error => {
    console.error('Error:', error);
    process.exit(1);
  });
