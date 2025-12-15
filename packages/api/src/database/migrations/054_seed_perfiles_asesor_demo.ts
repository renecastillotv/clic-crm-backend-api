import { Knex } from 'knex';

/**
 * Migración 054: Seed de perfiles de asesor demo
 *
 * Crea equipos y perfiles de asesor de ejemplo para desarrollo
 * Vinculados a usuarios existentes del tenant demo
 */

export async function up(knex: Knex): Promise<void> {
  // Obtener tenant demo
  const tenant = await knex('tenants').where('slug', 'demo').first();
  if (!tenant) {
    console.log('⚠️ No se encontró tenant demo, saltando seed de asesores');
    return;
  }

  const tenantId = tenant.id;

  // Obtener usuarios existentes del tenant demo
  const usuarios = await knex('usuarios')
    .join('usuarios_tenants', 'usuarios.id', 'usuarios_tenants.usuario_id')
    .where('usuarios_tenants.tenant_id', tenantId)
    .select('usuarios.*')
    .limit(5);

  if (usuarios.length === 0) {
    console.log('⚠️ No hay usuarios en el tenant demo, saltando seed de asesores');
    return;
  }

  // =====================================================
  // Crear Equipos
  // =====================================================
  const equipos = [
    {
      tenant_id: tenantId,
      nombre: 'Equipo Residencial Norte',
      slug: 'residencial-norte',
      descripcion: 'Especialistas en propiedades residenciales de la zona norte de la ciudad',
      zona_principal: 'Zona Norte',
      zonas_cobertura: JSON.stringify(['Condado', 'Las Colinas', 'San Patricio', 'Guaynabo']),
      meta_mensual: 500000.00,
      split_comision_equipo: 10.00,
      activo: true,
      metadata: JSON.stringify({ color: '#667eea', icono: 'home' })
    },
    {
      tenant_id: tenantId,
      nombre: 'Equipo Comercial',
      slug: 'comercial',
      descripcion: 'Expertos en propiedades comerciales, locales y oficinas',
      zona_principal: 'Metro',
      zonas_cobertura: JSON.stringify(['Hato Rey', 'Santurce', 'Miramar', 'Condado']),
      meta_mensual: 1000000.00,
      split_comision_equipo: 15.00,
      activo: true,
      metadata: JSON.stringify({ color: '#764ba2', icono: 'building' })
    },
    {
      tenant_id: tenantId,
      nombre: 'Equipo Lujo',
      slug: 'lujo',
      descripcion: 'Propiedades premium y de alto valor',
      zona_principal: 'Dorado',
      zonas_cobertura: JSON.stringify(['Dorado Beach', 'Bahía Beach', 'Palmas del Mar']),
      meta_mensual: 2000000.00,
      split_comision_equipo: 12.00,
      activo: true,
      metadata: JSON.stringify({ color: '#d4af37', icono: 'star' })
    }
  ];

  const insertedEquipos = await knex('equipos').insert(equipos).returning('*');
  const equipoResidencial = insertedEquipos.find(e => e.slug === 'residencial-norte');
  const equipoComercial = insertedEquipos.find(e => e.slug === 'comercial');
  const equipoLujo = insertedEquipos.find(e => e.slug === 'lujo');

  // =====================================================
  // Crear Perfiles de Asesor
  // =====================================================
  const asesoresData = [
    {
      usuario_id: usuarios[0]?.id,
      slug: 'maria-rodriguez',
      titulo_profesional: 'Broker Asociada',
      biografia: 'Con más de 15 años de experiencia en el mercado inmobiliario de Puerto Rico, María se especializa en propiedades residenciales de lujo. Ha cerrado más de 200 transacciones y es reconocida por su atención personalizada y conocimiento profundo del mercado.',
      foto_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400',
      especialidades: JSON.stringify(['Residencial', 'Lujo', 'Inversión']),
      idiomas: JSON.stringify(['es', 'en']),
      zonas: JSON.stringify(['Condado', 'Guaynabo', 'Dorado']),
      tipos_propiedad: JSON.stringify(['Casa', 'Penthouse', 'Villa']),
      experiencia_anos: 15,
      rango: 'broker',
      equipo_id: equipoLujo?.id,
      split_comision: 60.00,
      meta_mensual: 300000.00,
      stats: JSON.stringify({
        propiedades_vendidas: 203,
        propiedades_activas: 12,
        volumen_ventas: 45000000,
        calificacion_promedio: 4.9,
        total_resenas: 87,
        tiempo_respuesta_hrs: 2
      }),
      redes_sociales: JSON.stringify({
        linkedin: 'https://linkedin.com/in/maria-rodriguez',
        instagram: '@mariarodriguez_realestate'
      }),
      whatsapp: '+1787555-0001',
      certificaciones: JSON.stringify([
        { nombre: 'Certified Luxury Home Marketing Specialist', institucion: 'ILHM', fecha: '2020-06-15' },
        { nombre: 'Accredited Buyer Representative', institucion: 'NAR', fecha: '2018-03-20' }
      ]),
      logros: JSON.stringify([
        { titulo: 'Top Producer 2023', descripcion: 'Mayor volumen de ventas del año', icono: 'trophy' },
        { titulo: 'Diamond Club', descripcion: 'Miembro elite por 5 años consecutivos', icono: 'diamond' }
      ]),
      activo: true,
      destacado: true,
      visible_en_web: true,
      orden: 1,
      traducciones: JSON.stringify({
        en: {
          biografia: 'With over 15 years of experience in Puerto Rico\'s real estate market, María specializes in luxury residential properties. She has closed over 200 transactions and is recognized for her personalized attention and deep market knowledge.',
          titulo_profesional: 'Associate Broker'
        }
      })
    },
    {
      usuario_id: usuarios[1]?.id || usuarios[0]?.id,
      slug: 'carlos-martinez',
      titulo_profesional: 'Agente Senior',
      biografia: 'Carlos es un experto en propiedades comerciales con enfoque en locales y espacios de oficina. Su formación en administración de empresas y su experiencia de 10 años le permiten asesorar a inversionistas con perspectiva financiera.',
      foto_url: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400',
      especialidades: JSON.stringify(['Comercial', 'Oficinas', 'Inversión']),
      idiomas: JSON.stringify(['es', 'en', 'pt']),
      zonas: JSON.stringify(['Hato Rey', 'Santurce', 'Miramar']),
      tipos_propiedad: JSON.stringify(['Local Comercial', 'Oficina', 'Edificio']),
      experiencia_anos: 10,
      rango: 'senior',
      equipo_id: equipoComercial?.id,
      split_comision: 55.00,
      meta_mensual: 200000.00,
      stats: JSON.stringify({
        propiedades_vendidas: 95,
        propiedades_activas: 8,
        volumen_ventas: 28000000,
        calificacion_promedio: 4.8,
        total_resenas: 52,
        tiempo_respuesta_hrs: 4
      }),
      redes_sociales: JSON.stringify({
        linkedin: 'https://linkedin.com/in/carlos-martinez-realtor',
        instagram: '@carlosmartinez.pr'
      }),
      whatsapp: '+1787555-0002',
      certificaciones: JSON.stringify([
        { nombre: 'Certified Commercial Investment Member', institucion: 'CCIM', fecha: '2021-09-10' }
      ]),
      logros: JSON.stringify([
        { titulo: 'Mejor Asesor Comercial 2022', descripcion: 'Reconocimiento por excelencia en sector comercial', icono: 'award' }
      ]),
      activo: true,
      destacado: true,
      visible_en_web: true,
      orden: 2,
      traducciones: JSON.stringify({
        en: {
          biografia: 'Carlos is an expert in commercial properties focused on retail and office spaces. His business administration background and 10 years of experience allow him to advise investors with a financial perspective.',
          titulo_profesional: 'Senior Agent'
        }
      })
    },
    {
      usuario_id: usuarios[2]?.id || usuarios[0]?.id,
      slug: 'ana-torres',
      titulo_profesional: 'Agente Inmobiliario',
      biografia: 'Ana se especializa en ayudar a familias jóvenes a encontrar su primer hogar. Su enfoque empático y su conocimiento de los programas de financiamiento la convierten en la opción ideal para compradores primerizos.',
      foto_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=400',
      especialidades: JSON.stringify(['Residencial', 'Primera Vivienda', 'Financiamiento']),
      idiomas: JSON.stringify(['es', 'en']),
      zonas: JSON.stringify(['Carolina', 'Trujillo Alto', 'Caguas']),
      tipos_propiedad: JSON.stringify(['Casa', 'Apartamento', 'Townhouse']),
      experiencia_anos: 5,
      rango: 'junior',
      equipo_id: equipoResidencial?.id,
      split_comision: 50.00,
      meta_mensual: 100000.00,
      stats: JSON.stringify({
        propiedades_vendidas: 45,
        propiedades_activas: 6,
        volumen_ventas: 8500000,
        calificacion_promedio: 4.95,
        total_resenas: 38,
        tiempo_respuesta_hrs: 1
      }),
      redes_sociales: JSON.stringify({
        instagram: '@ana.torres.realtor',
        facebook: 'anatorres.realestate'
      }),
      whatsapp: '+1787555-0003',
      certificaciones: JSON.stringify([
        { nombre: 'First Time Buyer Specialist', institucion: 'NAR', fecha: '2022-01-15' }
      ]),
      logros: JSON.stringify([
        { titulo: 'Rising Star 2023', descripcion: 'Mejor agente nuevo del año', icono: 'star' }
      ]),
      activo: true,
      destacado: false,
      visible_en_web: true,
      orden: 3,
      traducciones: JSON.stringify({
        en: {
          biografia: 'Ana specializes in helping young families find their first home. Her empathetic approach and knowledge of financing programs make her the ideal choice for first-time buyers.',
          titulo_profesional: 'Real Estate Agent'
        }
      })
    },
    {
      usuario_id: usuarios[3]?.id || usuarios[0]?.id,
      slug: 'roberto-diaz',
      titulo_profesional: 'Team Leader',
      biografia: 'Roberto lidera el equipo residencial norte con más de 20 años en la industria. Su visión estratégica y habilidades de liderazgo han convertido a su equipo en uno de los más productivos de la región.',
      foto_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=400',
      especialidades: JSON.stringify(['Residencial', 'Terrenos', 'Desarrollo']),
      idiomas: JSON.stringify(['es', 'en']),
      zonas: JSON.stringify(['Guaynabo', 'San Juan', 'Bayamón']),
      tipos_propiedad: JSON.stringify(['Casa', 'Terreno', 'Proyecto']),
      experiencia_anos: 20,
      rango: 'team_leader',
      equipo_id: equipoResidencial?.id,
      split_comision: 65.00,
      meta_mensual: 400000.00,
      stats: JSON.stringify({
        propiedades_vendidas: 350,
        propiedades_activas: 15,
        volumen_ventas: 72000000,
        calificacion_promedio: 4.85,
        total_resenas: 156,
        tiempo_respuesta_hrs: 6
      }),
      redes_sociales: JSON.stringify({
        linkedin: 'https://linkedin.com/in/roberto-diaz-realtor',
        youtube: '@robertodiazrealestate'
      }),
      whatsapp: '+1787555-0004',
      certificaciones: JSON.stringify([
        { nombre: 'Certified Residential Specialist', institucion: 'CRS', fecha: '2010-05-20' },
        { nombre: 'Graduate REALTOR Institute', institucion: 'NAR', fecha: '2008-11-10' }
      ]),
      logros: JSON.stringify([
        { titulo: 'Hall of Fame', descripcion: 'Inductado al salón de la fama 2020', icono: 'crown' },
        { titulo: 'Lifetime Achievement', descripcion: 'Reconocimiento por trayectoria', icono: 'medal' }
      ]),
      activo: true,
      destacado: true,
      visible_en_web: true,
      orden: 4,
      traducciones: JSON.stringify({
        en: {
          biografia: 'Roberto leads the north residential team with over 20 years in the industry. His strategic vision and leadership skills have made his team one of the most productive in the region.',
          titulo_profesional: 'Team Leader'
        }
      })
    },
    {
      usuario_id: usuarios[4]?.id || usuarios[0]?.id,
      slug: 'sofia-mendez',
      titulo_profesional: 'Agente de Lujo',
      biografia: 'Sofía trabaja exclusivamente con propiedades de alto valor en las comunidades más exclusivas. Su red de contactos y discreción la hacen la elección preferida de clientes de alto perfil.',
      foto_url: 'https://images.unsplash.com/photo-1598550874175-4d0ef436c909?w=400',
      especialidades: JSON.stringify(['Lujo', 'Waterfront', 'Golf Communities']),
      idiomas: JSON.stringify(['es', 'en', 'fr']),
      zonas: JSON.stringify(['Dorado Beach', 'Bahía Beach', 'Palmas del Mar']),
      tipos_propiedad: JSON.stringify(['Villa', 'Penthouse', 'Estate']),
      experiencia_anos: 12,
      rango: 'senior',
      equipo_id: equipoLujo?.id,
      split_comision: 55.00,
      meta_mensual: 500000.00,
      stats: JSON.stringify({
        propiedades_vendidas: 78,
        propiedades_activas: 10,
        volumen_ventas: 95000000,
        calificacion_promedio: 5.0,
        total_resenas: 45,
        tiempo_respuesta_hrs: 3
      }),
      redes_sociales: JSON.stringify({
        linkedin: 'https://linkedin.com/in/sofia-mendez-luxury',
        instagram: '@sofiamendez.luxury'
      }),
      whatsapp: '+1787555-0005',
      certificaciones: JSON.stringify([
        { nombre: 'Certified Luxury Home Marketing Specialist', institucion: 'ILHM', fecha: '2015-08-25' },
        { nombre: 'Resort & Second Home Specialist', institucion: 'NAR', fecha: '2017-04-12' }
      ]),
      logros: JSON.stringify([
        { titulo: 'Luxury Agent of the Year 2023', descripcion: 'Mejor agente de propiedades de lujo', icono: 'gem' }
      ]),
      activo: true,
      destacado: true,
      visible_en_web: true,
      orden: 5,
      traducciones: JSON.stringify({
        en: {
          biografia: 'Sofía works exclusively with high-value properties in the most exclusive communities. Her network of contacts and discretion make her the preferred choice for high-profile clients.',
          titulo_profesional: 'Luxury Agent'
        }
      })
    }
  ];

  // Filtrar solo asesores con usuario_id válido y único
  const validAsesores = asesoresData.filter(a => a.usuario_id);
  const uniqueAsesores: typeof asesoresData = [];
  const seenUserIds = new Set<string>();

  for (const asesor of validAsesores) {
    if (!seenUserIds.has(asesor.usuario_id)) {
      seenUserIds.add(asesor.usuario_id);
      uniqueAsesores.push(asesor);
    }
  }

  // Insertar perfiles de asesor
  for (const asesor of uniqueAsesores) {
    await knex('perfiles_asesor').insert({
      tenant_id: tenantId,
      ...asesor
    });
  }

  // Actualizar líder del equipo residencial
  if (equipoResidencial && usuarios[3]) {
    await knex('equipos')
      .where('id', equipoResidencial.id)
      .update({ lider_id: usuarios[3].id });
  }

  console.log(`✅ Migración 054: Seed completado - ${insertedEquipos.length} equipos, ${uniqueAsesores.length} perfiles de asesor`);
}

export async function down(knex: Knex): Promise<void> {
  // Obtener tenant demo
  const tenant = await knex('tenants').where('slug', 'demo').first();
  if (!tenant) return;

  // Eliminar perfiles de asesor del tenant demo
  await knex('perfiles_asesor').where('tenant_id', tenant.id).delete();

  // Eliminar equipos del tenant demo
  await knex('equipos').where('tenant_id', tenant.id).delete();

  console.log('✅ Migración 054: Rollback completado');
}
