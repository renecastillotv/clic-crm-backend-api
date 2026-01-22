# Resumen: Uso de alias_rutas en Detección de Rutas

## ✅ Respuesta a tus Preguntas

### 1. ¿El detector usa alias_rutas para otros idiomas?

**SÍ**, pero ahora **está optimizado**:

- **Antes**: Buscaba en TODOS los valores de `alias_rutas` sin priorizar el idioma detectado
- **Ahora**: 
  - **PASO 1**: Primero verifica el alias del idioma detectado, luego busca en todos (fallback)
  - **PASO 0**: Ahora también verifica `alias_rutas` del idioma detectado para rutas exactas

**Ejemplo**:
```
URL: /en/articles
    ↓
extractIdioma(): { idioma: "en", cleanPath: "/articles" }
    ↓
PASO 1: Busca prefijo "articles"
  - Compara con ruta_patron "/articulos" → NO coincide
  - Compara con alias_rutas["en"] = "articles" → ✅ COINCIDE (optimizado)
```

---

### 2. ¿La tabla tiene todos los alias?

**NO completamente**. Análisis:

- ✅ **~16 páginas** tienen alias_rutas completos (directorios y páginas únicas)
- ⚠️ **~13 páginas** NO tienen alias_rutas (correcto para single/categoría, pero faltan algunos directorios)

**Faltan alias para DIRECTORIOS** (deben tener alias):
- `ubicaciones` ❌ **DEBE TENER**
- `tipos_propiedades` ❌ **DEBE TENER**
- `directorio_proyectos` ❌ **DEBE TENER**
- `videos_listado` ❌ **DEBE TENER**

**NO deben tener alias** (correcto que estén vacíos):
- `ubicaciones_single`, `tipos_propiedades_single`, `single_proyecto` (singles - buscan slug en sus tablas usando `slug_traducciones`)
- `testimonios_categoria` (categoría - busca slug en su tabla usando `slug_traducciones`)
- `favoritos`, `favoritos_token`, `propuestas_token` (páginas privadas)
- `listados_curados` (slug se busca en su tabla)

---

## 🔧 Correcciones Realizadas

### 1. ✅ Optimización en PASO 1
- Prioriza el alias del idioma detectado antes de buscar en todos
- Más eficiente y correcto semánticamente

### 2. ✅ Búsqueda de alias en PASO 0
- Ahora verifica `alias_rutas` del idioma detectado si no encuentra por `ruta_patron`
- Permite detectar rutas exactas en otros idiomas (ej: `/en/privacy-policy`)

---

## 📝 Próximos Pasos

1. ✅ **Ejecutar script SQL corregido** (`script_agregar_alias_rutas_CORREGIDO.sql`) - Solo directorios
2. ⚠️ **Implementar búsqueda en traducciones**: Los handlers deben buscar en campo `traducciones` con fallback a español
3. ✅ **Corregir landing_page**: Cambiar alias de "projects" a "landing" (incluido en script)

---

## 📊 Estado Actual del Código

| Componente | Estado | Notas |
|------------|--------|-------|
| **PASO 0 - alias_rutas** | ✅ Implementado | Verifica alias del idioma detectado |
| **PASO 1 - alias_rutas** | ✅ Optimizado | Prioriza idioma detectado |
| **Alias en BD** | ⚠️ Incompleto | 13 páginas sin alias |




