/**
 * Script para verificar y agregar videos al tenant CLIC si no existen
 */

import { query } from '../utils/db.js';
import { getTenantByIdOrSlug } from '../services/tenantsService.js';

async function verificarVideos() {
  try {
    // Obtener el tenant CLIC
    const tenant = await getTenantByIdOrSlug('clic');
    
    if (!tenant) {
      console.error('❌ Tenant "clic" no encontrado');
      process.exit(1);
    }
    
    console.log(`✅ Tenant encontrado: ${tenant.nombre} (${tenant.id})`);
    
    // Verificar si hay videos
    const videosResult = await query(
      `SELECT COUNT(*) as count FROM mock_videos WHERE tenant_id = $1`,
      [tenant.id]
    );
    
    const count = parseInt(videosResult.rows[0].count);
    console.log(`📊 Videos existentes: ${count}`);
    
    if (count === 0) {
      console.log('⚠️ No hay videos. Necesitas ejecutar el seed.');
      console.log('   Ejecuta: pnpm --filter api seed:run');
      process.exit(1);
    }
    
    // Listar algunos videos
    const videos = await query(
      `SELECT id, titulo, activo, fecha_publicacion 
       FROM mock_videos 
       WHERE tenant_id = $1 
       ORDER BY fecha_publicacion DESC 
       LIMIT 5`,
      [tenant.id]
    );
    
    console.log(`\n📹 Primeros 5 videos:`);
    videos.rows.forEach((video, i) => {
      console.log(`   [${i + 1}] ${video.titulo} (activo: ${video.activo})`);
    });
    
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

verificarVideos();
















