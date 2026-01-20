import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function addContentComponent() {
  try {
    // Verificar si ya existe
    const existing = await pool.query('SELECT id FROM catalogo_componentes WHERE tipo = $1', ['content']);
    if (existing.rows.length > 0) {
      console.log('El componente "content" ya existe');
      return;
    }

    // Crear el componente content con campos de configuración
    const camposConfig = {
      campos: [
        { nombre: 'titulo', tipo: 'text', label: 'Título', placeholder: 'Título de la sección' },
        { nombre: 'subtitulo', tipo: 'text', label: 'Subtítulo', placeholder: 'Subtítulo opcional' },
        { nombre: 'contenido', tipo: 'richtext', label: 'Contenido', placeholder: 'Escribe el contenido...' },
        { nombre: 'imagenPrincipal', tipo: 'image', label: 'Imagen principal' },
        { nombre: 'alineacion', tipo: 'select', label: 'Alineación del texto', opciones: ['izquierda', 'centro', 'derecha'] },
        { nombre: 'colorFondo', tipo: 'color', label: 'Color de fondo' },
        { nombre: 'mostrarImagen', tipo: 'boolean', label: 'Mostrar imagen', default: true },
        { nombre: 'anchoCompleto', tipo: 'boolean', label: 'Ancho completo', default: false }
      ],
      toggles: [
        { nombre: 'mostrarTitulo', label: 'Mostrar título', default: true },
        { nombre: 'mostrarSubtitulo', label: 'Mostrar subtítulo', default: true }
      ]
    };

    // variantes es integer, no jsonb - usar 1 para indicar que tiene variantes
    // id es UUID pero no tiene default, generamos uno
    // componente_key es requerido
    await pool.query(`
      INSERT INTO catalogo_componentes (id, tipo, nombre, descripcion, icono, categoria, campos_config, variantes, active, componente_key)
      VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, true, $8)
    `, [
      'content',
      'Bloque de Contenido',
      'Sección flexible para mostrar texto, imágenes y contenido personalizado',
      'file-text',
      'contenido',
      JSON.stringify(camposConfig),
      1,  // variantes es integer
      'content-default'  // componente_key
    ]);

    console.log('✅ Componente "content" agregado al catálogo');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

addContentComponent();
