/**
 * Script para actualizar las opciones predeterminadas de fuente_lead
 */
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

// Nuevas fuentes predeterminadas
const FUENTES_DEFAULT = [
  'Página Web',
  'Portales Inmobiliarios',
  'Referido',
  'Conocido',
  'Periódico',
  'Youtube',
  'Instagram',
  'Campaña Publicitaria',
  'Letrero',
  'Sin Vía',
];

async function updateFuentesLead() {
  const client = await pool.connect();

  try {
    console.log("🚀 Actualizando opciones de fuente_lead...\n");

    // Obtener la extensión Lead
    const leadResult = await client.query(`
      SELECT id, campos_schema FROM catalogo_extensiones_contacto
      WHERE codigo = 'lead' AND es_sistema = true
    `);

    if (leadResult.rows.length === 0) {
      console.log("❌ No se encontró la extensión Lead");
      return;
    }

    const lead = leadResult.rows[0];
    let camposSchema = lead.campos_schema || [];

    // Encontrar el campo fuente_lead
    const idx = camposSchema.findIndex(c => c.campo === 'fuente_lead');
    if (idx < 0) {
      console.log("❌ No se encontró el campo fuente_lead");
      return;
    }

    console.log("📋 Opciones actuales:", camposSchema[idx].opciones);

    // Actualizar opciones
    camposSchema[idx].opciones = FUENTES_DEFAULT;
    camposSchema[idx].opciones_editables = true;

    // Guardar
    await client.query(`
      UPDATE catalogo_extensiones_contacto
      SET campos_schema = $1, updated_at = NOW()
      WHERE id = $2
    `, [JSON.stringify(camposSchema), lead.id]);

    console.log("\n✅ Opciones actualizadas:");
    FUENTES_DEFAULT.forEach(f => console.log(`   - ${f}`));

    // Verificar
    const verify = await client.query(`
      SELECT campos_schema FROM catalogo_extensiones_contacto
      WHERE id = $1
    `, [lead.id]);

    const campo = verify.rows[0].campos_schema.find(c => c.campo === 'fuente_lead');
    console.log("\n📋 Verificación - Campo fuente_lead:");
    console.log("   opciones_editables:", campo.opciones_editables);
    console.log("   opciones:", campo.opciones.length, "fuentes");

  } catch (error) {
    console.error("❌ Error:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateFuentesLead().catch(console.error);
