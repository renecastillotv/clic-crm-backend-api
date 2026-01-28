import { Knex } from 'knex';

/**
 * Migration: Create plantillas_documentos and documentos_generados tables
 *
 * Tables:
 * - plantillas_documentos: Document templates with variables (admin creates/edits)
 * - documentos_generados: Documents generated from templates
 */

export async function up(knex: Knex): Promise<void> {
  // =====================================================
  // PLANTILLAS DE DOCUMENTOS
  // =====================================================
  await knex.schema.createTable('plantillas_documentos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');

    table.string('nombre', 200).notNullable();
    table.text('descripcion');
    table.string('categoria', 50).notNullable(); // captacion, venta, alquiler, legal, kyc, otro

    // Template content with {{variables}}
    table.text('contenido_html').notNullable();

    // Field definitions: [{ nombre: 'comprador_nombre', label: 'Nombre del Comprador', tipo: 'text', fuente: 'contacto.nombre' }]
    table.jsonb('campos_requeridos').defaultTo('[]');

    // Signature configuration
    table.boolean('requiere_firma').defaultTo(false);
    // Signers: [{ rol: 'comprador', nombre: 'Comprador', email_campo: 'comprador_email' }]
    table.jsonb('firmantes').defaultTo('[]');

    table.boolean('es_publica').defaultTo(true); // Visible to all users or admin only
    table.integer('orden').defaultTo(0);
    table.boolean('activo').defaultTo(true);

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.uuid('created_by_id').references('id').inTable('usuarios').onDelete('SET NULL');
    table.uuid('updated_by_id').references('id').inTable('usuarios').onDelete('SET NULL');

    table.index(['tenant_id', 'activo']);
    table.index(['tenant_id', 'categoria']);
  });

  // =====================================================
  // DOCUMENTOS GENERADOS
  // =====================================================
  await knex.schema.createTable('documentos_generados', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable().references('id').inTable('tenants').onDelete('CASCADE');
    table.uuid('usuario_id').references('id').inTable('usuarios').onDelete('SET NULL');
    table.uuid('plantilla_id').references('id').inTable('plantillas_documentos').onDelete('SET NULL');

    // Related entities
    table.uuid('contacto_id').references('id').inTable('contactos').onDelete('SET NULL');
    table.uuid('propiedad_id').references('id').inTable('propiedades').onDelete('SET NULL');
    table.uuid('venta_id').references('id').inTable('ventas').onDelete('SET NULL');

    table.string('nombre', 300).notNullable();
    table.string('numero_documento', 100); // Internal document number
    table.string('estado', 50).defaultTo('borrador'); // borrador, pendiente_firma, firmado, anulado

    // Merge data used to generate the document
    table.jsonb('datos_merge').defaultTo('{}');

    // Generated document
    table.text('url_documento'); // URL to PDF in R2
    table.integer('tamano_archivo');

    // DocuSeal integration
    table.string('docuseal_submission_id', 100);
    table.string('docuseal_signing_url', 500);
    table.jsonb('docuseal_signers').defaultTo('[]'); // Status of each signer

    // Dates
    table.timestamp('fecha_generacion').defaultTo(knex.fn.now());
    table.timestamp('fecha_firma');
    table.timestamp('fecha_expiracion');

    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index(['tenant_id', 'estado']);
    table.index(['tenant_id', 'usuario_id']);
    table.index(['tenant_id', 'contacto_id']);
    table.index(['tenant_id', 'propiedad_id']);
    table.index(['docuseal_submission_id']);
  });

  console.log('✅ Plantillas documentos tables created successfully');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('documentos_generados');
  await knex.schema.dropTableIfExists('plantillas_documentos');
}
