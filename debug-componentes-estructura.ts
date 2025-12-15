import { query } from './src/utils/db.js';

const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184';
const PAGINA_ID = 'fab59c27-8d21-4732-87a6-ac040b6a7c16';

async function debug() {
  console.log('\n=== VERIFICANDO ESTRUCTURA DE COMPONENTES ===\n');

  // 1. Ver qué devuelve el endpoint del editor
  console.log('1. Componentes disponibles (como los ve el frontend):\n');

  const disponibles = await query(
    `SELECT
      id,
      tipo,
      variante,
      scope,
      datos as default_data,
      activo
    FROM componentes_web
    WHERE tenant_id = $1
      AND activo = true
    ORDER BY tipo, variante`,
    [TENANT_ID]
  );

  console.log(`Total: ${disponibles.rows.length}`);
  console.log(JSON.stringify(disponibles.rows, null, 2));

  // 2. Ver un componente específico tipo 'hero' variante 'clic'
  console.log('\n2. Componente hero-clic específico:\n');

  const heroClic = await query(
    `SELECT * FROM componentes_web
     WHERE tenant_id = $1
       AND tipo = 'hero'
       AND variante = 'clic'`,
    [TENANT_ID]
  );

  if (heroClic.rows.length > 0) {
    console.log(JSON.stringify(heroClic.rows[0], null, 2));
  } else {
    console.log('No existe hero-clic');
  }

  process.exit(0);
}

debug().catch(console.error);
