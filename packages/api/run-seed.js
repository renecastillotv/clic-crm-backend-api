// Script simple para poblar el catálogo
const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('Conectando a la base de datos...');

  const componentes = [
    {
      tipo: 'header',
      nombre: 'Header / Navegación',
      descripcion: 'Barra de navegación superior con logo, menú y botón CTA.',
      categoria: 'layout',
      componente_key: 'header-default',
      campos_config: JSON.stringify([
        { key: 'logo', tipo: 'image', label: 'Logo', grupo: 'contenido' },
        { key: 'logoAlt', tipo: 'text', label: 'Texto alternativo', default: 'Logo', grupo: 'contenido' },
        { key: 'links', tipo: 'json', label: 'Enlaces de navegación', default: [], grupo: 'contenido' },
        { key: 'textoBotonCTA', tipo: 'text', label: 'Texto botón CTA', default: 'Contactar', grupo: 'contenido' },
        { key: 'urlBotonCTA', tipo: 'url', label: 'URL botón CTA', default: '/contacto', grupo: 'contenido' },
        { key: 'posicionLogo', tipo: 'select', label: 'Posición del logo', default: 'izquierda', grupo: 'diseño', opciones: [{ value: 'izquierda', label: 'Izquierda' }, { value: 'centro', label: 'Centro' }] },
        { key: 'posicionNav', tipo: 'select', label: 'Posición navegación', default: 'centro', grupo: 'diseño', opciones: [{ value: 'izquierda', label: 'Izquierda' }, { value: 'centro', label: 'Centro' }, { value: 'derecha', label: 'Derecha' }] },
        { key: 'estiloHeader', tipo: 'select', label: 'Estilo del header', default: 'normal', grupo: 'diseño', opciones: [{ value: 'normal', label: 'Normal' }, { value: 'transparente', label: 'Transparente' }, { value: 'oscuro', label: 'Oscuro' }] },
        { key: 'headerFijo', tipo: 'toggle', label: 'Header fijo (sticky)', default: true, grupo: 'diseño' },
        { key: 'mostrarLogo', tipo: 'toggle', label: 'Mostrar logo', default: true, grupo: 'toggles' },
        { key: 'mostrarNav', tipo: 'toggle', label: 'Mostrar navegación', default: true, grupo: 'toggles' },
        { key: 'mostrarBusqueda', tipo: 'toggle', label: 'Mostrar búsqueda', default: false, grupo: 'toggles' },
        { key: 'mostrarBotonCTA', tipo: 'toggle', label: 'Mostrar botón CTA', default: true, grupo: 'toggles' },
        { key: 'colorPrimario', tipo: 'color', label: 'Color primario', grupo: 'colores' },
        { key: 'colorFondo', tipo: 'color', label: 'Color de fondo', grupo: 'colores' },
        { key: 'colorTexto', tipo: 'color', label: 'Color del texto', grupo: 'colores' },
      ]),
      default_data: JSON.stringify({
        static_data: {
          logo: '', logoAlt: 'Mi Empresa',
          links: [{ texto: 'Inicio', url: '/' }, { texto: 'Propiedades', url: '/propiedades' }, { texto: 'Contacto', url: '/contacto' }],
          textoBotonCTA: 'Contactar', urlBotonCTA: '/contacto',
          posicionLogo: 'izquierda', posicionNav: 'centro', estiloHeader: 'normal', headerFijo: true,
        },
        styles: {},
        toggles: { mostrarLogo: true, mostrarNav: true, mostrarBusqueda: false, mostrarBotonCTA: true },
      }),
    },
    {
      tipo: 'footer',
      nombre: 'Footer / Pie de página',
      descripcion: 'Pie de página con logo, columnas de enlaces y contacto.',
      categoria: 'layout',
      componente_key: 'footer-default',
      campos_config: JSON.stringify([
        { key: 'logo', tipo: 'image', label: 'Logo', grupo: 'contenido' },
        { key: 'logoAlt', tipo: 'text', label: 'Texto alternativo logo', default: 'Logo', grupo: 'contenido' },
        { key: 'descripcion', tipo: 'textarea', label: 'Descripción', grupo: 'contenido' },
        { key: 'copyright', tipo: 'text', label: 'Texto copyright', default: '© 2024 Todos los derechos reservados', grupo: 'contenido' },
        { key: 'columnas', tipo: 'json', label: 'Columnas de enlaces', grupo: 'contenido' },
        { key: 'telefono', tipo: 'text', label: 'Teléfono', grupo: 'contenido' },
        { key: 'email', tipo: 'text', label: 'Email', grupo: 'contenido' },
        { key: 'direccion', tipo: 'textarea', label: 'Dirección', grupo: 'contenido' },
        { key: 'redesSociales', tipo: 'json', label: 'Redes sociales', grupo: 'contenido' },
        { key: 'layout', tipo: 'select', label: 'Diseño', default: 'columnas', grupo: 'diseño', opciones: [{ value: 'columnas', label: 'Columnas' }, { value: 'simple', label: 'Simple' }, { value: 'centrado', label: 'Centrado' }] },
        { key: 'mostrarLogo', tipo: 'toggle', label: 'Mostrar logo', default: true, grupo: 'toggles' },
        { key: 'mostrarDescripcion', tipo: 'toggle', label: 'Mostrar descripción', default: true, grupo: 'toggles' },
        { key: 'mostrarColumnas', tipo: 'toggle', label: 'Mostrar columnas', default: true, grupo: 'toggles' },
        { key: 'mostrarContacto', tipo: 'toggle', label: 'Mostrar contacto', default: true, grupo: 'toggles' },
        { key: 'mostrarRedesSociales', tipo: 'toggle', label: 'Mostrar redes sociales', default: true, grupo: 'toggles' },
        { key: 'colorFondo', tipo: 'color', label: 'Color de fondo', grupo: 'colores' },
        { key: 'colorTexto', tipo: 'color', label: 'Color del texto', grupo: 'colores' },
      ]),
      default_data: JSON.stringify({
        static_data: {
          logo: '', logoAlt: 'Logo', descripcion: '', copyright: '© 2024 Todos los derechos reservados',
          columnas: [], telefono: '', email: '', direccion: '', redesSociales: [], layout: 'columnas',
        },
        styles: {},
        toggles: { mostrarLogo: true, mostrarDescripcion: true, mostrarColumnas: true, mostrarContacto: true, mostrarRedesSociales: true },
      }),
    },
    {
      tipo: 'hero',
      nombre: 'Hero / Banner Principal',
      descripcion: 'Sección principal con título, subtítulo e imagen de fondo.',
      categoria: 'content',
      componente_key: 'hero-default',
      campos_config: JSON.stringify([
        { key: 'titulo', tipo: 'text', label: 'Título principal', required: true, grupo: 'contenido' },
        { key: 'subtitulo', tipo: 'textarea', label: 'Subtítulo', grupo: 'contenido' },
        { key: 'descripcion', tipo: 'textarea', label: 'Descripción adicional', grupo: 'contenido' },
        { key: 'imagenFondo', tipo: 'image', label: 'Imagen de fondo', grupo: 'contenido' },
        { key: 'textoBoton', tipo: 'text', label: 'Texto botón principal', grupo: 'contenido' },
        { key: 'urlBoton', tipo: 'url', label: 'URL botón principal', grupo: 'contenido' },
        { key: 'textoBoton2', tipo: 'text', label: 'Texto botón secundario', grupo: 'contenido' },
        { key: 'urlBoton2', tipo: 'url', label: 'URL botón secundario', grupo: 'contenido' },
        { key: 'alineacion', tipo: 'select', label: 'Alineación', default: 'centro', grupo: 'diseño', opciones: [{ value: 'izquierda', label: 'Izquierda' }, { value: 'centro', label: 'Centro' }, { value: 'derecha', label: 'Derecha' }] },
        { key: 'altura', tipo: 'select', label: 'Altura del hero', default: 'grande', grupo: 'diseño', opciones: [{ value: 'pequeño', label: 'Pequeño' }, { value: 'mediano', label: 'Mediano' }, { value: 'grande', label: 'Grande' }, { value: 'pantalla', label: 'Pantalla completa' }] },
        { key: 'overlay', tipo: 'toggle', label: 'Oscurecer imagen', default: true, grupo: 'diseño' },
        { key: 'opacidadOverlay', tipo: 'number', label: 'Opacidad overlay (0-100)', default: 50, grupo: 'diseño' },
        { key: 'mostrarTitulo', tipo: 'toggle', label: 'Mostrar título', default: true, grupo: 'toggles' },
        { key: 'mostrarSubtitulo', tipo: 'toggle', label: 'Mostrar subtítulo', default: true, grupo: 'toggles' },
        { key: 'mostrarBoton', tipo: 'toggle', label: 'Mostrar botón principal', default: true, grupo: 'toggles' },
        { key: 'mostrarBoton2', tipo: 'toggle', label: 'Mostrar botón secundario', default: false, grupo: 'toggles' },
        { key: 'colorTitulo', tipo: 'color', label: 'Color del título', grupo: 'colores' },
        { key: 'colorSubtitulo', tipo: 'color', label: 'Color del subtítulo', grupo: 'colores' },
        { key: 'colorFondo', tipo: 'color', label: 'Color de fondo (si no hay imagen)', grupo: 'colores' },
        { key: 'colorBoton', tipo: 'color', label: 'Color botón principal', grupo: 'colores' },
      ]),
      default_data: JSON.stringify({
        static_data: {
          titulo: 'Bienvenido', subtitulo: 'Encuentra tu próximo hogar', descripcion: '',
          imagenFondo: '', textoBoton: 'Ver propiedades', urlBoton: '/propiedades', textoBoton2: '', urlBoton2: '',
          alineacion: 'centro', altura: 'grande', overlay: true, opacidadOverlay: 50,
        },
        styles: {},
        toggles: { mostrarTitulo: true, mostrarSubtitulo: true, mostrarBoton: true, mostrarBoton2: false },
      }),
    },
  ];

  for (const comp of componentes) {
    try {
      const existe = await pool.query('SELECT id FROM catalogo_componentes WHERE tipo = $1', [comp.tipo]);

      if (existe.rows.length > 0) {
        await pool.query(
          `UPDATE catalogo_componentes SET
            nombre = $1, descripcion = $2, categoria = $3, componente_key = $4, campos_config = $5, default_data = $6
          WHERE tipo = $7`,
          [comp.nombre, comp.descripcion, comp.categoria, comp.componente_key, comp.campos_config, comp.default_data, comp.tipo]
        );
        console.log(`Actualizado: ${comp.tipo}`);
      } else {
        await pool.query(
          `INSERT INTO catalogo_componentes (tipo, nombre, descripcion, categoria, componente_key, campos_config, default_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [comp.tipo, comp.nombre, comp.descripcion, comp.categoria, comp.componente_key, comp.campos_config, comp.default_data]
        );
        console.log(`Insertado: ${comp.tipo}`);
      }
    } catch (error) {
      console.error(`Error con ${comp.tipo}:`, error.message);
    }
  }

  const result = await pool.query('SELECT tipo, componente_key FROM catalogo_componentes ORDER BY tipo');
  console.log('\nCatálogo actual:');
  console.table(result.rows);

  await pool.end();
  process.exit(0);
}

main().catch(console.error);
