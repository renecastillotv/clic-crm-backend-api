# 📋 Instrucciones: Registrar PropertyCarouselClic y TestimonialsClic en Homepage

**Fecha:** 2025-01-XX  
**Objetivo:** Registrar los componentes refactorizados en la base de datos y asignarlos a la homepage

---

## ✅ Componentes Refactorizados

Los siguientes componentes han sido refactorizados para eliminar colores hardcodeados y están listos para uso multi-tenant:

1. ✅ **PropertyCarouselClic** - Carrusel de propiedades destacadas
2. ✅ **TestimonialsClic** - Testimonios de clientes

Ambos componentes ya están:
- ✅ Registrados en `ComponentRenderer.astro`
- ✅ Refactorizados con colores configurables
- ⚠️ **PENDIENTE:** Registro en base de datos

---

## 🗄️ Pasos para Registrar en Base de Datos

### Opción 1: Ejecutar Script SQL Completo (Recomendado)

1. **Conectar a la base de datos** (Neon PostgreSQL)

2. **Ejecutar el script:**
   ```bash
   # El script está en:
   scripts/registrar_componentes_homepage.sql
   ```

3. **El script automáticamente:**
   - ✅ Verifica si los componentes existen en `catalogo_componentes`
   - ✅ Los crea si no existen
   - ✅ Los registra en `componentes_web` para la homepage
   - ✅ Asigna el orden correcto (PropertyCarousel: 3, Testimonials: 5)

### Opción 2: Ejecutar Manualmente

Si prefieres ejecutar paso a paso, sigue las instrucciones en el script SQL.

---

## 📊 Orden de Componentes en Homepage

Según la propuesta, el orden debería ser:

| Orden | Componente | componente_key |
|-------|-----------|----------------|
| -1 | Header | `header-clic` |
| 0 | Hero | `hero-clic` |
| 1 | Search Bar | `search-bar-clic` (pendiente) |
| 2 | Popular Locations | `popular-locations-clic` |
| **3** | **Property Carousel** | **`property-carousel-clic`** ⬅️ NUEVO |
| 4 | Founder Story | `founder-story-clic` |
| **5** | **Testimonials** | **`testimonials-clic`** ⬅️ NUEVO |
| 6 | Homepage CTA | `homepage-cta-clic` |
| 999 | Footer | `footer-clic` |

---

## 🔍 Verificar Registro

Después de ejecutar el script, verifica con esta consulta:

```sql
SELECT 
  cw.orden,
  cw.nombre,
  cc.componente_key,
  cw.activo
FROM componentes_web cw
JOIN catalogo_componentes cc ON cc.id = cw.componente_catalogo_id
JOIN tipos_pagina tp ON tp.id = cw.tipo_pagina_id
JOIN tenants t ON t.id = cw.tenant_id
WHERE t.slug = 'clic'
  AND tp.codigo = 'homepage'
  AND cw.activo = true
ORDER BY cw.orden ASC;
```

Deberías ver:
- ✅ `property-carousel-clic` en orden 3
- ✅ `testimonials-clic` en orden 5

---

## 🎨 Configuración de Datos por Defecto

### PropertyCarouselClic

```json
{
  "static_data": {
    "titulo": "Propiedades Destacadas",
    "viewAllLink": "/propiedades",
    "language": "es"
  },
  "dynamic_data": {
    "dataType": "properties",
    "limit": 10
  },
  "styles": {
    "colorPrimario": "#f04e00"
  }
}
```

### TestimonialsClic

```json
{
  "static_data": {
    "titulo": "Lo que dicen nuestros clientes",
    "subtitulo": "Experiencias reales de personas que han confiado en nosotros",
    "showTitle": true,
    "layout": "minimal",
    "maxItems": 4,
    "language": "es"
  },
  "dynamic_data": {
    "dataType": "testimonials",
    "limit": 6
  },
  "styles": {
    "colorPrimario": "#f04e00"
  }
}
```

---

## ⚠️ Notas Importantes

1. **El script es idempotente**: Puedes ejecutarlo múltiples veces sin problemas. Solo crea los componentes si no existen.

2. **Verificar tenant_id**: El script busca el tenant con `slug = 'clic'`. Si tu tenant tiene otro slug, modifica el script.

3. **Orden de componentes**: Si necesitas ajustar el orden después, usa:
   ```sql
   UPDATE componentes_web 
   SET orden = [NUEVO_ORDEN]
   WHERE id = [ID_DEL_COMPONENTE];
   ```

4. **Datos dinámicos**: Los componentes esperan que la API resuelva los datos dinámicos (`properties` y `testimonials`). Asegúrate de que la API esté configurada correctamente.

---

## ✅ Checklist Final

- [ ] Script SQL ejecutado exitosamente
- [ ] Componentes verificados en `catalogo_componentes`
- [ ] Componentes verificados en `componentes_web` para homepage
- [ ] Orden de componentes correcto
- [ ] Componentes visibles en la homepage
- [ ] Datos dinámicos cargando correctamente
- [ ] Colores personalizables funcionando

---

## 🐛 Troubleshooting

### Los componentes no aparecen en la homepage

1. **Verificar que estén activos:**
   ```sql
   SELECT activo FROM componentes_web 
   WHERE componente_catalogo_id IN (
     SELECT id FROM catalogo_componentes 
     WHERE componente_key IN ('property-carousel-clic', 'testimonials-clic')
   );
   ```

2. **Verificar que tengan datos dinámicos:**
   - PropertyCarousel necesita propiedades en la base de datos
   - Testimonials necesita testimonios en la base de datos

3. **Verificar logs del servidor:**
   - Los componentes tienen logs de depuración que muestran qué datos reciben

### Los componentes aparecen pero sin datos

- Verifica que la API esté resolviendo correctamente los `dynamic_data`
- Revisa los logs del componente en la consola del navegador

---

**¿Listo para ejecutar?** Ejecuta el script SQL y verifica los resultados. 🚀








