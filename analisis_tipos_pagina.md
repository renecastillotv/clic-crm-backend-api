# Análisis de tipos_pagina.json

## 📋 PÁGINAS CON PARENT (ruta_padre != null) - 9 páginas

1. **testimonio_single**
   - Parent: `testimonios`
   - Ruta: `/testimonios/:slug`
   - Nivel: 2

2. **articulos_single**
   - Parent: `articulos_categoria`
   - Ruta: `/articulos/:slug`
   - Nivel: 2

3. **videos_categoria**
   - Parent: `videos_listado`
   - Ruta: `/videos/categoria/:slug`
   - Nivel: 1

4. **landing_subpagina**
   - Parent: `landing_proyecto`
   - Ruta: `/landing/:parent/:slug`
   - Nivel: 0

5. **videos_single**
   - Parent: `videos_categoria`
   - Ruta: `/videos/:slug`
   - Nivel: 2

6. **propiedades_single**
   - Parent: `propiedades_listado`
   - Ruta: `/propiedades/:slug`
   - Nivel: 1

7. **asesor_single**
   - Parent: `listado_asesores`
   - Ruta: `/asesores/:slug`
   - Nivel: 1

8. **articulos_categoria**
   - Parent: `articulos_listado`
   - Ruta: `/articulos/categoria/:slug`
   - Nivel: 1

9. **landing_proyecto**
   - Parent: `landing_page`
   - Ruta: `/landing/proyecto/:slug`
   - Nivel: 0

---

## 🌳 PÁGINAS QUE SON PARENT (tienen hijos) - 7 páginas

1. **testimonios** 
   - Hijos: `testimonio_single`

2. **articulos_listado**
   - Hijos: `articulos_categoria` → `articulos_single`

3. **videos_listado**
   - Hijos: `videos_categoria` → `videos_single`

4. **propiedades_listado**
   - Hijos: `propiedades_single`

5. **listado_asesores**
   - Hijos: `asesor_single`

6. **landing_page**
   - Hijos: `landing_proyecto` → `landing_subpagina`

7. **articulos_categoria**
   - Hijos: `articulos_single`

---

## 🚫 PÁGINAS SIN PARENT Y SIN HIJOS (ruta_padre == null y nadie las referencia) - 17 páginas

1. **politicas_privacidad** - `/politicas-privacidad`
2. **single_proyecto** - `/proyectos/:slug`
3. **homepage** - `/`
4. **propuestas_token** - `/propuestas/:token`
5. **contacto** - `/contacto`
6. **terminos_condiciones** - `/terminos-condiciones`
7. **listados_curados** - `/listados-de-propiedades/:slug`
8. **ubicaciones** - `/ubicaciones`
9. **landing_page** - `/landing/:slug` ⚠️ (ES PARENT de landing_proyecto)
10. **tipos_propiedades** - `/tipos-de-propiedades`
11. **directorio_proyectos** - `/proyectos`
12. **testimonios_categoria** - `/testimonios/categoria/:slug` ⚠️ (ruta_padre null pero debería tener parent)
13. **favoritos** - `/favoritos`
14. **propuestas** - `/propuestas`
15. **custom** - (sin ruta)
16. **videos_categoria** - ⚠️ (Tiene parent: videos_listado)
17. **articulos_categoria** - ⚠️ (Tiene parent: articulos_listado)

---

## ⚠️ INCONSISTENCIAS DETECTADAS

1. **testimonios_categoria** - Tiene `ruta_padre: null` pero debería tener `testimonios` como parent (similar a articulos_categoria y videos_categoria)

2. **videos_categoria** y **articulos_categoria** aparecen en ambas listas porque tienen parent pero el script no las filtró correctamente de la lista "sin parent"

3. **landing_page** aparece en "sin parent" pero ES parent de landing_proyecto

---

## 📊 RESUMEN POR CATEGORÍA

### Páginas independientes (sin parent, sin hijos):
- politicas_privacidad
- single_proyecto
- homepage
- propuestas_token
- contacto
- terminos_condiciones
- listados_curados
- ubicaciones
- tipos_propiedades
- directorio_proyectos
- favoritos
- propuestas
- custom

### Jerarquías completas:
- **Testimonios**: testimonios → testimonio_single
- **Artículos**: articulos_listado → articulos_categoria → articulos_single
- **Videos**: videos_listado → videos_categoria → videos_single
- **Propiedades**: propiedades_listado → propiedades_single
- **Asesores**: listado_asesores → asesor_single
- **Landing**: landing_page → landing_proyecto → landing_subpagina




