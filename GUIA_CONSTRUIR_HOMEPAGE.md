# 📘 Guía: Cómo Construir una Homepage Paso a Paso

**Fecha:** 2025-11-27  
**Objetivo:** Crear una homepage completa con componentes usando el esquema estructurado

---

## 🎯 Prerequisitos

✅ Servidores corriendo:
- API: `http://localhost:3001` ✅
- Web: `http://localhost:4321` ✅  
- CRM: `http://localhost:3000` ✅

---

## 📋 Paso 1: Obtener el Tenant ID

Primero necesitas el ID del tenant. Hay dos formas:

### Opción A: Desde la API
```bash
curl http://localhost:3001/api/tenants/first
```

Respuesta:
```json
{
  "id": "9763dd67-1b33-40b1-ae78-73e5bcafc2b7",
  "nombre": "Inmobiliaria Demo",
  "slug": "demo"
}
```

**Guarda este `id` para los siguientes pasos.**

### Opción B: Desde el CRM
1. Abre `http://localhost:3000`
2. Inicia sesión
3. El tenant ID se muestra en la URL o en el dashboard

---

## 📋 Paso 2: Verificar/Crear la Página Homepage

### Verificar si existe:
```bash
curl http://localhost:3001/api/tenants/{TENANT_ID}/paginas
```

### Si no existe, crear página desde el CRM:
1. Ve a `http://localhost:3000/paginas`
2. Click en "Nueva Página"
3. Configurar:
   - **Tipo:** Homepage
   - **Título:** Inicio
   - **Slug:** `/` o `homepage`
   - **Activa:** ✅ Sí
   - **Pública:** ✅ Sí

### O crear directamente via API (más rápido):
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/paginas \
  -H "Content-Type: application/json" \
  -d '{
    "tipoPagina": "homepage",
    "titulo": "Inicio",
    "slug": "/",
    "descripcion": "Página principal",
    "contenido": {},
    "meta": {},
    "publica": true,
    "activa": true,
    "orden": 0
  }'
```

**Guarda el `id` de la página creada.**

---

## 📋 Paso 3: Crear Componentes para la Homepage

Ahora vamos a crear los componentes usando el **esquema estructurado correcto**.

### Componente 1: Header (Global - aparece en todas las páginas)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "header",
    "variante": "default",
    "datos": {
      "static_data": {
        "logo": ""
      },
      "toggles": {
        "mostrarMenu": true,
        "mostrarBusqueda": true
      },
      "styles": {
        "colors": {
          "primary": "#667eea"
        }
      }
    },
    "activo": true,
    "orden": -1,
    "paginaId": null,
    "predeterminado": true
  }'
```

**Nota:** `paginaId: null` significa que es global (aparece en todas las páginas).

---

### Componente 2: Hero (Para la homepage)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "hero",
    "variante": "default",
    "datos": {
      "static_data": {
        "titulo": "Bienvenido a Nuestra Inmobiliaria",
        "subtitulo": "Encuentra la propiedad de tus sueños en el lugar perfecto",
        "textoBoton": "Ver Propiedades",
        "urlBoton": "/propiedades",
        "imagenFondo": ""
      },
      "styles": {
        "colors": {
          "primary": "#667eea",
          "text": "#ffffff"
        }
      }
    },
    "activo": true,
    "orden": 0,
    "paginaId": "{PAGINA_ID}",
    "predeterminado": true
  }'
```

**Importante:** Reemplaza `{PAGINA_ID}` con el ID de la página creada en el Paso 2.

---

### Componente 3: Features (Servicios)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "features",
    "variante": "default",
    "datos": {
      "static_data": {
        "titulo": "Nuestros Servicios",
        "subtitulo": "Ofrecemos las mejores soluciones para ti",
        "features": [
          {
            "icono": "🏠",
            "titulo": "Compra",
            "descripcion": "Encuentra la propiedad perfecta"
          },
          {
            "icono": "💰",
            "titulo": "Venta",
            "descripcion": "Vende tu propiedad al mejor precio"
          },
          {
            "icono": "🔑",
            "titulo": "Alquiler",
            "descripcion": "Alquila propiedades de calidad"
          }
        ]
      },
      "styles": {
        "colors": {
          "background": "#ffffff"
        },
        "spacing": {
          "padding": "4rem 1rem"
        }
      }
    },
    "activo": true,
    "orden": 1,
    "paginaId": "{PAGINA_ID}",
    "predeterminado": true
  }'
```

---

### Componente 4: PropertyList (Con datos dinámicos)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "property_list",
    "variante": "default",
    "datos": {
      "static_data": {
        "titulo": "Propiedades Destacadas",
        "itemsPorPagina": 6
      },
      "dynamic_data": {
        "dataType": "properties",
        "pagination": {
          "page": 1,
          "limit": 6
        }
      },
      "toggles": {
        "mostrarFiltros": false
      },
      "styles": {
        "colors": {
          "background": "#f7fafc"
        },
        "spacing": {
          "padding": "3rem 1rem",
          "gap": "2rem"
        }
      }
    },
    "activo": true,
    "orden": 2,
    "paginaId": "{PAGINA_ID}",
    "predeterminado": true
  }'
