import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkTables() {
  const client = await pool.connect();
  try {
    // Check if comisiones table exists
    const comisionesRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'comisiones'
      ORDER BY ordinal_position
    `);

    if (comisionesRes.rows.length > 0) {
      console.log('\n=== TABLA comisiones ===');
      comisionesRes.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('\n❌ Tabla comisiones NO existe');
    }

    // Check if pagos_comisiones table exists
    const pagosRes = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'pagos_comisiones'
      ORDER BY ordinal_position
    `);

    if (pagosRes.rows.length > 0) {
      console.log('\n=== TABLA pagos_comisiones ===');
      pagosRes.rows.forEach(col => {
        console.log(`  ${col.column_name}: ${col.data_type} (nullable: ${col.is_nullable})`);
      });
    } else {
      console.log('\n❌ Tabla pagos_comisiones NO existe');
    }

    // Check usuarios table for avatar column
    const usuariosRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'usuarios' AND column_name IN ('avatar', 'avatar_url', 'foto', 'foto_url', 'imagen')
    `);

    console.log('\n=== Columnas de imagen en usuarios ===');
    if (usuariosRes.rows.length > 0) {
      usuariosRes.rows.forEach(col => {
        console.log(`  ✓ ${col.column_name}`);
      });
    } else {
      console.log('  ❌ No hay columnas de avatar/foto');
    }

    // Check propiedades table for imagen column
    const propiedadesRes = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'propiedades' AND column_name IN ('imagen', 'imagen_url', 'foto', 'foto_url', 'imagen_principal')
    `);

    console.log('\n=== Columnas de imagen en propiedades ===');
    if (propiedadesRes.rows.length > 0) {
      propiedadesRes.rows.forEach(col => {
        console.log(`  ✓ ${col.column_name}`);
      });
    } else {
      console.log('  ❌ No hay columnas de imagen');
    }

  } finally {
    client.release();
    await pool.end();
  }
}

checkTables().catch(console.error);
