# Manual de Commits y Push - Proyecto CLIC CRM

## Estructura del Proyecto

Este es un **monorepo** con la siguiente estructura:

```
d:\2026 CLIC\
├── apps/crm-frontend/     → Repositorio: clic-crm-frontend
├── packages/api/          → Repositorio: clic-crm-backend-api
└── ... otros archivos del monorepo
```

## Repositorios Remotos Configurados

| Remoto | URL | Carpeta Local |
|--------|-----|---------------|
| `frontend` | https://github.com/renecastillotv/clic-crm-frontend.git | `apps/crm-frontend/` |
| `backend` | https://github.com/renecastillotv/clic-crm-backend-api.git | `packages/api/` |

---

## Proceso de Commits

### 1. Hacer Commit Local (siempre primero)

Todos los cambios se commitean primero en el monorepo local:

```bash
# Ver estado de archivos modificados
git status

# Agregar archivos específicos
git add <archivo1> <archivo2>

# O agregar todos los cambios
git add .

# Crear commit con mensaje descriptivo
git commit -m "tipo: descripción del cambio

Co-Authored-By: Claude Opus 4.5 <noreply@anthropic.com>"
```

### Tipos de commit recomendados:
- `feat:` Nueva funcionalidad
- `fix:` Corrección de bug
- `refactor:` Refactorización sin cambio de funcionalidad
- `style:` Cambios de formato/estilo
- `docs:` Documentación
- `chore:` Tareas de mantenimiento

---

## Proceso de Push a Repositorios Separados

### 2. Push al Frontend (clic-crm-frontend)

```bash
git subtree push --prefix=apps/crm-frontend frontend main
```

Este comando:
- Extrae solo los commits que afectan `apps/crm-frontend/`
- Los pushea al repositorio `frontend` en la rama `main`

### 3. Push al Backend (clic-crm-backend-api)

```bash
git subtree push --prefix=packages/api backend main
```

Este comando:
- Extrae solo los commits que afectan `packages/api/`
- Los pushea al repositorio `backend` en la rama `main`

---

## Comandos Rápidos de Referencia

### Push completo a ambos repos (después de commit):

```bash
# Frontend
git subtree push --prefix=apps/crm-frontend frontend main

# Backend
git subtree push --prefix=packages/api backend main
```

### Ver remotos configurados:

```bash
git remote -v
```

### Ver historial de commits:

```bash
git log --oneline -10
```

---

## Flujo de Trabajo Completo

1. **Desarrollar** cambios en el monorepo local
2. **Commit** los cambios:
   ```bash
   git add .
   git commit -m "feat: descripción"
   ```
3. **Push al frontend** (si hay cambios en `apps/crm-frontend/`):
   ```bash
   git subtree push --prefix=apps/crm-frontend frontend main
   ```
4. **Push al backend** (si hay cambios en `packages/api/`):
   ```bash
   git subtree push --prefix=packages/api backend main
   ```

---

## Notas Importantes

- **Siempre hacer commit local primero** antes de push a los subtrees
- Los subtree push pueden tardar unos segundos porque reconstruyen el historial
- Si solo modificaste el frontend, solo necesitas hacer push al frontend (y viceversa)
- El historial de commits se preserva en cada repositorio separado
- Vercel detectará automáticamente los cambios y hará deploy

---

## Verificar Deploys en Vercel

- Frontend: Verificar en el dashboard de Vercel para `clic-crm-frontend`
- Backend: Verificar en el dashboard de Vercel para `clic-crm-backend-api`

---

*Última actualización: 2025-01-19*
