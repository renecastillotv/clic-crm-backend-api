/**
 * Script de Migración: Extensiones de Contacto
 *
 * Este script migra los datos existentes de:
 * - contactos.tipos_contacto (array de códigos como ['lead', 'cliente'])
 * - contactos.datos_extra (objeto con datos por extensión como { extension_lead: {...} })
 *
 * A la nueva tabla contacto_extensiones que normaliza la estructura.
 *
 * Uso: node src/scripts/migrate-extensiones-contacto.mjs
 *
 * IMPORTANTE: Este script es idempotente - puede ejecutarse múltiples veces
 * sin duplicar datos gracias a ON CONFLICT DO NOTHING.
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

// Mapeo de códigos antiguos a nuevos (por si hay diferencias)
const CODIGO_MAP = {
  'lead': 'lead',
  'cliente': 'cliente',
  'asesor': 'asesor_inmobiliario',  // El antiguo era "asesor", el nuevo es "asesor_inmobiliario"
  'desarrollador': 'desarrollador',
  'referidor': 'referidor',
  'propietario': 'propietario',
  'master_broker': 'master_broker',
};

// Mapeo de claves de datos_extra a extension_id
// Los datos se guardaban como datos_extra.extension_lead, etc.
const DATA_KEY_PREFIX = 'extension_';

async function migrate() {
  const client = await pool.connect();

  try {
    console.log("🚀 Iniciando migración de extensiones de contacto...\n");

    // 1. Obtener el mapeo de códigos a IDs de extensiones del catálogo
    const extensionesResult = await client.query(`
      SELECT id, codigo FROM catalogo_extensiones_contacto
      WHERE es_sistema = true AND tenant_id IS NULL
    `);

    const extensionMap = {};
    for (const ext of extensionesResult.rows) {
      extensionMap[ext.codigo] = ext.id;
    }

    console.log("📋 Extensiones de sistema encontradas:", Object.keys(extensionMap).join(", "));

    // 2. Obtener todos los contactos que tienen tipos_contacto
    const contactosResult = await client.query(`
      SELECT id, tenant_id, tipos_contacto, datos_extra
      FROM contactos
      WHERE tipos_contacto IS NOT NULL
        AND jsonb_array_length(tipos_contacto) > 0
    `);

    console.log(`📊 Contactos con extensiones a migrar: ${contactosResult.rows.length}\n`);

    let migrated = 0;
    let skipped = 0;
    let errors = 0;

    // 3. Procesar cada contacto
    for (const contacto of contactosResult.rows) {
      const tiposContacto = contacto.tipos_contacto || [];
      const datosExtra = contacto.datos_extra || {};

      for (const tipoAntiguo of tiposContacto) {
        // Mapear código antiguo a nuevo
        const codigoNuevo = CODIGO_MAP[tipoAntiguo] || tipoAntiguo;
        const extensionId = extensionMap[codigoNuevo];

        if (!extensionId) {
          console.log(`  ⚠️  Extensión no encontrada: ${tipoAntiguo} -> ${codigoNuevo}`);
          skipped++;
          continue;
        }

        // Obtener datos guardados para esta extensión
        const dataKey = `${DATA_KEY_PREFIX}${tipoAntiguo}`;
        const datos = datosExtra[dataKey] || {};

        try {
          // Insertar en contacto_extensiones (ON CONFLICT ignora si ya existe)
          await client.query(`
            INSERT INTO contacto_extensiones
              (tenant_id, contacto_id, extension_id, datos, activo)
            VALUES ($1, $2, $3, $4, true)
            ON CONFLICT (contacto_id, extension_id) DO NOTHING
          `, [contacto.tenant_id, contacto.id, extensionId, JSON.stringify(datos)]);

          migrated++;
        } catch (err) {
          console.error(`  ❌ Error migrando contacto ${contacto.id}, extensión ${tipoAntiguo}:`, err.message);
          errors++;
        }
      }
    }

    console.log("\n📊 Resumen de migración:");
    console.log(`   ✅ Extensiones migradas: ${migrated}`);
    console.log(`   ⏭️  Omitidas (no encontradas): ${skipped}`);
    console.log(`   ❌ Errores: ${errors}`);

    // 4. Verificar migración
    const verifyResult = await client.query(`
      SELECT COUNT(*) as count FROM contacto_extensiones
    `);
    console.log(`\n📋 Total de registros en contacto_extensiones: ${verifyResult.rows[0].count}`);

    // 5. Mostrar ejemplo de migración
    const sampleResult = await client.query(`
      SELECT
        ce.id,
        c.nombre as contacto,
        e.nombre as extension,
        ce.datos
      FROM contacto_extensiones ce
      JOIN contactos c ON c.id = ce.contacto_id
      JOIN catalogo_extensiones_contacto e ON e.id = ce.extension_id
      LIMIT 5
    `);

    if (sampleResult.rows.length > 0) {
      console.log("\n📝 Ejemplo de datos migrados:");
      for (const row of sampleResult.rows) {
        console.log(`   - ${row.contacto} -> ${row.extension}: ${JSON.stringify(row.datos)}`);
      }
    }

    console.log("\n✅ Migración completada exitosamente");

  } catch (error) {
    console.error("❌ Error en migración:", error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Función adicional para corregir duplicados y marcar campos editables
async function fixDuplicatesAndSetEditableFields() {
  const client = await pool.connect();
  try {
    console.log("\n🔧 Corrigiendo duplicados y configurando campos editables...\n");

    // 1. Eliminar duplicados (manteniendo el registro más antiguo por created_at)
    const deleteResult = await client.query(`
      DELETE FROM catalogo_extensiones_contacto
      WHERE id NOT IN (
        SELECT DISTINCT ON (codigo, COALESCE(tenant_id::text, '')) id
        FROM catalogo_extensiones_contacto
        ORDER BY codigo, COALESCE(tenant_id::text, ''), created_at ASC
      )
    `);
    console.log(`✅ Eliminados ${deleteResult.rowCount} registros duplicados`);

    // 2. Actualizar fuente_lead para que sea editable
    const leadResult = await client.query(`
      SELECT id, campos_schema FROM catalogo_extensiones_contacto
      WHERE codigo = 'lead' AND es_sistema = true
      LIMIT 1
    `);

    if (leadResult.rows.length > 0) {
      const lead = leadResult.rows[0];
      let camposSchema = lead.campos_schema || [];

      const idx = camposSchema.findIndex(c => c.campo === 'fuente_lead');
      if (idx >= 0 && !camposSchema[idx].opciones_editables) {
        camposSchema[idx].opciones_editables = true;

        await client.query(`
          UPDATE catalogo_extensiones_contacto
          SET campos_schema = $1, updated_at = NOW()
          WHERE id = $2
        `, [JSON.stringify(camposSchema), lead.id]);

        console.log("✅ Campo 'fuente_lead' de Lead marcado como personalizable");
      } else if (idx >= 0) {
        console.log("✅ Campo 'fuente_lead' ya está marcado como personalizable");
      }
    }

    // 3. Verificar
    const count = await client.query('SELECT COUNT(*) FROM catalogo_extensiones_contacto WHERE es_sistema = true');
    console.log(`\n📋 Extensiones de sistema: ${count.rows[0].count}`);

  } finally {
    client.release();
  }
}

// Ejecutar si se pasa --fix como argumento
if (process.argv.includes('--fix')) {
  fixDuplicatesAndSetEditableFields().then(() => pool.end()).catch(console.error);
} else {
  migrate().catch(console.error);
}
