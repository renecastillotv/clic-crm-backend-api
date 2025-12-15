import { Knex } from 'knex';

/**
 * Migración - Agregar más variantes de Header y Footer
 *
 * Expande las variantes disponibles para una mayor personalización
 */
export async function up(knex: Knex): Promise<void> {
  // Actualizar variantes de header (10+ variantes)
  await knex('catalogo_componentes')
    .where('tipo', 'header')
    .update({
      variantes: JSON.stringify([
        'default',          // Logo izq, nav centro, CTA der
        'minimal',          // Solo logo y hamburguesa
        'centered',         // Logo centrado, nav debajo
        'transparent',      // Transparente sobre contenido
        'sticky',           // Se fija al hacer scroll
        'mega-menu',        // Menús desplegables grandes
        'split-nav',        // Nav dividida a los lados del logo
        'top-bar',          // Con barra superior de contacto
        'modern',           // Diseño moderno con gradientes
        'classic',          // Diseño clásico empresarial
        'dark',             // Header oscuro
        'sidebar-toggle',   // Con toggle para sidebar
      ]),
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image' },
        { key: 'logoAlt', label: 'Texto alternativo del logo', type: 'text' },
        { key: 'links', label: 'Enlaces de navegación', type: 'array' },
        { key: 'mostrarBotonContacto', label: 'Mostrar botón contacto', type: 'boolean', default: true },
        { key: 'textoBotonContacto', label: 'Texto del botón', type: 'text', default: 'Contactar' },
        { key: 'urlBotonContacto', label: 'URL del botón', type: 'text', default: '/contacto' },
        { key: 'mostrarTelefono', label: 'Mostrar teléfono', type: 'boolean', default: false },
        { key: 'telefono', label: 'Número de teléfono', type: 'text' },
        { key: 'mostrarRedesSociales', label: 'Mostrar redes sociales', type: 'boolean', default: false },
        { key: 'colorFondo', label: 'Color de fondo', type: 'color' },
        { key: 'colorTexto', label: 'Color del texto', type: 'color' },
        { key: 'esTransparente', label: 'Fondo transparente', type: 'boolean', default: false },
        { key: 'esFijo', label: 'Header fijo (sticky)', type: 'boolean', default: false },
      ]),
    });

  // Actualizar variantes de footer (más opciones)
  await knex('catalogo_componentes')
    .where('tipo', 'footer')
    .update({
      variantes: JSON.stringify([
        'default',          // Footer completo con columnas
        'simple',           // Una línea con copyright
        'extended',         // Footer extenso con newsletter
        'minimal',          // Solo copyright y redes
        'dark',             // Footer oscuro
        'centered',         // Contenido centrado
        'modern',           // Diseño moderno
        'mega-footer',      // Footer muy extenso
      ]),
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image' },
        { key: 'descripcion', label: 'Descripción de la empresa', type: 'textarea' },
        { key: 'copyright', label: 'Texto copyright', type: 'text' },
        { key: 'columnas', label: 'Columnas de enlaces', type: 'array' },
        { key: 'redesSociales', label: 'Redes sociales', type: 'array' },
        { key: 'mostrarNewsletter', label: 'Mostrar newsletter', type: 'boolean', default: false },
        { key: 'tituloNewsletter', label: 'Título newsletter', type: 'text', default: 'Suscríbete' },
        { key: 'direccion', label: 'Dirección', type: 'text' },
        { key: 'telefono', label: 'Teléfono', type: 'text' },
        { key: 'email', label: 'Email', type: 'email' },
        { key: 'colorFondo', label: 'Color de fondo', type: 'color' },
        { key: 'colorTexto', label: 'Color del texto', type: 'color' },
      ]),
    });

  // Actualizar variantes de hero (más opciones)
  await knex('catalogo_componentes')
    .where('tipo', 'hero')
    .update({
      variantes: JSON.stringify([
        'default',          // Imagen fondo, texto centrado
        'variant1',         // Imagen a la derecha
        'variant2',         // Con búsqueda integrada
        'variant3',         // Texto a la izquierda
        'video',            // Video de fondo
        'slider',           // Carrusel de imágenes
        'split-screen',     // Pantalla dividida
        'parallax',         // Efecto parallax
        'minimal',          // Minimalista
        'gradient',         // Con gradiente
        'animated',         // Con animaciones
        'fullscreen',       // Pantalla completa
      ]),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text' },
        { key: 'descripcion', label: 'Descripción', type: 'textarea' },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text' },
        { key: 'urlBoton', label: 'URL del botón', type: 'text' },
        { key: 'textoBoton2', label: 'Texto botón secundario', type: 'text' },
        { key: 'urlBoton2', label: 'URL botón secundario', type: 'text' },
        { key: 'imagenFondo', label: 'Imagen de fondo', type: 'image' },
        { key: 'videoFondo', label: 'URL del video', type: 'text' },
        { key: 'alturaCompleta', label: 'Altura completa', type: 'boolean', default: true },
        { key: 'mostrarBusqueda', label: 'Mostrar búsqueda', type: 'boolean', default: false },
        { key: 'alineacion', label: 'Alineación del texto', type: 'text', default: 'center' },
        { key: 'overlay', label: 'Oscurecer imagen', type: 'boolean', default: true },
        { key: 'colorOverlay', label: 'Color del overlay', type: 'color' },
      ]),
    });

  // Actualizar variantes de property_card (más opciones)
  await knex('catalogo_componentes')
    .where('tipo', 'property_card')
    .update({
      variantes: JSON.stringify([
        'default',          // Tarjeta vertical
        'compact',          // Tarjeta compacta
        'featured',         // Tarjeta destacada
        'horizontal',       // Tarjeta horizontal
        'minimal',          // Minimalista
        'overlay',          // Info sobre imagen
        'detailed',         // Con más información
        'premium',          // Diseño premium
        'modern',           // Diseño moderno
        'classic',          // Diseño clásico
      ]),
      campos_config: JSON.stringify([
        { key: 'mostrarPrecio', label: 'Mostrar precio', type: 'boolean', default: true },
        { key: 'mostrarUbicacion', label: 'Mostrar ubicación', type: 'boolean', default: true },
        { key: 'mostrarCaracteristicas', label: 'Mostrar características', type: 'boolean', default: true },
        { key: 'mostrarAgente', label: 'Mostrar agente', type: 'boolean', default: false },
        { key: 'mostrarBadge', label: 'Mostrar badge (nuevo, destacado)', type: 'boolean', default: true },
        { key: 'mostrarFavoritos', label: 'Botón favoritos', type: 'boolean', default: true },
        { key: 'mostrarComparar', label: 'Botón comparar', type: 'boolean', default: false },
        { key: 'aspectRatioImagen', label: 'Ratio de imagen', type: 'text', default: '4:3' },
        { key: 'hoverEffect', label: 'Efecto hover', type: 'text', default: 'zoom' },
      ]),
    });
}

