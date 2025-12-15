# 🚀 Inicio Rápido - Página Web del Tenant

## Servidores en Ejecución

### API (Puerto 3001)
- URL: `http://localhost:3001`
- Endpoints disponibles:
  - `GET /api/tenants/:tenantId/componentes` - Obtener componentes
  - `GET /api/tenants/:tenantId/tema` - Obtener tema
  - `GET /api/tenants/:tenantId/paginas/:slug` - Obtener página

### Astro Web (Puerto 4321)
- URL: `http://localhost:4321`
- Página principal: `http://localhost:4321/`
- Página de tenant: `http://localhost:4321/tenant/1/homepage`

## Ver la Página del Tenant

1. **Asegúrate de que ambos servidores estén corriendo:**
   ```bash
   # Terminal 1 - API
   cd packages/api
   pnpm dev
   
   # Terminal 2 - Astro
   cd apps/web
   pnpm dev
   ```

2. **Abre tu navegador en:**
   - `http://localhost:4321` - Página principal con datos mock
   - `http://localhost:4321/tenant/1/homepage` - Página específica del tenant

## Componentes Disponibles

Actualmente implementados:
- ✅ Hero (Default, Variant1, Variant2, Variant3)
- ✅ Footer (Default)
- 🚧 Otros componentes mostrarán placeholder

## Datos Mock

Si la API no está disponible, la página usará datos mock automáticamente:
- Hero con título y botón
- Footer con información de contacto
- Tema por defecto (colores morados)

## Próximos Pasos

1. Conectar con la base de datos real
2. Implementar más componentes estándar
3. Agregar más variantes
4. Sistema de preview en tiempo real



