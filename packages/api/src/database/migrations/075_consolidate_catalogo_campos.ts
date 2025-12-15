import { Knex } from 'knex';

/**
 * Migración 075 - Consolidar sistema de contenido persistente
 *
 * Elimina catalogo_campos, contenido_campos, contenido_media, tenant_defaults
 * Consolida todo en componentes_web.default_data y paginas_componentes.config_override
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Consolidando sistema de contenido persistente...');

  // ========================================
  // 1. Migrar catalogo_campos → default_data
  // ========================================
  console.log('\n📦 Migrando catalogo_campos a default_data...');

  const hasCatalogoCampos = await knex.schema.hasTable('catalogo_campos');

  if (hasCatalogoCampos) {
    // Obtener todos los componentes que necesitan default_data
    const tiposVariantes = await knex('catalogo_campos')
      .distinct('tipo_componente', 'variante')
      .orderBy('tipo_componente')
      .orderBy('variante');

    let migratedCount = 0;

    for (const { tipo_componente, variante } of tiposVariantes) {
      // Obtener todos los campos de este tipo+variante
      const campos = await knex('catalogo_campos')
        .where({ tipo_componente, variante, activo: true })
        .orderBy('orden');

      if (campos.length === 0) continue;

      // Construir default_data object
      const defaultData: any = {};

      for (const campo of campos) {
        if (campo.valor_default) {
          // Parsear JSON si es necesario
          if (campo.tipo_campo === 'array' || campo.tipo_campo === 'object') {
            try {
              defaultData[campo.campo] = JSON.parse(campo.valor_default);
            } catch {
              defaultData[campo.campo] = campo.valor_default;
            }
          } else {
            defaultData[campo.campo] = campo.valor_default;
          }
        }
      }

      // Actualizar componentes_web que coincidan con este tipo+variante
      const updated = await knex('componentes_web')
        .where({ tipo: tipo_componente, variante })
        .whereNull('default_data')
        .update({ default_data: JSON.stringify(defaultData) });

      if (updated > 0) {
        console.log(`   ✅ ${tipo_componente}/${variante}: ${updated} componentes actualizados`);
        migratedCount += updated;
      }
    }

    console.log(`   📊 Total: ${migratedCount} componentes con default_data migrado`);
  }

  // ========================================
  // 2. Migrar contenido_campos → config_override
  // ========================================
  console.log('\n📝 Migrando contenido_campos a config_override...');

  const hasContenidoCampos = await knex.schema.hasTable('contenido_campos');

  if (hasContenidoCampos) {
    // Obtener todos los componentes con contenido editado
    const componentesConContenido = await knex('contenido_campos')
      .distinct('componente_id')
      .select('componente_id');

    let contentMigrated = 0;

    for (const { componente_id } of componentesConContenido) {
      // Obtener todos los campos de este componente (idioma 'es' por ahora)
      const campos = await knex('contenido_campos')
        .where({ componente_id, idioma: 'es' });

      if (campos.length === 0) continue;

      // Construir config_override object
      const configOverride: any = {};

      for (const campo of campos) {
        if (campo.valor_json) {
          configOverride[campo.campo] = typeof campo.valor_json === 'string'
            ? JSON.parse(campo.valor_json)
            : campo.valor_json;
        } else if (campo.valor) {
          configOverride[campo.campo] = campo.valor;
        }
      }

      // Verificar si existe en paginas_componentes
      const relacion = await knex('paginas_componentes')
        .where({ componente_id })
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
          ...configOverride
        };

        await knex('paginas_componentes')
          .where({ componente_id })
          .update({ config_override: JSON.stringify(mergedOverride) });

        contentMigrated++;
      }
    }

    console.log(`   ✅ ${contentMigrated} componentes con contenido migrado a config_override`);
  }

  // ========================================
  // 3. Migrar contenido_media → config_override
  // ========================================
  console.log('\n🖼️  Migrando contenido_media a config_override...');

  const hasContenidoMedia = await knex.schema.hasTable('contenido_media');

  if (hasContenidoMedia) {
    const componentesConMedia = await knex('contenido_media')
      .distinct('componente_id')
      .select('componente_id');

    let mediaMigrated = 0;

    for (const { componente_id } of componentesConMedia) {
      const mediaItems = await knex('contenido_media')
        .where({ componente_id })
        .orderBy('campo')
        .orderBy('orden');

      if (mediaItems.length === 0) continue;

      // Agrupar media por campo
      const mediaByField: any = {};

      for (const media of mediaItems) {
        if (!mediaByField[media.campo]) {
          mediaByField[media.campo] = [];
        }

        mediaByField[media.campo].push({
          url: media.url,
          alt: media.alt_text,
          tipo: media.tipo_media,
          metadata: typeof media.metadata === 'string'
            ? JSON.parse(media.metadata)
            : media.metadata
        });
      }

      // Simplificar: si solo hay un item, guardar solo la URL
      const mediaConfig: any = {};
      for (const [campo, items] of Object.entries(mediaByField)) {
        if ((items as any[]).length === 1) {
          mediaConfig[campo] = (items as any[])[0].url;
          // Guardar alt como campo separado
          if ((items as any[])[0].alt) {
            mediaConfig[`${campo}Alt`] = (items as any[])[0].alt;
          }
        } else {
          mediaConfig[campo] = items;
        }
      }

      // Verificar si existe en paginas_componentes
      const relacion = await knex('paginas_componentes')
        .where({ componente_id })
        .first();

      if (relacion) {
        const existingOverride = relacion.config_override
          ? (typeof relacion.config_override === 'string'
              ? JSON.parse(relacion.config_override)
              : relacion.config_override)
          : {};

        const mergedOverride = {
          ...existingOverride,
          ...mediaConfig
        };

        await knex('paginas_componentes')
          .where({ componente_id })
          .update({ config_override: JSON.stringify(mergedOverride) });

        mediaMigrated++;
      }
    }

    console.log(`   ✅ ${mediaMigrated} componentes con media migrado a config_override`);
  }

  // ========================================
  // 4. Drop tables
  // ========================================
  console.log('\n🗑️  Eliminando tablas obsoletas...');

  const tablesToDrop = [
    'tenant_defaults',
    'contenido_media',
    'contenido_campos',
    'catalogo_campos'
  ];

  let droppedCount = 0;

  for (const tableName of tablesToDrop) {
    const exists = await knex.schema.hasTable(tableName);
    if (exists) {
      await knex.schema.dropTableIfExists(tableName);
      console.log(`   ✅ Eliminada: ${tableName}`);
      droppedCount++;
    } else {
      console.log(`   ⏭️  Ya no existe: ${tableName}`);
    }
  }

  console.log(`\n✅ Consolidación completada: ${droppedCount} tablas eliminadas`);
  console.log('   • Sistema de contenido ahora usa default_data + config_override');
  console.log('   • Reducción de 4 tablas → JSONB fields');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⚠️  Esta migración no se puede revertir automáticamente');
  console.log('   Los datos ya fueron consolidados en default_data y config_override');
  console.log('   Para revertir, restaurar desde backup de la base de datos');
}
