import { Knex } from 'knex';

/**
 * Migración: Actualizar schema del hero con todos los campos reales
 *
 * El hero actual usa muchos más campos que los definidos en el catálogo inicial.
 * Esta migración actualiza el schema para reflejar todos los campos usados.
 */
export async function up(knex: Knex): Promise<void> {
  // Schema completo del Hero basado en HeroDefault.astro
  const heroSchemaCompleto = {
    campos: [
      // Textos principales
      { nombre: 'badge', tipo: 'text', requerido: false, default: '', label: 'Badge superior' },
      { nombre: 'titulo', tipo: 'text', requerido: true, default: '', label: 'Título principal' },
      { nombre: 'subtitulo', tipo: 'textarea', requerido: false, default: '', label: 'Subtítulo' },
      { nombre: 'textoBoton', tipo: 'text', requerido: false, default: '', label: 'Texto del botón' },
      { nombre: 'urlBoton', tipo: 'text', requerido: false, default: '/propiedades', label: 'URL del botón' },
      { nombre: 'imagenFondo', tipo: 'image', requerido: false, default: '', label: 'Imagen de fondo' },

      // Stats (array de objetos)
      {
        nombre: 'stats',
        tipo: 'array',
        requerido: false,
        default: [],
        label: 'Estadísticas',
        schema: {
          numero: { tipo: 'text', requerido: true, label: 'Número' },
          etiqueta: { tipo: 'text', requerido: true, label: 'Etiqueta' },
        }
      },

      // Buscador - Tabs
      {
        nombre: 'buscador_tabs',
        tipo: 'array',
        requerido: false,
        default: [],
        label: 'Tabs del buscador',
        schema: {
          valor: { tipo: 'text', requerido: true, label: 'Valor' },
          etiqueta: { tipo: 'text', requerido: true, label: 'Etiqueta' },
        }
      },

      // Buscador - Configuración
      { nombre: 'buscador_placeholder_ubicacion', tipo: 'text', requerido: false, default: 'Ingresa ubicación', label: 'Placeholder ubicación' },
      { nombre: 'buscador_label_tipo', tipo: 'text', requerido: false, default: 'Tipo', label: 'Label tipo' },
      { nombre: 'buscador_label_precio', tipo: 'text', requerido: false, default: 'Precio', label: 'Label precio' },
      { nombre: 'buscador_texto_boton', tipo: 'text', requerido: false, default: 'Buscar', label: 'Texto botón buscar' },
    ],
    toggles: [
      { nombre: 'mostrarBadge', tipo: 'boolean', default: true, label: 'Mostrar badge' },
      { nombre: 'mostrarStats', tipo: 'boolean', default: true, label: 'Mostrar estadísticas' },
      { nombre: 'mostrarBuscador', tipo: 'boolean', default: false, label: 'Mostrar buscador' },
    ],
  };

  // Actualizar el schema del hero en componentes_catalogo
  await knex('componentes_catalogo')
    .where('codigo', 'hero')
    .update({
      schema_config: JSON.stringify(heroSchemaCompleto),
      updated_at: knex.fn.now(),
    });

  console.log('✅ Schema del componente hero actualizado con campos completos');
}

export async function down(knex: Knex): Promise<void> {
  // Revertir al schema básico original
  const heroSchemaBasico = {
    campos: [
      { nombre: 'titulo', tipo: 'text', requerido: true, default: '' },
      { nombre: 'subtitulo', tipo: 'text', requerido: false, default: '' },
      { nombre: 'imagen_fondo', tipo: 'text', requerido: false, default: '' },
      { nombre: 'altura', tipo: 'select', opciones: ['small', 'medium', 'large', 'fullscreen'], default: 'large' },
      { nombre: 'alineacion', tipo: 'select', opciones: ['left', 'center', 'right'], default: 'center' },
      { nombre: 'overlay_opacity', tipo: 'number', requerido: false, default: 0.5 },
    ]
  };

  await knex('componentes_catalogo')
    .where('codigo', 'hero')
    .update({
      schema_config: JSON.stringify(heroSchemaBasico),
      updated_at: knex.fn.now(),
    });

  console.log('❌ Schema del componente hero revertido a básico');
}
