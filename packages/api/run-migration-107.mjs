/**
 * Migración 107: Crear tablas de equipos y oficinas
 */

import knex from 'knex';

const db = knex({
  client: 'pg',
  connection: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function migrate() {
  try {
    // Crear tabla de oficinas/franquicias
    console.log('Creando tabla oficinas...');
    const existeOficinas = await db.schema.hasTable('oficinas');
    if (!existeOficinas) {
      await db.schema.createTable('oficinas', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
        table.string('nombre', 255).notNullable();
        table.string('codigo', 50);
        table.text('direccion');
        table.string('ciudad', 100);
        table.string('provincia', 100);
        table.string('pais', 100);
        table.string('codigo_postal', 20);
        table.string('telefono', 50);
        table.string('email', 255);
        table.text('zona_trabajo');
        table.uuid('administrador_id').references('id').inTable('usuarios').onDelete('SET NULL');
        table.boolean('activo').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());

        table.index('tenant_id');
        table.index('administrador_id');
        table.index('activo');
      });
      console.log('✅ Tabla oficinas creada');
    } else {
      console.log('ℹ️ Tabla oficinas ya existe');
    }

    // Crear tabla de equipos
    console.log('Creando tabla equipos...');
    const existeEquipos = await db.schema.hasTable('equipos');
    if (!existeEquipos) {
      await db.schema.createTable('equipos', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
        table.string('nombre', 255).notNullable();
        table.text('descripcion');
        table.string('color', 20);
        table.uuid('lider_id').references('id').inTable('usuarios').onDelete('SET NULL');
        table.uuid('asistente_id').references('id').inTable('usuarios').onDelete('SET NULL');
        table.uuid('oficina_id').references('id').inTable('oficinas').onDelete('SET NULL');
        table.boolean('activo').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());
        table.timestamp('updated_at').defaultTo(db.fn.now());

        table.index('tenant_id');
        table.index('lider_id');
        table.index('asistente_id');
        table.index('oficina_id');
        table.index('activo');
      });
      console.log('✅ Tabla equipos creada');
    } else {
      console.log('ℹ️ Tabla equipos ya existe');
    }

    // Crear tabla de miembros de equipo
    console.log('Creando tabla equipos_miembros...');
    const existeMiembros = await db.schema.hasTable('equipos_miembros');
    if (!existeMiembros) {
      await db.schema.createTable('equipos_miembros', (table) => {
        table.uuid('id').primary().defaultTo(db.raw('gen_random_uuid()'));
        table.uuid('equipo_id').notNullable().references('id').inTable('equipos').onDelete('CASCADE');
        table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
        table.string('rol', 50).defaultTo('miembro');
        table.date('fecha_ingreso').defaultTo(db.fn.now());
        table.boolean('activo').defaultTo(true);
        table.timestamp('created_at').defaultTo(db.fn.now());

        table.unique(['equipo_id', 'usuario_id']);
        table.index('equipo_id');
        table.index('usuario_id');
      });
      console.log('✅ Tabla equipos_miembros creada');
    } else {
      console.log('ℹ️ Tabla equipos_miembros ya existe');
    }

    // Añadir columna oficina_id a usuarios si no existe
    console.log('Verificando columna oficina_id en usuarios...');
    const tieneOficinaId = await db.schema.hasColumn('usuarios', 'oficina_id');
    if (!tieneOficinaId) {
      await db.schema.alterTable('usuarios', (table) => {
        table.uuid('oficina_id').references('id').inTable('oficinas').onDelete('SET NULL');
      });
      console.log('✅ Columna oficina_id agregada a usuarios');
    } else {
      console.log('ℹ️ Columna oficina_id ya existe en usuarios');
    }

    // Añadir columna equipo_id a usuarios si no existe
    console.log('Verificando columna equipo_id en usuarios...');
    const tieneEquipoId = await db.schema.hasColumn('usuarios', 'equipo_id');
    if (!tieneEquipoId) {
      await db.schema.alterTable('usuarios', (table) => {
        table.uuid('equipo_id').references('id').inTable('equipos').onDelete('SET NULL');
      });
      console.log('✅ Columna equipo_id agregada a usuarios');
    } else {
      console.log('ℹ️ Columna equipo_id ya existe en usuarios');
    }

    console.log('\n✅ Migración 107 completada exitosamente');

  } catch (error) {
    console.error('❌ Error en migración:', error);
    throw error;
  } finally {
    await db.destroy();
  }
}

migrate().catch(console.error);
