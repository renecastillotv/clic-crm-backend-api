import type { Knex } from 'knex';

/**
 * Migración 039: Sistema de Contenido Persistente
 *
 * Objetivo: Separar el contenido editable de la configuración del componente
 * para que los textos, imágenes y configuraciones persistan al cambiar de variante/template.
 *
 * Arquitectura:
 * - catalogo_campos: Define qué campos tiene cada tipo+variante de componente
 * - contenido_campos: Almacena los valores de texto por componente/idioma
 * - contenido_media: Almacena referencias a imágenes/videos
 */

export async function up(knex: Knex): Promise<void> {
  // ============================================================
  // 1. CATÁLOGO DE CAMPOS - Define los campos por tipo+variante
  // ============================================================
  await knex.schema.createTable('catalogo_campos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.string('tipo_componente', 50).notNullable(); // hero, header, footer, cta, etc.
    table.string('variante', 50).notNullable().defaultTo('default');
    table.string('campo', 100).notNullable(); // titulo, subtitulo, badge, etc.
    table.string('tipo_campo', 50).notNullable(); // text, textarea, html, image, url, number, array
    table.string('categoria', 50).notNullable().defaultTo('content'); // content, media, config, style
    table.string('etiqueta', 200); // Label para UI: "Título principal"
    table.text('descripcion'); // Descripción para el editor
    table.text('valor_default'); // Valor por defecto
    table.jsonb('opciones').defaultTo('{}'); // { placeholder, maxLength, required, etc. }
    table.integer('orden').defaultTo(0);
    table.boolean('requerido').defaultTo(false);
    table.boolean('traducible').defaultTo(true); // Si soporta múltiples idiomas
    table.boolean('activo').defaultTo(true);
    table.timestamps(true, true);

    // Índices
    table.unique(['tipo_componente', 'variante', 'campo']);
    table.index(['tipo_componente', 'variante']);
    table.index(['categoria']);
  });

  // ============================================================
  // 2. CONTENIDO DE CAMPOS - Valores editables por componente
  // ============================================================
  await knex.schema.createTable('contenido_campos', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('componente_id').notNullable()
      .references('id').inTable('componentes_web').onDelete('CASCADE');
    table.string('campo', 100).notNullable(); // Nombre del campo
    table.string('idioma', 10).notNullable().defaultTo('es'); // es, en, fr, pt
    table.text('valor'); // El valor del campo
    table.jsonb('valor_json'); // Para campos tipo array/object
    table.integer('version').defaultTo(1);
    table.uuid('actualizado_por'); // Usuario que hizo el cambio
    table.timestamps(true, true);

    // Índices
    table.unique(['componente_id', 'campo', 'idioma']);
    table.index(['componente_id']);
    table.index(['idioma']);
  });

  // ============================================================
  // 3. CONTENIDO MEDIA - Imágenes y videos separados
  // ============================================================
  await knex.schema.createTable('contenido_media', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('componente_id').notNullable()
      .references('id').inTable('componentes_web').onDelete('CASCADE');
    table.string('campo', 100).notNullable(); // imagenFondo, logo, video, etc.
    table.string('tipo_media', 50).notNullable(); // image, video, icon
    table.text('url').notNullable();
    table.string('alt_text', 500); // Texto alternativo
    table.jsonb('traducciones_alt').defaultTo('{}'); // { "en": "...", "es": "..." }
    table.jsonb('metadata').defaultTo('{}'); // { width, height, format, size }
    table.integer('orden').defaultTo(0); // Para campos con múltiples imágenes
    table.timestamps(true, true);

    // Índices
    table.index(['componente_id', 'campo']);
    table.index(['componente_id']);
  });

  // ============================================================
  // 4. DEFAULTS POR TENANT - Valores default específicos del tenant
  // ============================================================
  await knex.schema.createTable('tenant_defaults', (table) => {
    table.uuid('id').primary().defaultTo(knex.raw('gen_random_uuid()'));
    table.uuid('tenant_id').notNullable()
      .references('id').inTable('tenants').onDelete('CASCADE');
    table.string('tipo_componente', 50).notNullable();
    table.string('campo', 100).notNullable();
    table.string('idioma', 10).notNullable().defaultTo('es');
    table.text('valor');
    table.jsonb('valor_json');
    table.timestamps(true, true);

    // Un tenant puede tener sus propios defaults por tipo+campo+idioma
    table.unique(['tenant_id', 'tipo_componente', 'campo', 'idioma']);
    table.index(['tenant_id']);
  });

  // ============================================================
  // 5. SEED: Catálogo de campos para componentes base
  // ============================================================

  // HERO - Campos del componente Hero
  await knex('catalogo_campos').insert([
    // Hero - Textos principales
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'badge',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Badge / Etiqueta superior',
      descripcion: 'Texto pequeño que aparece arriba del título',
      valor_default: 'Tu inmobiliaria de confianza',
      opciones: JSON.stringify({ maxLength: 100, placeholder: 'Ej: Bienvenido' }),
      orden: 1,
      requerido: false,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'titulo',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Título principal',
      descripcion: 'El título grande del hero',
      valor_default: 'Encuentra tu hogar ideal',
      opciones: JSON.stringify({ maxLength: 200, placeholder: 'Título impactante' }),
      orden: 2,
      requerido: true,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'subtitulo',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Subtítulo',
      descripcion: 'Texto descriptivo debajo del título',
      valor_default: 'Miles de propiedades te esperan con las mejores opciones del mercado',
      opciones: JSON.stringify({ maxLength: 500, rows: 3 }),
      orden: 3,
      requerido: false,
      traducible: true
    },
    // Hero - Botón
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'textoBoton',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto del botón',
      descripcion: 'Texto que aparece en el botón de acción',
      valor_default: 'Ver Propiedades',
      opciones: JSON.stringify({ maxLength: 50 }),
      orden: 4,
      requerido: false,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'urlBoton',
      tipo_campo: 'url',
      categoria: 'config',
      etiqueta: 'URL del botón',
      descripcion: 'Enlace al que lleva el botón',
      valor_default: '/propiedades',
      opciones: JSON.stringify({ placeholder: '/propiedades' }),
      orden: 5,
      requerido: false,
      traducible: false
    },
    // Hero - Imagen
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'imagenFondo',
      tipo_campo: 'image',
      categoria: 'media',
      etiqueta: 'Imagen de fondo',
      descripcion: 'Imagen de fondo del hero (recomendado: 1920x1080)',
      valor_default: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1920&q=80',
      opciones: JSON.stringify({ aspectRatio: '16:9', minWidth: 1200 }),
      orden: 6,
      requerido: false,
      traducible: false
    },
    // Hero - Stats
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'stats',
      tipo_campo: 'array',
      categoria: 'content',
      etiqueta: 'Estadísticas',
      descripcion: 'Lista de estadísticas a mostrar',
      valor_default: JSON.stringify([
        { numero: '500+', etiqueta: 'Propiedades' },
        { numero: '1000+', etiqueta: 'Clientes felices' },
        { numero: '15+', etiqueta: 'Años de experiencia' }
      ]),
      opciones: JSON.stringify({
        itemSchema: { numero: 'text', etiqueta: 'text' },
        maxItems: 4
      }),
      orden: 7,
      requerido: false,
      traducible: true
    },
    // Hero - Buscador labels
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'buscador_tabs',
      tipo_campo: 'array',
      categoria: 'content',
      etiqueta: 'Tabs del buscador',
      descripcion: 'Opciones de tabs para el buscador',
      valor_default: JSON.stringify([
        { valor: 'venta', etiqueta: 'Comprar' },
        { valor: 'renta', etiqueta: 'Alquilar' }
      ]),
      opciones: JSON.stringify({ itemSchema: { valor: 'text', etiqueta: 'text' } }),
      orden: 8,
      requerido: false,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'buscador_placeholder_ubicacion',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Placeholder ubicación',
      valor_default: 'Ciudad, sector o zona...',
      orden: 9,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'buscador_label_tipo',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Label tipo propiedad',
      valor_default: 'Tipo',
      orden: 10,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'buscador_label_precio',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Label precio',
      valor_default: 'Precio máx.',
      orden: 11,
      traducible: true
    },
    {
      tipo_componente: 'hero',
      variante: 'default',
      campo: 'buscador_texto_boton',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto botón buscar',
      valor_default: 'Buscar',
      orden: 12,
      traducible: true
    }
  ]);

  // HEADER - Campos del componente Header
  await knex('catalogo_campos').insert([
    {
      tipo_componente: 'header',
      variante: 'default',
      campo: 'logo',
      tipo_campo: 'image',
      categoria: 'media',
      etiqueta: 'Logo',
      descripcion: 'Logo de la empresa',
      valor_default: '',
      orden: 1
    },
    {
      tipo_componente: 'header',
      variante: 'default',
      campo: 'logoAlt',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto alternativo del logo',
      valor_default: 'Logo',
      orden: 2,
      traducible: true
    },
    {
      tipo_componente: 'header',
      variante: 'default',
      campo: 'links',
      tipo_campo: 'array',
      categoria: 'content',
      etiqueta: 'Enlaces de navegación',
      valor_default: JSON.stringify([
        { texto: 'Comprar', url: '/propiedades?operacion=venta' },
        { texto: 'Alquilar', url: '/propiedades?operacion=renta' },
        { texto: 'Vender', url: '/vender' },
        { texto: 'Nosotros', url: '/nosotros' }
      ]),
      opciones: JSON.stringify({ itemSchema: { texto: 'text', url: 'url' } }),
      orden: 3,
      traducible: true
    },
    {
      tipo_componente: 'header',
      variante: 'default',
      campo: 'textoBotonContacto',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto botón contacto',
      valor_default: 'Contactar',
      orden: 4,
      traducible: true
    },
    {
      tipo_componente: 'header',
      variante: 'default',
      campo: 'urlBotonContacto',
      tipo_campo: 'url',
      categoria: 'config',
      etiqueta: 'URL botón contacto',
      valor_default: '/contacto',
      orden: 5
    }
  ]);

  // FOOTER - Campos del componente Footer
  await knex('catalogo_campos').insert([
    {
      tipo_componente: 'footer',
      variante: 'default',
      campo: 'descripcion',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Descripción de la empresa',
      valor_default: 'Tu socio inmobiliario de confianza. Te ayudamos a encontrar la propiedad perfecta.',
      orden: 1,
      traducible: true
    },
    {
      tipo_componente: 'footer',
      variante: 'default',
      campo: 'telefono',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Teléfono',
      valor_default: '+1 (809) 555-0123',
      orden: 2
    },
    {
      tipo_componente: 'footer',
      variante: 'default',
      campo: 'email',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Email',
      valor_default: 'info@inmobiliaria.com',
      orden: 3
    },
    {
      tipo_componente: 'footer',
      variante: 'default',
      campo: 'direccion',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Dirección',
      valor_default: 'Av. Principal #123, Santo Domingo',
      orden: 4,
      traducible: true
    },
    {
      tipo_componente: 'footer',
      variante: 'default',
      campo: 'textoCopyright',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto de copyright',
      valor_default: '© 2024 Inmobiliaria. Todos los derechos reservados.',
      orden: 5,
      traducible: true
    },
    {
      tipo_componente: 'footer',
      variante: 'default',
      campo: 'redesSociales',
      tipo_campo: 'array',
      categoria: 'content',
      etiqueta: 'Redes sociales',
      valor_default: JSON.stringify([
        { red: 'facebook', url: 'https://facebook.com' },
        { red: 'instagram', url: 'https://instagram.com' },
        { red: 'whatsapp', url: 'https://wa.me/18095550123' }
      ]),
      orden: 6
    }
  ]);

  // FEATURES - Campos del componente Features
  await knex('catalogo_campos').insert([
    {
      tipo_componente: 'features',
      variante: 'default',
      campo: 'titulo',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Título de la sección',
      valor_default: '¿Por qué elegirnos?',
      orden: 1,
      traducible: true
    },
    {
      tipo_componente: 'features',
      variante: 'default',
      campo: 'subtitulo',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Subtítulo',
      valor_default: 'Somos tu mejor opción en el mercado inmobiliario',
      orden: 2,
      traducible: true
    },
    {
      tipo_componente: 'features',
      variante: 'default',
      campo: 'features',
      tipo_campo: 'array',
      categoria: 'content',
      etiqueta: 'Lista de características',
      valor_default: JSON.stringify([
        { icono: 'home', titulo: 'Compra', descripcion: 'Encuentra la propiedad perfecta para ti y tu familia' },
        { icono: 'dollar', titulo: 'Venta', descripcion: 'Vendemos tu propiedad al mejor precio del mercado' },
        { icono: 'key', titulo: 'Alquiler', descripcion: 'Las mejores opciones de renta para tu estilo de vida' },
        { icono: 'chart', titulo: 'Avalúos', descripcion: 'Valuación profesional y certificada de inmuebles' }
      ]),
      opciones: JSON.stringify({
        itemSchema: { icono: 'text', titulo: 'text', descripcion: 'textarea' },
        maxItems: 8
      }),
      orden: 3,
      traducible: true
    }
  ]);

  // CTA - Campos del componente Call to Action
  await knex('catalogo_campos').insert([
    {
      tipo_componente: 'cta',
      variante: 'default',
      campo: 'titulo',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Título',
      valor_default: '¿Listo para encontrar tu hogar ideal?',
      orden: 1,
      traducible: true
    },
    {
      tipo_componente: 'cta',
      variante: 'default',
      campo: 'subtitulo',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Subtítulo',
      valor_default: 'Contáctanos hoy y te ayudaremos a hacer realidad tu sueño',
      orden: 2,
      traducible: true
    },
    {
      tipo_componente: 'cta',
      variante: 'default',
      campo: 'textoBoton',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto del botón',
      valor_default: 'Contactar ahora',
      orden: 3,
      traducible: true
    },
    {
      tipo_componente: 'cta',
      variante: 'default',
      campo: 'urlBoton',
      tipo_campo: 'url',
      categoria: 'config',
      etiqueta: 'URL del botón',
      valor_default: '/contacto',
      orden: 4
    }
  ]);

  // TESTIMONIALS - Campos del componente Testimonios
  await knex('catalogo_campos').insert([
    {
      tipo_componente: 'testimonials',
      variante: 'default',
      campo: 'titulo',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Título de la sección',
      valor_default: 'Lo que dicen nuestros clientes',
      orden: 1,
      traducible: true
    },
    {
      tipo_componente: 'testimonials',
      variante: 'default',
      campo: 'subtitulo',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Subtítulo',
      valor_default: 'Testimonios reales de personas que confiaron en nosotros',
      orden: 2,
      traducible: true
    }
  ]);

  // PROPERTY_LIST - Campos del componente Lista de Propiedades
  await knex('catalogo_campos').insert([
    {
      tipo_componente: 'property_list',
      variante: 'default',
      campo: 'titulo',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Título de la sección',
      valor_default: 'Propiedades destacadas',
      orden: 1,
      traducible: true
    },
    {
      tipo_componente: 'property_list',
      variante: 'default',
      campo: 'subtitulo',
      tipo_campo: 'textarea',
      categoria: 'content',
      etiqueta: 'Subtítulo',
      valor_default: 'Descubre las mejores opciones del mercado',
      orden: 2,
      traducible: true
    },
    {
      tipo_componente: 'property_list',
      variante: 'default',
      campo: 'textoVerMas',
      tipo_campo: 'text',
      categoria: 'content',
      etiqueta: 'Texto ver más',
      valor_default: 'Ver todas las propiedades',
      orden: 3,
      traducible: true
    },
    {
      tipo_componente: 'property_list',
      variante: 'default',
      campo: 'urlVerMas',
      tipo_campo: 'url',
      categoria: 'config',
      etiqueta: 'URL ver más',
      valor_default: '/propiedades',
      orden: 4
    }
  ]);

  console.log('Migración 039: Sistema de contenido persistente creado exitosamente');
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('tenant_defaults');
  await knex.schema.dropTableIfExists('contenido_media');
  await knex.schema.dropTableIfExists('contenido_campos');
  await knex.schema.dropTableIfExists('catalogo_campos');

  console.log('Migración 039: Tablas de contenido eliminadas');
}
