import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function checkColumns() {
  const client = await pool.connect();
  try {
    console.log('=== Verificando columnas de Connect en propiedades ===\n');

    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'propiedades'
      AND column_name IN ('connect', 'connect_terminos', 'connect_comision')
      ORDER BY column_name
    `);

    if (result.rows.length === 0) {
      console.log('❌ No se encontraron las columnas');
    } else {
      console.log('Columnas encontradas:');
      result.rows.forEach(r => {
        console.log(`  - ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`);
      });
    }

    // Verificar datos de una propiedad
    console.log('\n=== Datos de ejemplo ===\n');
    const props = await client.query(`
      SELECT id, nombre, connect, connect_terminos, connect_comision
      FROM propiedades
      LIMIT 3
    `);

    props.rows.forEach(p => {
      console.log(`Propiedad: ${p.nombre}`);
      console.log(`  - connect: ${p.connect}`);
      console.log(`  - connect_terminos: ${p.connect_terminos || '(vacío)'}`);
      console.log(`  - connect_comision: ${p.connect_comision || '(vacío)'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

checkColumns();
