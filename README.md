# API Package

APIs del proyecto CRM. Actualmente desplegadas en Vercel, con migración futura a AWS App Runner.

## Características

- 🚀 Express.js
- 📦 TypeScript
- 🔄 Compatible con Vercel Serverless Functions
- 🐳 Dockerfile para AWS App Runner
- 📋 Configuración App Runner incluida
- 🗄️ Sistema de migraciones con Knex.js
- 📊 Esquema de base de datos en código

## Desarrollo Local

1. Copia el archivo `.env.example` a `.env`:
```bash
cp .env.example .env
```

2. Asegúrate de que la variable `DATABASE_URL` esté configurada en `.env`

3. Instala las dependencias e inicia el servidor:
```bash
pnpm install
pnpm dev
```

El servidor se ejecutará en `http://localhost:3001`

### Probar la conexión a la base de datos

Una vez que el servidor esté corriendo, puedes probar la conexión visitando:
```
http://localhost:3001/api/db/test
```

### Consultar el esquema de la base de datos

Puedes consultar el esquema completo:
```
http://localhost:3001/api/schema
```

O una tabla específica:
```
http://localhost:3001/api/schema/nombre_tabla
```

## Migraciones

### Crear una nueva migración
```bash
pnpm migrate:make nombre_descriptivo
```

### Aplicar migraciones
```bash
pnpm migrate:latest
```

### Revertir última migración
```bash
pnpm migrate:rollback
```

### Ver estado de migraciones
```bash
pnpm migrate:status
```

## Esquema de Base de Datos

El esquema de la base de datos está definido en `src/database/schema.ts`. 

**IMPORTANTE**: Después de crear una migración, debes actualizar el esquema en este archivo.

### Generar documentación del esquema
```bash
pnpm schema:generate
```

Esto generará un archivo `SCHEMA_DOCUMENTATION.md` con toda la información del esquema.

## Manual de Trabajo

Consulta el [MANUAL_BASE_DATOS.md](./MANUAL_BASE_DATOS.md) para:
- Cómo crear tablas
- Cómo modificar tablas existentes
- Cómo agregar relaciones
- Buenas prácticas
- Solución de problemas

## Build

```bash
pnpm build
```

## Despliegue

### Vercel (Actual)

Las funciones serverless se despliegan automáticamente usando `vercel.json`.

### AWS App Runner (Futuro)

Usa el `Dockerfile` y `apprunner.yaml` incluidos para desplegar en AWS App Runner.

## Estructura

```
src/
├── config/
│   ├── database.ts      # Configuración del pool de conexiones
│   └── knexfile.ts       # Configuración de Knex para migraciones
├── database/
│   ├── migrations/      # Archivos de migración
│   ├── seeds/           # Archivos de seed (datos iniciales)
│   └── schema.ts         # Esquema de base de datos en código
├── routes/               # Definición de rutas
├── controllers/          # Lógica de negocio
├── middleware/            # Middlewares personalizados
├── utils/
│   └── db.ts             # Utilidades para queries
└── scripts/
    └── generate-schema.ts # Script para generar documentación
```