export async function down(knex: Knex): Promise<void> {
  // Restaurar variantes originales de header
  await knex('catalogo_componentes')
    .where('tipo', 'header')
    .update({
      variantes: JSON.stringify(['default', 'minimal', 'centered', 'transparent']),
      campos_config: JSON.stringify([
        { key: 'logo', label: 'Logo URL', type: 'image' },
        { key: 'links', label: 'Enlaces', type: 'array' },
        { key: 'mostrarBotonContacto', label: 'Mostrar botón contacto', type: 'boolean', default: true },
      ]),
    });

  // Restaurar variantes originales de footer
  await knex('catalogo_componentes')
    .where('tipo', 'footer')
    .update({
      variantes: JSON.stringify(['default', 'simple', 'extended', 'minimal']),
      campos_config: JSON.stringify([
        { key: 'copyright', label: 'Texto copyright', type: 'text' },
        { key: 'redesSociales', label: 'Redes sociales', type: 'array' },
        { key: 'columnas', label: 'Columnas de enlaces', type: 'array' },
      ]),
    });

  // Restaurar variantes originales de hero
  await knex('catalogo_componentes')
    .where('tipo', 'hero')
    .update({
      variantes: JSON.stringify(['default', 'variant1', 'variant2', 'variant3', 'video', 'slider']),
      campos_config: JSON.stringify([
        { key: 'titulo', label: 'Título', type: 'text' },
        { key: 'subtitulo', label: 'Subtítulo', type: 'text' },
        { key: 'textoBoton', label: 'Texto del botón', type: 'text' },
        { key: 'urlBoton', label: 'URL del botón', type: 'text' },
        { key: 'imagenFondo', label: 'Imagen de fondo', type: 'image' },
      ]),
    });

  // Restaurar variantes originales de property_card
  await knex('catalogo_componentes')
    .where('tipo', 'property_card')
    .update({
      variantes: JSON.stringify(['default', 'compact', 'featured', 'horizontal', 'minimal']),
      campos_config: JSON.stringify([
        { key: 'mostrarPrecio', label: 'Mostrar precio', type: 'boolean', default: true },
        { key: 'mostrarUbicacion', label: 'Mostrar ubicación', type: 'boolean', default: true },
        { key: 'mostrarCaracteristicas', label: 'Mostrar características', type: 'boolean', default: true },
      ]),
    });
}
