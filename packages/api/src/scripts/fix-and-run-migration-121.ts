/**
 * Script para limpiar migraciones huérfanas y ejecutar la migración 121
 */
import knex from 'knex';
import config from '../config/knexfile.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  console.error(`No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(knexConfig);

async function fixAndRunMigration() {
  try {
    // 1. Obtener las migraciones registradas en la BD
    console.log('📋 Verificando migraciones en la base de datos...');
    const dbMigrations = await db('knex_migrations').select('name');

    // 2. Obtener los archivos de migración existentes
    const migrationsDir = path.resolve(import.meta.dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.ts'));
    const fileNames = files.map(f => f.replace('.ts', ''));

    // 3. Encontrar migraciones huérfanas (en BD pero no en archivos)
    const orphanMigrations = dbMigrations.filter(
      (m: any) => !fileNames.includes(m.name.replace('.ts', '').replace('.js', ''))
    );

    if (orphanMigrations.length > 0) {
      console.log(`🧹 Encontradas ${orphanMigrations.length} migraciones huérfanas:`);
      for (const m of orphanMigrations) {
        console.log(`   - ${m.name}`);
        // Eliminar la referencia huérfana
        await db('knex_migrations').where('name', m.name).delete();
      }
      console.log('✅ Migraciones huérfanas eliminadas');
    } else {
      console.log('✅ No hay migraciones huérfanas');
    }

    // 4. Verificar tablas existentes
    const tableCheck = await db.raw(`
      SELECT
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'ventas_expediente_requerimientos') as has_old,
        EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'documentos_requeridos') as has_new
    `);

    console.log('\n📊 Estado de las tablas:');
    console.log('   - ventas_expediente_requerimientos:', tableCheck.rows[0].has_old ? 'EXISTE' : 'NO EXISTE');
    console.log('   - documentos_requeridos:', tableCheck.rows[0].has_new ? 'EXISTE' : 'NO EXISTE');

    // 5. Si las tablas viejas existen, ejecutar la migración manualmente
    if (tableCheck.rows[0].has_old && !tableCheck.rows[0].has_new) {
      console.log('\n🔄 Ejecutando migración 121...');

      // Importar y ejecutar la migración
      const migration = await import('../database/migrations/121_refactor_documentos_requeridos.js');
      await migration.up(db);

      // Registrar la migración como completada
      await db('knex_migrations').insert({
        name: '121_refactor_documentos_requeridos.ts',
        batch: (await db('knex_migrations').max('batch as max').first())?.max + 1 || 1,
        migration_time: new Date()
      });

      console.log('✅ Migración 121 completada y registrada');
    } else if (tableCheck.rows[0].has_new) {
      console.log('\n✅ La tabla documentos_requeridos ya existe. No es necesario migrar.');

      // Verificar si está registrada
      const isRegistered = await db('knex_migrations')
        .where('name', 'like', '%121_refactor_documentos_requeridos%')
        .first();

      if (!isRegistered) {
        await db('knex_migrations').insert({
          name: '121_refactor_documentos_requeridos.ts',
          batch: (await db('knex_migrations').max('batch as max').first())?.max + 1 || 1,
          migration_time: new Date()
        });
        console.log('✅ Migración registrada en knex_migrations');
      }
    } else {
      console.log('\n⚠️  La tabla ventas_expediente_requerimientos no existe.');
      console.log('   Creando tabla documentos_requeridos desde cero...');

      // Crear la tabla directamente
      await db.schema.createTable('documentos_requeridos', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
        table.string('titulo', 255).notNullable();
        table.text('descripcion');
        table.text('instrucciones');
        table.string('categoria', 50).notNullable();
        table.string('tipo', 50);
        table.boolean('requiere_documento').defaultTo(true);
        table.boolean('es_obligatorio').defaultTo(false);
        table.integer('orden_visualizacion').defaultTo(0);
        table.jsonb('tipos_archivo_permitidos').defaultTo(JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']));
        table.integer('tamaño_maximo_archivo').defaultTo(10485760);
        table.boolean('activo').defaultTo(true);
        table.timestamps(true, true);

        table.index(['tenant_id', 'categoria']);
        table.index(['tenant_id', 'activo']);
      });

      console.log('✅ Tabla documentos_requeridos creada');

      // Crear tabla documentos_subidos
      await db.schema.createTable('documentos_subidos', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
        table.uuid('venta_id').notNullable().references('id').inTable('ventas').onDelete('CASCADE');
        table.uuid('requerimiento_id').references('id').inTable('documentos_requeridos').onDelete('CASCADE');
        table.string('titulo', 255);
        table.text('descripcion');
        table.string('categoria', 50);
        table.string('tipo', 50);
        table.boolean('requiere_documento').defaultTo(true);
        table.boolean('es_obligatorio').defaultTo(false);
        table.string('estado', 50).defaultTo('pendiente');
        table.text('url_documento');
        table.text('ruta_documento');
        table.string('tipo_archivo', 50);
        table.integer('tamaño_archivo');
        table.string('nombre_documento', 255);
        table.timestamp('fecha_subida_documento');
        table.timestamp('fecha_revision');
        table.uuid('subido_por_id').references('id').inTable('usuarios');
        table.uuid('revisado_por_id').references('id').inTable('usuarios');
        table.text('notas_revision');
        table.text('comentarios');
        table.timestamps(true, true);

        table.index(['tenant_id', 'venta_id']);
      });

      console.log('✅ Tabla documentos_subidos creada');

      // Insertar documentos por defecto para cada tenant
      const tenants = await db('tenants').select('id', 'nombre');

      for (const tenant of tenants) {
        await insertDefaultDocuments(db, tenant.id, tenant.nombre);
      }

      // Registrar migración
      await db('knex_migrations').insert({
        name: '121_refactor_documentos_requeridos.ts',
        batch: (await db('knex_migrations').max('batch as max').first())?.max + 1 || 1,
        migration_time: new Date()
      });

      console.log('✅ Migración registrada en knex_migrations');
    }

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    await db.destroy();
    process.exit(1);
  }
}

