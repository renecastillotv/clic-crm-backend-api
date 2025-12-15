# Configuración de Variables de Entorno

Para configurar la base de datos, crea un archivo `.env` en el directorio `packages/api/` con el siguiente contenido:

## Ejemplo de archivo `.env`

```env
# Opción 1: URL completa de conexión (recomendado para servicios en la nube)
DATABASE_URL=postgresql://usuario:contraseña@host:puerto/nombre_base_datos

# Opción 2: Variables individuales (para PostgreSQL local)
# DB_HOST=localhost
# DB_PORT=5432
# DB_USER=postgres
# DB_PASSWORD=tu_contraseña
# DB_NAME=nombre_base_datos

# Puerto del servidor API
PORT=3001

# Ambiente
NODE_ENV=development

# Cloudflare R2 (Almacenamiento de archivos)
# Obtén estas credenciales desde tu dashboard de Cloudflare R2
R2_ACCOUNT_ID=tu_account_id_aqui
R2_ACCESS_KEY_ID=tu_access_key_id_aqui
R2_SECRET_ACCESS_KEY=tu_secret_access_key_aqui
R2_BUCKET_NAME=nombre_de_tu_bucket
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev  # URL pública de tu bucket (opcional)

# Alternativamente, puedes usar estos nombres de variables:
# CLOUDFLARE_R2_ACCOUNT_ID=...
# CLOUDFLARE_R2_ACCESS_KEY_ID=...
# CLOUDFLARE_R2_SECRET_ACCESS_KEY=...
# CLOUDFLARE_R2_BUCKET_NAME=...
# CLOUDFLARE_R2_PUBLIC_URL=...
```
<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
read_file

## Ejemplos de DATABASE_URL

### PostgreSQL Local
```
DATABASE_URL=postgresql://postgres:password@localhost:5432/crm_db
```

### Neon.tech
```
DATABASE_URL=postgresql://user:pass@ep-xxx.region.aws.neon.tech/neondb?sslmode=require
```

### Supabase
```
DATABASE_URL=postgresql://postgres:password@db.xxx.supabase.co:5432/postgres
```

## Nota

Si no tienes una base de datos configurada, la API funcionará normalmente pero las funciones que requieran base de datos estarán limitadas.


