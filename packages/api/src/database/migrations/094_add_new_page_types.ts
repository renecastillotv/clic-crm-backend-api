import type { Knex } from 'knex';

/**
 * Migración 094: Agregar nuevos tipos de página para funcionalidades extendidas
 *
 * Propósito:
 * - Agregar tipos de página para favoritos y propuestas (con y sin token)
 * - Agregar tipos de página para ubicaciones y tipos de propiedades (listados)
 * - Agregar tipo de página para listados curados personalizados
 *
 * Nuevos tipos de página:
 * 1. favoritos - Listado de propiedades favoritas del usuario
 * 2. favoritos_token - Ver selección de favoritos compartida vía token
 * 3. propuestas - Listado de propuestas del asesor
 * 4. propuestas_token - Ver propuesta compartida vía token
 * 5. ubicaciones - Listado de todas las ubicaciones disponibles
 * 6. tipos_propiedades - Listado de todos los tipos de propiedades
 * 7. listados_curados - Páginas curadas con listas de propiedades específicas y contenido
 */

export async function up(knex: Knex): Promise<void> {
  console.log('⬆️  Ejecutando migración 094: add_new_page_types');

  // Array de nuevos tipos de página a insertar
  const nuevosTipos = [
    {
      codigo: 'favoritos',
      nombre: 'Favoritos',
      ruta_patron: '/favoritos',
      nivel: 1,
      visible: true,
      publico: false, // Requiere autenticación
      alias_rutas: {},
    },
    {
      codigo: 'favoritos_token',
      nombre: 'Favoritos Compartidos',
      ruta_patron: '/favoritos/:token',
      nivel: 2,
      visible: true,
      publico: true, // Accesible vía token sin autenticación
      alias_rutas: {},
    },
    {
      codigo: 'propuestas',
      nombre: 'Propuestas',
      ruta_patron: '/propuestas',
      nivel: 1,
      visible: true,
      publico: false, // Solo para asesores autenticados
      alias_rutas: {},
    },
    {
      codigo: 'propuestas_token',
      nombre: 'Propuesta Compartida',
      ruta_patron: '/propuestas/:token',
      nivel: 2,
      visible: true,
      publico: true, // Accesible vía token sin autenticación
      alias_rutas: {},
    },
    {
      codigo: 'ubicaciones',
      nombre: 'Ubicaciones',
      ruta_patron: '/ubicaciones',
      nivel: 1,
      visible: true,
      publico: true,
      alias_rutas: {},
    },
    {
      codigo: 'tipos_propiedades',
      nombre: 'Tipos de Propiedades',
      ruta_patron: '/tipos-de-propiedades',
      nivel: 1,
      visible: true,
      publico: true,
      alias_rutas: {},
    },
    {
      codigo: 'listados_curados',
      nombre: 'Listados Curados',
      ruta_patron: '/listados-de-propiedades/:slug',
      nivel: 2,
      visible: true,
      publico: true,
      alias_rutas: {},
    },
  ];

  // Insertar todos los tipos de página
  for (const tipo of nuevosTipos) {
    await knex('tipos_pagina')
      .insert({
        codigo: tipo.codigo,
        nombre: tipo.nombre,
        ruta_patron: tipo.ruta_patron,
        nivel: tipo.nivel,
        visible: tipo.visible,
        publico: tipo.publico,
        alias_rutas: JSON.stringify(tipo.alias_rutas),
      })
      .onConflict('codigo')
      .merge(); // Actualizar si ya existe

    console.log(`✅ Tipo de página agregado: ${tipo.codigo} (${tipo.ruta_patron})`);
  }

  console.log('✅ Migración 094 completada: 7 nuevos tipos de página agregados');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⬇️  Revirtiendo migración 094');

  // Eliminar los tipos de página agregados
  const codigos = [
    'favoritos',
    'favoritos_token',
    'propuestas',
    'propuestas_token',
    'ubicaciones',
    'tipos_propiedades',
    'listados_curados',
  ];

  await knex('tipos_pagina').whereIn('codigo', codigos).del();

  console.log('✅ Migración 094 revertida: tipos de página eliminados');
}
