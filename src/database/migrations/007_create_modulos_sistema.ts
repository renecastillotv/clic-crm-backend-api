import { Knex } from 'knex';

/**
 * Migración 007 - Crear tabla de módulos del sistema
 *
 * Los módulos representan las secciones/features disponibles en la plataforma.
 * Cada rol puede tener acceso a diferentes módulos con diferentes permisos.
 */
export async function up(knex: Knex): Promise<void> {
  // Tabla de módulos del sistema
  await knex.schema.createTable('modulos', (table) => {
    table.string('id', 50).primary().comment('Identificador único del módulo (slug)');
    table.string('nombre', 100).notNullable().comment('Nombre para mostrar');
    table.text('descripcion').nullable().comment('Descripción del módulo');
    table.string('icono', 50).nullable().comment('Nombre del icono (ej: home, users)');
    table.string('categoria', 50).notNullable().comment('Categoría: crm, web, admin, tools');
    table.integer('orden').defaultTo(0).comment('Orden de visualización');
    table.boolean('activo').defaultTo(true);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    table.index('categoria', 'idx_modulos_categoria');
  });

  // Insertar módulos por defecto
  await knex('modulos').insert([
    // CRM
    { id: 'dashboard', nombre: 'Dashboard', icono: 'layout-dashboard', categoria: 'crm', orden: 1 },
    { id: 'propiedades', nombre: 'Propiedades', icono: 'home', categoria: 'crm', orden: 2 },
    { id: 'clientes', nombre: 'Clientes/Leads', icono: 'users', categoria: 'crm', orden: 3 },
    { id: 'agenda', nombre: 'Agenda', icono: 'calendar', categoria: 'crm', orden: 4 },
    { id: 'equipo', nombre: 'Equipo', icono: 'user-plus', categoria: 'crm', orden: 5 },
    { id: 'reportes', nombre: 'Reportes', icono: 'chart-bar', categoria: 'crm', orden: 6 },

    // Web
    { id: 'web-paginas', nombre: 'Páginas Web', icono: 'file-text', categoria: 'web', orden: 10 },
    { id: 'web-componentes', nombre: 'Componentes', icono: 'layout', categoria: 'web', orden: 11 },
    { id: 'web-tema', nombre: 'Tema/Diseño', icono: 'palette', categoria: 'web', orden: 12 },
    { id: 'blog', nombre: 'Blog', icono: 'edit', categoria: 'web', orden: 13 },
    { id: 'media', nombre: 'Media Library', icono: 'image', categoria: 'web', orden: 14 },

    // Admin (solo tenant_owner)
    { id: 'configuracion', nombre: 'Configuración', icono: 'settings', categoria: 'admin', orden: 20 },
    { id: 'roles', nombre: 'Roles y Permisos', icono: 'shield', categoria: 'admin', orden: 21 },
    { id: 'facturacion', nombre: 'Facturación', icono: 'credit-card', categoria: 'admin', orden: 22 },

    // Tools (opcionales por tenant)
    { id: 'redes-sociales', nombre: 'Redes Sociales', icono: 'share-2', categoria: 'tools', orden: 30 },
    { id: 'cursos', nombre: 'University/Cursos', icono: 'book-open', categoria: 'tools', orden: 31 },
    { id: 'certificaciones', nombre: 'Certificaciones', icono: 'award', categoria: 'tools', orden: 32 },
  ]);
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('modulos');
}
