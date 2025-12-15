import { pool } from './src/config/database.js';

async function seedHeaderClic() {
  console.log('📦 Verificando/insertando header-clic...');

  try {
    // Verificar si ya existe
    const existe = await pool.query(
      'SELECT id FROM catalogo_componentes WHERE componente_key = $1',
      ['header-clic']
    );

    if (existe.rows.length > 0) {
      console.log('✅ header-clic ya existe en el catálogo');
      console.log('   ID:', existe.rows[0].id);
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

    // Insertar
    const result = await pool.query(`
      INSERT INTO catalogo_componentes (
        id, tipo, nombre, componente_key, descripcion, icono,
        categoria, variantes, campos_config, active, required_features
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
      )
      RETURNING id
    `, [
      'header',
      'Header CLIC',
      'header-clic',
      'Header estilo CLIC Inmobiliaria con selector de idiomas, favoritos y diseño moderno',
      'Layout',
      'layout',
      1,
      JSON.stringify(camposConfig),
      true,
      false
    ]);

    console.log('✅ header-clic insertado');
    console.log('   ID:', result.rows[0].id);

  } catch (error: any) {
    console.error('❌ Error:', error.message);
  } finally {
    await pool.end();
  }
}

seedHeaderClic();
