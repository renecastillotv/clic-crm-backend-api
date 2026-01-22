# Plan: Sistema de Split de Comisiones Mejorado

## Análisis del Sistema Actual

### Tablas Existentes Relevantes

1. **`catalogos`** (migración 107) - Ya soporta `tipo_asesor` con config JSON
   - Multitenant (tenant_id nullable para globales)
   - Campo `config` JSONB para datos adicionales
   - Ya tiene seeds: junior, pleno, senior, trainee, asociado

2. **`perfiles_asesor`** (migración 053)
   - `split_comision` decimal(5,2) - % que recibe el asesor
   - `rango` enum: trainee, junior, senior, broker, team_leader, director
   - `equipo_id` FK a equipos

3. **`comisiones`** (migración 051, 066)
   - `split_porcentaje_vendedor` - Snapshot del split al momento de la venta
   - `split_porcentaje_owner` - Snapshot del split para owner
   - `tipo`: venta, captacion, referido, liderazgo, especialidad
   - `datos_extra` JSONB

4. **`equipos`** (migración 053)
   - `split_comision_equipo` decimal(5,2)

### Problema Actual
La UI en `CrmFinanzasConfiguracion.tsx` está hardcodeada sin conexión a BD, con estructura confusa.

---

## Propuesta de Solución (SIN NUEVAS TABLAS)

### Estrategia: Usar `catalogos` con tipo `plantilla_comision`

Usaremos la tabla `catalogos` existente que ya es multitenant y tiene estructura flexible:

```typescript
// Nuevo tipo en catalogos: 'plantilla_comision'
{
  tenant_id: uuid | null,  // null = plantilla global, uuid = personalizada
  tipo: 'plantilla_comision',
  codigo: 'asesor_top_producer',
  nombre: 'Asesor Top Producer',
  descripcion: 'Distribución para asesores de alto rendimiento',
  orden: 1,
  activo: true,
  config: {
    // Estructura de distribución
    distribuciones: {
      // Por tipo de propiedad
      propiedad_lista: {
        solo_capta: { captador: 20, vendedor: 0, empresa: 80 },
        solo_vende: { captador: 0, vendedor: 60, empresa: 40 },
        capta_y_vende: { captador: 20, vendedor: 60, empresa: 20 },
      },
      proyecto: {
        solo_capta: { captador: 10, vendedor: 0, empresa: 90 },
        solo_vende: { captador: 0, vendedor: 65, empresa: 35 },
        capta_y_vende: { captador: 10, vendedor: 70, empresa: 20 },
      }
    },
    // Distribución de la parte de empresa (sobre el % de empresa)
    distribucion_empresa: [
      { rol: 'contabilidad', tipo: 'porcentaje', valor: 2, descripcion: 'Contabilidad' },
      { rol: 'cafe', tipo: 'fijo', valor: 500, moneda: 'DOP', descripcion: 'Señora del café' },
      { rol: 'marketing', tipo: 'porcentaje', valor: 5, descripcion: 'Marketing' }
    ],
    // Fees que se deducen ANTES de la distribución principal
    fees_previos: [
      { rol: 'mentor', porcentaje: 5, aplica_a: ['trainee', 'junior'] },
      { rol: 'lider_equipo', porcentaje: 3, aplica_a: ['todos'] },
      { rol: 'franquicia', porcentaje: 2, aplica_a: ['todos'] }
    ],
    // Roles que pueden usar esta plantilla
    roles_aplicables: ['asesor_top_producer'], // códigos de catalogos tipo_asesor
    // Si es la plantilla por defecto para nuevos asesores
    es_default_para_rol: 'asesor_top_producer'
  }
}
```

### Flujo de Asignación

1. **Usuario tiene un rol** (tipo_asesor en catalogos): junior, senior, top_producer
2. **Cada rol tiene plantilla de comisión asociada** (tipo plantilla_comision)
3. **Al crear venta:**
   - Sistema busca plantilla activa del rol del asesor
   - Crea snapshot en `comisiones.datos_extra` con la distribución aplicada
