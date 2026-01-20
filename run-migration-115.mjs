import pg from 'pg';

const pool = new pg.Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('🔄 Migración 115: Sistema de Plantillas de Comisión\n');

    // ============================================
    // 1. Agregar campo plantilla_comision_id a perfiles_asesor
    // ============================================
    console.log('➕ Agregando plantilla_comision_id a perfiles_asesor...');

    const checkColumn = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'perfiles_asesor' AND column_name = 'plantilla_comision_id'
    `);

    if (checkColumn.rows.length > 0) {
      console.log('   ⏭️  Campo plantilla_comision_id ya existe');
    } else {
      await client.query(`
        ALTER TABLE perfiles_asesor
        ADD COLUMN plantilla_comision_id UUID NULL
      `);

      // Agregar FK constraint
      await client.query(`
        ALTER TABLE perfiles_asesor
        ADD CONSTRAINT perfiles_asesor_plantilla_comision_fk
        FOREIGN KEY (plantilla_comision_id)
        REFERENCES catalogos(id)
        ON DELETE SET NULL
      `);

      console.log('   ✓ Campo plantilla_comision_id agregado');
    }

    // ============================================
    // 2. Insertar plantillas globales de comisión
    // ============================================
    console.log('\n➕ Insertando plantillas globales de comisión...');

    const existingPlantillas = await client.query(`
      SELECT COUNT(*) as count
      FROM catalogos
      WHERE tipo = 'plantilla_comision' AND tenant_id IS NULL
    `);

    if (Number(existingPlantillas.rows[0]?.count) > 0) {
      console.log('   ⏭️  Plantillas globales ya existen');
    } else {
      const plantillas = [
        {
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
                capta_y_vende: { captador: 35, vendedor: 80, empresa: -15 }
              },
              proyecto: {
                solo_capta: { captador: 30, vendedor: 0, empresa: 70 },
                solo_vende: { captador: 0, vendedor: 75, empresa: 25 },
                capta_y_vende: { captador: 30, vendedor: 75, empresa: -5 }
              }
            },
            fees_previos: [],
            roles_aplicables: ['top_producer', 'broker'],
            es_personal: false
          })
        },
        {
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
              tipo: 'porcentaje',
              valor: 10,
              descripcion: 'Comisión por referido'
            },
            fees_previos: [],
            roles_aplicables: ['referidor'],
            es_personal: false
          })
        }
      ];

      for (const p of plantillas) {
        await client.query(`
          INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, descripcion, icono, color, orden, activo, es_default, config)
          VALUES (NULL, $1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [p.tipo, p.codigo, p.nombre, p.descripcion, p.icono, p.color, p.orden, p.activo, p.es_default, p.config]);
      }
      console.log(`   ✓ ${plantillas.length} plantillas globales insertadas`);
    }

    // ============================================
    // 3. Insertar configuración de distribución interna de empresa
    // ============================================
    console.log('\n➕ Insertando configuración de distribución interna de empresa...');

    const existingDistribucion = await client.query(`
      SELECT COUNT(*) as count
      FROM catalogos
      WHERE tipo = 'distribucion_empresa' AND tenant_id IS NULL
    `);

    if (Number(existingDistribucion.rows[0]?.count) > 0) {
      console.log('   ⏭️  Distribución interna ya existe');
    } else {
      await client.query(`
        INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, descripcion, orden, activo, es_default, config)
        VALUES (NULL, 'distribucion_empresa', 'default', 'Distribución Interna de Empresa',
          'Cómo se distribuye internamente la parte de comisión que recibe la empresa',
          1, true, true,
          $1)
      `, [JSON.stringify({
        distribuciones: [
          { rol: 'operaciones', tipo: 'porcentaje', valor: 10, descripcion: 'Gastos operativos' },
          { rol: 'marketing', tipo: 'porcentaje', valor: 5, descripcion: 'Marketing y publicidad' },
          { rol: 'tecnologia', tipo: 'porcentaje', valor: 3, descripcion: 'Plataforma tecnológica' }
        ],
        nota: 'Los porcentajes se aplican sobre la parte de empresa. El resto es utilidad neta.'
      })]);
      console.log('   ✓ Distribución interna de empresa insertada');
    }

    console.log('\n✅ Migración 115 completada exitosamente');

    // Mostrar resumen
    const count = await client.query(`
      SELECT tipo, COUNT(*) as count
      FROM catalogos
      WHERE tipo IN ('plantilla_comision', 'distribucion_empresa')
      GROUP BY tipo
    `);
    console.log('\nResumen:');
    count.rows.forEach(r => {
      console.log(`  - ${r.tipo}: ${r.count} registros`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
