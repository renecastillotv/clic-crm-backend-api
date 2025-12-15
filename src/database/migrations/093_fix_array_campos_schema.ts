import { Knex } from 'knex';

/**
 * Migración 093: Corregir schema de campos array en campos_config
 *
 * Agrega la propiedad `schema` a los campos de tipo array para que el
 * DynamicComponentEditor del CRM pueda renderizar los campos correctamente.
 */
export async function up(knex: Knex): Promise<void> {
  console.log('🔧 Actualizando schema de campos array en campos_config...\n');

  // HEADER - Agregar schema para links
  const headerCampos = [
    {
      key: 'logo',
      name: 'logo',
      label: 'Logo',
      type: 'image',
      required: false,
      default: '',
      description: 'URL del logo de la empresa',
    },
    {
      key: 'logoAlt',
      name: 'logoAlt',
      label: 'Texto alternativo del logo',
      type: 'text',
      required: false,
      default: 'Logo',
      description: 'Texto que se muestra si el logo no carga',
    },
    {
      key: 'links',
      name: 'links',
      label: 'Enlaces de navegación',
      type: 'array',
      required: false,
      default: [],
      description: 'Array de enlaces para el menú',
      schema: {
        texto: { type: 'text', label: 'Texto del enlace' },
        url: { type: 'text', label: 'URL del enlace' },
      },
    },
    {
      key: 'textoBotonCTA',
      name: 'textoBotonCTA',
      label: 'Texto del botón CTA',
      type: 'text',
      required: false,
      default: 'Contactar',
      description: 'Texto que aparece en el botón CTA',
    },
    {
      key: 'urlBotonCTA',
      name: 'urlBotonCTA',
      label: 'URL del botón CTA',
      type: 'text',
      required: false,
      default: '/contacto',
      description: 'URL a la que redirige el botón CTA',
    },
    {
      key: 'placeholderBusqueda',
      name: 'placeholderBusqueda',
      label: 'Placeholder de búsqueda',
      type: 'text',
      required: false,
      default: 'Buscar propiedades...',
      description: 'Texto placeholder del campo de búsqueda',
    },
  ];

  const headerToggles = [
    {
      key: 'mostrarLogo',
      name: 'mostrarLogo',
      label: 'Mostrar logo',
      type: 'toggle',
      default: true,
    },
    {
      key: 'mostrarNav',
      name: 'mostrarNav',
      label: 'Mostrar navegación',
      type: 'toggle',
      default: true,
    },
    {
      key: 'mostrarBusqueda',
      name: 'mostrarBusqueda',
      label: 'Mostrar barra de búsqueda',
      type: 'toggle',
      default: false,
    },
    {
      key: 'mostrarBotonCTA',
      name: 'mostrarBotonCTA',
      label: 'Mostrar botón CTA',
      type: 'toggle',
      default: true,
    },
  ];

  // FOOTER - Agregar schema para columnas y redesSociales
  const footerCampos = [
    {
      key: 'logo',
      name: 'logo',
      label: 'Logo',
      type: 'image',
      required: false,
      default: '',
    },
    {
      key: 'logoAlt',
      name: 'logoAlt',
      label: 'Texto alternativo del logo',
      type: 'text',
      required: false,
      default: 'Logo',
    },
    {
      key: 'descripcion',
      name: 'descripcion',
      label: 'Descripción',
      type: 'textarea',
      required: false,
      default: '',
    },
    {
      key: 'columnas',
      name: 'columnas',
      label: 'Columnas de enlaces',
      type: 'array',
      required: false,
      default: [],
      schema: {
        titulo: { type: 'text', label: 'Título de la columna' },
        enlaces: { type: 'text', label: 'Enlaces (JSON)' }, // Por ahora simplificado
      },
    },
    {
      key: 'redesSociales',
      name: 'redesSociales',
      label: 'Redes sociales',
      type: 'array',
      required: false,
      default: [],
      schema: {
        nombre: { type: 'text', label: 'Nombre de la red' },
        url: { type: 'text', label: 'URL del perfil' },
        icono: { type: 'text', label: 'Ícono (nombre o clase)' },
      },
    },
    {
      key: 'telefono',
      name: 'telefono',
      label: 'Teléfono',
      type: 'text',
      required: false,
      default: '',
    },
    {
      key: 'email',
      name: 'email',
      label: 'Email',
      type: 'text',
      required: false,
      default: '',
    },
    {
      key: 'direccion',
      name: 'direccion',
      label: 'Dirección',
      type: 'textarea',
      required: false,
      default: '',
    },
    {
      key: 'copyright',
      name: 'copyright',
      label: 'Texto de copyright',
      type: 'text',
      required: false,
      default: '© 2024 Todos los derechos reservados',
    },
  ];

  const footerToggles = [
    { key: 'mostrarLogo', name: 'mostrarLogo', label: 'Mostrar logo', type: 'toggle', default: true },
    { key: 'mostrarDescripcion', name: 'mostrarDescripcion', label: 'Mostrar descripción', type: 'toggle', default: true },
    { key: 'mostrarColumnas', name: 'mostrarColumnas', label: 'Mostrar columnas', type: 'toggle', default: true },
    { key: 'mostrarRedesSociales', name: 'mostrarRedesSociales', label: 'Mostrar redes sociales', type: 'toggle', default: true },
    { key: 'mostrarTelefono', name: 'mostrarTelefono', label: 'Mostrar teléfono', type: 'toggle', default: true },
    { key: 'mostrarEmail', name: 'mostrarEmail', label: 'Mostrar email', type: 'toggle', default: true },
  ];

  // HERO - Agregar schema para stats y buscador_tabs
  const heroCampos = [
    {
      key: 'badge',
      name: 'badge',
      label: 'Badge superior',
      type: 'text',
      required: false,
      default: '',
    },
    {
      key: 'titulo',
      name: 'titulo',
      label: 'Título principal',
      type: 'text',
      required: true,
      default: '',
    },
    {
      key: 'subtitulo',
      name: 'subtitulo',
      label: 'Subtítulo',
      type: 'textarea',
      required: false,
      default: '',
    },
    {
      key: 'textoBoton',
      name: 'textoBoton',
      label: 'Texto del botón',
      type: 'text',
      required: false,
      default: 'Ver propiedades',
    },
    {
      key: 'urlBoton',
      name: 'urlBoton',
      label: 'URL del botón',
      type: 'text',
      required: false,
      default: '/propiedades',
    },
    {
      key: 'imagenFondo',
      name: 'imagenFondo',
      label: 'Imagen de fondo',
      type: 'image',
      required: false,
      default: '',
    },
    {
      key: 'stats',
      name: 'stats',
      label: 'Estadísticas',
      type: 'array',
      required: false,
      default: [],
      schema: {
        numero: { type: 'text', label: 'Número/Valor' },
        etiqueta: { type: 'text', label: 'Etiqueta' },
      },
    },
    {
      key: 'buscador_tabs',
      name: 'buscador_tabs',
      label: 'Tabs del buscador',
      type: 'array',
      required: false,
      default: [],
      schema: {
        valor: { type: 'text', label: 'Valor' },
        etiqueta: { type: 'text', label: 'Etiqueta' },
      },
    },
    {
      key: 'buscador_placeholder_ubicacion',
      name: 'buscador_placeholder_ubicacion',
      label: 'Placeholder de ubicación',
      type: 'text',
      required: false,
      default: 'Buscar ubicación...',
    },
    {
      key: 'buscador_label_tipo',
      name: 'buscador_label_tipo',
      label: 'Label de tipo',
      type: 'text',
      required: false,
      default: 'Tipo',
    },
    {
      key: 'buscador_label_precio',
      name: 'buscador_label_precio',
      label: 'Label de precio',
      type: 'text',
      required: false,
      default: 'Precio',
    },
    {
      key: 'buscador_texto_boton',
      name: 'buscador_texto_boton',
      label: 'Texto del botón buscar',
      type: 'text',
      required: false,
      default: 'Buscar',
    },
  ];

  const heroToggles = [
    { key: 'mostrarBuscador', name: 'mostrarBuscador', label: 'Mostrar buscador', type: 'toggle', default: false },
    { key: 'mostrarStats', name: 'mostrarStats', label: 'Mostrar estadísticas', type: 'toggle', default: false },
    { key: 'mostrarBoton', name: 'mostrarBoton', label: 'Mostrar botón CTA', type: 'toggle', default: true },
  ];

  // FEATURES - Agregar schema para features
  const featuresCampos = [
    {
      key: 'titulo',
      name: 'titulo',
      label: 'Título',
      type: 'text',
      required: true,
      default: '',
    },
    {
      key: 'subtitulo',
      name: 'subtitulo',
      label: 'Subtítulo',
      type: 'textarea',
      required: false,
      default: '',
    },
    {
      key: 'features',
      name: 'features',
      label: 'Características',
      type: 'array',
      required: false,
      default: [],
      schema: {
        titulo: { type: 'text', label: 'Título' },
        descripcion: { type: 'textarea', label: 'Descripción' },
        icono: { type: 'text', label: 'Ícono' },
      },
    },
    {
      key: 'columnas',
      name: 'columnas',
      label: 'Número de columnas',
      type: 'number',
      required: false,
      default: 3,
    },
  ];

  // TESTIMONIALS - Agregar schema para testimonios
  const testimonialsCampos = [
    {
      key: 'titulo',
      name: 'titulo',
      label: 'Título',
      type: 'text',
      required: false,
      default: 'Lo que dicen nuestros clientes',
    },
    {
      key: 'subtitulo',
      name: 'subtitulo',
      label: 'Subtítulo',
      type: 'textarea',
      required: false,
      default: '',
    },
    {
      key: 'testimonios',
      name: 'testimonios',
      label: 'Testimonios',
      type: 'array',
      required: false,
      default: [],
      schema: {
        nombre: { type: 'text', label: 'Nombre' },
        cargo: { type: 'text', label: 'Cargo/Empresa' },
        texto: { type: 'textarea', label: 'Testimonio' },
        calificacion: { type: 'number', label: 'Calificación (1-5)' },
        foto: { type: 'image', label: 'Foto' },
      },
    },
  ];

  // Actualizar cada componente con campos + toggles
  const updates: Array<{ tipo: string; campos: any[]; toggles?: any[] }> = [
    { tipo: 'header', campos: headerCampos, toggles: headerToggles },
    { tipo: 'footer', campos: footerCampos, toggles: footerToggles },
    { tipo: 'hero', campos: heroCampos, toggles: heroToggles },
    { tipo: 'features', campos: featuresCampos },
    { tipo: 'testimonials', campos: testimonialsCampos },
  ];

  for (const update of updates) {
    const existe = await knex('catalogo_componentes')
      .where('tipo', update.tipo)
      .first();

    if (existe) {
      // Crear campos_config con estructura correcta
      const camposConfig = {
        campos: update.campos.map(c => ({
          nombre: c.name || c.key,
          tipo: c.type,
          label: c.label,
          requerido: c.required,
          default: c.default,
          descripcion: c.description,
          schema: c.schema,
        })),
        toggles: (update.toggles || []).map(t => ({
          nombre: t.name || t.key,
          tipo: 'boolean',
          label: t.label,
          default: t.default,
        })),
      };

      await knex('catalogo_componentes')
        .where('tipo', update.tipo)
        .update({
          campos_config: JSON.stringify(camposConfig),
        });
      console.log(`✅ ${update.tipo} actualizado con schemas de array`);
    } else {
      console.log(`⚠️  ${update.tipo} no existe en catalogo_componentes`);
    }
  }

  console.log('\n✅ Schemas de campos array actualizados correctamente\n');
}

export async function down(knex: Knex): Promise<void> {
  console.log('⏪ No se revierte esta migración - los campos siguen siendo válidos\n');
}
