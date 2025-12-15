/**
 * Script para corregir el campo 'origen' en paginas_web
 *
 * Clasifica las páginas como 'sistema' o 'custom' basándose en sus slugs
 */

import { query } from '../utils/db.js';

const RUTAS_ESTANDAR = [
  '',  // Homepage (slug vacío o '/')
  '/',  // Homepage (slug con barra)
  'contacto',
  'politicas-de-privacidad',
  'politicas-privacidad',
  'terminos-y-condiciones',
  'terminos-condiciones',
  'vende-con-nosotros',
  'asesores',
  'blog',
  'articulos',  // Alias de blog
  'proyectos',
  'testimonios',
  'videos',
  'propiedades',
  'propiedad',  // Singular de propiedades
  'nosotros',
  'servicios',
  '_template',  // Todos los templates son del sistema
];

function isPaginaEstandar(slug: string): boolean {
  const cleanSlug = slug.replace(/^\//, ''); // Remover barra inicial
  return RUTAS_ESTANDAR.some(rutaEst => {
    return cleanSlug === rutaEst || cleanSlug.startsWith(`${rutaEst}/`);
  });
}

async function fixPaginasOrigen() {
  try {
    console.log('🔧 Corrigiendo clasificación de páginas...\n');

    // Obtener todas las páginas
    const result = await query('SELECT id, slug, tipo_pagina, origen FROM paginas_web');
    const paginas = result.rows;

    console.log(`📄 Total de páginas: ${paginas.length}\n`);

    let sistemaCount = 0;
    let customCount = 0;
    let cambiosCount = 0;

    for (const pagina of paginas) {
      const esEstandar = isPaginaEstandar(pagina.slug);
      const origenCorrecto = esEstandar ? 'sistema' : 'custom';

      if (pagina.origen !== origenCorrecto) {
        console.log(`🔄 Actualizando: ${pagina.slug}`);
        console.log(`   Antes: ${pagina.origen} → Después: ${origenCorrecto}`);

        await query(
          'UPDATE paginas_web SET origen = $1 WHERE id = $2',
          [origenCorrecto, pagina.id]
        );

        cambiosCount++;
      }

      if (origenCorrecto === 'sistema') {
        sistemaCount++;
      } else {
        customCount++;
      }
    }

    console.log('\n✅ Corrección completada:');
    console.log(`   📊 Páginas del sistema: ${sistemaCount}`);
    console.log(`   ⭐ Páginas personalizadas: ${customCount}`);
    console.log(`   🔄 Páginas actualizadas: ${cambiosCount}`);

  } catch (error: any) {
    console.error('❌ Error al corregir páginas:', error);
    throw error;
  }
}

// Ejecutar
fixPaginasOrigen()
  .then(() => {
    console.log('\n✅ Script completado exitosamente');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Error ejecutando script:', error);
    process.exit(1);
  });
