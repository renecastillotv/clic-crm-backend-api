# 📦 Sistema de Componentes Web

## Arquitectura

El sistema está diseñado para que **la API devuelva los componentes con toda su configuración y datos listos**, y el **frontend solo los sirva**.

### Flujo de Datos

```
Base de Datos → API Service → API Endpoint → Frontend (Astro) → Renderizado
```

## Estructura de Base de Datos

### Tabla: `componentes_web`

Almacena los componentes configurados por tenant:

```sql
- id (uuid): Identificador único
- tenant_id (uuid): ID del tenant
- tipo (string): Tipo de componente (header, hero, footer, etc.)
- variante (string): Variante del componente (default, variant1, etc.)
- datos (jsonb): Datos/configuración del componente (JSON)
- activo (boolean): Si el componente está activo
- orden (integer): Orden de visualización
- pagina_id (uuid, nullable): Página específica (null = todas las páginas)
```

### Tabla: `temas_tenant`

Almacena los temas (colores) por tenant:

```sql
- id (uuid): Identificador único
- tenant_id (uuid): ID del tenant (único)
- colores (jsonb): Objeto JSON con los colores del tema
```

## API Endpoints

### `GET /api/tenants/:tenantId/componentes`

Obtiene todos los componentes activos de un tenant, ordenados y listos para renderizar.

**Query Params:**
- `paginaId` (opcional): Filtrar componentes por página específica

**Respuesta:**
```json
[
  {
    "id": "uuid",
    "tipo": "header",
    "variante": "default",
    "datos": {
      "logo": "",
      "mostrarBusqueda": true,
      "mostrarMenu": true
    },
    "activo": true,
    "orden": -1,
    "paginaId": null
  },
  {
    "id": "uuid",
    "tipo": "hero",
    "variante": "default",
    "datos": {
      "titulo": "Bienvenido",
      "subtitulo": "Subtítulo",
      "textoBoton": "Ver más",
      "urlBoton": "/propiedades"
    },
    "activo": true,
    "orden": 0
  }
]
```

**Características:**
- ✅ Componentes ya ordenados por `orden`
- ✅ Solo componentes activos (`activo = true`)
- ✅ Datos ya parseados (JSON)
- ✅ Filtrado por página si se especifica `paginaId`
- ✅ Componentes globales si `pagina_id IS NULL`

### `GET /api/tenants/:tenantId/tema`

Obtiene el tema (colores) de un tenant.

**Respuesta:**
```json
{
  "primary": "#667eea",
  "secondary": "#764ba2",
  "accent": "#f56565",
  "background": "#ffffff",
  "text": "#1a202c",
  "textSecondary": "#718096",
  "border": "#e2e8f0",
  "success": "#48bb78",
  "warning": "#ed8936",
  "error": "#f56565"
}
```

**Características:**
- ✅ Retorna tema por defecto si no existe
- ✅ Colores ya parseados (JSON)

## Frontend (Astro)

### Uso Básico

```astro
---
import { fetchTema, fetchComponentes } from '../utils/fetchComponents';

const tenantId = '1';
const tema = await fetchTema(tenantId);
const componentes = await fetchComponentes(tenantId);

// Los componentes ya vienen ordenados y listos
---

<main>
  {componentes.map((componente) => (
    <ComponentRenderer 
      componente={componente} 
      tema={tema}
    />
  ))}
</main>
```

### Con Filtrado por Página

```astro
---
const pagina = await fetchPagina(tenantId, slug);
const componentes = await fetchComponentes(tenantId, pagina?.id);
---
```

## Servicios

### `componentesService.ts`

Contiene la lógica de negocio para obtener componentes:

- `getComponentesByTenant(tenantId, paginaId?)`: Obtiene componentes con filtrado
- `getTemaByTenant(tenantId)`: Obtiene tema con fallback a valores por defecto

## Ventajas de esta Arquitectura

1. **Separación de responsabilidades**: La API maneja la lógica, el frontend solo renderiza
2. **Datos listos**: No hay procesamiento en el frontend
3. **Performance**: Consultas optimizadas en la base de datos
4. **Mantenibilidad**: Cambios en la lógica solo afectan la API
5. **Escalabilidad**: Fácil agregar caché, filtros, etc. en la API

## Próximos Pasos

1. ✅ Migración de base de datos (`004_create_componentes_web.ts`)
2. ✅ Servicio de componentes (`componentesService.ts`)
3. ✅ Endpoints de API actualizados
4. ✅ Frontend actualizado para usar API
5. ⏳ Implementar CRUD de componentes en el CRM
6. ⏳ Agregar caché en la API
7. ⏳ Implementar validación de datos



