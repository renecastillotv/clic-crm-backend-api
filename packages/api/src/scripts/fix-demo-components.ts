/**
 * Script para agregar componentes faltantes a las páginas del tenant demo
 */

import knex from 'knex';
import config from '../config/knexfile.js';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];
const db = knex(knexConfig);

async function fixDemoComponents() {
  const tenantSlug = 'demo';

  // Obtener tenant
  const tenant = await db('tenants').where('slug', tenantSlug).first();

  if (!tenant) {
    console.log('Tenant demo no encontrado');
    return;
  }

  const tenantId = tenant.id;
  console.log(`Tenant demo ID: ${tenantId}`);

  // Componentes requeridos por tipo de página
  const componentesPorTipo: Record<string, Array<{ tipo: string; variante: string; orden: number }>> = {
    homepage: [
      { tipo: 'hero', variante: 'default', orden: 1 },
      { tipo: 'features', variante: 'default', orden: 2 },
      { tipo: 'property_list', variante: 'default', orden: 3 },
      { tipo: 'testimonials', variante: 'default', orden: 4 },
      { tipo: 'cta', variante: 'default', orden: 5 },
    ],
    listados_propiedades: [
      { tipo: 'property_list', variante: 'default', orden: 1 },
    ],
    propiedades_listado: [
      { tipo: 'property_list', variante: 'default', orden: 1 },
    ],
    single_property: [
      { tipo: 'property_detail', variante: 'default', orden: 1 },
    ],
    propiedades_single: [
      { tipo: 'property_detail', variante: 'default', orden: 1 },
    ],
  };

  // Obtener páginas del tenant
  const paginas = await db('paginas_web')
    .where('tenant_id', tenantId)
    .where('activa', true);

  console.log(`Páginas encontradas: ${paginas.length}`);

  for (const pagina of paginas) {
    const componentesRequeridos = componentesPorTipo[pagina.tipo_pagina];
    if (!componentesRequeridos) {
      console.log(`  - ${pagina.titulo} (${pagina.tipo_pagina}): tipo no configurado`);
      continue;
    }

    console.log(`\n📄 ${pagina.titulo} (${pagina.tipo_pagina})`);

    // Verificar qué componentes ya tiene asignados (específicos de esta página)
    const existentesDirectos = await db('componentes_web')
      .where('tenant_id', tenantId)
      .where('pagina_id', pagina.id)
      .where('activo', true)
      .whereNotIn('tipo', ['header', 'footer'])
      .select('tipo');

    const existentesReferencias = await db('paginas_componentes')
      .join('componentes_web', 'componentes_web.id', 'paginas_componentes.componente_id')
      .where('paginas_componentes.pagina_id', pagina.id)
      .where('paginas_componentes.activo', true)
      .where('componentes_web.activo', true)
      .select('componentes_web.tipo');

    const existentes = new Set([
      ...existentesDirectos.map((r: any) => r.tipo),
      ...existentesReferencias.map((r: any) => r.tipo)
    ]);
    console.log(`   Existentes: ${Array.from(existentes).join(', ') || 'ninguno'}`);

    // Agregar componentes faltantes
    for (const comp of componentesRequeridos) {
      if (existentes.has(comp.tipo)) {
        console.log(`   ✓ ${comp.tipo} ya existe`);
        continue;
      }

      // Crear componente específico para esta página
      await db('componentes_web').insert({
        tenant_id: tenantId,
        tipo: comp.tipo,
        variante: comp.variante,
        nombre: `${comp.tipo} - ${pagina.titulo}`,
        datos: JSON.stringify({ static_data: {}, toggles: {} }),
        activo: true,
        orden: comp.orden,
        scope: 'page',
        pagina_id: pagina.id,
        es_activo: true
      });

      console.log(`   + Creado ${comp.tipo}`);
    }
  }

  console.log('\n✅ Componentes actualizados');
  await db.destroy();
}

fixDemoComponents()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Error:', err);
    process.exit(1);
  });
