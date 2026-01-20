import 'dotenv/config';
import { query } from '../utils/db.js';

async function insertPlantillas() {
  console.log('Insertando plantillas faltantes...\n');

  // Obtener IDs
  const tipos = await query(
    "SELECT id, codigo FROM tipos_pagina WHERE codigo IN ('propiedades_listado', 'articulos_listado', 'videos_listado')"
  );
  const comps = await query(
    "SELECT id, tipo FROM catalogo_componentes WHERE tipo IN ('header', 'footer', 'hero', 'content')"
  );

  const tiposMap: Record<string, string> = {};
  tipos.rows.forEach((t: any) => (tiposMap[t.codigo] = t.id));

  const compsMap: Record<string, string> = {};
  comps.rows.forEach((c: any) => {
    if (!compsMap[c.tipo]) compsMap[c.tipo] = c.id;
  });

  console.log('Tipos encontrados:', Object.keys(tiposMap));
  console.log('Componentes encontrados:', Object.keys(compsMap));

  const plantillas = [
    {
      tipo: 'propiedades_listado',
      comps: [
        { tipo: 'header', orden: 0, esGlobal: true, datos: {} },
        {
          tipo: 'hero',
          orden: 1,
          esGlobal: false,
          datos: {
            static_data: {
              titulo: 'Propiedades',
              subtitulo: 'Explora nuestra selección de propiedades',
            },
          },
        },
        {
          tipo: 'content',
          orden: 2,
          esGlobal: false,
          datos: { dynamic_data: { dataType: 'lista_propiedades' } },
        },
        { tipo: 'footer', orden: 999, esGlobal: true, datos: {} },
      ],
    },
    {
      tipo: 'articulos_listado',
      comps: [
        { tipo: 'header', orden: 0, esGlobal: true, datos: {} },
        {
          tipo: 'hero',
          orden: 1,
          esGlobal: false,
          datos: {
            static_data: {
              titulo: 'Blog',
              subtitulo: 'Noticias y consejos del mundo inmobiliario',
            },
          },
        },
        {
          tipo: 'content',
          orden: 2,
          esGlobal: false,
          datos: { dynamic_data: { dataType: 'lista_articulos' } },
        },
        { tipo: 'footer', orden: 999, esGlobal: true, datos: {} },
      ],
    },
  ];

  let inserted = 0;
  for (const p of plantillas) {
    const tipoPaginaId = tiposMap[p.tipo];
    if (!tipoPaginaId) {
      console.log('Tipo no encontrado:', p.tipo);
      continue;
    }

    for (const c of p.comps) {
      const compId = compsMap[c.tipo];
      if (!compId) {
        console.log('Componente no encontrado:', c.tipo);
        continue;
      }

      const exists = await query(
        'SELECT 1 FROM plantillas_pagina WHERE tipo_pagina_id = $1 AND componente_catalogo_id = $2',
        [tipoPaginaId, compId]
      );

      if (exists.rows.length === 0) {
        await query(
          'INSERT INTO plantillas_pagina (tipo_pagina_id, componente_catalogo_id, orden, datos_default, es_global, activo) VALUES ($1, $2, $3, $4, $5, true)',
          [tipoPaginaId, compId, c.orden, JSON.stringify(c.datos), c.esGlobal]
        );
        console.log('  ✅ Insertado:', p.tipo, '->', c.tipo);
        inserted++;
      } else {
        console.log('  ⏭️  Ya existe:', p.tipo, '->', c.tipo);
      }
    }
  }

  console.log('\nTotal insertados:', inserted);
  process.exit(0);
}

insertPlantillas().catch((e) => {
  console.error(e);
  process.exit(1);
});
