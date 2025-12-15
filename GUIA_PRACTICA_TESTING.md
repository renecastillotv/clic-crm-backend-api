# 🧪 Guía Práctica: Cómo Probar y Construir una Homepage

**Fecha:** 2025-11-27  
**Objetivo:** Guía paso a paso para crear y probar una homepage completa

---

## 🚀 Método Rápido: Script Automático

### Opción 1: Script PowerShell (Recomendado)

1. **Ejecutar el script:**
   ```powershell
   .\scripts\crear-homepage-completa.ps1
   ```

2. **El script automáticamente:**
   - ✅ Obtiene el Tenant ID
   - ✅ Crea/verifica la página homepage
   - ✅ Crea todos los componentes necesarios
   - ✅ Configura el esquema estructurado correcto

3. **Verifica el resultado:**
   - Abre: `http://localhost:4321/tenant/{TENANT_ID}/`

---

## 📋 Método Manual: Paso a Paso

### Paso 1: Obtener Tenant ID

```bash
curl http://localhost:3001/api/tenants/first
```

**Guarda el `id` que aparece en la respuesta.**

---

### Paso 2: Crear/Cargar Página Homepage

**Opción A: Ejecutar Seed de Páginas**
```bash
cd packages/api
pnpm seed:run
```

Esto crea automáticamente las páginas estándar, incluyendo la homepage.

**Opción B: Crear desde CRM**
1. Abre `http://localhost:3000`
2. Ve a **Páginas** → **Nueva Página**
3. Completa:
   - Tipo: `homepage`
   - Título: `Inicio`
   - Slug: `/`
   - Activa: ✅

---

### Paso 3: Obtener ID de la Página

```bash
curl http://localhost:3001/api/tenants/{TENANT_ID}/paginas
```

Busca la página con `slug: "/"` y **guarda su `id`**.

---

### Paso 4: Crear Componentes

Reemplaza `{TENANT_ID}` y `{PAGE_ID}` con los valores reales:

#### 1. Header (Global)
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"header\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"logo\": \"\"
      },
      \"toggles\": {
        \"mostrarMenu\": true,
        \"mostrarBusqueda\": true
      },
      \"styles\": {
        \"colors\": {
          \"primary\": \"#667eea\"
        }
      }
    },
    \"activo\": true,
    \"orden\": -1,
    \"paginaId\": null,
    \"predeterminado\": true
  }"
```

#### 2. Hero
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"hero\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"titulo\": \"Bienvenido a Nuestra Inmobiliaria\",
        \"subtitulo\": \"Encuentra la propiedad de tus sueños\",
        \"textoBoton\": \"Ver Propiedades\",
        \"urlBoton\": \"/propiedades\"
      },
      \"styles\": {
        \"colors\": {
          \"primary\": \"#667eea\",
          \"text\": \"#ffffff\"
        }
      }
    },
    \"activo\": true,
    \"orden\": 0,
    \"paginaId\": \"{PAGE_ID}\",
    \"predeterminado\": true
  }"
```

#### 3. Features
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"features\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"titulo\": \"Nuestros Servicios\",
        \"subtitulo\": \"Ofrecemos las mejores soluciones\",
        \"features\": [
          {\"icono\": \"🏠\", \"titulo\": \"Compra\", \"descripcion\": \"Encuentra la propiedad perfecta\"},
          {\"icono\": \"💰\", \"titulo\": \"Venta\", \"descripcion\": \"Vende al mejor precio\"},
          {\"icono\": \"🔑\", \"titulo\": \"Alquiler\", \"descripcion\": \"Alquila propiedades de calidad\"}
        ]
      },
      \"styles\": {
        \"colors\": {\"background\": \"#ffffff\"},
        \"spacing\": {\"padding\": \"4rem 1rem\"}
      }
    },
    \"activo\": true,
    \"orden\": 1,
    \"paginaId\": \"{PAGE_ID}\",
    \"predeterminado\": true
  }"
