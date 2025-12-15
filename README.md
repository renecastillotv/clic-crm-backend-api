# CRM Monorepo

Monorepo para proyecto CRM con arquitectura desacoplada.

## Estructura del Proyecto

```
.
├── apps/
│   ├── crm-frontend/     # Frontend React del CRM
│   └── web/              # Página web en Astro
├── packages/
│   └── api/              # APIs (actualmente Vercel, futuro AWS App Runner)
└── package.json          # Configuración del monorepo
```

## Tecnologías

- **Frontend CRM**: React
- **Página Web**: Astro (optimizado para SEO y velocidad)
- **APIs**: Node.js/TypeScript (desplegadas en Vercel, migración futura a AWS App Runner)
- **Monorepo**: pnpm workspaces

## Instalación

```bash
# Instalar pnpm si no lo tienes
npm install -g pnpm

# Instalar dependencias
pnpm install
```

## Scripts Disponibles

### Desarrollo
```bash
# Desarrollo de todos los proyectos
pnpm dev

# Desarrollo individual
pnpm dev:crm      # Frontend CRM
pnpm dev:web      # Página web Astro
pnpm dev:api      # APIs
```

### Build
```bash
# Build de todos los proyectos
pnpm build

# Build individual
pnpm build:crm
pnpm build:web
pnpm build:api
```

## Despliegue

- **Frontend CRM**: Vercel
- **Página Web**: Vercel
- **APIs**: Vercel (actualmente) → AWS App Runner (futuro)

## Arquitectura

El proyecto está completamente desacoplado:
- Cada aplicación puede desplegarse independientemente
- Layouts y componentes son personalizables
- APIs pueden migrarse sin afectar los frontends



