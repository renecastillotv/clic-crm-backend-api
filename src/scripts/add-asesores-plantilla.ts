import 'dotenv/config';
import { query } from '../utils/db.js';

/**
 * Script para agregar plantilla de asesores a plantillas_pagina
 */
async function main() {
  console.log('Agregando plantilla para listado_asesores...\n');

  // 1. Obtener ID del tipo de página
  const tipoResult = await query(
    "SELECT id FROM tipos_pagina WHERE codigo = 'listado_asesores'"
  );

  if (tipoResult.rows.length === 0) {
    console.error('No se encontró el tipo de página listado_asesores');
    process.exit(1);
  }

  const tipoPaginaId = tipoResult.rows[0].id;
  console.log('Tipo de página encontrado:', tipoPaginaId);

  // 2. Obtener IDs de componentes del catálogo
  const compsResult = await query(
    "SELECT id, tipo FROM catalogo_componentes WHERE tipo IN ('header', 'footer', 'hero', 'content')"
  );

  const compsMap: Record<string, string> = {};
  compsResult.rows.forEach((c: any) => {
    if (!compsMap[c.tipo]) compsMap[c.tipo] = c.id;
  });

  console.log('Componentes encontrados:', Object.keys(compsMap));

  // 3. Definir componentes para la plantilla
  const componentes = [
    { tipo: 'header', orden: 0, esGlobal: true, datos: {} },
    {
      tipo: 'hero',
      orden: 1,
      esGlobal: false,
      datos: {
        static_data: {
          titulo: 'Nuestro Equipo',
          subtitulo: 'Profesionales comprometidos con tu búsqueda',
        },
      },
    },
    {
      tipo: 'content',
      orden: 2,
      esGlobal: false,
      datos: { dynamic_data: { dataType: 'lista_asesores' } },
    },
    { tipo: 'footer', orden: 999, esGlobal: true, datos: {} },
  ];

  // 4. Insertar cada componente
  let inserted = 0;
  for (const c of componentes) {
    const compId = compsMap[c.tipo];
    if (!compId) {
      console.log('  Componente no encontrado:', c.tipo);
      continue;
    }

    // Verificar si ya existe
    const exists = await query(
      'SELECT 1 FROM plantillas_pagina WHERE tipo_pagina_id = $1 AND componente_catalogo_id = $2',
      [tipoPaginaId, compId]
    );

    if (exists.rows.length === 0) {
      await query(
        'INSERT INTO plantillas_pagina (tipo_pagina_id, componente_catalogo_id, orden, datos_default, es_global, activo) VALUES ($1, $2, $3, $4, $5, true)',
        [tipoPaginaId, compId, c.orden, JSON.stringify(c.datos), c.esGlobal]
      );
      console.log('  Insertado:', c.tipo);
      inserted++;
    } else {
      console.log('  Ya existe:', c.tipo);
    }
  }

  console.log('\nTotal insertados:', inserted);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
