import { Knex } from 'knex';

/**
 * Migración - Actualizar campos del header
 *
 * Agrega campos faltantes al catálogo del header:
 * - mostrarBusqueda: toggle para mostrar/ocultar búsqueda
 * - mostrarMenu: toggle para mostrar/ocultar navegación
 * - placeholderBusqueda: texto placeholder del campo de búsqueda
 */
export async function up(knex: Knex): Promise<void> {
  // Actualizar campos_config del header con todos los campos
  await knex('catalogo_componentes')
    .where('tipo', 'header')
    .update({
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image', required: false },
        { key: 'logoAlt', label: 'Texto alternativo del logo', type: 'text', required: false, default: 'Logo' },
        { key: 'links', label: 'Enlaces de navegación', type: 'array', required: false },
        { key: 'mostrarMenu', label: 'Mostrar navegación', type: 'boolean', default: true },
        { key: 'mostrarBusqueda', label: 'Mostrar búsqueda', type: 'boolean', default: true },
        { key: 'placeholderBusqueda', label: 'Placeholder de búsqueda', type: 'text', default: 'Buscar propiedades...' },
        { key: 'mostrarBotonContacto', label: 'Mostrar botón contacto', type: 'boolean', default: true },
        { key: 'textoBotonContacto', label: 'Texto del botón', type: 'text', default: 'Contactar' },
        { key: 'urlBotonContacto', label: 'URL del botón', type: 'text', default: '/contacto' },
      ]),
    });
}

export async function down(knex: Knex): Promise<void> {
  // Revertir a la configuración anterior
  await knex('catalogo_componentes')
    .where('tipo', 'header')
    .update({
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image', required: true },
        { key: 'logoAlt', label: 'Texto alternativo del logo', type: 'text', required: false },
        { key: 'links', label: 'Enlaces de navegación', type: 'array', required: false },
        { key: 'mostrarBotonContacto', label: 'Mostrar botón contacto', type: 'boolean', default: true },
        { key: 'textoBotonContacto', label: 'Texto del botón', type: 'text', default: 'Contactar' },
        { key: 'urlBotonContacto', label: 'URL del botón', type: 'text', default: '/contacto' },
      ]),
    });
}