```

#### 4. PropertyList (con Dynamic Data)
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"property_list\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"titulo\": \"Propiedades Destacadas\",
        \"itemsPorPagina\": 6
      },
      \"dynamic_data\": {
        \"dataType\": \"properties\",
        \"pagination\": {\"page\": 1, \"limit\": 6}
      },
      \"toggles\": {
        \"mostrarFiltros\": false
      },
      \"styles\": {
        \"colors\": {\"background\": \"#f7fafc\"},
        \"spacing\": {\"padding\": \"3rem 1rem\", \"gap\": \"2rem\"}
      }
    },
    \"activo\": true,
    \"orden\": 2,
    \"paginaId\": \"{PAGE_ID}\",
    \"predeterminado\": true
  }"
```

#### 5. Testimonials (con Dynamic Data)
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"testimonials\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"titulo\": \"Lo que dicen nuestros clientes\",
        \"subtitulo\": \"Testimonios reales\"
      },
      \"dynamic_data\": {
        \"dataType\": \"testimonials\",
        \"pagination\": {\"page\": 1, \"limit\": 3}
      },
      \"styles\": {
        \"colors\": {\"background\": \"#f7fafc\"},
        \"spacing\": {\"padding\": \"4rem 1rem\"}
      }
    },
    \"activo\": true,
    \"orden\": 3,
    \"paginaId\": \"{PAGE_ID}\",
    \"predeterminado\": true
  }"
```

#### 6. CTA
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"cta\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"titulo\": \"¿Listo para comenzar?\",
        \"textoBoton\": \"Contactarnos\",
        \"urlBoton\": \"/contacto\"
      },
      \"styles\": {
        \"colors\": {
          \"primary\": \"#667eea\",
          \"secondary\": \"#764ba2\"
        },
        \"spacing\": {\"padding\": \"4rem 1rem\"}
      }
    },
    \"activo\": true,
    \"orden\": 4,
    \"paginaId\": \"{PAGE_ID}\",
    \"predeterminado\": true
  }"
```

#### 7. Footer (Global)
```bash
curl -X POST http://localhost:3001/api/tenants/{TENANT_ID}/componentes \
  -H "Content-Type: application/json" \
  -d "{
    \"tipo\": \"footer\",
    \"variante\": \"default\",
    \"datos\": {
      \"static_data\": {
        \"textoCopyright\": \"© 2024 Inmobiliaria. Todos los derechos reservados.\",
        \"telefono\": \"+1 234 567 890\",
        \"email\": \"contacto@inmobiliaria.com\",
        \"direccion\": \"Calle Principal 123, Ciudad\"
      },
      \"toggles\": {
        \"mostrarTelefono\": true,
        \"mostrarEmail\": true
      }
    },
    \"activo\": true,
    \"orden\": 100,
    \"paginaId\": null,
    \"predeterminado\": true
  }"
```

---

## 🧪 Verificación

### 1. Verificar Página Completa desde API

```bash
curl http://localhost:3001/api/tenants/{TENANT_ID}/pages/
```

**Deberías ver:**
- ✅ `page`: Información de la página
- ✅ `theme`: Tema del tenant
- ✅ `components`: Array con todos los componentes
- ✅ `dynamic_data.resolved`: En PropertyList y Testimonials

---

### 2. Verificar en el Navegador

Abre en tu navegador:
```
http://localhost:4321/tenant/{TENANT_ID}/
```

**Deberías ver:**
- ✅ Header con menú y búsqueda
- ✅ Hero con título y botón
- ✅ Features con 3 servicios
- ✅ PropertyList con propiedades (datos mock)
- ✅ Testimonials con testimonios (datos mock)
- ✅ CTA con botón
- ✅ Footer con información de contacto

---

### 3. Verificar Componentes Creados

```bash
curl "http://localhost:3001/api/tenants/{TENANT_ID}/componentes?todos=true"
```

Deberías ver todos los componentes que creaste.

---

## 🎨 Crear desde el CRM (Interfaz Gráfica)

### Paso 1: Acceder al CRM
```
http://localhost:3000
```

### Paso 2: Crear Página
1. Ve a **Páginas**
2. Click **Nueva Página**
3. Completa:
   - Tipo: `homepage`
   - Título: `Inicio`
   - Slug: `/`
   - Activa: ✅
   - Pública: ✅

