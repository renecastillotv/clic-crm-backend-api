import { Knex } from 'knex';

/**
 * Migración 040 - Asignar componentes a páginas
 *
 * Con el nuevo sistema limpio (sin herencia de predeterminados),
 * cada página debe tener sus componentes asignados explícitamente.
 *
 * Esta migración:
 * 1. Crea componentes para cada página que los necesite
 * 2. Los asocia via paginas_componentes o con pagina_id directo
 */
export async function up(knex: Knex): Promise<void> {
  // Obtener todos los tenants
  const tenants = await knex('tenants').where('activo', true);

  for (const tenant of tenants) {
    console.log(`📋 Asignando componentes para tenant: ${tenant.slug}`);

    // Obtener páginas del tenant
    const paginas = await knex('paginas_web')
      .where('tenant_id', tenant.id)
      .where('activa', true);

    for (const pagina of paginas) {
      // Definir componentes según tipo de página
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
        contacto: [
          { tipo: 'contact_form', variante: 'default', orden: 1 },
        ],
        blog: [
          { tipo: 'article_list', variante: 'default', orden: 1 },
        ],
      };

      const componentes = componentesPorTipo[pagina.tipo_pagina];
      if (!componentes || componentes.length === 0) {
        continue;
      }

      // Verificar si la página ya tiene componentes asignados (además de header/footer)
      const existentes = await knex('componentes_web')
        .where('tenant_id', tenant.id)
        .where('pagina_id', pagina.id)
        .whereNotIn('tipo', ['header', 'footer'])
        .first();

      if (existentes) {
        console.log(`  - ${pagina.titulo} ya tiene componentes, saltando...`);
        continue;
      }

      // Verificar referencias en paginas_componentes
      const referencias = await knex('paginas_componentes')
        .where('pagina_id', pagina.id)
        .first();

      if (referencias) {
        console.log(`  - ${pagina.titulo} ya tiene referencias, saltando...`);
        continue;
      }

      // Crear los componentes para esta página
      console.log(`  + Creando componentes para: ${pagina.titulo} (${pagina.tipo_pagina})`);

      for (const comp of componentes) {
        // Verificar si ya existe el componente global
        const componenteGlobal = await knex('componentes_web')
          .where('tenant_id', tenant.id)
          .where('tipo', comp.tipo)
          .where('variante', comp.variante)
          .where('scope', 'tenant')
          .whereNull('pagina_id')
          .first();

        if (componenteGlobal) {
          // Crear referencia al componente global
          const existing = await knex('paginas_componentes')
            .where('pagina_id', pagina.id)
            .where('componente_id', componenteGlobal.id)
            .first();

          if (!existing) {
            await knex('paginas_componentes').insert({
              pagina_id: pagina.id,
              componente_id: componenteGlobal.id,
              orden: comp.orden,
              activo: true,
            });
            console.log(`    → Referenciado ${comp.tipo} global`);
          }
        } else {
          // Crear componente específico para la página
          await knex('componentes_web').insert({
            tenant_id: tenant.id,
            tipo: comp.tipo,
            variante: comp.variante,
            nombre: `${comp.tipo} - ${pagina.titulo}`,
            datos: JSON.stringify({ static_data: {}, toggles: {} }),
            activo: true,
            orden: comp.orden,
            scope: 'page',
            pagina_id: pagina.id,
            es_activo: true,
          });
          console.log(`    → Creado ${comp.tipo} para página`);
        }
      }
    }
  }

  console.log('✅ Componentes asignados correctamente');
}

export async function down(knex: Knex): Promise<void> {
  // No eliminamos componentes en down para no perder datos
  console.log('⚠️ Esta migración no elimina datos en rollback');
}
