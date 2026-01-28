import { Knex } from 'knex';

/**
 * Migration: Create biblioteca (company document library) tables
 *
 * Tables:
 * - biblioteca_categorias: Categories for organizing documents
 * - biblioteca_documentos: Shared company documents (policies, manuals, etc.)
 * - biblioteca_versiones: Version history for documents
 * - biblioteca_confirmaciones: Reading confirmations for mandatory docs
 * - biblioteca_favoritos: User favorites
 */

export async function up(knex: Knex): Promise<void> {
  // =====================================================
  // BIBLIOTECA CATEGORIAS
  // =====================================================
  await knex.schema.createTable('biblioteca_categorias', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    table.string('nombre', 100).notNullable();
    table.text('descripcion');
    table.string('icono', 50); // lucide icon name
    table.string('color', 20); // hex color for UI

    table.integer('orden').defaultTo(0);
    table.boolean('activo').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by_id').references('id').inTable('usuarios').onDelete('SET NULL');

    table.index(['tenant_id', 'activo']);
    table.index(['tenant_id', 'orden']);
  });

  // =====================================================
  // BIBLIOTECA DOCUMENTOS
  // =====================================================
  await knex.schema.createTable('biblioteca_documentos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('categoria_id').references('id').inTable('biblioteca_categorias').onDelete('SET NULL');

    table.string('titulo', 300).notNullable();
    table.text('descripcion');
    table.text('url_documento').notNullable();
    table.string('tipo_archivo', 20); // pdf, doc, docx, etc.
    table.integer('tamano_archivo'); // bytes

    table.integer('version').defaultTo(1);
    table.text('version_notas'); // release notes for current version
    table.boolean('es_obligatorio').defaultTo(false); // requires reading confirmation
    table.date('fecha_vigencia'); // validity date

    table.integer('orden').defaultTo(0);
    table.boolean('activo').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by_id').references('id').inTable('usuarios').onDelete('SET NULL');
    table.uuid('updated_by_id').references('id').inTable('usuarios').onDelete('SET NULL');

    table.index(['tenant_id', 'activo']);
    table.index(['tenant_id', 'categoria_id']);
    table.index(['tenant_id', 'es_obligatorio']);
  });

  // =====================================================
  // BIBLIOTECA VERSIONES (version history)
  // =====================================================
  await knex.schema.createTable('biblioteca_versiones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('documento_id').notNullable().references('id').inTable('biblioteca_documentos').onDelete('CASCADE');

    table.integer('version').notNullable();
    table.text('url_documento').notNullable();
    table.text('notas'); // version notes

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.uuid('created_by_id').references('id').inTable('usuarios').onDelete('SET NULL');

    table.index(['documento_id', 'version']);
  });

  // =====================================================
  // BIBLIOTECA CONFIRMACIONES (reading confirmations)
  // =====================================================
  await knex.schema.createTable('biblioteca_confirmaciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('documento_id').notNullable().references('id').inTable('biblioteca_documentos').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');

    table.integer('version_confirmada').notNullable();
    table.timestamp('fecha_confirmacion').defaultTo(knex.fn.now());
    table.string('ip_address', 45);

    table.unique(['documento_id', 'usuario_id', 'version_confirmada']);
    table.index(['tenant_id', 'usuario_id']);
    table.index(['documento_id']);
  });

  // =====================================================
  // BIBLIOTECA FAVORITOS
  // =====================================================
  await knex.schema.createTable('biblioteca_favoritos', (table) => {
    table.uuid('documento_id').notNullable().references('id').inTable('biblioteca_documentos').onDelete('CASCADE');
    table.uuid('usuario_id').notNullable().references('id').inTable('usuarios').onDelete('CASCADE');
    table.timestamp('created_at').defaultTo(knex.fn.now());

    table.primary(['documento_id', 'usuario_id']);
  });

  // Seed default categories for new tenants (will be created per-tenant)
  console.log('✅ Biblioteca tables created successfully');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('biblioteca_favoritos');
  await knex.schema.dropTableIfExists('biblioteca_confirmaciones');
  await knex.schema.dropTableIfExists('biblioteca_versiones');
  await knex.schema.dropTableIfExists('biblioteca_documentos');
  await knex.schema.dropTableIfExists('biblioteca_categorias');
}
