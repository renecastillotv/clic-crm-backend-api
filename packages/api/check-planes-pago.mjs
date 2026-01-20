import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function main() {
  try {
    // Ver propiedades de tipo proyecto con sus campos de proyecto
    const result = await pool.query(`
      SELECT
        id,
        titulo,
        is_project,
        planes_pago,
        beneficios,
        garantias,
        tipologias,
        etapas
      FROM propiedades
      WHERE is_project = true
      LIMIT 5
    `);

    console.log('=== Propiedades de Proyecto ===\n');

    for (const row of result.rows) {
      console.log(`ID: ${row.id}`);
      console.log(`Titulo: ${row.titulo}`);
      console.log(`planes_pago: ${JSON.stringify(row.planes_pago, null, 2)}`);
      console.log(`beneficios: ${JSON.stringify(row.beneficios, null, 2)}`);
      console.log(`garantias: ${JSON.stringify(row.garantias, null, 2)}`);
      console.log(`tipologias: ${row.tipologias ? 'Tiene datos' : 'null'}`);
      console.log(`etapas: ${row.etapas ? 'Tiene datos' : 'null'}`);
      console.log('---\n');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

main();
