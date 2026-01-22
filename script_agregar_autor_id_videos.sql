-- Script para agregar campo autor_id a la tabla videos
-- Ejecutar en la base de datos NEON

-- 1. Agregar la columna autor_id de tipo UUID
ALTER TABLE videos
ADD COLUMN autor_id UUID;

-- 2. Agregar la constraint de foreign key que apunta a usuarios.id
-- Siguiendo el mismo patrón que articulos.autor_id y testimonios.asesor_id
ALTER TABLE videos
ADD CONSTRAINT videos_autor_id_fkey
FOREIGN KEY (autor_id)
REFERENCES usuarios(id)
ON DELETE SET NULL;

-- 3. Agregar un índice para mejorar las consultas por autor
-- Siguiendo el patrón de otras tablas (articulos tiene idx_articulos_categoria, etc.)
CREATE INDEX idx_videos_autor ON videos(autor_id);

-- Verificar los cambios
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'videos' 
    AND column_name = 'autor_id';

-- Verificar la constraint
SELECT 
    constraint_name,
    constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'videos' 
    AND constraint_name = 'videos_autor_id_fkey';

-- Verificar el índice
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'videos' 
    AND indexname = 'idx_videos_autor';




