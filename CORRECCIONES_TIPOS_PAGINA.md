# Correcciones Necesarias en tipos_pagina.json

## 📋 ANÁLISIS POR TIPO DE PÁGINA

### 1. ✅ FAVORITOS - CORRECCIÓN NECESARIA

**Situación actual:**
- `favoritos` - `/favoritos` - ruta_padre: null, nivel: 1
- `favoritos_token` - `/favoritos/:token` - ruta_padre: null, nivel: 2

**Problema:** Actualmente solo acepta token y punto, sino no muestra nada

**Corrección:**
- `favoritos` - `/favoritos` - Debe mostrar selección actual del usuario
- `favoritos_token` - `/favoritos/:token` - Usuario ve selección compartida de otro usuario
- `favoritos_token` debe tener `ruta_padre: "favoritos"` y `nivel: 1`

---

### 2. ✅ PROPUESTAS - CORRECCIÓN NECESARIA

**Situación actual:**
- `propuestas` - `/propuestas` - ruta_padre: null, nivel: 1
- `propuestas_token` - `/propuestas/:token` - ruta_padre: null, nivel: 2

**Problema:** `/propuestas` sola existe pero no debería o debería redirigir

**Corrección:**
- Eliminar `propuestas` (directorio no necesario)
- `propuestas_token` - `/propuestas/:token` - URL pública para ver propiedades del asesor
- `propuestas_token` debe tener `ruta_padre: null`, `nivel: 1` (es ruta directa, no necesita directorio)

---

### 3. ✅ UBICACIONES - FALTA SINGLE

**Situación actual:**
- `ubicaciones` - `/ubicaciones` - ruta_padre: null, nivel: 1

**Problema:** Falta single para `/ubicaciones/nombre-ubicacion`

**Corrección:**
- `ubicaciones` - `/ubicaciones` - Directorio (mantener, pero cambiar nivel a 0)
- **CREAR:** `ubicaciones_single` - `/ubicaciones/:slug` - ruta_padre: "ubicaciones", nivel: 1

---

### 4. ✅ TIPOS DE PROPIEDADES - FALTA SINGLE

**Situación actual:**
- `tipos_propiedades` - `/tipos-de-propiedades` - ruta_padre: null, nivel: 1

**Problema:** Falta single para `/tipos-de-propiedades/nombre-tipo`

**Corrección:**
- `tipos_propiedades` - `/tipos-de-propiedades` - Directorio (mantener, pero cambiar nivel a 0)
- **CREAR:** `tipos_propiedades_single` - `/tipos-de-propiedades/:slug` - ruta_padre: "tipos_propiedades", nivel: 1

---

### 5. ✅ PROYECTOS - CORRECCIÓN DE PARENT

**Situación actual:**
- `directorio_proyectos` - `/proyectos` - ruta_padre: null, nivel: 0 ✅
- `single_proyecto` - `/proyectos/:slug` - ruta_padre: null, nivel: 1 ❌

**Problema:** `single_proyecto` no tiene parent cuando debería ser hijo de `directorio_proyectos`

**Corrección:**
- `directorio_proyectos` - `/proyectos` - Directorio (correcto)
- `single_proyecto` - `/proyectos/:slug` - Cambiar `ruta_padre: "directorio_proyectos"`, mantener nivel: 1

---

### 6. ✅ PROPIEDADES - CORRECTO (solo verificar)

**Situación actual:**
- `propiedades_listado` - `/propiedades` - ruta_padre: null, nivel: 0 ✅
- `propiedades_single` - `/propiedades/:slug` - ruta_padre: "propiedades_listado", nivel: 1 ✅

**Estado:** Correcto, ambos están en el resolver como comodín

---

### 7. ❌ LANDINGS - ELIMINAR INCONSISTENCIAS

**Situación actual:**
- `landing_page` - `/landing/:slug` - ruta_padre: null, nivel: 0 ✅
- `landing_proyecto` - `/landing/proyecto/:slug` - ruta_padre: "landing_page", nivel: 0 ❌
- `landing_subpagina` - `/landing/:parent/:slug` - ruta_padre: "landing_proyecto", nivel: 0 ❌

**Problema:** Solo debe existir `/landing/:slug` (ej: `/landing/feria-de-apartamentos`)

**Corrección:**
- Mantener: `landing_page` - `/landing/:slug` ✅
- **ELIMINAR:** `landing_proyecto` ❌
- **ELIMINAR:** `landing_subpagina` ❌

---

### 8. ✅ TESTIMONIOS_CATEGORIA - CORRECCIÓN DE PARENT

**Situación actual:**
- `testimonios` - `/testimonios` - ruta_padre: null, nivel: 0 ✅
- `testimonios_categoria` - `/testimonios/categoria/:slug` - ruta_padre: null, nivel: 1 ❌
- `testimonio_single` - `/testimonios/:slug` - ruta_padre: "testimonios", nivel: 2 ✅

**Problema:** `testimonios_categoria` no tiene parent cuando debería ser hijo de `testimonios`

**Corrección:**
- `testimonios_categoria` - Cambiar `ruta_padre: "testimonios"`, mantener nivel: 1

---

## 📝 RESUMEN DE ACCIONES

### CREAR (2 nuevas páginas):
1. `ubicaciones_single` - `/ubicaciones/:slug` - parent: "ubicaciones"
2. `tipos_propiedades_single` - `/tipos-de-propiedades/:slug` - parent: "tipos_propiedades"

### ELIMINAR (3 páginas):
1. `propuestas` - `/propuestas` (directorio no necesario)
2. `landing_proyecto` - `/landing/proyecto/:slug`
3. `landing_subpagina` - `/landing/:parent/:slug`

### CORREGIR (5 páginas):
1. `favoritos_token` - Agregar `ruta_padre: "favoritos"`, cambiar nivel: 1
2. `propuestas_token` - Cambiar nivel: 1 (mantener ruta_padre: null)
3. `ubicaciones` - Cambiar nivel: 0 (de 1 a 0)
4. `tipos_propiedades` - Cambiar nivel: 0 (de 1 a 0)
5. `single_proyecto` - Agregar `ruta_padre: "directorio_proyectos"`
6. `testimonios_categoria` - Agregar `ruta_padre: "testimonios"`

---

## ✅ PÁGINAS QUE ESTÁN CORRECTAS (no tocar):
- homepage
- politicas_privacidad
- terminos_condiciones
- contacto
- articulos_listado
- articulos_categoria
- articulos_single
- videos_listado
- videos_categoria
- videos_single
- testimonios
- testimonio_single
- listado_asesores
- asesor_single
- propiedades_listado
- propiedades_single
- listados_curados
- custom




