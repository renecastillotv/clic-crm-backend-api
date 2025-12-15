import type { Knex } from 'knex';

/**
 * Migración para crear tablas de contenidos:
 * - categorias_contenido: Categorías compartidas para artículos, videos, etc.
 * - articulos: Blog/artículos con soporte multi-idioma
 * - testimonios: Reseñas/testimonios de clientes
 * - videos: Galería de videos
 * - faqs: Preguntas frecuentes
 *
 * Todas las tablas soportan:
 * - Multi-tenant (tenant_id)
 * - Categorías
 * - Slugs únicos por tenant
 * - Multi-idioma (campo idioma + traducciones JSONB)
 */

export async function up(knex: Knex): Promise<void> {
  // =============================================
  // 1. CATEGORÍAS DE CONTENIDO (compartidas)
  // =============================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS categorias_contenido (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

      -- Identificador y tipo
      slug VARCHAR(100) NOT NULL,
      tipo VARCHAR(50) NOT NULL, -- 'articulo', 'video', 'testimonio', 'faq'

      -- Datos base (idioma por defecto)
      nombre VARCHAR(200) NOT NULL,
      descripcion TEXT,

      -- Multi-idioma
      traducciones JSONB DEFAULT '{}',
      -- Ejemplo: { "en": { "nombre": "Tips", "descripcion": "..." }, "pt": { ... } }

      -- Metadata
      icono VARCHAR(100),
      color VARCHAR(20),
      orden INT DEFAULT 0,
      activa BOOLEAN DEFAULT true,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(tenant_id, slug, tipo)
    );

    CREATE INDEX idx_categorias_contenido_tenant ON categorias_contenido(tenant_id);
    CREATE INDEX idx_categorias_contenido_tipo ON categorias_contenido(tipo);
  `);

  // =============================================
  // 2. ARTÍCULOS / BLOG
  // =============================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS articulos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      categoria_id UUID REFERENCES categorias_contenido(id) ON DELETE SET NULL,

      -- Identificador único
      slug VARCHAR(200) NOT NULL,

      -- Datos base (idioma por defecto: español)
      idioma VARCHAR(5) DEFAULT 'es',
      titulo VARCHAR(300) NOT NULL,
      extracto TEXT,
      contenido TEXT,

      -- Multi-idioma
      traducciones JSONB DEFAULT '{}',
      -- Ejemplo: { "en": { "titulo": "...", "extracto": "...", "contenido": "..." } }

      -- Imágenes
      imagen_principal VARCHAR(500),
      imagenes JSONB DEFAULT '[]',

      -- Autor
      autor_id UUID REFERENCES usuarios(id) ON DELETE SET NULL,
      autor_nombre VARCHAR(200),
      autor_foto VARCHAR(500),

      -- SEO
      meta_titulo VARCHAR(200),
      meta_descripcion TEXT,
      tags JSONB DEFAULT '[]',

      -- Publicación
      publicado BOOLEAN DEFAULT false,
      destacado BOOLEAN DEFAULT false,
      fecha_publicacion TIMESTAMPTZ,

      -- Estadísticas
      vistas INT DEFAULT 0,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(tenant_id, slug)
    );

    CREATE INDEX idx_articulos_tenant ON articulos(tenant_id);
    CREATE INDEX idx_articulos_categoria ON articulos(categoria_id);
    CREATE INDEX idx_articulos_publicado ON articulos(publicado, fecha_publicacion DESC);
    CREATE INDEX idx_articulos_destacado ON articulos(destacado);
  `);

  // =============================================
  // 3. TESTIMONIOS
  // =============================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS testimonios (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      categoria_id UUID REFERENCES categorias_contenido(id) ON DELETE SET NULL,

      -- Identificador
      slug VARCHAR(200) NOT NULL,

      -- Datos base
      idioma VARCHAR(5) DEFAULT 'es',

      -- Cliente
      cliente_nombre VARCHAR(200) NOT NULL,
      cliente_cargo VARCHAR(200),
      cliente_empresa VARCHAR(200),
      cliente_foto VARCHAR(500),
      cliente_ubicacion VARCHAR(200),

      -- Testimonio
      titulo VARCHAR(300),
      contenido TEXT NOT NULL,

      -- Multi-idioma
      traducciones JSONB DEFAULT '{}',
      -- { "en": { "titulo": "...", "contenido": "..." } }

      -- Valoración
      rating DECIMAL(2,1) DEFAULT 5.0,

      -- Relación con propiedad (opcional)
      propiedad_id UUID REFERENCES propiedades(id) ON DELETE SET NULL,

      -- Publicación
      publicado BOOLEAN DEFAULT true,
      destacado BOOLEAN DEFAULT false,
      fecha TIMESTAMPTZ DEFAULT NOW(),

      -- Verificación
      verificado BOOLEAN DEFAULT false,
      fuente VARCHAR(100), -- 'google', 'facebook', 'directo'

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(tenant_id, slug)
    );

    CREATE INDEX idx_testimonios_tenant ON testimonios(tenant_id);
    CREATE INDEX idx_testimonios_publicado ON testimonios(publicado, destacado);
    CREATE INDEX idx_testimonios_rating ON testimonios(rating DESC);
  `);

  // =============================================
  // 4. VIDEOS
  // =============================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS videos (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      categoria_id UUID REFERENCES categorias_contenido(id) ON DELETE SET NULL,

      -- Identificador
      slug VARCHAR(200) NOT NULL,

      -- Datos base
      idioma VARCHAR(5) DEFAULT 'es',
      titulo VARCHAR(300) NOT NULL,
      descripcion TEXT,

      -- Multi-idioma
      traducciones JSONB DEFAULT '{}',

      -- Video
      tipo_video VARCHAR(50) DEFAULT 'youtube', -- 'youtube', 'vimeo', 'mp4', 'embed'
      video_url VARCHAR(500) NOT NULL,
      video_id VARCHAR(100), -- ID de YouTube/Vimeo
      embed_code TEXT,

      -- Imágenes
      thumbnail VARCHAR(500),

      -- Duración
      duracion_segundos INT,

      -- Relaciones opcionales
      propiedad_id UUID REFERENCES propiedades(id) ON DELETE SET NULL,

      -- SEO
      tags JSONB DEFAULT '[]',

      -- Publicación
      publicado BOOLEAN DEFAULT true,
      destacado BOOLEAN DEFAULT false,
      fecha_publicacion TIMESTAMPTZ DEFAULT NOW(),

      -- Estadísticas
      vistas INT DEFAULT 0,

      -- Orden
      orden INT DEFAULT 0,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),

      UNIQUE(tenant_id, slug)
    );

    CREATE INDEX idx_videos_tenant ON videos(tenant_id);
    CREATE INDEX idx_videos_categoria ON videos(categoria_id);
    CREATE INDEX idx_videos_publicado ON videos(publicado, orden);
  `);

  // =============================================
  // 5. FAQs (Preguntas Frecuentes)
  // =============================================
  await knex.raw(`
    CREATE TABLE IF NOT EXISTS faqs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
      categoria_id UUID REFERENCES categorias_contenido(id) ON DELETE SET NULL,

      -- Datos base
      idioma VARCHAR(5) DEFAULT 'es',
      pregunta TEXT NOT NULL,
      respuesta TEXT NOT NULL,

      -- Multi-idioma
      traducciones JSONB DEFAULT '{}',
      -- { "en": { "pregunta": "...", "respuesta": "..." } }

      -- Contexto (para qué página/sección aplica)
      contexto VARCHAR(100), -- 'general', 'compra', 'venta', 'alquiler', etc.

      -- Publicación
      publicado BOOLEAN DEFAULT true,
      destacada BOOLEAN DEFAULT false,
      orden INT DEFAULT 0,

      -- Estadísticas
      vistas INT DEFAULT 0,
      util_si INT DEFAULT 0,
      util_no INT DEFAULT 0,

      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    );

    CREATE INDEX idx_faqs_tenant ON faqs(tenant_id);
    CREATE INDEX idx_faqs_categoria ON faqs(categoria_id);
    CREATE INDEX idx_faqs_contexto ON faqs(contexto);
    CREATE INDEX idx_faqs_publicado ON faqs(publicado, orden);
  `);

  console.log('✅ Tablas de contenidos creadas: categorias_contenido, articulos, testimonios, videos, faqs');
}

export async function down(knex: Knex): Promise<void> {
  await knex.raw(`
    DROP TABLE IF EXISTS faqs CASCADE;
    DROP TABLE IF EXISTS videos CASCADE;
    DROP TABLE IF EXISTS testimonios CASCADE;
    DROP TABLE IF EXISTS articulos CASCADE;
    DROP TABLE IF EXISTS categorias_contenido CASCADE;
  `);

  console.log('✅ Tablas de contenidos eliminadas');
}
