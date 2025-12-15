import { Knex } from 'knex';

/**
 * Migración 096: Agregar variante header-clic al catálogo
 *
 * Header estilo CLIC Inmobiliaria con:
 * - Logo y navegación
 * - Selector de idiomas (ES/EN/FR)
 * - Botón de favoritos con contador
 * - Botón de contacto
 * - Menú móvil responsive
 * - Color primario naranja (#f04e00)
 */
export async function up(knex: Knex): Promise<void> {
  console.log('📦 Agregando header-clic al catálogo...\n');

  // Verificar si ya existe
  const existe = await knex('catalogo_componentes')
    .where('componente_key', 'header-clic')
    .first();

  if (existe) {
    console.log('↻ header-clic ya existe en el catálogo\n');
    return;
  }

  // Configuración de campos para el CRM
  const camposConfig = [
    {
      key: 'logo',
      label: 'Logo URL',
      tipo: 'image',
      default: '/logo.png'
    },
    {
      key: 'logoAlt',
      label: 'Texto alternativo del logo',
      tipo: 'text',
      default: 'CLIC Inmobiliaria'
    },
    {
      key: 'links',
      label: 'Enlaces de navegación',
      tipo: 'array',
      schema: {
        texto: { type: 'text', label: 'Texto' },
        url: { type: 'text', label: 'URL' }
      },
      default: [
        { texto: 'Inicio', url: '/' },
        { texto: 'Propiedades', url: '/propiedades' },
        { texto: 'Asesores', url: '/asesores' },
        { texto: 'Blog', url: '/blog' }
      ]
    },
    {
      key: 'textoBotonContacto',
      label: 'Texto botón contacto',
      tipo: 'text',
      default: 'Contacto'
    },
    {
      key: 'urlBotonContacto',
      label: 'URL botón contacto',
      tipo: 'text',
      default: '/contacto'
    },
    {
      key: 'telefono',
      label: 'Teléfono',
      tipo: 'text',
      default: ''
    },
    {
      key: 'idiomas',
      label: 'Idiomas disponibles',
      tipo: 'array',
      schema: {
        codigo: { type: 'text', label: 'Código (ej: es, en)' },
        nombre: { type: 'text', label: 'Nombre (ej: Español)' },
        bandera: { type: 'text', label: 'Bandera emoji' }
      },
      default: [
        { codigo: 'es', nombre: 'Español', bandera: '🇲🇽' },
        { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
        { codigo: 'fr', nombre: 'Français', bandera: '🇫🇷' }
      ]
    },
    // Toggles
    {
      key: 'mostrarIdiomas',
      label: 'Mostrar selector de idiomas',
      tipo: 'toggle',
      grupo: 'toggles',
      default: true
    },
    {
      key: 'mostrarFavoritos',
      label: 'Mostrar botón de favoritos',
      tipo: 'toggle',
      grupo: 'toggles',
      default: true
    },
    {
      key: 'mostrarTelefono',
      label: 'Mostrar teléfono',
      tipo: 'toggle',
      grupo: 'toggles',
      default: false
    },
    {
      key: 'mostrarBotonContacto',
      label: 'Mostrar botón de contacto',
      tipo: 'toggle',
      grupo: 'toggles',
      default: true
    }
  ];

  await knex('catalogo_componentes').insert({
    id: knex.raw('gen_random_uuid()'),
    tipo: 'header',
    nombre: 'Header CLIC',
    componente_key: 'header-clic',
    descripcion: 'Header estilo CLIC Inmobiliaria con selector de idiomas, favoritos y diseño moderno',
    icono: 'Layout',
    categoria: 'layout',
    variantes: 1,
    campos_config: JSON.stringify(camposConfig),
    active: true,
    required_features: false
  });

  console.log('✅ header-clic agregado al catálogo\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ Eliminando header-clic del catálogo...\n');

  await knex('catalogo_componentes')
    .where('componente_key', 'header-clic')
    .delete();

  console.log('✅ header-clic eliminado\n');
}