4. **Si asesor es ascendido:**
   - Comisiones anteriores mantienen su snapshot (no cambian)
   - Nuevas ventas usan la nueva plantilla

### Beneficios de este Enfoque

1. **No requiere nuevas tablas** - Usa `catalogos` existente
2. **Multitenant nativo** - tenant_id null = global, uuid = personalizado
3. **Herencia** - Tenants heredan plantillas globales, pueden override
4. **Snapshot inmutable** - Al generar comisión se guarda copia en datos_extra
5. **Flexible** - Estructura JSON permite evolucionar sin migraciones

---

## Implementación

### Fase 1: Migración de Datos Seed

```sql
-- Insertar plantillas globales de comisión
INSERT INTO catalogos (tenant_id, tipo, codigo, nombre, config, orden) VALUES
(NULL, 'plantilla_comision', 'trainee', 'Asesor en Entrenamiento', '{...}', 1),
(NULL, 'plantilla_comision', 'junior', 'Asesor Junior', '{...}', 2),
(NULL, 'plantilla_comision', 'pleno', 'Asesor Pleno', '{...}', 3),
(NULL, 'plantilla_comision', 'senior', 'Asesor Senior', '{...}', 4),
(NULL, 'plantilla_comision', 'top_producer', 'Top Producer', '{...}', 5);
```

### Fase 2: API Endpoints

```
GET    /api/tenants/:id/finanzas/plantillas-comision
POST   /api/tenants/:id/finanzas/plantillas-comision
PUT    /api/tenants/:id/finanzas/plantillas-comision/:codigo
DELETE /api/tenants/:id/finanzas/plantillas-comision/:codigo

GET    /api/tenants/:id/finanzas/distribucion-empresa
PUT    /api/tenants/:id/finanzas/distribucion-empresa
```

### Fase 3: Rediseño UI

Nueva estructura de `SplitComisionesTab`:

