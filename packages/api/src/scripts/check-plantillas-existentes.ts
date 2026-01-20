import 'dotenv/config';
import { query } from '../utils/db.js';

async function main() {
  const result = await query(`
    SELECT tp.codigo, COUNT(pp.id) as num_componentes
    FROM tipos_pagina tp
    LEFT JOIN plantillas_pagina pp ON tp.id = pp.tipo_pagina_id
    GROUP BY tp.codigo
    ORDER BY tp.codigo
  `);

  console.log('Plantillas existentes por tipo de página:\n');
  result.rows.forEach((r: any) => {
    const status = parseInt(r.num_componentes) > 0 ? '✅' : '❌';
    console.log(`  ${status} ${r.codigo}: ${r.num_componentes} componentes`);
  });
  process.exit(0);
}

main().catch(console.error);
