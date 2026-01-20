import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function update() {
  // Configuración de campos para cada componente que falta
  const configs = {
    founder_story: {
      campos: [
        { nombre: 'titulo', tipo: 'text', label: 'Título', placeholder: 'Nuestra Historia', required: true },
        { nombre: 'subtitulo', tipo: 'text', label: 'Subtítulo', placeholder: 'Conoce nuestros inicios' },
        { nombre: 'contenido', tipo: 'richtext', label: 'Contenido', placeholder: 'Escribe la historia...' },
        { nombre: 'imagen', tipo: 'image', label: 'Imagen del fundador' },
        { nombre: 'nombreFundador', tipo: 'text', label: 'Nombre del fundador' },
        { nombre: 'cargoFundador', tipo: 'text', label: 'Cargo del fundador' },
        { nombre: 'mostrarFirma', tipo: 'boolean', label: 'Mostrar firma', default: false }
      ]
    },
    homepage_cta: {
      campos: [
        { nombre: 'titulo', tipo: 'text', label: 'Título CTA', placeholder: '¿Listo para comenzar?', required: true },
        { nombre: 'subtitulo', tipo: 'text', label: 'Subtítulo', placeholder: 'Contáctanos hoy' },
        { nombre: 'textoBoton', tipo: 'text', label: 'Texto del botón', placeholder: 'Contactar', required: true },
        { nombre: 'urlBoton', tipo: 'text', label: 'URL del botón', placeholder: '/contacto' },
        { nombre: 'colorFondo', tipo: 'color', label: 'Color de fondo' },
        { nombre: 'mostrarIcono', tipo: 'boolean', label: 'Mostrar icono', default: true }
      ]
    },
    property_carousel: {
      campos: [
        { nombre: 'titulo', tipo: 'text', label: 'Título', placeholder: 'Propiedades Destacadas' },
        { nombre: 'subtitulo', tipo: 'text', label: 'Subtítulo', placeholder: 'Descubre nuestras mejores ofertas' },
        { nombre: 'cantidad', tipo: 'number', label: 'Cantidad de propiedades', default: 6, min: 1, max: 12 },
        { nombre: 'autoplay', tipo: 'boolean', label: 'Reproducción automática', default: true },
        { nombre: 'mostrarPrecio', tipo: 'boolean', label: 'Mostrar precio', default: true },
        { nombre: 'mostrarUbicacion', tipo: 'boolean', label: 'Mostrar ubicación', default: true },
        { nombre: 'filtroTipo', tipo: 'select', label: 'Filtrar por tipo', options: ['todos', 'venta', 'alquiler'] }
      ]
    },
    testimonials: {
      campos: [
        { nombre: 'titulo', tipo: 'text', label: 'Título', placeholder: 'Lo que dicen nuestros clientes' },
        { nombre: 'subtitulo', tipo: 'text', label: 'Subtítulo', placeholder: 'Testimonios reales' },
        { nombre: 'cantidad', tipo: 'number', label: 'Cantidad a mostrar', default: 3, min: 1, max: 6 },
        { nombre: 'autoplay', tipo: 'boolean', label: 'Reproducción automática', default: true },
        { nombre: 'mostrarEstrellas', tipo: 'boolean', label: 'Mostrar estrellas', default: true },
        { nombre: 'mostrarFoto', tipo: 'boolean', label: 'Mostrar foto del cliente', default: true }
      ]
    }
  };

  try {
    for (const [tipo, config] of Object.entries(configs)) {
      // Obtener config actual
      const current = await pool.query('SELECT campos_config FROM catalogo_componentes WHERE tipo = $1 LIMIT 1', [tipo]);
      if (current.rows.length > 0) {
        const existingConfig = current.rows[0].campos_config || {};
        // Merge: mantener styles, toggles, static_data, dynamic_data si existen, agregar campos
        const newConfig = {
          ...existingConfig,
          campos: config.campos
        };
        await pool.query(
          'UPDATE catalogo_componentes SET campos_config = $1 WHERE tipo = $2',
          [JSON.stringify(newConfig), tipo]
        );
        console.log('✅ Actualizado:', tipo, '-', config.campos.length, 'campos agregados');
      } else {
        console.log('⚠️ No encontrado:', tipo);
      }
    }
    console.log('\n✅ Todos los componentes actualizados correctamente');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

update();
