import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocalhost = dbUrl?.includes("localhost") || dbUrl?.includes("127.0.0.1");

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

async function verify() {
  const client = await pool.connect();

  try {
    // Verificar extensiones
    const ext = await client.query('SELECT codigo, nombre FROM catalogo_extensiones_contacto WHERE es_sistema = true ORDER BY orden');
    console.log('Extensiones de sistema:', ext.rows.length);
    ext.rows.forEach(e => console.log(`  - ${e.codigo}: ${e.nombre}`));

    // Verificar campos_schema de Lead
    const lead = await client.query("SELECT campos_schema FROM catalogo_extensiones_contacto WHERE codigo = 'lead' AND es_sistema = true");
    if (lead.rows.length > 0) {
      const campos = lead.rows[0].campos_schema;
      const fuenteField = campos.find(c => c.campo === 'fuente_lead');
      console.log('\nCampo fuente_lead:');
      console.log(JSON.stringify(fuenteField, null, 2));
    }
  } finally {
    client.release();
    await pool.end();
  }
}

verify().catch(console.error);