### Paso 3: Agregar Componentes
1. Ve a **Páginas** → Selecciona la homepage
2. Click **Editar Componentes**
3. Click **Agregar Componente**

**Ejemplo para crear Hero:**
- Tipo: `hero`
- Variante: `default`
- Datos (JSON):
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
      "primary": "#667eea",
      "text": "#ffffff"
    }
  }
}
```
- Orden: `0`
- Activo: ✅
- Predeterminado: ✅
- Página: Selecciona la homepage

---

## 🔍 Estructura de Datos: Ejemplos Completos

### Hero con Esquema Estructurado
```json
{
  "static_data": {
    "titulo": "Bienvenido",
    "subtitulo": "Subtítulo aquí",
    "textoBoton": "Comenzar",
    "urlBoton": "/ruta",
    "imagenFondo": "url/imagen.jpg"
  },
  "styles": {
    "colors": {
      "primary": "#667eea",
      "secondary": "#764ba2",
      "text": "#ffffff"
    },
    "spacing": {
      "padding": "4rem 2rem"
    }
  }
}
```

### PropertyList con Dynamic Data
```json
{
  "static_data": {
    "titulo": "Propiedades Disponibles",
    "itemsPorPagina": 12
  },
  "dynamic_data": {
    "dataType": "properties",
    "pagination": {
      "page": 1,
      "limit": 12
    },
    "filters": {
      "precioMin": 0,
      "precioMax": 1000000
    }
  },
  "toggles": {
    "mostrarFiltros": true,
    "mostrarPrecio": true,
    "mostrarUbicacion": true
  },
  "styles": {
    "colors": {
      "background": "#f7fafc",
      "text": "#1a202c"
    },
    "spacing": {
      "padding": "3rem 1rem",
      "gap": "2rem"
    }
  }
}
```

---

## ✅ Checklist de Verificación

- [ ] Tenant ID obtenido
- [ ] Página homepage creada (slug: `/`)
- [ ] Header creado (global, orden: -1)
- [ ] Hero creado (homepage, orden: 0)
- [ ] Features creado (homepage, orden: 1)
- [ ] PropertyList creado (homepage, orden: 2, con dynamic_data)
- [ ] Testimonials creado (homepage, orden: 3, con dynamic_data)
- [ ] CTA creado (homepage, orden: 4)
- [ ] Footer creado (global, orden: 100)
- [ ] Página visible en navegador
- [ ] Todos los componentes renderizados
- [ ] Dynamic data resuelto (propiedades y testimonios aparecen)

---

## 🐛 Troubleshooting

### Error: "Página no encontrada"
- Verifica que la página existe: `curl http://localhost:3001/api/tenants/{TENANT_ID}/paginas`
- Verifica que el slug es `/` o `homepage`
- Ejecuta el seed: `cd packages/api && pnpm seed:run`

### Error: "Componente no se muestra"
- Verifica que `activo: true`
- Verifica que `predeterminado: true` (solo uno por tipo)
- Verifica el `orden` (debe ser correcto)
- Verifica que `paginaId` es correcto (o `null` para globales)

### Error: "Dynamic data no resuelto"
- Verifica que `dynamic_data.dataType` es uno de: `properties`, `agents`, `blog`, `testimonials`
- Verifica los logs del servidor API para ver si hay errores
- Los datos mock deberían aparecer automáticamente

### Error: "Datos inválidos"
- Verifica que el JSON tiene el esquema estructurado correcto
- Debe tener `static_data` (obligatorio)
- `dynamic_data`, `styles`, `toggles` son opcionales pero deben seguir el formato correcto

---

## 🎯 Resultado Esperado

Al finalizar, deberías tener:

1. **Una homepage completa** con 7 componentes
2. **Componentes globales** (Header, Footer) que aparecen en todas las páginas
3. **Componentes específicos** (Hero, Features, etc.) solo en la homepage
4. **Datos dinámicos resueltos** (propiedades y testimonios con datos mock)
5. **Estilos personalizados** aplicados
6. **Toggles funcionando** (mostrar/ocultar elementos)

---

**¡Listo!** Ahora tienes una homepage completa funcionando. 🎉


