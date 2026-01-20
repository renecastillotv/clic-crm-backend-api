import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const client = await pool.connect();
  try {
    console.log('=== Verificando datos de Connect en propiedad 91177360-b5c0-4f87-9acc-1c302ccc7020 ===\n');

    const result = await client.query(`
      SELECT
        id,
        connect,
        connect_terminos,
        connect_comision,
        red_global,
        red_global_comision,
        red_afiliados
      FROM propiedades
      WHERE id = '91177360-b5c0-4f87-9acc-1c302ccc7020'
    `);

    if (result.rows.length === 0) {
      console.log('❌ Propiedad no encontrada');
    } else {
      const p = result.rows[0];
      console.log('Datos encontrados:');
      console.log('  - connect:', p.connect);
      console.log('  - connect_terminos:', p.connect_terminos || '(vacío)');
      console.log('  - connect_comision:', p.connect_comision || '(vacío)');
      console.log('  - red_global:', p.red_global);
      console.log('  - red_global_comision:', p.red_global_comision || '(vacío)');
      console.log('  - red_afiliados:', p.red_afiliados);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

check();
