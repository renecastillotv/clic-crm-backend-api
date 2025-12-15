/**
 * Script para crear categorías de testimonios y testimonios de ejemplo
 */

import { query } from './src/utils/db.js';

const TENANT_ID = 'd43e30b1-61d0-46e5-a760-7595f78dd184'; // CLIC tenant

async function seedTestimonios() {
  try {
    console.log('🌱 Iniciando seed de testimonios...\n');

    // 1. Crear categorías de testimonios
    console.log('📁 Creando categorías de testimonios...');

    const categorias = [
      { nombre: 'Servicio al Cliente', slug: 'servicio', descripcion: 'Testimonios sobre nuestro servicio al cliente', icono: '⭐', color: '#4CAF50' },
      { nombre: 'Compra de Propiedades', slug: 'compra', descripcion: 'Experiencias de clientes que compraron propiedades', icono: '🏠', color: '#2196F3' },
      { nombre: 'Venta de Propiedades', slug: 'venta', descripcion: 'Testimonios de clientes que vendieron con nosotros', icono: '💰', color: '#FF9800' },
      { nombre: 'Alquiler', slug: 'alquiler', descripcion: 'Experiencias en alquiler de propiedades', icono: '🔑', color: '#9C27B0' },
    ];

    const categoriasCreadas: { [key: string]: string } = {};

    for (let i = 0; i < categorias.length; i++) {
      const cat = categorias[i];
      const result = await query(`
        INSERT INTO categorias_contenido (tenant_id, tipo, nombre, slug, descripcion, icono, color, orden, activa)
        VALUES ($1, 'testimonio', $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (tenant_id, tipo, slug) DO UPDATE SET
          nombre = EXCLUDED.nombre,
          descripcion = EXCLUDED.descripcion,
          icono = EXCLUDED.icono,
          color = EXCLUDED.color,
          activa = true
        RETURNING id, nombre, slug
      `, [TENANT_ID, cat.nombre, cat.slug, cat.descripcion, cat.icono, cat.color, i + 1]);

      if (result.rows[0]) {
        categoriasCreadas[cat.slug] = result.rows[0].id;
        console.log(`   ✅ Categoría "${cat.nombre}" (${cat.slug})`);
      }
    }

    console.log(`\n📊 ${Object.keys(categoriasCreadas).length} categorías creadas/actualizadas\n`);

    // 2. Crear testimonios de ejemplo
    console.log('💬 Creando testimonios de ejemplo...');

    const testimonios = [
      {
        slug: 'maria-gonzalez-servicio',
        cliente_nombre: 'María González',
        cliente_cargo: 'Empresaria',
        cliente_empresa: 'Tech Solutions',
        cliente_ubicacion: 'Ciudad de México',
        titulo: 'Excelente atención personalizada',
        contenido: 'Desde el primer contacto, el equipo de CLIC me brindó una atención excepcional. Entendieron exactamente lo que buscaba y me presentaron opciones que se ajustaban perfectamente a mis necesidades. El proceso fue transparente y profesional en todo momento.',
        rating: 5,
        categoria_slug: 'servicio',
        destacado: true,
      },
      {
        slug: 'carlos-ruiz-compra',
        cliente_nombre: 'Carlos Ruiz',
        cliente_cargo: 'Director Financiero',
        cliente_empresa: 'Inversiones MX',
        cliente_ubicacion: 'Guadalajara',
        titulo: 'Encontré mi hogar ideal',
        contenido: 'Después de meses buscando, CLIC me ayudó a encontrar la casa perfecta para mi familia. Su conocimiento del mercado y su paciencia para mostrarme diferentes opciones hicieron toda la diferencia. ¡Altamente recomendados!',
        rating: 5,
        categoria_slug: 'compra',
        destacado: true,
      },
      {
        slug: 'ana-martinez-venta',
        cliente_nombre: 'Ana Martínez',
        cliente_cargo: 'Arquitecta',
        cliente_empresa: 'Diseño AM',
        cliente_ubicacion: 'Monterrey',
        titulo: 'Vendí mi propiedad en tiempo récord',
        contenido: 'Necesitaba vender mi departamento rápidamente y CLIC lo logró en menos de un mes. Su estrategia de marketing y red de contactos fueron clave. Obtuve incluso más de lo que esperaba.',
        rating: 5,
        categoria_slug: 'venta',
        destacado: false,
      },
      {
        slug: 'pedro-sanchez-alquiler',
        cliente_nombre: 'Pedro Sánchez',
        cliente_cargo: 'Ingeniero de Software',
        cliente_empresa: 'Startup Hub',
        cliente_ubicacion: 'CDMX',
        titulo: 'Proceso de alquiler sin complicaciones',
        contenido: 'Alquilar con CLIC fue increíblemente fácil. Me ayudaron con toda la documentación y negociación. El departamento estaba en perfectas condiciones y el trato con el propietario ha sido excelente gracias a su mediación.',
        rating: 4,
        categoria_slug: 'alquiler',
        destacado: false,
      },
      {
        slug: 'laura-fernandez-servicio',
        cliente_nombre: 'Laura Fernández',
        cliente_cargo: 'Médica',
        cliente_empresa: 'Hospital Central',
        cliente_ubicacion: 'Querétaro',
        titulo: 'Profesionalismo en cada paso',
        contenido: 'Lo que más valoro de CLIC es su profesionalismo. Siempre disponibles para resolver dudas, con información clara y honesta sobre cada propiedad. Hicieron que un proceso que podía ser estresante fuera completamente tranquilo.',
        rating: 5,
        categoria_slug: 'servicio',
        destacado: true,
      },
      {
        slug: 'roberto-diaz-compra',
        cliente_nombre: 'Roberto Díaz',
        cliente_cargo: 'Emprendedor',
        cliente_empresa: 'Díaz & Asociados',
        cliente_ubicacion: 'Puebla',
        titulo: 'Inversión segura gracias a su asesoría',
        contenido: 'Como inversionista, necesitaba un equipo que entendiera el mercado inmobiliario. CLIC no solo me ayudó a encontrar propiedades con buen potencial, sino que me asesoraron en cada paso del proceso legal y financiero.',
        rating: 5,
        categoria_slug: 'compra',
        destacado: false,
      },
    ];

    for (const test of testimonios) {
      const categoriaId = categoriasCreadas[test.categoria_slug];

      const result = await query(`
        INSERT INTO testimonios (
          tenant_id, slug, cliente_nombre, cliente_cargo, cliente_empresa,
          cliente_ubicacion, titulo, contenido, rating, categoria_id,
          publicado, destacado, verificado, fecha
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, true, $11, true, NOW())
        ON CONFLICT (tenant_id, slug) DO UPDATE SET
          cliente_nombre = EXCLUDED.cliente_nombre,
          cliente_cargo = EXCLUDED.cliente_cargo,
          cliente_empresa = EXCLUDED.cliente_empresa,
          cliente_ubicacion = EXCLUDED.cliente_ubicacion,
          titulo = EXCLUDED.titulo,
          contenido = EXCLUDED.contenido,
          rating = EXCLUDED.rating,
          categoria_id = EXCLUDED.categoria_id,
          destacado = EXCLUDED.destacado,
          publicado = true
        RETURNING id, titulo
      `, [
        TENANT_ID, test.slug, test.cliente_nombre, test.cliente_cargo,
        test.cliente_empresa, test.cliente_ubicacion, test.titulo,
        test.contenido, test.rating, categoriaId, test.destacado
      ]);

      if (result.rows[0]) {
        console.log(`   ✅ Testimonio: "${test.titulo}" (${test.categoria_slug})`);
      }
    }

    console.log(`\n📊 ${testimonios.length} testimonios creados/actualizados\n`);

    // 3. Verificar resultado
    console.log('🔍 Verificando datos...');

    const catCount = await query(`
      SELECT COUNT(*) as count FROM categorias_contenido
      WHERE tenant_id = $1 AND tipo = 'testimonio' AND activa = true
    `, [TENANT_ID]);

    const testCount = await query(`
      SELECT COUNT(*) as count FROM testimonios
      WHERE tenant_id = $1 AND publicado = true
    `, [TENANT_ID]);

    console.log(`   📁 Categorías de testimonios: ${catCount.rows[0].count}`);
    console.log(`   💬 Testimonios publicados: ${testCount.rows[0].count}`);

    console.log('\n✅ Seed completado exitosamente!');

  } catch (error) {
    console.error('❌ Error:', error);
  }

  process.exit(0);
}

seedTestimonios();
