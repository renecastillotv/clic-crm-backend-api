import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  // Campos de propiedades relacionados con red/comision
  const propCols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'propiedades'
    AND (column_name LIKE '%red%' OR column_name LIKE '%comision%' OR column_name LIKE '%share%' OR column_name LIKE '%afiliado%' OR column_name LIKE '%connect%')
    ORDER BY column_name
  `);

  console.log('=== CAMPOS EN PROPIEDADES ===');
  propCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.is_nullable === 'YES' ? 'nullable' : 'not null'})`));

  // Campos de tenants relacionados
  const tenantCols = await pool.query(`
    SELECT column_name, data_type, is_nullable
    FROM information_schema.columns
    WHERE table_name = 'tenants'
    AND (column_name LIKE '%red%' OR column_name LIKE '%comision%' OR column_name LIKE '%share%' OR column_name LIKE '%afiliado%' OR column_name LIKE '%connect%')
    ORDER BY column_name
  `);

  console.log('\n=== CAMPOS EN TENANTS ===');
  tenantCols.rows.forEach(r => console.log(`  ${r.column_name}: ${r.data_type} (${r.is_nullable === 'YES' ? 'nullable' : 'not null'})`));

  // Ver valores actuales en una propiedad
  const prop = await pool.query(`
    SELECT id, titulo, red_global, red_global_comision, share_commission
    FROM propiedades
    WHERE red_global = true
    LIMIT 3
  `);

  console.log('\n=== PROPIEDADES CON RED GLOBAL ===');
  prop.rows.forEach(r => console.log(`  ${r.titulo}: red_global_comision='${r.red_global_comision}', share_commission=${r.share_commission}`));

  // Ver valores default en tenant
  const tenant = await pool.query(`
    SELECT id, nombre, red_global_comision_default, connect_comision_default
    FROM tenants
    LIMIT 2
  `);

  console.log('\n=== TENANTS DEFAULTS ===');
  tenant.rows.forEach(r => console.log(`  ${r.nombre}: red_global_comision_default='${r.red_global_comision_default}', connect_comision_default='${r.connect_comision_default}'`));

  await pool.end();
}

check();
