# 📋 Tipos de Datos Dinámicos Soportados

Este documento lista todos los tipos de datos dinámicos que el resolver universal puede resolver usando datos mock del seed.

## 🎯 Cómo Usar

Los componentes pueden configurar `dynamic_data.dataType` con cualquiera de estos tipos. El resolver universal automáticamente:
1. Consulta las tablas mock correspondientes
2. Resuelve los datos
3. Los agrega en `dynamic_data.resolved`

## 📊 Tipos Disponibles

### 📝 Listas (Retornan Arrays)

| Tipo | Alias | Tabla Mock | Descripción |
|------|-------|------------|-------------|
| `properties` | - | `propiedades` (real) o mock | Lista de propiedades inmobiliarias |
| `videos` | - | `mock_videos` | Lista de videos |
| `articles` | `articulos` | `mock_articulos` | Lista de artículos del blog |
| `testimonials` | - | `mock_testimonios` | Lista de testimonios |
| `faqs` | - | `mock_faqs` | Lista de preguntas frecuentes |
| `agents` | `asesores` | `mock_asesores` | Lista de asesores/agentes |
| `ubicaciones` | `locations`, `popular_locations` | `mock_carruseles_propiedades` | Ubicaciones populares |

**Ejemplo:**
```json
{
  "dynamic_data": {
    "dataType": "testimonials",
    "pagination": { "page": 1, "limit": 10 }
  }
}
```

### 🔍 Singles (Retornan un Objeto - Requieren `id`)

| Tipo | Alias | Tabla Mock | Requiere |
|------|-------|------------|----------|
| `property_single` | - | `propiedades` (real) | `filters.id` o `queryParams.id` |
| `video_single` | - | `mock_videos` | `filters.id` o `queryParams.id` |
| `article_single` | `articulo_single` | `mock_articulos` | `filters.id` o `queryParams.id` |
| `testimonial_single` | `testimonio_single` | `mock_testimonios` | `filters.id` o `queryParams.id` |
| `faq_single` | - | `mock_faqs` | `filters.id` o `queryParams.id` |
| `agent_single` | `asesor_single` | `mock_asesores` | `filters.id` o `queryParams.id` |

**Ejemplo:**
```json
{
  "dynamic_data": {
    "dataType": "video_single",
    "filters": { "id": "uuid-del-video" }
  }
}
```

### 📂 Categorías (Retornan Arrays)

| Tipo | Tabla Mock | Descripción |
|------|------------|-------------|
| `categorias_videos` | `mock_categorias_contenido` | Categorías de videos |
| `categorias_articulos` | `mock_categorias_contenido` | Categorías de artículos |
| `categorias_testimonios` | `mock_categorias_contenido` | Categorías de testimonios |

**Ejemplo:**
```json
{
  "dynamic_data": {
    "dataType": "categorias_videos"
  }
}
```

### 📊 Otros Tipos

| Tipo | Alias | Tabla Mock | Descripción |
|------|-------|------------|-------------|
| `stats` | `estadisticas` | `mock_stats` | Estadísticas del tenant (retorna objeto) |
| `carrusel_propiedades` | `carrusel` | `mock_carruseles_propiedades` | Carruseles temáticos de propiedades |
| `texto_suelto` | `texto` | `mock_textos_sueltos` | Bloques de texto/HTML (requiere `filters.clave`) |

**Ejemplo Stats:**
```json
{
  "dynamic_data": {
    "dataType": "stats"
  }
}
```

**Ejemplo Texto Suelto:**
```json
{
  "dynamic_data": {
    "dataType": "texto_suelto",
    "filters": { "clave": "hero_principal" }
  }
}
```

## 🔄 Flujo de Resolución

```
Componente con dynamic_data
    ↓
paginasService.getPaginaCompleta()
    ↓
dynamicDataResolver.resolveDynamicData()
    ↓
dynamicDataService.resolveDynamicDataType()
    ↓
Consulta tabla mock correspondiente
    ↓
Retorna datos en dynamic_data.resolved
    ↓
Componente renderiza con datos
```

## 📦 Datos del Seed

El seed `001_seed_mock_dynamic_data.ts` popula:
- ✅ 1 registro de `stats`
- ✅ 6 categorías de videos
- ✅ 6 categorías de artículos
- ✅ 6 categorías de testimonios
- ✅ 8 videos
- ✅ 8 artículos
- ✅ 8 testimonios
- ✅ 8 FAQs
- ✅ 8 asesores
- ✅ 6 carruseles de propiedades
- ✅ 6 textos sueltos

## 🚀 Migración a Datos Reales

Cuando haya datos reales, solo se actualiza `dynamicDataService.ts`:
- Cambiar consultas de tablas mock a tablas reales
- Mantener la misma interfaz de retorno
- Los componentes NO necesitan cambios

## 📝 Notas

- Los tipos "single" retornan un objeto envuelto en array: `[objeto]` o `[]` si no existe
- Los tipos de lista retornan arrays: `[item1, item2, ...]` o `[]` si no hay datos
- `stats` retorna un objeto envuelto en array: `[{...}]`
- Todos los tipos soportan `pagination` (excepto singles y stats)
- Todos los tipos soportan `filters` para filtrado adicional

