async function insertDefaultDocuments(db: any, tenantId: string, tenantName: string) {
  // Documentos para cierre de venta lista
  const docsVentaLista = [
    { titulo: 'Documento de Identidad', categoria: 'cierre_venta_lista', tipo: 'identificacion', es_obligatorio: true, orden_visualizacion: 10 },
    { titulo: 'Recibo Depósito', categoria: 'cierre_venta_lista', tipo: 'pago', es_obligatorio: true, orden_visualizacion: 20 },
    { titulo: 'Debida Diligencia', categoria: 'cierre_venta_lista', tipo: 'diligencia', es_obligatorio: true, orden_visualizacion: 30 },
    { titulo: 'Copia Contrato', categoria: 'cierre_venta_lista', tipo: 'contrato', es_obligatorio: true, orden_visualizacion: 40 },
    { titulo: 'Documentos Extras', categoria: 'cierre_venta_lista', tipo: 'extra', es_obligatorio: false, orden_visualizacion: 50 },
    { titulo: 'Otros Documentos', categoria: 'cierre_venta_lista', tipo: 'otros', es_obligatorio: false, orden_visualizacion: 60 },
  ];

  // Documentos para cierre de venta proyecto
  const docsVentaProyecto = [
    { titulo: 'Documento de Identidad', categoria: 'cierre_venta_proyecto', tipo: 'identificacion', es_obligatorio: true, orden_visualizacion: 10 },
    { titulo: 'Recibo Depósito', categoria: 'cierre_venta_proyecto', tipo: 'pago', es_obligatorio: true, orden_visualizacion: 20 },
    { titulo: 'Debida Diligencia', categoria: 'cierre_venta_proyecto', tipo: 'diligencia', es_obligatorio: true, orden_visualizacion: 30 },
    { titulo: 'Copia Contrato', categoria: 'cierre_venta_proyecto', tipo: 'contrato', es_obligatorio: true, orden_visualizacion: 40 },
    { titulo: 'Evidencia de Ingresos', categoria: 'cierre_venta_proyecto', tipo: 'ingresos', es_obligatorio: true, orden_visualizacion: 50 },
    { titulo: 'Documentos Extras', categoria: 'cierre_venta_proyecto', tipo: 'extra', es_obligatorio: false, orden_visualizacion: 60 },
    { titulo: 'Otros Documentos', categoria: 'cierre_venta_proyecto', tipo: 'otros', es_obligatorio: false, orden_visualizacion: 70 },
  ];

  // Documentos para cierre de alquiler
  const docsAlquiler = [
    { titulo: 'Documento de Identidad', categoria: 'cierre_alquiler', tipo: 'identificacion', es_obligatorio: true, orden_visualizacion: 10 },
    { titulo: 'Recibo Depósito', categoria: 'cierre_alquiler', tipo: 'pago', es_obligatorio: true, orden_visualizacion: 20 },
    { titulo: 'Debida Diligencia', categoria: 'cierre_alquiler', tipo: 'diligencia', es_obligatorio: true, orden_visualizacion: 30 },
    { titulo: 'Copia Contrato', categoria: 'cierre_alquiler', tipo: 'contrato', es_obligatorio: true, orden_visualizacion: 40 },
    { titulo: 'Depuración Crediticia', categoria: 'cierre_alquiler', tipo: 'crediticio', es_obligatorio: true, orden_visualizacion: 50 },
    { titulo: 'Evidencia de Ingresos', categoria: 'cierre_alquiler', tipo: 'ingresos', es_obligatorio: true, orden_visualizacion: 60 },
    { titulo: 'Documentos Extras', categoria: 'cierre_alquiler', tipo: 'extra', es_obligatorio: false, orden_visualizacion: 70 },
    { titulo: 'Otros Documentos', categoria: 'cierre_alquiler', tipo: 'otros', es_obligatorio: false, orden_visualizacion: 80 },
  ];

  const allDocs = [...docsVentaLista, ...docsVentaProyecto, ...docsAlquiler].map(doc => ({
    tenant_id: tenantId,
    titulo: doc.titulo,
    descripcion: null,
    instrucciones: null,
    categoria: doc.categoria,
    tipo: doc.tipo,
    requiere_documento: true,
    es_obligatorio: doc.es_obligatorio,
    orden_visualizacion: doc.orden_visualizacion,
    tipos_archivo_permitidos: JSON.stringify(['pdf', 'jpg', 'jpeg', 'png']),
    tamaño_maximo_archivo: 10485760,
    activo: true,
  }));

  await db('documentos_requeridos').insert(allDocs);
  console.log(`   ✅ Documentos por defecto creados para tenant: ${tenantName}`);
}

fixAndRunMigration();
