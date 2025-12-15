import type { Knex } from 'knex';

/**
 * Tabla de Ubicaciones con jerarquía
 *
 * Estructura jerárquica:
 * - Pais (nivel 1, parent_id = null)
 *   - Provincia/Estado (nivel 2)
 *     - Ciudad (nivel 3)
 *       - Sector/Barrio (nivel 4)
 *         - Zona (nivel 5, opcional)
 *
 * Cada ubicación puede tener:
 * - Contenido SEO rico (tagline, descripcion, meta tags)
 * - Imágenes para Hero, galerías, etc.
 * - Lugares cercanos y servicios
 * - Stats para insights
 * - Traducciones completas
 */

export async function up(knex: Knex): Promise<void> {
  // Check if table already exists
  const tableExists = await knex.schema.hasTable('ubicaciones');
  if (tableExists) {
    console.log('✅ ubicaciones table already exists, skipping creation');
    return;
  }

  await knex.schema.createTable('ubicaciones', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));

    // Jerarquía
    table.uuid('parent_id').nullable().references('id').inTable('ubicaciones').onDelete('CASCADE');
    table.enum('tipo', ['pais', 'provincia', 'ciudad', 'sector', 'zona']).notNullable();
    table.integer('nivel').notNullable(); // 1=pais, 2=provincia, 3=ciudad, 4=sector, 5=zona

    // Identificación básica
    table.string('nombre', 255).notNullable();
    table.string('slug', 255).notNullable();
    table.string('codigo', 10).nullable(); // Ej: 'DO' para país, 'SD' para provincia

    // Contenido SEO
    table.string('tagline', 500).nullable(); // "Sector premium de Santo Domingo"
    table.text('descripcion').nullable(); // Descripción rica para SEO
    table.text('descripcion_corta').nullable(); // Para cards y previews

    // Meta SEO
    table.string('meta_title', 255).nullable();
    table.string('meta_description', 500).nullable();
    table.jsonb('meta_keywords').nullable(); // ["lujo", "premium", "exclusivo"]

    // Imágenes (múltiples para diferentes usos)
    table.jsonb('imagenes').nullable();
    /*
    {
      hero: { url, alt, caption },
      thumbnail: { url, alt },
      gallery: [{ url, alt, caption, orden }],
      mapa: { url, alt }
    }
    */

    // Lugares cercanos y servicios
    table.jsonb('lugares_cercanos').nullable();
    /*
    [
      { tipo: "restaurante", nombre: "La Residence", distancia: "500m", rating: 4.8 },
      { tipo: "hospital", nombre: "Centro Médico", distancia: "1km" },
      { tipo: "supermercado", nombre: "Nacional", distancia: "300m" },
      { tipo: "escuela", nombre: "Colegio XYZ", distancia: "800m" }
    ]
    */

    table.jsonb('servicios').nullable();
    /*
    ["seguridad_24h", "transporte_publico", "areas_verdes", "vida_nocturna", "centros_comerciales"]
    */

    // Stats para insights
    table.jsonb('stats').nullable();
    /*
    {
      propiedades_total: 150,
      propiedades_venta: 80,
      propiedades_alquiler: 70,
      precio_promedio_venta: 250000,
      precio_promedio_alquiler: 1500,
      precio_m2_promedio: 2500,
      tendencia: "alza", // alza, baja, estable
      demanda: "alta", // alta, media, baja
      tiempo_promedio_venta: 45, // días
      updated_at: "2024-01-15"
    }
    */

    // Coordenadas geográficas (centro del área)
    table.decimal('latitud', 10, 7).nullable();
    table.decimal('longitud', 10, 7).nullable();
    table.jsonb('bounds').nullable(); // { north, south, east, west } para delimitar área

    // Traducciones
    table.jsonb('traducciones').nullable();
    /*
    {
      en: {
        nombre: "Colonial Zone",
        tagline: "Live in the historical heart of America",
        descripcion: "...",
        descripcion_corta: "...",
        meta_title: "...",
        meta_description: "..."
      },
      fr: { ... }
    }
    */

    table.jsonb('slug_traducciones').nullable(); // { en: "colonial-zone", fr: "zone-coloniale" }

    // Configuración de visualización
    table.boolean('destacado').defaultTo(false); // Para mostrar en home o secciones destacadas
    table.boolean('mostrar_en_menu').defaultTo(true); // Para menús de navegación
    table.boolean('mostrar_en_filtros').defaultTo(true); // Para filtros de búsqueda
    table.integer('orden').defaultTo(0); // Orden de aparición

    // Estado
    table.boolean('activo').defaultTo(true);

    // Timestamps
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());

    // Índices
    table.index('parent_id');
    table.index('tipo');
    table.index('nivel');
    table.index('activo');
    table.index('destacado');
    table.unique(['parent_id', 'slug']); // Slug único dentro del mismo padre
  });

  // Crear índice GIN para búsqueda en JSONB
  await knex.raw(`
    CREATE INDEX idx_ubicaciones_traducciones ON ubicaciones USING GIN (traducciones);
    CREATE INDEX idx_ubicaciones_stats ON ubicaciones USING GIN (stats);
    CREATE INDEX idx_ubicaciones_servicios ON ubicaciones USING GIN (servicios);
  `);

  // Insertar datos iniciales - República Dominicana
  const paisId = knex.raw('gen_random_uuid()');

  await knex('ubicaciones').insert({
    id: paisId,
    parent_id: null,
    tipo: 'pais',
    nivel: 1,
    nombre: 'República Dominicana',
    slug: 'republica-dominicana',
    codigo: 'DO',
    tagline: 'El corazón del Caribe',
    descripcion: 'República Dominicana ofrece una combinación única de playas paradisíacas, montañas majestuosas y una rica herencia cultural. Desde el lujo de Punta Cana hasta el encanto histórico de Santo Domingo.',
    descripcion_corta: 'Paraíso caribeño con playas, montañas y rica cultura.',
    latitud: 18.7357,
    longitud: -70.1627,
    destacado: true,
    traducciones: JSON.stringify({
      en: {
        nombre: 'Dominican Republic',
        tagline: 'The heart of the Caribbean',
        descripcion: 'Dominican Republic offers a unique combination of paradise beaches, majestic mountains and rich cultural heritage.',
        descripcion_corta: 'Caribbean paradise with beaches, mountains and rich culture.'
      }
    }),
    slug_traducciones: JSON.stringify({ en: 'dominican-republic' })
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('ubicaciones');
}