```

**Nota:** El backend resolverá automáticamente `dynamic_data` y agregará propiedades mock en `dynamic_data.resolved`.

---

### Componente 5: Testimonials (Con datos dinámicos)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "testimonials",
    "variante": "default",
    "datos": {
      "static_data": {
        "titulo": "Lo que dicen nuestros clientes",
        "subtitulo": "Testimonios reales de personas que confiaron en nosotros"
      },
      "dynamic_data": {
        "dataType": "testimonials",
        "pagination": {
          "page": 1,
          "limit": 3
        }
      },
      "styles": {
        "colors": {
          "background": "#f7fafc"
        },
        "spacing": {
          "padding": "4rem 1rem"
        }
      }
    },
    "activo": true,
    "orden": 3,
    "paginaId": "{PAGINA_ID}",
    "predeterminado": true
  }'
```

---

### Componente 6: CTA (Call to Action)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "cta",
    "variante": "default",
    "datos": {
      "static_data": {
        "titulo": "¿Listo para comenzar?",
        "textoBoton": "Contactarnos",
        "urlBoton": "/contacto"
      },
      "styles": {
        "colors": {
          "primary": "#667eea",
          "secondary": "#764ba2"
        },
        "spacing": {
          "padding": "4rem 1rem"
        }
      }
    },
    "activo": true,
    "orden": 4,
    "paginaId": "{PAGINA_ID}",
    "predeterminado": true
  }'
```

---

### Componente 7: Footer (Global)

```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d '{
    "tipo": "footer",
    "variante": "default",
    "datos": {
      "static_data": {
        "textoCopyright": "© 2024 Inmobiliaria. Todos los derechos reservados.",
        "telefono": "+1 234 567 890",
        "email": "contacto@inmobiliaria.com",
        "direccion": "Calle Principal 123, Ciudad"
      },
      "toggles": {
        "mostrarTelefono": true,
        "mostrarEmail": true
      }
    },
    "activo": true,
    "orden": 100,
    "paginaId": null,
    "predeterminado": true
  }'
```

---

## 📋 Paso 4: Verificar la Homepage

### Opción A: Ver desde el Frontend Web

Abre en tu navegador:
```
http://localhost:4321/tenant/{TENANT_ID}/
```

O si usas el slug:
```
http://localhost:4321/tenant/{TENANT_ID}/homepage
```

### Opción B: Verificar desde la API

```bash
curl http://localhost:3001/api/tenants/{TENANT_ID}/pages/
```

O con slug específico:
```bash
curl http://localhost:3001/api/tenants/{TENANT_ID}/pages/homepage
```

**Respuesta esperada:**
```json
{
  "page": {
    "id": "...",
    "titulo": "Inicio",
    "slug": "/",
    ...
  },
  "theme": {
    "primary": "#667eea",
    ...
  },
  "components": [
    {
      "id": "...",
      "tipo": "header",
      "variante": "default",
      "datos": {
        "static_data": { ... },
        "toggles": { ... }
      },
      "orden": -1
    },
    {
      "id": "...",
      "tipo": "hero",
      "variante": "default",
      "datos": {
        "static_data": { ... },
        "styles": { ... }
      },
      "orden": 0
    },
    {
      "id": "...",
      "tipo": "property_list",
      "variante": "default",
      "datos": {
        "static_data": { ... },
        "dynamic_data": {
          "dataType": "properties",
          "resolved": [
            {
              "id": "1",
              "titulo": "Propiedad Ejemplo 1",
              "precio": 250000,
              ...
            },
            ...
          ]
        },
        ...
      },
      "orden": 2
    },
    ...
  ]
}
```

**Nota:** Si usas `property_list` o `testimonials` con `dynamic_data`, verás que el backend ya resolvió los datos y agregó `dynamic_data.resolved` automáticamente.

---

## 🎨 Ejemplo Completo: Script para Crear Homepage

Crea un archivo `crear-homepage.sh` (o `.ps1` para PowerShell):

```bash
#!/bin/bash

# Configuración
TENANT_ID="9763dd67-1b33-40b1-ae78-73e5bcafc2b7"  # Reemplaza con tu tenant ID
API_URL="http://localhost:3001"

# 1. Crear página
echo "📄 Creando página homepage..."
PAGE_RESPONSE=$(curl -s -X POST "$API_URL/api/tenants/$TENANT_ID/paginas" \
  -H "Content-Type: application/json" \
  -d '{
    "tipoPagina": "homepage",
    "titulo": "Inicio",
    "slug": "/",
    "descripcion": "Página principal",
    "contenido": {},
    "meta": {},
    "publica": true,
    "activa": true,
    "orden": 0
  }')

PAGE_ID=$(echo $PAGE_RESPONSE | grep -o '"id":"[^"]*' | cut -d'"' -f4)
echo "✅ Página creada: $PAGE_ID"

