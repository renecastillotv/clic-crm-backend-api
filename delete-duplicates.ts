/**
 * Script para eliminar páginas duplicadas
 * Elimina las páginas con slugs que tienen "/" al inicio
 */

import { query } from './src/utils/db.js';

async function deleteDuplicates() {
  try {
    console.log('🔍 Buscando páginas duplicadas...\n');

    // IDs de las páginas duplicadas a eliminar del tenant CLIC
    const duplicateIds = [
      '2bf60a1f-b3be-417c-b42c-b10236c95976', // propiedades (duplicado, mantener /propiedades)
      '1f51ac46-6326-4654-9bc7-9c6667fd4ad4', // contacto (duplicado, mantener /contacto)
      '52941fe2-3b09-422e-9ac1-5966cbef3556', // asesores (duplicado, mantener /asesores)
      '26b99cd4-30e6-49e4-b083-6a5caba98422', // articulos (duplicado, mantener /articulos)
    ];

    for (const id of duplicateIds) {
      // Obtener info de la página antes de eliminar
      const pageResult = await query(
        'SELECT id, titulo, slug, created_at FROM paginas_web WHERE id = $1',
        [id]
      );

      if (pageResult.rows.length > 0) {
        const page = pageResult.rows[0];
        console.log(`📄 Eliminando: ${page.titulo} (slug: "${page.slug}")`);
        console.log(`   ID: ${page.id}`);
        console.log(`   Creada: ${page.created_at}`);

        // Eliminar la página
        await query('DELETE FROM paginas_web WHERE id = $1', [id]);
        console.log('   ✅ Eliminada\n');
      } else {
        console.log(`⚠️  Página ${id} no encontrada\n`);
      }
    }

    // Verificar páginas restantes
    console.log('📋 Verificando páginas restantes en tenant CLIC...\n');
    const remaining = await query(
      `SELECT titulo, slug, created_at
       FROM paginas_web
       WHERE tenant_id = 'd43e30b1-61d0-46e5-a760-7595f78dd184'
       ORDER BY created_at ASC`
    );

    console.log(`Total de páginas: ${remaining.rows.length}\n`);
    remaining.rows.forEach((p: any) => {
      console.log(`  - ${p.titulo} → "${p.slug}" (${new Date(p.created_at).toLocaleDateString()})`);
    });

    console.log('\n✅ Limpieza completada!');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

deleteDuplicates();
