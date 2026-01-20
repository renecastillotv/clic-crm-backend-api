import type { Knex } from 'knex';

/**
 * Migración 105: Documentar y asegurar estructura de traducciones en componentes_web.datos
 *
 * Propósito:
 * - Documentar la estructura esperada del campo JSONB `datos` en componentes_web
 * - Asegurar que los componentes puedan tener traducciones de su static_data
 * - No modifica la estructura de la tabla (datos ya es JSONB), solo documenta y normaliza
 *
 * Estructura esperada de componentes_web.datos:
 * {
 *   "static_data": {
 *     "titulo": "Título en español",
 *     "subtitulo": "Subtítulo en español",
 *     ...
 *   },
 *   "traducciones": {
 *     "en": {
 *       "titulo": "Title in English",
 *       "subtitulo": "Subtitle in English",
 *       ...
 *     },
 *     "fr": {
 *       "titulo": "Titre en français",
 *       "subtitulo": "Sous-titre en français",
 *       ...
 *     }
 *   },
 *   "dynamic_data": { ... },
 *   "toggles": { ... },
 *   "styles": { ... }
 * }
 *
 * Nota: Esta migración NO modifica la tabla, solo asegura que los componentes existentes
 * tengan la estructura correcta (agregando traducciones: {} si no existe).
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 105: add_traducciones_componentes_web');
  console.log('   Normalizando estructura de datos JSONB en componentes_web...\n');

  // Obtener todos los componentes que no tienen el campo traducciones
  const componentes = await knex('componentes_web')
    .select('id', 'datos')
    .whereRaw(`datos::text NOT LIKE '%"traducciones"%'`)
    .orWhereRaw(`datos->'traducciones' IS NULL`);

  console.log(`   📦 Encontrados ${componentes.length} componentes sin campo traducciones`);

  let actualizados = 0;

  for (const componente of componentes) {
    try {
      // Parsear datos actuales
      let datos = typeof componente.datos === 'string' 
        ? JSON.parse(componente.datos) 
        : componente.datos;

      // Asegurar estructura base si no existe
      if (!datos) datos = {};
      if (!datos.static_data) datos.static_data = {};
      if (!datos.toggles) datos.toggles = {};
      if (!datos.styles) datos.styles = {};

      // Agregar campo traducciones vacío si no existe
      if (!datos.traducciones) {
        datos.traducciones = {};
      }

      // Actualizar en la base de datos
      await knex('componentes_web')
        .where('id', componente.id)
        .update({
          datos: JSON.stringify(datos),
          updated_at: knex.fn.now()
        });

      actualizados++;
    } catch (error: any) {
      console.error(`   ❌ Error actualizando componente ${componente.id}:`, error.message);
    }
  }

  console.log(`\n✅ Migración completada: ${actualizados} componentes actualizados`);
  console.log('   Todos los componentes ahora tienen la estructura de traducciones documentada\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 105: add_traducciones_componentes_web');
  console.log('   Nota: Esta migración no elimina el campo traducciones, solo lo documenta.');
  console.log('   Si deseas eliminar traducciones, hazlo manualmente desde el CRM.\n');
}








