import { query } from './src/utils/db.js';

/**
 * Script para poblar catalogo_componentes con los componentes base
 * Ejecutar con: npx tsx seed-catalogo.ts
 */

interface CampoConfig {
  key: string;
  tipo: 'text' | 'textarea' | 'number' | 'toggle' | 'select' | 'color' | 'image' | 'url' | 'array' | 'json';
  label: string;
  descripcion?: string;
  default?: any;
  required?: boolean;
  grupo?: 'contenido' | 'diseño' | 'toggles' | 'colores';
  opciones?: { value: string; label: string }[]; // Para tipo 'select'
}

interface ComponenteCatalogo {
  tipo: string;
  nombre: string;
  descripcion: string;
  categoria: 'layout' | 'content' | 'forms' | 'display' | 'navigation';
  componente_key: string;
  campos_config: CampoConfig[];
  default_data: {
    static_data: Record<string, any>;
    styles: Record<string, any>;
    toggles: Record<string, boolean>;
  };
}

const componentes: ComponenteCatalogo[] = [
  // ==========================================
  // HEADER
  // ==========================================
  {
    tipo: 'header',
    nombre: 'Header / Navegación',
    descripcion: 'Barra de navegación superior con logo, menú y botón CTA. Configurable: posición del logo, estilo del header, colores.',
    categoria: 'layout',
    componente_key: 'header-default',
    campos_config: [
      // Contenido
      { key: 'logo', tipo: 'image', label: 'Logo', descripcion: 'URL del logo', grupo: 'contenido' },
      { key: 'logoAlt', tipo: 'text', label: 'Texto alternativo', descripcion: 'Texto alt del logo', default: 'Logo', grupo: 'contenido' },
      { key: 'links', tipo: 'json', label: 'Enlaces de navegación', descripcion: 'Array de {texto, url}', default: [], grupo: 'contenido' },
      { key: 'textoBotonCTA', tipo: 'text', label: 'Texto botón CTA', default: 'Contactar', grupo: 'contenido' },
      { key: 'urlBotonCTA', tipo: 'url', label: 'URL botón CTA', default: '/contacto', grupo: 'contenido' },
      { key: 'placeholderBusqueda', tipo: 'text', label: 'Placeholder búsqueda', default: 'Buscar...', grupo: 'contenido' },
      // Diseño
      { key: 'posicionLogo', tipo: 'select', label: 'Posición del logo', default: 'izquierda', grupo: 'diseño', opciones: [{ value: 'izquierda', label: 'Izquierda' }, { value: 'centro', label: 'Centro' }] },
      { key: 'posicionNav', tipo: 'select', label: 'Posición navegación', default: 'centro', grupo: 'diseño', opciones: [{ value: 'izquierda', label: 'Izquierda' }, { value: 'centro', label: 'Centro' }, { value: 'derecha', label: 'Derecha' }] },
      { key: 'estiloHeader', tipo: 'select', label: 'Estilo del header', default: 'normal', grupo: 'diseño', opciones: [{ value: 'normal', label: 'Normal (fondo blanco)' }, { value: 'transparente', label: 'Transparente' }, { value: 'oscuro', label: 'Oscuro' }] },
      { key: 'headerFijo', tipo: 'toggle', label: 'Header fijo (sticky)', default: true, grupo: 'diseño' },
      // Toggles
      { key: 'mostrarLogo', tipo: 'toggle', label: 'Mostrar logo', default: true, grupo: 'toggles' },
      { key: 'mostrarNav', tipo: 'toggle', label: 'Mostrar navegación', default: true, grupo: 'toggles' },
      { key: 'mostrarBusqueda', tipo: 'toggle', label: 'Mostrar búsqueda', default: false, grupo: 'toggles' },
      { key: 'mostrarBotonCTA', tipo: 'toggle', label: 'Mostrar botón CTA', default: true, grupo: 'toggles' },
      // Colores
      { key: 'colorPrimario', tipo: 'color', label: 'Color primario', descripcion: 'Color de acentos y botones', grupo: 'colores' },
      { key: 'colorFondo', tipo: 'color', label: 'Color de fondo', grupo: 'colores' },
      { key: 'colorTexto', tipo: 'color', label: 'Color del texto', grupo: 'colores' },
    ],
    default_data: {
      static_data: {
        logo: '',
        logoAlt: 'Mi Empresa',
        links: [
          { texto: 'Inicio', url: '/' },
          { texto: 'Propiedades', url: '/propiedades' },
          { texto: 'Contacto', url: '/contacto' }
        ],
        textoBotonCTA: 'Contactar',
        urlBotonCTA: '/contacto',
        posicionLogo: 'izquierda',
        posicionNav: 'centro',
        estiloHeader: 'normal',
        headerFijo: true,
      },
      styles: {},
      toggles: {
        mostrarLogo: true,
        mostrarNav: true,
        mostrarBusqueda: false,
        mostrarBotonCTA: true,
      },
    },
  },

  // ==========================================
  // FOOTER
  // ==========================================
  {
    tipo: 'footer',
    nombre: 'Footer / Pie de página',
    descripcion: 'Pie de página con logo, columnas de enlaces, información de contacto y redes sociales.',
    categoria: 'layout',
    componente_key: 'footer-default',
    campos_config: [
      // Contenido
      { key: 'logo', tipo: 'image', label: 'Logo', grupo: 'contenido' },
      { key: 'logoAlt', tipo: 'text', label: 'Texto alternativo logo', default: 'Logo', grupo: 'contenido' },
      { key: 'descripcion', tipo: 'textarea', label: 'Descripción', descripcion: 'Texto descriptivo de la empresa', grupo: 'contenido' },
      { key: 'copyright', tipo: 'text', label: 'Texto copyright', default: '© 2024 Todos los derechos reservados', grupo: 'contenido' },
      { key: 'columnas', tipo: 'json', label: 'Columnas de enlaces', descripcion: 'Array de {titulo, enlaces: [{texto, url}]}', grupo: 'contenido' },
      { key: 'telefono', tipo: 'text', label: 'Teléfono', grupo: 'contenido' },
      { key: 'email', tipo: 'text', label: 'Email', grupo: 'contenido' },
      { key: 'direccion', tipo: 'textarea', label: 'Dirección', grupo: 'contenido' },
      { key: 'redesSociales', tipo: 'json', label: 'Redes sociales', descripcion: 'Array de {nombre, url, icono?}', grupo: 'contenido' },
      // Diseño
      { key: 'layout', tipo: 'select', label: 'Diseño', default: 'columnas', grupo: 'diseño', opciones: [{ value: 'columnas', label: 'Columnas (3)' }, { value: 'simple', label: 'Simple (1 fila)' }, { value: 'centrado', label: 'Centrado' }] },
      // Toggles
      { key: 'mostrarLogo', tipo: 'toggle', label: 'Mostrar logo', default: true, grupo: 'toggles' },
      { key: 'mostrarDescripcion', tipo: 'toggle', label: 'Mostrar descripción', default: true, grupo: 'toggles' },
      { key: 'mostrarColumnas', tipo: 'toggle', label: 'Mostrar columnas', default: true, grupo: 'toggles' },
      { key: 'mostrarContacto', tipo: 'toggle', label: 'Mostrar contacto', default: true, grupo: 'toggles' },
      { key: 'mostrarRedesSociales', tipo: 'toggle', label: 'Mostrar redes sociales', default: true, grupo: 'toggles' },
      // Colores
      { key: 'colorFondo', tipo: 'color', label: 'Color de fondo', grupo: 'colores' },
      { key: 'colorTexto', tipo: 'color', label: 'Color del texto', grupo: 'colores' },
    ],
    default_data: {
      static_data: {
        logo: '',
        logoAlt: 'Logo',
        descripcion: '',
        copyright: '© 2024 Todos los derechos reservados',
        columnas: [],
        telefono: '',
        email: '',
        direccion: '',
        redesSociales: [],
        layout: 'columnas',
      },
      styles: {},
      toggles: {
        mostrarLogo: true,
        mostrarDescripcion: true,
        mostrarColumnas: true,
        mostrarContacto: true,
        mostrarRedesSociales: true,
      },
    },
  },

  // ==========================================
  // HERO
  // ==========================================
  {
    tipo: 'hero',
    nombre: 'Hero / Banner Principal',
    descripcion: 'Sección principal con título, subtítulo, imagen de fondo y botones de acción. Múltiples estilos disponibles.',
    categoria: 'content',
    componente_key: 'hero-default',
    campos_config: [
      // Contenido
      { key: 'titulo', tipo: 'text', label: 'Título principal', required: true, grupo: 'contenido' },
      { key: 'subtitulo', tipo: 'textarea', label: 'Subtítulo', grupo: 'contenido' },
      { key: 'descripcion', tipo: 'textarea', label: 'Descripción adicional', grupo: 'contenido' },
      { key: 'imagenFondo', tipo: 'image', label: 'Imagen de fondo', grupo: 'contenido' },
      { key: 'textoBoton', tipo: 'text', label: 'Texto botón principal', grupo: 'contenido' },
      { key: 'urlBoton', tipo: 'url', label: 'URL botón principal', grupo: 'contenido' },
      { key: 'textoBoton2', tipo: 'text', label: 'Texto botón secundario', grupo: 'contenido' },
      { key: 'urlBoton2', tipo: 'url', label: 'URL botón secundario', grupo: 'contenido' },
      // Diseño
      { key: 'alineacion', tipo: 'select', label: 'Alineación del contenido', default: 'centro', grupo: 'diseño', opciones: [{ value: 'izquierda', label: 'Izquierda' }, { value: 'centro', label: 'Centro' }, { value: 'derecha', label: 'Derecha' }] },
      { key: 'altura', tipo: 'select', label: 'Altura del hero', default: 'grande', grupo: 'diseño', opciones: [{ value: 'pequeño', label: 'Pequeño (300px)' }, { value: 'mediano', label: 'Mediano (450px)' }, { value: 'grande', label: 'Grande (600px)' }, { value: 'pantalla', label: 'Pantalla completa' }] },
      { key: 'overlay', tipo: 'toggle', label: 'Oscurecer imagen', default: true, grupo: 'diseño' },
      { key: 'opacidadOverlay', tipo: 'number', label: 'Opacidad overlay (0-100)', default: 50, grupo: 'diseño' },
      // Toggles
      { key: 'mostrarTitulo', tipo: 'toggle', label: 'Mostrar título', default: true, grupo: 'toggles' },
      { key: 'mostrarSubtitulo', tipo: 'toggle', label: 'Mostrar subtítulo', default: true, grupo: 'toggles' },
      { key: 'mostrarBoton', tipo: 'toggle', label: 'Mostrar botón principal', default: true, grupo: 'toggles' },
      { key: 'mostrarBoton2', tipo: 'toggle', label: 'Mostrar botón secundario', default: false, grupo: 'toggles' },
      // Colores
      { key: 'colorTitulo', tipo: 'color', label: 'Color del título', grupo: 'colores' },
      { key: 'colorSubtitulo', tipo: 'color', label: 'Color del subtítulo', grupo: 'colores' },
      { key: 'colorFondo', tipo: 'color', label: 'Color de fondo (si no hay imagen)', grupo: 'colores' },
      { key: 'colorBoton', tipo: 'color', label: 'Color botón principal', grupo: 'colores' },
    ],
    default_data: {
      static_data: {
        titulo: 'Bienvenido',
        subtitulo: 'Encuentra tu próximo hogar',
        descripcion: '',
        imagenFondo: '',
        textoBoton: 'Ver propiedades',
        urlBoton: '/propiedades',
        textoBoton2: '',
        urlBoton2: '',
        alineacion: 'centro',
        altura: 'grande',
        overlay: true,
        opacidadOverlay: 50,
      },
      styles: {},
      toggles: {
        mostrarTitulo: true,
        mostrarSubtitulo: true,
        mostrarBoton: true,
        mostrarBoton2: false,
      },
    },
  },
];

