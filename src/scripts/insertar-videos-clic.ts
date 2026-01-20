/**
 * Script para insertar videos mock para el tenant CLIC
 */

import { query } from '../utils/db.js';
import { getTenantByIdOrSlug } from '../services/tenantsService.js';

async function insertarVideos() {
  try {
    // Obtener el tenant CLIC
    const tenant = await getTenantByIdOrSlug('clic');
    
    if (!tenant) {
      console.error('❌ Tenant "clic" no encontrado');
      process.exit(1);
    }
    
    console.log(`✅ Tenant encontrado: ${tenant.nombre} (${tenant.id})`);
    
    // Verificar si ya hay videos
    const countResult = await query(
      `SELECT COUNT(*) as count FROM mock_videos WHERE tenant_id = $1`,
      [tenant.id]
    );
    
    const count = parseInt(countResult.rows[0].count);
    if (count > 0) {
      console.log(`ℹ️ Ya existen ${count} videos para este tenant. ¿Deseas continuar? (S/N)`);
      // Por ahora, continuamos de todas formas
    }
    
    // Obtener o crear una categoría de videos
    let categoriaId;
    const categoriaResult = await query(
      `SELECT id FROM mock_categorias_contenido 
       WHERE tenant_id = $1 AND tipo_contenido = 'videos' 
       LIMIT 1`,
      [tenant.id]
    );
    
    if (categoriaResult.rows.length > 0) {
      categoriaId = categoriaResult.rows[0].id;
      console.log(`✅ Usando categoría existente: ${categoriaId}`);
    } else {
      // Crear una categoría por defecto
      const newCategoria = await query(
        `INSERT INTO mock_categorias_contenido 
         (tenant_id, tipo_contenido, nombre, slug, descripcion, activa, orden)
         VALUES ($1, 'videos', 'General', 'general', 'Categoría general de videos', true, 1)
         RETURNING id`,
        [tenant.id]
      );
      categoriaId = newCategoria.rows[0].id;
      console.log(`✅ Categoría creada: ${categoriaId}`);
    }
    
    // Insertar videos
    const videos = [
      {
        titulo: 'Tour Virtual: Apartamento de Lujo en Zona Premium',
        descripcion: 'Descubre este espectacular apartamento de 3 habitaciones con vista al mar',
        url_video: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        thumbnail_url: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800',
        duracion: '05:32',
        vistas: 1245,
        fecha_publicacion: new Date('2024-01-15'),
      },
      {
        titulo: 'Casa Moderna con Piscina y Jardín',
        descripcion: 'Hermosa casa de 4 habitaciones con amplio jardín y piscina privada',
        url_video: 'https://www.youtube.com/watch?v=jNQXAC9IVRw',
        thumbnail_url: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        duracion: '07:15',
        vistas: 892,
        fecha_publicacion: new Date('2024-01-20'),
      },
      {
        titulo: 'Vista Panorámica: Penthouse en el Centro',
        descripcion: 'Lujoso penthouse con terraza y vista 360° de la ciudad',
        url_video: 'https://www.youtube.com/watch?v=9bZkp7q19f0',
        thumbnail_url: 'https://images.unsplash.com/photo-1570129477491-b579702052c8?w=800',
        duracion: '06:45',
        vistas: 1532,
        fecha_publicacion: new Date('2024-02-01'),
      },
      {
        titulo: 'Propiedad en la Playa: Paraíso Tropical',
        descripcion: 'Casa frente al mar con acceso directo a la playa',
        url_video: 'https://www.youtube.com/watch?v=kJQP7kiw5Fk',
        thumbnail_url: 'https://images.unsplash.com/photo-1592595896551-f771153876e5?w=800',
        duracion: '08:20',
        vistas: 2103,
        fecha_publicacion: new Date('2024-02-10'),
      },
      {
        titulo: 'Apartamento Minimalista en el Centro',
        descripcion: 'Moderno apartamento de 2 habitaciones con diseño minimalista',
        url_video: 'https://www.youtube.com/watch?v=LXb3EKWsInQ',
        thumbnail_url: 'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800',
        duracion: '04:50',
        vistas: 678,
        fecha_publicacion: new Date('2024-02-15'),
      },
      {
        titulo: 'Villa de Lujo con Vista al Océano',
        descripcion: 'Espectacular villa con todas las comodidades',
        url_video: 'https://www.youtube.com/watch?v=ZbZSe6N_BXs',
        thumbnail_url: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        duracion: '09:30',
        vistas: 3456,
        fecha_publicacion: new Date('2024-02-20'),
      },
      {
        titulo: 'Casa Familiar con Espacios Amplios',
        descripcion: 'Perfecta para familias grandes, con 5 habitaciones y sala de juegos',
        url_video: 'https://www.youtube.com/watch?v=YQHsXMglC9A',
        thumbnail_url: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
        duracion: '06:00',
        vistas: 987,
        fecha_publicacion: new Date('2024-03-01'),
      },
      {
        titulo: 'Estudio Moderno en Zona Céntrica',
        descripcion: 'Ideal para jóvenes profesionales, completamente amueblado',
        url_video: 'https://www.youtube.com/watch?v=fJ9rUzIMcZQ',
        thumbnail_url: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        duracion: '03:45',
        vistas: 543,
        fecha_publicacion: new Date('2024-03-05'),
      },
    ];
    
    console.log(`\n📹 Insertando ${videos.length} videos...`);
    
    for (const video of videos) {
      await query(
        `INSERT INTO mock_videos 
         (tenant_id, titulo, descripcion, url_video, thumbnail_url, duracion, 
          categoria_id, metadata, traducciones, activo, vistas, fecha_publicacion)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          tenant.id,
          video.titulo,
          video.descripcion,
          video.url_video,
          video.thumbnail_url,
          video.duracion,
          categoriaId,
          JSON.stringify({ tipo: 'tour_virtual' }),
          JSON.stringify({}),
          true,
          video.vistas,
          video.fecha_publicacion,
        ]
      );
      console.log(`   ✅ ${video.titulo}`);
    }
    
    console.log(`\n✅ ${videos.length} videos insertados exitosamente`);
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

insertarVideos();

















