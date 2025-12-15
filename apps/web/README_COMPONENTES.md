# Sistema de Componentes - Documentación

## Nomenclatura

### Componentes Estándar
Los componentes estándar son los predefinidos del sistema:
- `hero`, `footer`, `property_list`, `property_card`, `pagination`, etc.

### Componentes Personalizados (Custom)
Los componentes personalizados se llaman **"Componentes Personalizados"** o **"Custom Components"** y se identifican con el tipo `custom`.

Estos componentes permiten:
- Código HTML personalizado
- CSS personalizado
- JavaScript personalizado
- Total libertad de diseño

## Estructura de Variantes

### Cómo crear variantes

1. **En el CRM:**
   - Ve a "Página Web" > "Componentes"
   - Selecciona un componente estándar
   - Elige una variante (default, variant1, variant2, variant3)
   - Configura los datos del componente
   - Guarda

2. **En Astro:**
   - Las variantes se renderizan automáticamente según el tipo y variante seleccionada
   - Cada variante tiene su propio archivo: `ComponenteVariante.astro`
   - Ejemplo: `HeroDefault.astro`, `HeroVariant1.astro`, etc.

### Agregar una nueva variante

1. Crea el archivo en `apps/web/src/components/[tipo]/[Tipo][Variante].astro`
2. Agrega el import en `ComponentRenderer.astro`
3. Agrega el mapeo en la función `getComponent()`

Ejemplo:
```astro
// apps/web/src/components/hero/HeroVariant4.astro
---
interface Props {
  datos: Record<string, any>;
  tema?: Record<string, string>;
}
---

<section class="hero-variant4">
  <!-- Tu código aquí -->
</section>
```

Luego en `ComponentRenderer.astro`:
```typescript
import HeroVariant4 from './hero/HeroVariant4.astro';

const componentMap = {
  // ...
  'hero-variant4': HeroVariant4,
};
```

## Personalización de Temas

### Aplicar colores del tenant

Los componentes reciben el tema como prop y lo aplican usando variables CSS:

```astro
---
const { tema = {} } = Astro.props;
const primaryColor = tema.primary || '#667eea';
---

<div style={`--primary-color: ${primaryColor};`}>
  <!-- El componente usa var(--primary-color) -->
</div>
```

### Variables CSS disponibles

- `--primary-color`
- `--secondary-color`
- `--accent-color`
- `--background-color`
- `--text-color`
- `--text-secondary`
- `--border-color`
- `--success-color`
- `--warning-color`
- `--error-color`

## Componentes Personalizados (Custom)

### Crear un componente personalizado

1. Ve a "Página Web" > "Componentes Personalizados"
2. Haz clic en "Crear Componente Personalizado"
3. Completa:
   - Nombre del componente
   - Código único (se genera automáticamente)
   - Descripción
   - HTML personalizado
   - CSS personalizado (opcional)
   - JavaScript personalizado (opcional)
4. Guarda

### Renderizado en Astro

Los componentes custom se renderizan automáticamente en `CustomComponent.astro`:
- El HTML se inyecta directamente
- El CSS se agrega como `<style>`
- El JS se agrega como `<script>`

## Flujo de Renderizado

1. **CRM:** Usuario configura componentes y temas
2. **API:** Almacena en base de datos
3. **Astro:** Obtiene componentes y tema desde API
4. **ComponentRenderer:** Renderiza cada componente según su tipo y variante
5. **Resultado:** Página web con componentes personalizados y tema aplicado

## Ejemplo de Uso

```astro
---
// En una página de Astro
import PageLayout from '../layouts/PageLayout.astro';

const componentes = [
  {
    id: '1',
    tipo: 'hero',
    variante: 'default',
    datos: {
      titulo: 'Bienvenido',
      subtitulo: 'Encuentra tu propiedad ideal',
      textoBoton: 'Ver Propiedades',
      urlBoton: '/propiedades',
    },
    activo: true,
    orden: 0,
  },
];

const tema = {
  primary: '#667eea',
  secondary: '#764ba2',
  // ...
};
---

<PageLayout 
  title="Home"
  componentes={componentes}
  tema={tema}
/>
```

## Próximos Pasos

1. Crear todas las variantes de los componentes estándar
2. Implementar endpoints de API para obtener componentes y temas
3. Agregar preview en tiempo real en el CRM
4. Sistema de drag & drop para ordenar componentes
5. Editor visual de temas con selector de colores



