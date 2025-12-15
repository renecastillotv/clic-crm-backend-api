# 🧪 Instrucciones de Prueba - Fase 1

**Fecha:** 2025-01-27  
**Servidores:** 
- API: http://localhost:3001
- Web Astro: http://localhost:4321
- CRM: http://localhost:3000

---

## ✅ Verificación Inicial

### 1. Verificar que los servidores estén corriendo

Abre en tu navegador:
- **API:** http://localhost:3001/api/tenants/first
  - Debe devolver un JSON con el tenant (ID, nombre, slug)
  
- **Web Astro:** http://localhost:4321
  - Debe mostrar la página principal (puede estar vacía si no hay componentes)
  
- **CRM:** http://localhost:3000
  - Debe mostrar el login

---

## 🧪 Prueba 1: Verificar Endpoint Único

### Objetivo: Confirmar que el endpoint único funciona

1. **Obtener tenant ID:**
   ```bash
   # En PowerShell o terminal
   Invoke-RestMethod -Uri "http://localhost:3001/api/tenants/first" | ConvertTo-Json
   ```
   
   O abre en navegador: http://localhost:3001/api/tenants/first
   
   **Copia el `id` del tenant** (ejemplo: `9763dd67-1b33-40b1-ae78-73e5bcafc2b7`)

2. **Probar endpoint único de página completa:**
   ```bash
   # Reemplaza {tenantId} con el ID que obtuviste
   Invoke-RestMethod -Uri "http://localhost:3001/api/tenants/{tenantId}/pages/homepage" | ConvertTo-Json -Depth 10
   ```
   
   O abre en navegador: http://localhost:3001/api/tenants/{tenantId}/pages/homepage
   
   **Debe devolver:**
   ```json
   {
     "page": { "id", "titulo", "slug", ... },
     "theme": { "primary", "secondary", ... },
     "components": [ ... ]
   }
   ```

3. **Verificar en logs del servidor API:**
   - Debe aparecer: `📄 GET /pages/:slug - tenantId: ...`
   - Debe aparecer: `✅ Página completa obtenida: ...`

---

## 🧪 Prueba 2: Crear Componente desde CRM

### Objetivo: Verificar que se guarda en formato estructurado

1. **Login en CRM:**
   - Abre: http://localhost:3000
   - Usa cualquier credencial (login falso)
   - Selecciona "Tenant Dashboard"

2. **Navegar a Página Web > Páginas:**
   - En el menú lateral, click en "Página Web"
   - Click en "Páginas"
   - Selecciona "Homepage" (o cualquier página)

3. **Editar componentes de la página:**
   - Click en "Editar" o "Configurar Componentes"
   - Debe abrir `EditarPaginaComponentes`

4. **Agregar un componente Hero:**
   - Click en "Agregar Componente"
   - Selecciona "Hero Section"
   - Llena los campos:
     - Título: "Bienvenido a Mi Inmobiliaria"
     - Subtítulo: "Encuentra la propiedad de tus sueños"
     - Texto del Botón: "Ver Propiedades"
     - URL del Botón: "/propiedades"
   - Click en "Guardar"

5. **Verificar en logs del servidor API:**
   - Debe aparecer: `💾 POST /componentes - tenantId: ...`
   - Debe aparecer: `✅ Componente guardado:`
   - **IMPORTANTE:** Verifica que `datos` tenga formato estructurado:
     ```json
     {
       "datos": {
         "static_data": {
           "titulo": "Bienvenido a Mi Inmobiliaria",
           "subtitulo": "...",
           ...
         }
       }
     }
     ```

6. **Verificar en base de datos (opcional):**
   - Si tienes acceso a Neon, verifica que el campo `datos` en `componentes_web` tenga formato estructurado

---

## 🧪 Prueba 3: Ver Componente en Web Astro

### Objetivo: Confirmar que el frontend renderiza correctamente

1. **Abrir página web:**
   - Abre: http://localhost:4321
   - Debe mostrar la página con el componente Hero que creaste

2. **Verificar en consola del navegador (F12):**
   - Debe aparecer: `✅ Página completa obtenida desde la API:`
   - Debe mostrar: `- Página: Homepage`
   - Debe mostrar: `- Componentes: X` (donde X > 0)

3. **Verificar que el Hero se muestra:**
   - Debe aparecer el título "Bienvenido a Mi Inmobiliaria"
   - Debe aparecer el subtítulo
   - Debe aparecer el botón "Ver Propiedades"

