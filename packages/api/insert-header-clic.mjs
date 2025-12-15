import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Cargar .env desde el directorio del script
dotenv.config({ path: join(__dirname, '.env') });

import pg from 'pg';
const { Pool } = pg;

console.log('DATABASE_URL:', process.env.DATABASE_URL ? 'Configurada' : 'No configurada');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function main() {
  console.log('=== Insertando header-clic ===');

  try {
    // Verificar si existe
    const check = await pool.query(
      "SELECT id, componente_key FROM catalogo_componentes WHERE componente_key = 'header-clic'"
    );

    if (check.rows.length > 0) {
      console.log('Ya existe header-clic:', check.rows[0]);
      await pool.end();
      return;
    }

    // Insertar
    const camposConfig = [
      { key: 'logo', label: 'Logo URL', tipo: 'image', default: '/logo.png' },
      { key: 'logoAlt', label: 'Texto alternativo del logo', tipo: 'text', default: 'CLIC Inmobiliaria' },
      { key: 'links', label: 'Enlaces de navegación', tipo: 'array',
        schema: { texto: { type: 'text', label: 'Texto' }, url: { type: 'text', label: 'URL' } },
        default: [
          { texto: 'Inicio', url: '/' },
          { texto: 'Propiedades', url: '/propiedades' },
          { texto: 'Asesores', url: '/asesores' },
          { texto: 'Blog', url: '/blog' }
        ]
      },
      { key: 'textoBotonContacto', label: 'Texto botón contacto', tipo: 'text', default: 'Contacto' },
      { key: 'urlBotonContacto', label: 'URL botón contacto', tipo: 'text', default: '/contacto' },
      { key: 'telefono', label: 'Teléfono', tipo: 'text', default: '' },
      { key: 'idiomas', label: 'Idiomas disponibles', tipo: 'array',
        schema: {
          codigo: { type: 'text', label: 'Código' },
          nombre: { type: 'text', label: 'Nombre' },
          bandera: { type: 'text', label: 'Bandera emoji' }
        },
        default: [
          { codigo: 'es', nombre: 'Español', bandera: '🇲🇽' },
          { codigo: 'en', nombre: 'English', bandera: '🇺🇸' },
          { codigo: 'fr', nombre: 'Français', bandera: '🇫🇷' }
        ]
      },
      { key: 'mostrarIdiomas', label: 'Mostrar selector de idiomas', tipo: 'toggle', grupo: 'toggles', default: true },
      { key: 'mostrarFavoritos', label: 'Mostrar botón de favoritos', tipo: 'toggle', grupo: 'toggles', default: true },
      { key: 'mostrarTelefono', label: 'Mostrar teléfono', tipo: 'toggle', grupo: 'toggles', default: false },
      { key: 'mostrarBotonContacto', label: 'Mostrar botón de contacto', tipo: 'toggle', grupo: 'toggles', default: true }
    ];

    const result = await pool.query(`
      INSERT INTO catalogo_componentes (
        id, tipo, nombre, componente_key, descripcion, icono,
        categoria, variantes, campos_config, active, required_features
      ) VALUES (
        gen_random_uuid(), $1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9, $10
      )
      RETURNING id, componente_key
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

    console.log('Insertado:', result.rows[0]);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();
