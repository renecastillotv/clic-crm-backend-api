import { Knex } from 'knex';

/**
 * Migración 076 - Consolidar paginas_variantes_config
 *
 * Elimina paginas_variantes_config y usa paginas_componentes.activo para soft delete
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Consolidando sistema de variantes...');

  // ========================================
  // 1. Agregar columna activo a paginas_componentes
  // ========================================
  console.log('\n➕ Agregando columna activo a paginas_componentes...');

  const hasActivo = await knex.schema.hasColumn('paginas_componentes', 'activo');

  if (!hasActivo) {
    await knex.schema.alterTable('paginas_componentes', (table) => {
      table.boolean('activo').defaultTo(true).comment('Si false, componente desactivado (soft delete)');
      table.index('activo', 'idx_paginas_componentes_activo');
    });

    console.log('   ✅ Columna activo agregada');
  } else {
    console.log('   ⏭️  Columna activo ya existe');
  }

  // ========================================
  // 2. Migrar configuraciones de paginas_variantes_config
  // ========================================
  console.log('\n🔄 Migrando configuraciones de variantes...');

  const hasPaginasVariantes = await knex.schema.hasTable('paginas_variantes_config');

  if (hasPaginasVariantes) {
    const variantes = await knex('paginas_variantes_config').select('*');

    console.log(`   Encontradas ${variantes.length} configuraciones de variantes`);

    let migratedCount = 0;

    for (const variante of variantes) {
      const { pagina_id, componentes_activos, configuracion_componentes } = variante;

      // Parsear JSONs
      const componentesActivosArray = typeof componentes_activos === 'string'
        ? JSON.parse(componentes_activos)
        : componentes_activos;

      const configComponentes = typeof configuracion_componentes === 'string'
        ? JSON.parse(configuracion_componentes)
        : configuracion_componentes;

      // Para cada componente en la configuración
      for (const [tipo, config] of Object.entries(configComponentes)) {
        // Buscar el componente en paginas_componentes
        const relacion = await knex('paginas_componentes as pc')
          .join('componentes_web as c', 'c.id', 'pc.componente_id')
          .where({
            'pc.pagina_id': pagina_id,
            'c.tipo': tipo
          })
          .select('pc.id as relacion_id', 'pc.config_override')
          .first();

        if (relacion) {
          // Merge con config_override existente
          const existingOverride = relacion.config_override
            ? (typeof relacion.config_override === 'string'
                ? JSON.parse(relacion.config_override)
                : relacion.config_override)
            : {};

          const mergedOverride = {
            ...existingOverride,
            ...(config as object)
          };

          // Actualizar config_override
          await knex('paginas_componentes')
            .where({ id: relacion.relacion_id })
            .update({ config_override: JSON.stringify(mergedOverride) });

          // Actualizar activo según si está en componentes_activos
          const activo = componentesActivosArray.includes(tipo);

          await knex('paginas_componentes')
            .where({ id: relacion.relacion_id })
            .update({ activo });

          migratedCount++;
        }
      }
    }

    console.log(`   ✅ ${migratedCount} configuraciones migradas a config_override + activo`);
  }

  // ========================================
  // 3. Drop paginas_variantes_config
  // ========================================
  console.log('\n🗑️  Eliminando paginas_variantes_config...');

  if (hasPaginasVariantes) {
    await knex.schema.dropTableIfExists('paginas_variantes_config');
    console.log('   ✅ Tabla paginas_variantes_config eliminada');
  } else {
    console.log('   ⏭️  Tabla ya no existe');
  }

  console.log('\n✅ Sistema de variantes consolidado');
  console.log('   • Configuraciones migradas a paginas_componentes.config_override');
  console.log('   • Control de visibilidad con paginas_componentes.activo');
  console.log('   • Soft delete permite preservar datos al cambiar variantes');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revertiendo consolidación de variantes...');

  // Remover columna activo
  const hasActivo = await knex.schema.hasColumn('paginas_componentes', 'activo');
  if (hasActivo) {
    await knex.schema.alterTable('paginas_componentes', (table) => {
      table.dropIndex('activo', 'idx_paginas_componentes_activo');
      table.dropColumn('activo');
    });
  }

  console.log('⚠️  Nota: paginas_variantes_config no se puede recrear');
  console.log('   Para revertir completamente, restaurar desde backup');
}
