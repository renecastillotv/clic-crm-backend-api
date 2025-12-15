import { pool } from './src/config/database';

async function getHomepage() {
  const client = await pool.connect();

  try {
    // Obtener el tipo de página homepage
    const tipoPagina = await client.query(`
      SELECT id, codigo, nombre, ruta_patron
      FROM tipos_pagina
      WHERE codigo = 'homepage'
    `);

    console.log('=== TIPO DE PÁGINA HOMEPAGE ===');
    console.table(tipoPagina.rows);

    if (tipoPagina.rows.length > 0) {
      const tipoPaginaId = tipoPagina.rows[0].id;

      // Obtener tenant CLIC
      const tenant = await client.query(`
        SELECT id, slug, nombre
        FROM tenants
        WHERE slug = 'clic'
      `);

      console.log('\n=== TENANT CLIC ===');
      console.table(tenant.rows);

      if (tenant.rows.length > 0) {
        const tenantId = tenant.rows[0].id;

        // Ver componentes existentes para homepage de CLIC
        const componentes = await client.query(`
          SELECT
            cw.id,
            cw.nombre,
            cw.orden,
            cw.activo,
            cc.tipo as componente_tipo,
            cc.nombre as componente_nombre
          FROM componentes_web cw
          JOIN catalogo_componentes cc ON cw.componente_catalogo_id = cc.id
          WHERE cw.tipo_pagina_id = $1 AND cw.tenant_id = $2
          ORDER BY cw.orden
        `, [tipoPaginaId, tenantId]);

        console.log('\n=== COMPONENTES ACTUALES EN HOMEPAGE DE CLIC ===');
        console.table(componentes.rows);
        console.log(`Total componentes: ${componentes.rows.length}`);

        // Mostrar IDs importantes
        console.log('\n=== IDs IMPORTANTES ===');
        console.log(`Tenant CLIC ID: ${tenantId}`);
        console.log(`Tipo Página Homepage ID: ${tipoPaginaId}`);
      }
    }

  } finally {
    client.release();
    await pool.end();
  }
}

getHomepage();
