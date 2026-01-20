import type { Knex } from 'knex';

/**
 * Migración para cambiar las columnas de imagen de VARCHAR(500) a TEXT
 * Las URLs de Cloudflare R2 con tokens JWT pueden exceder 500 caracteres
 */

export async function up(knex: Knex): Promise<void> {
  // Cambiar imagen_principal a TEXT en articulos
  await knex.raw(`
    ALTER TABLE articulos
    ALTER COLUMN imagen_principal TYPE TEXT;
  `);

  // Cambiar thumbnail a TEXT en videos
  await knex.raw(`
    ALTER TABLE videos
    ALTER COLUMN thumbnail TYPE TEXT;
  `);

  // Cambiar video_url a TEXT en videos
  await knex.raw(`
    ALTER TABLE videos
    ALTER COLUMN video_url TYPE TEXT;
  `);

  // Cambiar cliente_foto a TEXT en testimonios
  await knex.raw(`
    ALTER TABLE testimonios
    ALTER COLUMN cliente_foto TYPE TEXT;
  `);

  console.log('✅ Columnas de imagen cambiadas a TEXT en tablas de contenido');
}

export async function down(knex: Knex): Promise<void> {
  // Revertir a VARCHAR(500)
  await knex.raw(`
    ALTER TABLE articulos
    ALTER COLUMN imagen_principal TYPE VARCHAR(500);
  `);

  await knex.raw(`
    ALTER TABLE videos
    ALTER COLUMN thumbnail TYPE VARCHAR(500);
  `);

  await knex.raw(`
    ALTER TABLE videos
    ALTER COLUMN video_url TYPE VARCHAR(500);
  `);

  await knex.raw(`
    ALTER TABLE testimonios
    ALTER COLUMN cliente_foto TYPE VARCHAR(500);
  `);

  console.log('✅ Columnas de imagen revertidas a VARCHAR(500)');
}
