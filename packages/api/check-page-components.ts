import { query } from './src/utils/db.js';

const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
const PAGINA_ID = 'fab59c27-8d21-4732-87a6-ac040b6a7c16';

async function check() {
  console.log('\n=== COMPONENTES EN LA PÁGINA ===\n');

  const result = await query(
    `SELECT
      pc.id as relacion_id,
      pc.componente_id,
      c.tipo,
      c.variante,
      c.nombre,
      c.scope,
      pc.orden,
      pc.activo
    FROM paginas_componentes pc
    JOIN componentes_web c ON pc.componente_id = c.id
    WHERE pc.pagina_id = $1
    ORDER BY pc.orden`,
    [PAGINA_ID]
  );

  console.log(`Total componentes: ${result.rows.length}\n`);
  console.log(JSON.stringify(result.rows, null, 2));

  process.exit(0);
}

check().catch(console.error);
