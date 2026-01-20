import { Knex } from 'knex';

/**
 * Migración 115: Sistema de Plantillas de Comisión
 *
 * 1. Agrega campo plantilla_comision_id a perfiles_asesor (FK a catalogos)
 * 2. Inserta plantillas globales de comisión en catalogos (tipo: plantilla_comision)
 *
 * Las plantillas definen cómo se distribuyen las comisiones según:
 * - Tipo de propiedad (lista vs proyecto)
 * - Escenario (solo capta, solo vende, capta y vende)
 * - Fees previos (mentor, líder, franquicia)
 * - Distribución interna de empresa
 */

export async function up(knex: Knex): Promise<void> {
  console.log('🔄 Migración 115: Sistema de Plantillas de Comisión\n');

  // ============================================
  // 1. Agregar campo plantilla_comision_id a perfiles_asesor
  // ============================================
  console.log('➕ Agregando plantilla_comision_id a perfiles_asesor...');

  const hasColumn = await knex.schema.hasColumn('perfiles_asesor', 'plantilla_comision_id');

  if (!hasColumn) {
    await knex.schema.alterTable('perfiles_asesor', (table) => {
      table.uuid('plantilla_comision_id')
        .nullable()
        .comment('FK a catalogos (tipo=plantilla_comision) - define distribución de comisiones');
    });

    // Agregar FK constraint
    await knex.raw(`
      ALTER TABLE perfiles_asesor
      ADD CONSTRAINT perfiles_asesor_plantilla_comision_fk
      FOREIGN KEY (plantilla_comision_id)
      REFERENCES catalogos(id)
      ON DELETE SET NULL;
    `);

    console.log('   ✓ Campo plantilla_comision_id agregado');
  } else {
    console.log('   ⏭️  Campo plantilla_comision_id ya existe');
  }

  // ============================================
  // 2. Insertar plantillas globales de comisión
  // ============================================
  console.log('\n➕ Insertando plantillas globales de comisión...');

  // Verificar si ya existen plantillas
  const existingPlantillas = await knex('catalogos')
    .where('tipo', 'plantilla_comision')
    .whereNull('tenant_id')
    .count('* as count')
    .first();

  if (Number(existingPlantillas?.count) > 0) {
    console.log('   ⏭️  Plantillas globales ya existen');
  } else {
    const plantillas = [
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'trainee',
        nombre: 'Asesor en Entrenamiento',
        descripcion: 'Distribución para asesores nuevos en período de capacitación',
        icono: 'GraduationCap',
        color: '#94a3b8',
        orden: 1,
        activo: true,
        es_default: false,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 15, vendedor: 0, empresa: 85 },
              solo_vende: { captador: 0, vendedor: 40, empresa: 60 },
              capta_y_vende: { captador: 15, vendedor: 40, empresa: 45 }
            },
            proyecto: {
              solo_capta: { captador: 10, vendedor: 0, empresa: 90 },
              solo_vende: { captador: 0, vendedor: 35, empresa: 65 },
              capta_y_vende: { captador: 10, vendedor: 35, empresa: 55 }
            }
          },
          fees_previos: [
            { rol: 'mentor', porcentaje: 10, descripcion: 'Mentor asignado', aplica_a: ['trainee'] }
          ],
          roles_aplicables: ['trainee'],
          es_personal: false
        })
      },
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'junior',
        nombre: 'Asesor Junior',
        descripcion: 'Distribución para asesores con menos de 2 años de experiencia',
        icono: 'User',
        color: '#3b82f6',
        orden: 2,
        activo: true,
        es_default: true,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 20, vendedor: 0, empresa: 80 },
              solo_vende: { captador: 0, vendedor: 50, empresa: 50 },
              capta_y_vende: { captador: 20, vendedor: 50, empresa: 30 }
            },
            proyecto: {
              solo_capta: { captador: 15, vendedor: 0, empresa: 85 },
              solo_vende: { captador: 0, vendedor: 45, empresa: 55 },
              capta_y_vende: { captador: 15, vendedor: 45, empresa: 40 }
            }
          },
          fees_previos: [
            { rol: 'mentor', porcentaje: 5, descripcion: 'Mentor asignado', aplica_a: ['junior'] }
          ],
          roles_aplicables: ['junior'],
          es_personal: false
        })
      },
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'pleno',
        nombre: 'Asesor Pleno',
        descripcion: 'Distribución para asesores con 2-5 años de experiencia',
        icono: 'UserCheck',
        color: '#22c55e',
        orden: 3,
        activo: true,
        es_default: false,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 25, vendedor: 0, empresa: 75 },
              solo_vende: { captador: 0, vendedor: 60, empresa: 40 },
              capta_y_vende: { captador: 25, vendedor: 60, empresa: 15 }
            },
            proyecto: {
              solo_capta: { captador: 20, vendedor: 0, empresa: 80 },
              solo_vende: { captador: 0, vendedor: 55, empresa: 45 },
              capta_y_vende: { captador: 20, vendedor: 55, empresa: 25 }
            }
          },
          fees_previos: [],
          roles_aplicables: ['pleno'],
          es_personal: false
        })
      },
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'senior',
        nombre: 'Asesor Senior',
        descripcion: 'Distribución para asesores con más de 5 años de experiencia',
        icono: 'Award',
        color: '#f59e0b',
        orden: 4,
        activo: true,
        es_default: false,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 30, vendedor: 0, empresa: 70 },
              solo_vende: { captador: 0, vendedor: 70, empresa: 30 },
              capta_y_vende: { captador: 30, vendedor: 70, empresa: 0 }
            },
            proyecto: {
              solo_capta: { captador: 25, vendedor: 0, empresa: 75 },
              solo_vende: { captador: 0, vendedor: 65, empresa: 35 },
              capta_y_vende: { captador: 25, vendedor: 65, empresa: 10 }
            }
          },
          fees_previos: [],
          roles_aplicables: ['senior'],
          es_personal: false
        })
      },
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'top_producer',
        nombre: 'Top Producer',
        descripcion: 'Distribución premium para asesores de alto rendimiento',
        icono: 'Trophy',
        color: '#a855f7',
        orden: 5,
        activo: true,
        es_default: false,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 35, vendedor: 0, empresa: 65 },
              solo_vende: { captador: 0, vendedor: 80, empresa: 20 },
              capta_y_vende: { captador: 35, vendedor: 80, empresa: -15 } // Bonificación
            },
            proyecto: {
              solo_capta: { captador: 30, vendedor: 0, empresa: 70 },
              solo_vende: { captador: 0, vendedor: 75, empresa: 25 },
              capta_y_vende: { captador: 30, vendedor: 75, empresa: -5 } // Bonificación
            }
          },
          fees_previos: [],
          roles_aplicables: ['top_producer', 'broker'],
          es_personal: false
        })
      },
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'asociado_externo',
        nombre: 'Asociado Externo',
        descripcion: 'Distribución para colaboradores de otras inmobiliarias',
        icono: 'Users',
        color: '#64748b',
        orden: 6,
        activo: true,
        es_default: false,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 15, vendedor: 0, empresa: 85 },
              solo_vende: { captador: 0, vendedor: 35, empresa: 65 },
              capta_y_vende: { captador: 15, vendedor: 35, empresa: 50 }
            },
            proyecto: {
              solo_capta: { captador: 10, vendedor: 0, empresa: 90 },
              solo_vende: { captador: 0, vendedor: 30, empresa: 70 },
              capta_y_vende: { captador: 10, vendedor: 30, empresa: 60 }
            }
          },
          fees_previos: [],
          roles_aplicables: ['asociado', 'externo'],
          es_personal: false
        })
      },
      {
        tenant_id: null,
        tipo: 'plantilla_comision',
        codigo: 'referidor',
        nombre: 'Referidor',
        descripcion: 'Distribución para personas que refieren clientes',
        icono: 'Share2',
        color: '#06b6d4',
        orden: 7,
        activo: true,
        es_default: false,
        config: JSON.stringify({
          distribuciones: {
            propiedad_lista: {
              solo_capta: { captador: 0, vendedor: 0, empresa: 100 },
              solo_vende: { captador: 0, vendedor: 0, empresa: 100 },
              capta_y_vende: { captador: 0, vendedor: 0, empresa: 100 }
            },
            proyecto: {
              solo_capta: { captador: 0, vendedor: 0, empresa: 100 },
              solo_vende: { captador: 0, vendedor: 0, empresa: 100 },
              capta_y_vende: { captador: 0, vendedor: 0, empresa: 100 }
            }
          },
          fee_referidor: {
            tipo: 'porcentaje', // o 'fijo'
            valor: 10,
            descripcion: 'Comisión por referido'
          },
          fees_previos: [],
          roles_aplicables: ['referidor'],
          es_personal: false
        })
      }
    ];

    await knex('catalogos').insert(plantillas);
    console.log(`   ✓ ${plantillas.length} plantillas globales insertadas`);
  }

  // ============================================
  // 3. Insertar configuración de distribución interna de empresa (global)
  // ============================================
  console.log('\n➕ Insertando configuración de distribución interna de empresa...');

  const existingDistribucion = await knex('catalogos')
    .where('tipo', 'distribucion_empresa')
    .whereNull('tenant_id')
    .count('* as count')
    .first();

  if (Number(existingDistribucion?.count) > 0) {
    console.log('   ⏭️  Distribución interna ya existe');
  } else {
    await knex('catalogos').insert({
      tenant_id: null,
      tipo: 'distribucion_empresa',
      codigo: 'default',
      nombre: 'Distribución Interna de Empresa',
      descripcion: 'Cómo se distribuye internamente la parte de comisión que recibe la empresa',
      orden: 1,
      activo: true,
      es_default: true,
      config: JSON.stringify({
        distribuciones: [
          { rol: 'operaciones', tipo: 'porcentaje', valor: 10, descripcion: 'Gastos operativos' },
          { rol: 'marketing', tipo: 'porcentaje', valor: 5, descripcion: 'Marketing y publicidad' },
          { rol: 'tecnologia', tipo: 'porcentaje', valor: 3, descripcion: 'Plataforma tecnológica' }
        ],
        // El resto va a utilidad neta de la empresa
        nota: 'Los porcentajes se aplican sobre la parte de empresa. El resto es utilidad neta.'
      })
    });
    console.log('   ✓ Distribución interna de empresa insertada');
  }

  console.log('\n✅ Migración 115 completada');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Revirtiendo migración 115...\n');

  // 1. Eliminar FK y columna de perfiles_asesor
  const hasColumn = await knex.schema.hasColumn('perfiles_asesor', 'plantilla_comision_id');
  if (hasColumn) {
    await knex.raw(`
      ALTER TABLE perfiles_asesor
      DROP CONSTRAINT IF EXISTS perfiles_asesor_plantilla_comision_fk;
    `);
    await knex.schema.alterTable('perfiles_asesor', (table) => {
      table.dropColumn('plantilla_comision_id');
    });
    console.log('   ✓ Campo plantilla_comision_id eliminado');
  }

  // 2. Eliminar plantillas globales
  await knex('catalogos')
    .where('tipo', 'plantilla_comision')
    .whereNull('tenant_id')
    .delete();
  console.log('   ✓ Plantillas globales eliminadas');

  // 3. Eliminar distribución interna
  await knex('catalogos')
    .where('tipo', 'distribucion_empresa')
    .whereNull('tenant_id')
    .delete();
  console.log('   ✓ Distribución interna eliminada');

  console.log('\n✅ Rollback completado');
}
