/**
 * Script para ejecutar migracion 106 y 107: Sistema de Extensiones de Contacto
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Pool } = pg;

const dbUrl = process.env.DATABASE_URL;
const isLocalhost = dbUrl?.includes("localhost") || dbUrl?.includes("127.0.0.1");

const pool = new Pool({
  connectionString: dbUrl,
  ssl: isLocalhost ? false : { rejectUnauthorized: false }
});

async function runMigration() {
  const client = await pool.connect();

  try {
    console.log("🚀 Ejecutando migracion 106: Sistema de Extensiones de Contacto...\n");

    // Leer el archivo SQL
    const sqlPath = path.join(__dirname, "src/scripts/106-extensiones-contacto.sql");
    const sql = fs.readFileSync(sqlPath, "utf8");

    // Ejecutar
    await client.query(sql);

    console.log("✅ Migracion 106 completada exitosamente\n");

    // Verificar
    const tableCheck = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'catalogo_extensiones_contacto'
      )
    `);
    console.log("📋 Tabla catalogo_extensiones_contacto creada:", tableCheck.rows[0].exists);

    const tableCheck2 = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'contacto_extensiones'
      )
    `);
    console.log("📋 Tabla contacto_extensiones creada:", tableCheck2.rows[0].exists);

    // Contar extensiones de sistema
    const extCount = await client.query(`
      SELECT COUNT(*) as count FROM catalogo_extensiones_contacto WHERE es_sistema = true
    `);
    console.log("📊 Extensiones de sistema creadas:", extCount.rows[0].count);

    // Mostrar extensiones
    const extensiones = await client.query(`
      SELECT codigo, nombre, color FROM catalogo_extensiones_contacto WHERE es_sistema = true ORDER BY orden
    `);
    console.log("\n📋 Extensiones de sistema:");
    extensiones.rows.forEach(e => {
      console.log("   - " + e.nombre + " (" + e.codigo + ") " + e.color);
    });

    // ==================== MIGRACIÓN 107 ====================
    console.log("\n🚀 Ejecutando migración 107: Agregar opciones_personalizadas...\n");

    // Verificar si la columna ya existe
    const checkCol = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_extension_preferencias'
        AND column_name = 'opciones_personalizadas'
      )
    `);

    if (checkCol.rows[0].exists) {
      console.log("✅ La columna opciones_personalizadas ya existe\n");
    } else {
      // Agregar columna opciones_personalizadas
      await client.query(`
        ALTER TABLE tenant_extension_preferencias
        ADD COLUMN IF NOT EXISTS opciones_personalizadas JSONB DEFAULT '{}'
      `);
      console.log("✅ Columna opciones_personalizadas agregada\n");
    }

    // Verificar si updated_at existe
    const checkUpdated = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'tenant_extension_preferencias'
        AND column_name = 'updated_at'
      )
    `);

    if (!checkUpdated.rows[0].exists) {
      await client.query(`
        ALTER TABLE tenant_extension_preferencias
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW()
      `);
      console.log("✅ Columna updated_at agregada\n");
    }

    // Actualizar el campo "fuente" de la extensión Lead para que sea editable
    console.log("📝 Actualizando extensión Lead para permitir personalizar fuentes...\n");

    // Obtener la extensión Lead
    const leadResult = await client.query(`
      SELECT id, campos_schema FROM catalogo_extensiones_contacto
      WHERE codigo = 'lead' AND es_sistema = true
    `);

    if (leadResult.rows.length > 0) {
      const lead = leadResult.rows[0];
      let camposSchema = lead.campos_schema || [];

      // Encontrar el campo "fuente" y marcar opciones_editables = true
      const fuenteIndex = camposSchema.findIndex(c => c.campo === 'fuente');
      if (fuenteIndex >= 0) {
        camposSchema[fuenteIndex].opciones_editables = true;

        // Actualizar
        await client.query(`
          UPDATE catalogo_extensiones_contacto
          SET campos_schema = $1, updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(camposSchema), lead.id]);

        console.log("✅ Campo 'fuente' de Lead marcado como personalizable\n");
      } else {
        console.log("⚠️  No se encontró el campo 'fuente' en Lead\n");
      }
    }

    // Verificar
    const verifyResult = await client.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_name = 'tenant_extension_preferencias'
      ORDER BY ordinal_position
    `);

    console.log("📋 Columnas en tenant_extension_preferencias:");
    verifyResult.rows.forEach(col => {
      console.log(`   - ${col.column_name}: ${col.data_type}`);
    });

    console.log("\n✅ Migraciones completadas exitosamente");

  } catch (error) {
    console.error("❌ Error en migracion:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

runMigration().catch(console.error);