4. **Verificar Network tab (F12 > Network):**
   - Debe haber UNA SOLA llamada a: `/api/tenants/{tenantId}/pages/homepage`
   - **NO** debe haber múltiples llamadas separadas

---

## 🧪 Prueba 4: Verificar Formato Estructurado

### Objetivo: Confirmar que NO hay compatibilidad legacy

1. **Verificar logs del servidor API:**
   - Abre la terminal donde corre el servidor API
   - Busca advertencias como: `⚠️ Componente ... no tiene formato estructurado`
   - **NO debe haber ninguna advertencia** si todos los componentes están bien

2. **Verificar respuesta del API:**
   - Obtén un componente desde el API:
     ```bash
     Invoke-RestMethod -Uri "http://localhost:3001/api/tenants/{tenantId}/componentes?todos=true" | ConvertTo-Json -Depth 10
     ```
   - Verifica que TODOS los componentes tengan:
     ```json
     {
       "datos": {
         "static_data": { ... }
       }
     }
     ```
   - **NO debe haber** componentes con datos "flat" (sin `static_data`)

---

## 🧪 Prueba 5: Editar Componente Existente

### Objetivo: Verificar que la edición funciona con formato estructurado

1. **En el CRM:**
   - Ve a la página donde agregaste el Hero
   - Click en "Editar" del componente Hero
   - Cambia el título a: "Nuevo Título de Prueba"
   - Click en "Guardar"

2. **Verificar en logs del API:**
   - Debe aparecer: `💾 POST /componentes - tenantId: ...`
   - Verifica que `datos` siga teniendo formato estructurado

3. **Recargar página web:**
   - Recarga: http://localhost:4321
   - Debe mostrar el nuevo título "Nuevo Título de Prueba"

---

## 🧪 Prueba 6: Agregar Footer con Toggles

### Objetivo: Verificar que los toggles funcionan

1. **En el CRM:**
   - Agrega un componente "Footer"
   - Llena los campos:
     - Texto Copyright: "© 2025 Mi Inmobiliaria"
     - Teléfono: "+1 234 567 890"
     - Email: "contacto@inmobiliaria.com"
     - Dirección: "Calle Principal 123"
   - En los toggles:
     - Marca "Mostrar Teléfono" como `true`
     - Marca "Mostrar Email" como `false`
   - Click en "Guardar"

2. **Verificar formato en API:**
   - El componente debe tener:
     ```json
     {
       "datos": {
         "static_data": {
           "telefono": "+1 234 567 890",
           "email": "contacto@inmobiliaria.com",
           ...
         },
         "toggles": {
           "mostrarTelefono": true,
           "mostrarEmail": false
         }
       }
     }
     ```

3. **Verificar en página web:**
   - Recarga: http://localhost:4321
   - El footer debe mostrar el teléfono
   - El footer **NO** debe mostrar el email

---

## ❌ Qué NO Debe Pasar

1. **NO debe haber múltiples llamadas HTTP:**
   - En Network tab, solo debe haber UNA llamada a `/pages/:slug`
   - NO debe haber llamadas separadas a `/componentes`, `/tema`, `/paginas`

2. **NO debe haber advertencias de formato legacy:**
   - Los logs del API NO deben mostrar: `⚠️ Componente ... no tiene formato estructurado`

3. **NO debe haber errores en consola:**
   - La consola del navegador NO debe mostrar errores de TypeScript
   - Los componentes NO deben fallar al renderizar

---

## ✅ Checklist Final

- [ ] API responde correctamente
- [ ] Endpoint único devuelve página completa
- [ ] Componentes se guardan en formato estructurado
- [ ] Componentes se muestran correctamente en web
- [ ] Solo hay UNA llamada HTTP por página
- [ ] Toggles funcionan correctamente
- [ ] No hay advertencias de formato legacy
- [ ] No hay errores en consola

---

## 🐛 Si Algo Falla

1. **Revisa los logs del servidor API:**
   - Busca errores o advertencias
   - Verifica que los datos tengan formato estructurado

2. **Revisa la consola del navegador:**
   - F12 > Console
   - Busca errores de TypeScript o JavaScript

3. **Revisa Network tab:**
   - F12 > Network
   - Verifica qué llamadas se están haciendo
   - Verifica las respuestas del API

4. **Verifica la base de datos:**
   - Si tienes acceso, verifica que `componentes_web.datos` tenga formato estructurado

---

**¡Listo para probar!** 🚀