```
┌─────────────────────────────────────────────────────────────────┐
│ PLANTILLAS DE DISTRIBUCIÓN                        [+ Nueva]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 🏆 TOP PRODUCER                              [Editar]    │   │
│  │                                                          │   │
│  │  PROPIEDADES LISTAS          PROYECTOS                   │   │
│  │  ┌─────────────────┐         ┌─────────────────┐         │   │
│  │  │ Capta+Vende: 80%│         │ Capta+Vende: 75%│         │   │
│  │  │ Solo Capta: 20% │         │ Solo Capta: 10% │         │   │
│  │  │ Solo Vende: 60% │         │ Solo Vende: 65% │         │   │
│  │  └─────────────────┘         └─────────────────┘         │   │
│  │                                                          │   │
│  │  Fees: Mentor 0% | Líder 3% | Franquicia 2%             │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 👔 SENIOR                                    [Editar]    │   │
│  │  ... (similar)                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ 📚 JUNIOR                                    [Editar]    │   │
│  │  ... (similar)                                           │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│ DISTRIBUCIÓN INTERNA DE EMPRESA                                 │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  Del % que recibe la empresa, distribuir:                │   │
│  │                                                          │   │
│  │  • Contabilidad ────────────────── 2%                    │   │
│  │  • Marketing ───────────────────── 5%                    │   │
│  │  • Señora del café ─────────────── RD$ 500 fijo          │   │
│  │  • [+ Agregar rol]                                       │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Fase 4: Modal de Edición de Plantilla

```
┌─────────────────────────────────────────────────────────────────┐
│ EDITAR PLANTILLA: TOP PRODUCER                          [X]    │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Nombre: [Top Producer                              ]           │
│  Descripción: [Distribución para alto rendimiento   ]           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ PROPIEDADES LISTAS                                         │
│  │                                                             │
│  │         │ Captador │ Vendedor │ Empresa │ Total            │
│  │ ────────┼──────────┼──────────┼─────────┼───────           │
│  │ Capta+V │   20%    │   60%    │   20%   │ 100% ✓           │
│  │ Solo C  │   20%    │    0%    │   80%   │ 100% ✓           │
│  │ Solo V  │    0%    │   60%    │   40%   │ 100% ✓           │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ PROYECTOS                                                  │
│  │                                                             │
│  │         │ Captador │ Vendedor │ Empresa │ Total            │
│  │ ────────┼──────────┼──────────┼─────────┼───────           │
│  │ Capta+V │   10%    │   70%    │   20%   │ 100% ✓           │
│  │ Solo C  │   10%    │    0%    │   90%   │ 100% ✓           │
│  │ Solo V  │    0%    │   65%    │   35%   │ 100% ✓           │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐
│  │ FEES PREVIOS (se deducen antes de distribuir)              │
│  │                                                             │
│  │  Mentor         [5 ]%  Aplica a: [Trainee, Junior]         │
│  │  Líder Equipo   [3 ]%  Aplica a: [Todos            ]       │
│  │  Franquicia     [2 ]%  Aplica a: [Todos            ]       │
│  │  [+ Agregar fee]                                           │
│  └─────────────────────────────────────────────────────────────┘
│                                                                 │
│                              [Cancelar]  [Guardar Plantilla]    │
└─────────────────────────────────────────────────────────────────┘
```

---

## Ejemplo de Cálculo

**Escenario:** Venta de proyecto, asesor TOP PRODUCER capta y vende, comisión total $10,000

1. **Fees previos:**
   - Líder equipo: 3% = $300
   - Franquicia: 2% = $200
   - **Subtotal fees:** $500
   - **Base para distribución:** $10,000 - $500 = $9,500

2. **Distribución principal (capta_y_vende proyecto):**
   - Captador: 10% de $9,500 = $950
   - Vendedor: 70% de $9,500 = $6,650
   - Empresa: 20% de $9,500 = $1,900

3. **Como mismo asesor capta y vende:**
   - Asesor recibe: $950 + $6,650 = $7,600
   - Empresa recibe: $1,900

4. **Distribución interna empresa ($1,900):**
   - Contabilidad (2%): $38
   - Marketing (5%): $95
   - Señora café (fijo): $500 DOP ≈ $8.50 USD
   - Neto empresa: $1,758.50

---

## Archivos a Modificar

### Backend (packages/api)

1. `src/database/migrations/115_seed_plantillas_comision.ts` (NUEVA)
   - Insertar plantillas globales en tabla catalogos

2. `src/routes/tenants/finanzas.routes.ts` (NUEVA)
   - Endpoints para CRUD de plantillas

3. `src/services/plantillasComisionService.ts` (NUEVA)
   - Lógica de negocio para plantillas

4. `src/services/comisionesService.ts` (MODIFICAR)
   - Actualizar cálculo de comisiones para usar plantillas
   - Guardar snapshot en datos_extra

### Frontend (apps/crm-frontend)

1. `src/pages/crm/CrmFinanzasConfiguracion.tsx` (REESCRIBIR)
   - Nueva UI según diseño propuesto
   - Conectar con API

2. `src/services/api.ts` (AGREGAR)
   - Funciones para endpoints de plantillas

---

## Resumen de Cambios en BD

**Ninguna tabla nueva requerida.** Solo:

1. **INSERT** en `catalogos` con tipo `plantilla_comision`
2. **UPDATE** campo `config` de `catalogos` tipo `tipo_asesor` para vincular plantilla

---

## Preguntas para Confirmar

1. ¿Confirmas que los fees (mentor, líder, franquicia) se deducen ANTES de la distribución principal?

2. ¿La distribución interna de empresa (contabilidad, café) es igual para todas las plantillas o varía por plantilla?

3. ¿Quieres poder definir distribuciones diferentes cuando el asesor es externo (otra inmobiliaria)?

4. ¿El referidor siempre tiene un % fijo o varía por plantilla?