async function main() {
  console.log('🚀 Poblando catalogo_componentes...\n');

  for (const comp of componentes) {
    try {
      // Verificar si ya existe
      const existe = await query(
        'SELECT id FROM catalogo_componentes WHERE tipo = $1',
        [comp.tipo]
      );

      if (existe.rows.length > 0) {
        // Actualizar
        await query(
          `UPDATE catalogo_componentes SET
            nombre = $1,
            descripcion = $2,
            categoria = $3,
            componente_key = $4,
            campos_config = $5,
            default_data = $6
          WHERE tipo = $7`,
          [
            comp.nombre,
            comp.descripcion,
            comp.categoria,
            comp.componente_key,
            JSON.stringify(comp.campos_config),
            JSON.stringify(comp.default_data),
            comp.tipo,
          ]
        );
        console.log(`✅ ${comp.tipo} actualizado (${comp.componente_key})`);
      } else {
        // Insertar
        await query(
          `INSERT INTO catalogo_componentes (tipo, nombre, descripcion, categoria, componente_key, campos_config, default_data)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            comp.tipo,
            comp.nombre,
            comp.descripcion,
            comp.categoria,
            comp.componente_key,
            JSON.stringify(comp.campos_config),
            JSON.stringify(comp.default_data),
          ]
        );
        console.log(`✅ ${comp.tipo} insertado (${comp.componente_key})`);
      }
    } catch (error) {
      console.error(`❌ Error con ${comp.tipo}:`, error);
    }
  }

  // Verificar resultado
  const result = await query('SELECT tipo, componente_key, nombre FROM catalogo_componentes ORDER BY tipo');
  console.log('\n📋 Catálogo actual:');
  console.table(result.rows);

  process.exit(0);
}

main().catch(console.error);
