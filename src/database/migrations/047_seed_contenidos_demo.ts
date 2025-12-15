import type { Knex } from 'knex';

/**
 * Seed de datos de ejemplo para tablas de contenidos
 * Inserta contenido para el tenant "otro-demo"
 */

export async function up(knex: Knex): Promise<void> {
  // Obtener tenant "otro-demo"
  const tenant = await knex('tenants').where('slug', 'otro-demo').first();

  if (!tenant) {
    console.log('⚠️ Tenant "otro-demo" no encontrado. Saltando seed de contenidos.');
    return;
  }

  const tenantId = tenant.id;

  // =============================================
  // 1. CATEGORÍAS
  // =============================================
  const categorias = await knex('categorias_contenido').insert([
    // Categorías de artículos
    {
      tenant_id: tenantId,
      slug: 'consejos-compradores',
      tipo: 'articulo',
      nombre: 'Consejos para Compradores',
      descripcion: 'Tips y guías para quienes buscan comprar propiedad',
      traducciones: JSON.stringify({
        en: { nombre: 'Buyer Tips', descripcion: 'Tips and guides for property buyers' },
        pt: { nombre: 'Dicas para Compradores', descripcion: 'Dicas e guias para compradores de imóveis' }
      }),
      icono: 'home',
      color: '#3182ce',
      orden: 1
    },
    {
      tenant_id: tenantId,
      slug: 'mercado-inmobiliario',
      tipo: 'articulo',
      nombre: 'Mercado Inmobiliario',
      descripcion: 'Análisis y tendencias del mercado',
      traducciones: JSON.stringify({
        en: { nombre: 'Real Estate Market', descripcion: 'Market analysis and trends' },
        pt: { nombre: 'Mercado Imobiliário', descripcion: 'Análise e tendências do mercado' }
      }),
      icono: 'trending-up',
      color: '#38a169',
      orden: 2
    },
    {
      tenant_id: tenantId,
      slug: 'inversiones',
      tipo: 'articulo',
      nombre: 'Inversiones',
      descripcion: 'Guías de inversión inmobiliaria',
      traducciones: JSON.stringify({
        en: { nombre: 'Investments', descripcion: 'Real estate investment guides' },
        pt: { nombre: 'Investimentos', descripcion: 'Guias de investimento imobiliário' }
      }),
      icono: 'dollar-sign',
      color: '#d69e2e',
      orden: 3
    },
    // Categorías de videos
    {
      tenant_id: tenantId,
      slug: 'tours-virtuales',
      tipo: 'video',
      nombre: 'Tours Virtuales',
      descripcion: 'Recorridos virtuales de propiedades',
      traducciones: JSON.stringify({
        en: { nombre: 'Virtual Tours', descripcion: 'Virtual property tours' }
      }),
      icono: 'video',
      color: '#e53e3e',
      orden: 1
    },
    {
      tenant_id: tenantId,
      slug: 'testimonios-clientes',
      tipo: 'video',
      nombre: 'Testimonios',
      descripcion: 'Videos de clientes satisfechos',
      traducciones: JSON.stringify({
        en: { nombre: 'Testimonials', descripcion: 'Satisfied customer videos' }
      }),
      icono: 'users',
      color: '#805ad5',
      orden: 2
    },
    // Categorías de FAQs
    {
      tenant_id: tenantId,
      slug: 'proceso-compra',
      tipo: 'faq',
      nombre: 'Proceso de Compra',
      descripcion: 'Preguntas sobre el proceso de compra',
      traducciones: JSON.stringify({
        en: { nombre: 'Buying Process', descripcion: 'Questions about the buying process' }
      }),
      icono: 'help-circle',
      color: '#3182ce',
      orden: 1
    },
    {
      tenant_id: tenantId,
      slug: 'financiamiento',
      tipo: 'faq',
      nombre: 'Financiamiento',
      descripcion: 'Preguntas sobre créditos y financiamiento',
      traducciones: JSON.stringify({
        en: { nombre: 'Financing', descripcion: 'Questions about loans and financing' }
      }),
      icono: 'credit-card',
      color: '#38a169',
      orden: 2
    }
  ]).returning('*');

  // Mapear categorías por slug para referencia
  const catMap: Record<string, string> = {};
  categorias.forEach((c: any) => { catMap[c.slug] = c.id; });

  // =============================================
  // 2. ARTÍCULOS
  // =============================================
  await knex('articulos').insert([
    {
      tenant_id: tenantId,
      categoria_id: catMap['consejos-compradores'],
      slug: 'guia-comprar-primera-casa',
      idioma: 'es',
      titulo: 'Guía Completa para Comprar tu Primera Casa',
      extracto: 'Todo lo que necesitas saber antes de dar el gran paso hacia tu primera propiedad.',
      contenido: `<h2>Introducción</h2>
<p>Comprar tu primera casa es uno de los pasos más importantes en la vida. Esta guía te ayudará a navegar el proceso con confianza.</p>

<h2>1. Evalúa tu situación financiera</h2>
<p>Antes de comenzar la búsqueda, es fundamental conocer tu capacidad de endeudamiento. Revisa tu historial crediticio y calcula cuánto puedes destinar mensualmente al pago de una hipoteca.</p>

<h2>2. Define tus prioridades</h2>
<p>Haz una lista de características esenciales vs. deseables. Considera ubicación, tamaño, número de habitaciones y cercanía a servicios.</p>

<h2>3. Busca asesoría profesional</h2>
<p>Un agente inmobiliario experimentado puede ahorrarte tiempo y dinero, además de guiarte en la negociación.</p>

<h2>Conclusión</h2>
<p>Con la preparación adecuada, comprar tu primera casa puede ser una experiencia emocionante y gratificante.</p>`,
      imagen_principal: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800',
      autor_nombre: 'María García',
      autor_foto: 'https://randomuser.me/api/portraits/women/44.jpg',
      meta_titulo: 'Guía para Comprar tu Primera Casa | Otro Demo',
      meta_descripcion: 'Descubre todos los pasos para comprar tu primera propiedad de forma segura.',
      tags: JSON.stringify(['primera-casa', 'compradores', 'guía', 'hipoteca']),
      traducciones: JSON.stringify({
        en: {
          titulo: 'Complete Guide to Buying Your First Home',
          extracto: 'Everything you need to know before taking the big step towards your first property.',
          contenido: '<h2>Introduction</h2><p>Buying your first home is one of the most important steps in life...</p>'
        }
      }),
      publicado: true,
      destacado: true,
      fecha_publicacion: new Date('2024-11-15')
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['mercado-inmobiliario'],
      slug: 'tendencias-mercado-2024',
      idioma: 'es',
      titulo: 'Tendencias del Mercado Inmobiliario 2024',
      extracto: 'Análisis de las principales tendencias que están moldeando el mercado este año.',
      contenido: `<h2>El Mercado en 2024</h2>
<p>El mercado inmobiliario continúa evolucionando con nuevas tendencias que todo inversor debe conocer.</p>

<h2>1. Auge de las propiedades sostenibles</h2>
<p>Los compradores buscan cada vez más casas con certificaciones verdes y eficiencia energética.</p>

<h2>2. Digitalización del sector</h2>
<p>Los tours virtuales y las firmas digitales se han convertido en estándar de la industria.</p>

<h2>3. Nuevas zonas de desarrollo</h2>
<p>Las áreas suburbanas ganan popularidad con el aumento del trabajo remoto.</p>`,
      imagen_principal: 'https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?w=800',
      autor_nombre: 'Carlos Rodríguez',
      autor_foto: 'https://randomuser.me/api/portraits/men/32.jpg',
      tags: JSON.stringify(['mercado', 'tendencias', '2024', 'análisis']),
      traducciones: JSON.stringify({
        en: {
          titulo: 'Real Estate Market Trends 2024',
          extracto: 'Analysis of the main trends shaping the market this year.'
        }
      }),
      publicado: true,
      destacado: false,
      fecha_publicacion: new Date('2024-10-20')
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['inversiones'],
      slug: 'invertir-bienes-raices-principiantes',
      idioma: 'es',
      titulo: 'Cómo Invertir en Bienes Raíces: Guía para Principiantes',
      extracto: 'Aprende los fundamentos de la inversión inmobiliaria y cómo comenzar con poco capital.',
      contenido: `<h2>¿Por qué invertir en bienes raíces?</h2>
<p>La inversión inmobiliaria ha demostrado ser una de las formas más seguras de generar riqueza a largo plazo.</p>

<h2>Tipos de inversión inmobiliaria</h2>
<ul>
<li><strong>Compra para alquiler:</strong> Genera ingresos pasivos mensuales</li>
<li><strong>Flipping:</strong> Comprar, renovar y vender</li>
<li><strong>REITs:</strong> Invertir en fondos inmobiliarios</li>
</ul>

<h2>Primeros pasos</h2>
<p>Comienza educándote sobre el mercado local y establece un presupuesto realista.</p>`,
      imagen_principal: 'https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=800',
      autor_nombre: 'Ana Martínez',
      autor_foto: 'https://randomuser.me/api/portraits/women/68.jpg',
      tags: JSON.stringify(['inversión', 'principiantes', 'guía', 'rentabilidad']),
      traducciones: JSON.stringify({
        en: {
          titulo: 'How to Invest in Real Estate: Beginner Guide',
          extracto: 'Learn the fundamentals of real estate investing and how to start with little capital.'
        }
      }),
      publicado: true,
      destacado: true,
      fecha_publicacion: new Date('2024-09-10')
    }
  ]);

  // =============================================
  // 3. TESTIMONIOS
  // =============================================
  await knex('testimonios').insert([
    {
      tenant_id: tenantId,
      slug: 'testimonio-familia-gonzalez',
      idioma: 'es',
      cliente_nombre: 'Roberto González',
      cliente_cargo: 'Empresario',
      cliente_empresa: 'González & Asociados',
      cliente_foto: 'https://randomuser.me/api/portraits/men/45.jpg',
      cliente_ubicacion: 'Santo Domingo',
      titulo: 'Encontramos la casa de nuestros sueños',
      contenido: 'El equipo de Otro Demo nos ayudó a encontrar la casa perfecta para nuestra familia. Su profesionalismo y dedicación hicieron que todo el proceso fuera muy sencillo. Estamos muy agradecidos por su excelente servicio.',
      traducciones: JSON.stringify({
        en: {
          titulo: 'We found our dream home',
          contenido: 'The Otro Demo team helped us find the perfect home for our family. Their professionalism and dedication made the whole process very easy.'
        }
      }),
      rating: 5.0,
      publicado: true,
      destacado: true,
      verificado: true,
      fuente: 'google',
      fecha: new Date('2024-10-15')
    },
    {
      tenant_id: tenantId,
      slug: 'testimonio-maria-fernandez',
      idioma: 'es',
      cliente_nombre: 'María Fernández',
      cliente_cargo: 'Doctora',
      cliente_foto: 'https://randomuser.me/api/portraits/women/33.jpg',
      cliente_ubicacion: 'Punta Cana',
      titulo: 'Inversión segura y rentable',
      contenido: 'Invertí en un apartamento en la playa siguiendo sus consejos y ha sido una de las mejores decisiones financieras. El retorno de inversión superó mis expectativas.',
      traducciones: JSON.stringify({
        en: {
          titulo: 'Safe and profitable investment',
          contenido: 'I invested in a beachfront apartment following their advice and it has been one of the best financial decisions.'
        }
      }),
      rating: 5.0,
      publicado: true,
      destacado: true,
      verificado: true,
      fuente: 'directo',
      fecha: new Date('2024-09-20')
    },
    {
      tenant_id: tenantId,
      slug: 'testimonio-juan-perez',
      idioma: 'es',
      cliente_nombre: 'Juan Pérez',
      cliente_cargo: 'Ingeniero',
      cliente_empresa: 'Tech Solutions',
      cliente_foto: 'https://randomuser.me/api/portraits/men/22.jpg',
      cliente_ubicacion: 'Santiago',
      titulo: 'Servicio excepcional',
      contenido: 'Como comprador primerizo estaba nervioso, pero el equipo me guió paso a paso. Resolvieron todas mis dudas y me ayudaron a conseguir el mejor financiamiento.',
      traducciones: JSON.stringify({
        en: {
          titulo: 'Exceptional service',
          contenido: 'As a first-time buyer I was nervous, but the team guided me step by step.'
        }
      }),
      rating: 4.5,
      publicado: true,
      destacado: false,
      verificado: true,
      fuente: 'facebook',
      fecha: new Date('2024-08-05')
    }
  ]);

  // =============================================
  // 4. VIDEOS
  // =============================================
  await knex('videos').insert([
    {
      tenant_id: tenantId,
      categoria_id: catMap['tours-virtuales'],
      slug: 'tour-penthouse-piantini',
      idioma: 'es',
      titulo: 'Tour Virtual: Penthouse de Lujo en Piantini',
      descripcion: 'Descubre este espectacular penthouse de 400m² con vista panorámica a la ciudad. 4 habitaciones, terraza privada y acabados de primera.',
      traducciones: JSON.stringify({
        en: {
          titulo: 'Virtual Tour: Luxury Penthouse in Piantini',
          descripcion: 'Discover this spectacular 400m² penthouse with panoramic city views.'
        }
      }),
      tipo_video: 'youtube',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      video_id: 'dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      duracion_segundos: 180,
      tags: JSON.stringify(['tour', 'penthouse', 'lujo', 'piantini']),
      publicado: true,
      destacado: true,
      orden: 1
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['tours-virtuales'],
      slug: 'tour-villa-cap-cana',
      idioma: 'es',
      titulo: 'Tour Virtual: Villa Frente al Mar en Cap Cana',
      descripcion: 'Impresionante villa de 5 habitaciones con acceso directo a la playa. Piscina infinity, muelle privado y jardines tropicales.',
      traducciones: JSON.stringify({
        en: {
          titulo: 'Virtual Tour: Beachfront Villa in Cap Cana',
          descripcion: 'Stunning 5-bedroom villa with direct beach access.'
        }
      }),
      tipo_video: 'youtube',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      video_id: 'dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      duracion_segundos: 240,
      tags: JSON.stringify(['tour', 'villa', 'playa', 'cap-cana']),
      publicado: true,
      destacado: true,
      orden: 2
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['testimonios-clientes'],
      slug: 'testimonio-video-familia-martinez',
      idioma: 'es',
      titulo: 'Familia Martínez - Su Experiencia Comprando con Nosotros',
      descripcion: 'La familia Martínez comparte cómo encontraron su hogar ideal después de meses de búsqueda.',
      traducciones: JSON.stringify({
        en: {
          titulo: 'Martinez Family - Their Experience Buying With Us',
          descripcion: 'The Martinez family shares how they found their ideal home.'
        }
      }),
      tipo_video: 'youtube',
      video_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      video_id: 'dQw4w9WgXcQ',
      thumbnail: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800',
      duracion_segundos: 120,
      tags: JSON.stringify(['testimonio', 'cliente', 'experiencia']),
      publicado: true,
      destacado: false,
      orden: 3
    }
  ]);

  // =============================================
  // 5. FAQs
  // =============================================
  await knex('faqs').insert([
    {
      tenant_id: tenantId,
      categoria_id: catMap['proceso-compra'],
      idioma: 'es',
      pregunta: '¿Cuáles son los pasos para comprar una propiedad?',
      respuesta: `El proceso de compra incluye los siguientes pasos:

1. **Pre-aprobación de financiamiento**: Obtén una carta de pre-aprobación de tu banco.
2. **Búsqueda de propiedad**: Trabajamos contigo para encontrar opciones que se ajusten a tus necesidades.
3. **Visitas y evaluación**: Coordinamos visitas a las propiedades de tu interés.
4. **Oferta y negociación**: Te asesoramos en la presentación de una oferta competitiva.
5. **Due diligence**: Verificamos el estado legal y físico de la propiedad.
6. **Cierre**: Firmamos el contrato y te entregamos las llaves de tu nuevo hogar.`,
      traducciones: JSON.stringify({
        en: {
          pregunta: 'What are the steps to buy a property?',
          respuesta: 'The buying process includes the following steps: 1. Financing pre-approval...'
        }
      }),
      contexto: 'compra',
      publicado: true,
      destacada: true,
      orden: 1
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['proceso-compra'],
      idioma: 'es',
      pregunta: '¿Cuánto tiempo toma el proceso de compra?',
      respuesta: 'El proceso completo generalmente toma entre 45 y 90 días, dependiendo de factores como el financiamiento, la disponibilidad de documentos y la complejidad de la transacción. Si la compra es al contado, puede completarse en 2-3 semanas.',
      traducciones: JSON.stringify({
        en: {
          pregunta: 'How long does the buying process take?',
          respuesta: 'The complete process usually takes 45 to 90 days...'
        }
      }),
      contexto: 'compra',
      publicado: true,
      destacada: false,
      orden: 2
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['financiamiento'],
      idioma: 'es',
      pregunta: '¿Qué documentos necesito para solicitar un préstamo hipotecario?',
      respuesta: `Los documentos típicamente requeridos son:

- Cédula de identidad
- Comprobantes de ingresos (últimos 3-6 meses)
- Estados de cuenta bancarios
- Carta de trabajo o certificación de ingresos
- Declaración de impuestos (si aplica)
- Referencias bancarias y comerciales

Cada banco puede tener requisitos adicionales específicos.`,
      traducciones: JSON.stringify({
        en: {
          pregunta: 'What documents do I need to apply for a mortgage?',
          respuesta: 'Typically required documents are: ID, proof of income...'
        }
      }),
      contexto: 'financiamiento',
      publicado: true,
      destacada: true,
      orden: 1
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['financiamiento'],
      idioma: 'es',
      pregunta: '¿Cuál es el inicial mínimo requerido?',
      respuesta: 'El inicial mínimo varía según el banco y el tipo de propiedad. Generalmente, los bancos solicitan entre un 10% y 30% del valor de la propiedad. Para propiedades de inversión o segundas residencias, el porcentaje suele ser mayor.',
      traducciones: JSON.stringify({
        en: {
          pregunta: 'What is the minimum down payment required?',
          respuesta: 'The minimum down payment varies by bank and property type, typically 10-30%.'
        }
      }),
      contexto: 'financiamiento',
      publicado: true,
      destacada: false,
      orden: 2
    },
    {
      tenant_id: tenantId,
      categoria_id: catMap['proceso-compra'],
      idioma: 'es',
      pregunta: '¿Qué impuestos debo pagar al comprar una propiedad?',
      respuesta: `Al comprar una propiedad debes considerar los siguientes costos:

- **Impuesto de transferencia**: 3% del valor de la propiedad
- **Gastos legales**: Aproximadamente 1-2% para abogados y notarios
- **Registro de propiedad**: Varía según el valor
- **Tasación**: Costo fijo según el banco

Es importante presupuestar entre 5-7% adicional al precio de compra para estos gastos.`,
      traducciones: JSON.stringify({
        en: {
          pregunta: 'What taxes do I have to pay when buying a property?',
          respuesta: 'When buying a property you should consider: Transfer tax (3%)...'
        }
      }),
      contexto: 'compra',
      publicado: true,
      destacada: true,
      orden: 3
    }
  ]);

  console.log('✅ Datos de ejemplo insertados: 3 artículos, 3 testimonios, 3 videos, 5 FAQs');
}

export async function down(knex: Knex): Promise<void> {
  // Obtener tenant "otro-demo"
  const tenant = await knex('tenants').where('slug', 'otro-demo').first();

  if (!tenant) {
    return;
  }

  const tenantId = tenant.id;

  // Eliminar en orden inverso por dependencias
  await knex('faqs').where('tenant_id', tenantId).delete();
  await knex('videos').where('tenant_id', tenantId).delete();
  await knex('testimonios').where('tenant_id', tenantId).delete();
  await knex('articulos').where('tenant_id', tenantId).delete();
  await knex('categorias_contenido').where('tenant_id', tenantId).delete();

  console.log('✅ Datos de ejemplo eliminados para otro-demo');
}
