/**
 * Script para actualizar los tipos de página de videos para que sean dinámicos
 */

import { query } from '../utils/db.js';

async function updateVideoPageTypes() {
  try {
    console.log('🔄 Actualizando tipos de página de videos...');
    
    // Actualizar video_category
    await query(`
      UPDATE tipos_pagina
      SET 
        descripcion = 'Página DINÁMICA que muestra videos de cualquier categoría. Se reutiliza para todas las categorías según la URL (/videos/[categoria])',
        requiere_slug = false,
        configuracion = jsonb_set(
          configuracion,
          '{is_template}',
          'true'::jsonb
        )
      WHERE codigo = 'video_category'
    `);
    console.log('✅ Tipo video_category actualizado');
    
    // Actualizar video_single
    await query(`
      UPDATE tipos_pagina
      SET 
        descripcion = 'Página DINÁMICA que muestra cualquier video. Se reutiliza para todos los videos según la URL (/videos/[categoria]/[video])',
        requiere_slug = false,
        configuracion = jsonb_set(
          configuracion,
          '{is_template}',
          'true'::jsonb
        )
      WHERE codigo = 'video_single'
    `);
    console.log('✅ Tipo video_single actualizado');
    
    console.log('✅ Tipos de página actualizados exitosamente');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

updateVideoPageTypes();

















