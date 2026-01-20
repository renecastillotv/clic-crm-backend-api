import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function fixPaginaWeb() {
  const client = await pool.connect();
  try {
    console.log('=== CORRIGIENDO "P�gina Web" -> "Página Web" ===\n');

    // Obtener todas las preferencias con extensión lead
    const prefResult = await client.query(`
      SELECT tep.id, tep.campos_override
      FROM tenant_extension_preferencias tep
      JOIN catalogo_extensiones_contacto cec ON tep.extension_id = cec.id
      WHERE cec.codigo = 'lead'
    `);

    for (const row of prefResult.rows) {
      if (row.campos_override) {
        let modified = false;
        const newCamposOverride = row.campos_override.map(campo => {
          if (campo.campo === 'fuente_lead' && campo.opciones) {
            const newOpciones = campo.opciones.map(opcion => {
              // Corregir cualquier variante corrupta de "Página Web"
              if (opcion.includes('gina Web') || opcion.includes('P�gina')) {
                console.log(`  Corrigiendo: "${opcion}" -> "Página Web"`);
                modified = true;
                return 'Página Web';
              }
              return opcion;
            });
            return { ...campo, opciones: newOpciones };
          }
          return campo;
        });

        if (modified) {
          await client.query(`
            UPDATE tenant_extension_preferencias
            SET campos_override = $1, updated_at = NOW()
            WHERE id = $2
          `, [JSON.stringify(newCamposOverride), row.id]);
          console.log('  ✓ Actualizado\n');
        }
      }
    }

    // Verificar resultado
    console.log('=== VERIFICANDO RESULTADO ===\n');
    const verifyResult = await client.query(`
      SELECT tep.campos_override
      FROM tenant_extension_preferencias tep
      JOIN catalogo_extensiones_contacto cec ON tep.extension_id = cec.id
      WHERE cec.codigo = 'lead'
    `);

    for (const row of verifyResult.rows) {
      if (row.campos_override) {
        const campoFuente = row.campos_override.find(c => c.campo === 'fuente_lead');
        if (campoFuente) {
          console.log('Opciones actuales:');
          campoFuente.opciones.forEach(o => console.log(`  - "${o}"`));
        }
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

fixPaginaWeb().catch(console.error);
