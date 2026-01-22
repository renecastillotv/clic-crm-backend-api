# Resumen de Relaciones de Base de Datos

## Relaciones importantes para los Utils

### Testimonios
- `testimonios.asesor_id` → `usuarios.id` (FK)
- `testimonios.propiedad_id` → `propiedades.id` (FK)
- `testimonios.categoria_id` → `categorias_contenido.id` (FK)
- `testimonios.contacto_id` → `contactos.id` (FK)

**IMPORTANTE**: Para buscar testimonios de un `perfiles_asesor.id`:
1. Obtener `usuario_id` desde `perfiles_asesor` donde `id = perfil_asesor_id`
2. Buscar testimonios donde `asesor_id = usuario_id`

### Artículos
- `articulos.autor_id` → `usuarios.id` (FK)
- `articulos.categoria_id` → `categorias_contenido.id` (FK)

**IMPORTANTE**: Para buscar artículos de un `perfiles_asesor.id`:
1. Obtener `usuario_id` desde `perfiles_asesor` donde `id = perfil_asesor_id`
2. Buscar artículos donde `autor_id = usuario_id`

### Videos
- `videos.categoria_id` → `categorias_contenido.id` (FK)
- `videos.propiedad_id` → `propiedades.id` (FK)
- **NO tiene `autor_id` o `created_by`** - Necesita agregarse

### Propiedades
- `propiedades.captador_id` → `perfiles_asesor.id` (FK) - Asumo
- `propiedades.perfil_asesor_id` → `perfiles_asesor.id` (FK) - Asumo
- `propiedades.agente_id` → `perfiles_asesor.id` (FK) - Asumo

### Perfiles Asesor
- `perfiles_asesor.usuario_id` → `usuarios.id` (FK)
- `perfiles_asesor.equipo_id` → `equipos.id` (FK)

### Categorías
- `categorias_contenido.tenant_id` → `tenants.id` (FK)
- `categorias_contenido.tipo` puede ser: 'articulo', 'video', 'testimonio', 'faq', 'seo_stat'

### FAQs
- `faqs.categoria_id` → `categorias_contenido.id` (FK)
- No tiene autor directo

### SEO Stats
- `seo_stats.categoria_id` → `categorias_contenido.id` (FK)
- `seo_stats.tipo_asociacion` + `asociacion_id` para asociar con otros tipos
- No tiene autor directo




