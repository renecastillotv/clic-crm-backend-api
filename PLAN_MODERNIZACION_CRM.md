# Plan de Modernización del CRM - Sistema Profesional

## Objetivo
Transformar el CRM en un sistema moderno, guiado y profesional, similar a los CMS líderes del mercado.

## Fase 1: Interfaz de Gestión de Páginas Moderna ✅ EN PROGRESO

### 1.1 Listado de Páginas Estilo Tabla Profesional
- [x] Tabla con columnas: Checkbox, Nombre, Estado, Última Modificación, Acciones
- [ ] Tabs de filtrado: Todas, Publicadas, Borradores
- [ ] Barra de búsqueda funcional
- [ ] Acciones por página: Editar, Ver, Duplicar, Eliminar
- [ ] Badge de estado (Publicada/Inactiva)
- [ ] Indicador de Homepage (estrella)
- [ ] Fecha de última modificación formateada

### 1.2 Modal/Página de Configuración Completa de Página
- [ ] Campos: Nombre, Título, Subtítulo, Descripción, Slug
- [ ] Generador automático de slug desde título
- [ ] Campo de Palabras Claves (keywords separadas por coma)
- [ ] Selector de tipo de página (en blanco, filtro propiedades, normal)
- [ ] Campo de código de cabecera (head code)
- [ ] Campos meta (meta title, meta description)
- [ ] Botones: Guardar, Guardar como borrador, Abrir Editor

### 1.3 Sistema de Plantillas de Páginas
- [ ] Catálogo de páginas disponibles para agregar
- [ ] Vista previa de cada plantilla
- [ ] Descripción de cada tipo de página
- [ ] Páginas base preconfiguradas al activar tenant

## Fase 2: Configuración Centralizada de Componentes

### 2.1 Página de Configuración de Componentes
- [ ] Listado de todos los componentes disponibles
- [ ] Selector de variantes por componente
- [ ] Vista previa de variantes
- [ ] Configuración global de componentes (Header, Footer)
- [ ] Activación/desactivación de componentes

### 2.2 Gestión de Variantes
- [ ] Visualización de todas las variantes disponibles
- [ ] Previsualización de variantes
- [ ] Aplicación de variantes a páginas específicas

## Fase 3: Sistema de Rutas SEO-Friendly

### 3.1 Rutas Predefinidas
- [ ] `/` - Homepage
- [ ] `/propiedades` - Listado de propiedades
- [ ] `/propiedades/[slug]` - Propiedad individual
- [ ] `/blog` - Listado de blog
- [ ] `/blog/[slug]` - Artículo individual
- [ ] `/asesores` - Directorio de asesores
- [ ] `/asesores/[slug]` - Perfil de asesor
- [ ] `/testimonios` - Listado de testimonios
- [ ] `/testimonios/[slug]` - Testimonio individual
- [ ] `/pagina/[slug]` - Páginas custom

### 3.2 Rutas SEO Avanzadas para Propiedades
- [ ] `/comprar/[tipo]/[ubicacion]/[sector]/[slug]`
- [ ] Ejemplo: `/comprar/apartamento/distrito-nacional/naco/a-estrenar-en-naco-apartamento-nuevo`
- [ ] Resolver inteligente que maneja múltiples niveles
- [ ] Configuración de estructura de URL por tenant

### 3.3 Resolver Mejorado
- [ ] Detección inteligente de tipo de página por URL
- [ ] Soporte para múltiples niveles de profundidad
- [ ] Manejo de categorías y taxonomías
- [ ] Redirecciones y aliases

## Fase 4: Páginas Base Preconfiguradas

### 4.1 Al Activar Tenant
- [ ] Homepage preconfigurada con componentes base
- [ ] Página de propiedades con filtros
- [ ] Página de contacto
- [ ] Páginas legales (privacidad, términos)

### 4.2 Plantillas por Tipo de Inmobiliaria
- [ ] Plantillas específicas por nicho
- [ ] Componentes preconfigurados según plantilla
- [ ] Contenido de ejemplo

## Fase 5: Paquetes y Extensiones

### 5.1 Sistema de Paquetes
- [ ] Paquete básico: Blog simple
- [ ] Paquete avanzado: Blog con categorías (`/articulos/categoria/single`)
- [ ] Paquetes personalizables por necesidad

### 5.2 Niveles de SEO
- [ ] Configuración de estructura de URL por nivel
- [ ] URLs friendly configurable
- [ ] Meta tags dinámicos

## Implementación Inmediata (Prioridad Alta)

1. **Interfaz de tabla profesional para páginas** - Similar a las imágenes compartidas
2. **Modal completo de configuración de página** - Con todos los campos necesarios
3. **Sistema de plantillas visual** - Para seleccionar páginas a agregar
4. **Mejora del resolver** - Para rutas SEO-friendly básicas

## Tecnologías y Herramientas

- React para el CRM frontend
- Astro para el frontend público
- Express/Node.js para la API
- PostgreSQL para la base de datos
- Sistema de resolver centralizado para rutas inteligentes