# 2. Crear componentes (usar los JSON de arriba reemplazando {PAGINA_ID} con $PAGE_ID)
# ... (componentes aquí)
```

---

## 🔍 Verificación Final

1. **Verifica que la página se creó:**
   ```bash
   curl http://localhost:3001/api/tenants/{TENANT_ID}/paginas
   ```

2. **Verifica que los componentes se crearon:**
   ```bash
   curl "http://localhost:3001/api/tenants/{TENANT_ID}/componentes?todos=true"
   ```

3. **Verifica la página completa:**
   ```bash
   curl http://localhost:3001/api/tenants/{TENANT_ID}/pages/
   ```

4. **Abre en el navegador:**
   ```
   http://localhost:4321/tenant/{TENANT_ID}/
   ```

---

## 🛠️ Crear desde el CRM (Interfaz Gráfica)

### Paso 1: Acceder al CRM
1. Abre `http://localhost:3000`
2. Inicia sesión (login falso)

### Paso 2: Crear Página
1. Ve a la sección **Páginas**
2. Click en **Nueva Página**
3. Completa el formulario:
   - Título: "Inicio"
   - Slug: "/"
   - Tipo: Homepage
   - Activa: ✅
   - Pública: ✅

### Paso 3: Agregar Componentes
1. Ve a **Editar Página** → Selecciona la página creada
2. Click en **Agregar Componente**
3. Selecciona el tipo de componente (Header, Hero, etc.)
4. Completa el formulario con el esquema estructurado:

**Ejemplo para Hero:**
```json
{
  "static_data": {
    "titulo": "Bienvenido a Nuestra Inmobiliaria",
    "subtitulo": "Encuentra la propiedad de tus sueños",
    "textoBoton": "Ver Propiedades",
    "urlBoton": "/propiedades"
  },
  "styles": {
    "colors": {
      "primary": "#667eea"
    }
  }
}
```

5. Configura:
   - **Orden:** -1 para header, 0 para hero, etc.
   - **Activo:** ✅
   - **Predeterminado:** ✅ (solo uno por tipo)
   - **Página:** Selecciona la homepage o "Todas las páginas" para header/footer

---

## 📝 Estructura de Datos: Guía Rápida

### Static Data
```json
{
  "static_data": {
    "titulo": "Texto del título",
    "subtitulo": "Texto del subtítulo",
    "textoBoton": "Texto del botón",
    "urlBoton": "/ruta",
    "imagenFondo": "url/imagen.jpg",
    "telefono": "+1234567890",
    "email": "contacto@example.com",
    "direccion": "Calle 123",
    "itemsPorPagina": 12
  }
}
```

### Dynamic Data
```json
{
  "dynamic_data": {
    "dataType": "properties",  // o "agents", "blog", "testimonials"
    "pagination": {
      "page": 1,
      "limit": 10
    },
    "filters": {
      // Filtros opcionales
    }
  }
}
```

### Styles
```json
{
  "styles": {
    "colors": {
      "primary": "#667eea",
      "secondary": "#764ba2",
      "background": "#ffffff",
      "text": "#1a202c",
      "border": "#e2e8f0"
    },
    "spacing": {
      "padding": "3rem 1rem",
      "gap": "2rem",
      "margin": "0"
    },
    "fonts": {
      "family": "Arial, sans-serif",
      "size": "1rem",
      "weight": "400"
    }
  }
}
```

### Toggles
```json
{
  "toggles": {
    "mostrarMenu": true,
    "mostrarBusqueda": true,
    "mostrarTelefono": true,
    "mostrarEmail": true,
    "mostrarFiltros": false,
    "mostrarPrecio": true,
    "mostrarUbicacion": true,
    "mostrarCaracteristicas": true
  }
}
```

---

## 🎯 Orden de Componentes (Recomendado)

Para una homepage típica:
1. **Header** (orden: -1) - Global
2. **Hero** (orden: 0) - Homepage
3. **Features** (orden: 1) - Homepage
4. **PropertyList** (orden: 2) - Homepage (con dynamic_data)
5. **Testimonials** (orden: 3) - Homepage (con dynamic_data)
6. **CTA** (orden: 4) - Homepage
7. **Footer** (orden: 100) - Global

---

## ✅ Checklist de Verificación

- [ ] Tenant ID obtenido
- [ ] Página homepage creada
- [ ] Header creado (global)
- [ ] Hero creado (homepage)
- [ ] Features creado (homepage)
- [ ] PropertyList creado (homepage, con dynamic_data)
- [ ] Testimonials creado (homepage, con dynamic_data)
- [ ] CTA creado (homepage)
- [ ] Footer creado (global)
- [ ] Página visible en `http://localhost:4321/tenant/{TENANT_ID}/`
- [ ] Componentes renderizados correctamente
- [ ] Dynamic data resuelto (propiedades, testimonios aparecen)

---

## 🚀 Siguientes Pasos

Una vez que tengas la homepage funcionando:

1. **Personalizar colores:** Edita el tema desde el CRM
2. **Agregar más componentes:** Features, BlogList, etc.
3. **Probar variantes:** Cambia Hero a variant1, variant2, etc.
4. **Conectar datos reales:** Cuando tengas tablas de propiedades, actualiza `dynamicDataResolver.ts`

---

**¡Listo!** Ahora tienes una homepage completa funcionando con el esquema estructurado. 🎉


