/**
 * Script para agregar dynamic_data al componente video_gallery
 * 
 * Ejecutar: pnpm tsx src/scripts/agregar-dynamic-data-video-gallery.ts
 */

import { query } from '../utils/db.js';
import { getTenantByIdOrSlug } from '../services/tenantsService.js';

async function agregarDynamicDataVideoGallery() {
  try {
    // Obtener el tenant CLIC
    const tenant = await getTenantByIdOrSlug('clic');
    
    if (!tenant) {
      console.error('❌ Tenant "clic" no encontrado');
      process.exit(1);
    }
    
    console.log(`✅ Tenant encontrado: ${tenant.nombre} (${tenant.id})`);
    
    // Buscar el componente video_gallery
    const result = await query(
      `SELECT id, tipo, variante, datos, pagina_id 
       FROM componentes_web 
       WHERE tenant_id = $1 AND tipo = 'video_gallery' AND activo = true
       LIMIT 1`,
      [tenant.id]
    );
    
    if (result.rows.length === 0) {
      console.error('❌ No se encontró ningún componente video_gallery activo');
      process.exit(1);
    }
    
    const componente = result.rows[0];
    console.log(`✅ Componente encontrado: ${componente.id}`);
    console.log(`   - Tipo: ${componente.tipo}`);
    console.log(`   - Variante: ${componente.variante}`);
    console.log(`   - Página ID: ${componente.pagina_id}`);
    
    // Parsear datos actuales
    const datosActuales = typeof componente.datos === 'string' 
      ? JSON.parse(componente.datos) 
      : componente.datos;
    
    console.log(`📋 Datos actuales:`, JSON.stringify(datosActuales, null, 2));
    
    // Agregar dynamic_data si no existe
    if (!datosActuales.dynamic_data) {
      datosActuales.dynamic_data = {
        dataType: 'videos',
        pagination: {
          page: 1,
          limit: 6
        },
        filters: {
          activo: true
        }
      };
      
      console.log('➕ Agregando dynamic_data...');
      console.log('📋 Nuevos datos:', JSON.stringify(datosActuales, null, 2));
      
      // Actualizar en la base de datos
      await query(
        `UPDATE componentes_web 
         SET datos = $1, updated_at = NOW()
         WHERE id = $2`,
        [JSON.stringify(datosActuales), componente.id]
      );
      
      console.log('✅ Componente actualizado exitosamente');
    } else {
      console.log('ℹ️ El componente ya tiene dynamic_data configurado');
      console.log('📋 dynamic_data actual:', JSON.stringify(datosActuales.dynamic_data, null, 2));
      
      // Verificar si tiene dataType correcto
      if (datosActuales.dynamic_data.dataType !== 'videos') {
        console.log('⚠️ dataType no es "videos", actualizando...');
        datosActuales.dynamic_data.dataType = 'videos';
        
        await query(
          `UPDATE componentes_web 
           SET datos = $1, updated_at = NOW()
           WHERE id = $2`,
          [JSON.stringify(datosActuales), componente.id]
        );
        
        console.log('✅ dataType actualizado a "videos"');
      }
    }
    
    console.log('✅ Script completado');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

agregarDynamicDataVideoGallery();

















