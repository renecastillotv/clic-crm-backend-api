import type { Knex } from 'knex';

/**
 * Migración para insertar 10 propiedades demo para el tenant otro-demo
 */

export async function up(knex: Knex): Promise<void> {
  // Obtener el tenant_id de "otro-demo"
  const tenantResult = await knex('tenants')
    .where('slug', 'otro-demo')
    .first();

  if (!tenantResult) {
    console.log('⚠️ Tenant "otro-demo" no encontrado, saltando seed de propiedades');
    return;
  }

  const tenantId = tenantResult.id;

  // 10 propiedades demo variadas
  const propiedades = [
    {
      tenant_id: tenantId,
      titulo: 'Apartamento de Lujo en Cap Cana',
      codigo: 'PROP-001',
      descripcion: `Espectacular apartamento de 3 habitaciones con vista al mar en el exclusivo Cap Cana.
        Acabados de primera calidad, cocina integral equipada con electrodomésticos de acero inoxidable.
        Amplio balcón con vista panorámica al océano. Acceso a playa privada, piscinas, gimnasio y club de golf.
        Ideal para inversión o residencia de lujo.`,
      tipo: 'apartamento',
      operacion: 'venta',
      precio: 425000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Punta Cana',
      sector: 'Cap Cana',
      zona: 'Aquamarina',
      direccion: 'Cap Cana Resort, Torre Aquamarina, Piso 8',
      habitaciones: 3,
      banos: 2,
      medios_banos: 1,
      estacionamientos: 2,
      m2_construccion: 185,
      m2_terreno: null,
      antiguedad: 2,
      pisos: 1,
      amenidades: JSON.stringify(['piscina', 'gimnasio', 'seguridad_24h', 'playa_privada', 'golf', 'spa']),
      caracteristicas: JSON.stringify({ aire_acondicionado: true, calentador_solar: true, cisterna: true, planta_electrica: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800',
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: true,
      exclusiva: true,
      slug: 'apartamento-lujo-cap-cana',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Villa Familiar en Punta Cana Village',
      codigo: 'PROP-002',
      descripcion: `Hermosa villa de 4 habitaciones en el corazón de Punta Cana Village.
        Amplio jardín tropical con piscina privada y área de BBQ.
        Cocina gourmet completamente equipada, sala de estar con doble altura.
        Perfecta para familias que buscan espacio y privacidad.`,
      tipo: 'villa',
      operacion: 'venta',
      precio: 650000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Punta Cana',
      sector: 'Punta Cana Village',
      zona: 'Sector Residencial',
      direccion: 'Punta Cana Village, Calle Principal #45',
      habitaciones: 4,
      banos: 3,
      medios_banos: 1,
      estacionamientos: 3,
      m2_construccion: 320,
      m2_terreno: 800,
      antiguedad: 5,
      pisos: 2,
      amenidades: JSON.stringify(['piscina_privada', 'jardin', 'bbq', 'seguridad_24h', 'terraza']),
      caracteristicas: JSON.stringify({ aire_acondicionado: true, cisterna: true, planta_electrica: true, cocina_equipada: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800',
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: true,
      exclusiva: false,
      slug: 'villa-familiar-punta-cana-village',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Penthouse en Bávaro Beach',
      codigo: 'PROP-003',
      descripcion: `Exclusivo penthouse con terraza privada y vista panorámica al Caribe.
        3 habitaciones con baño privado, sala de estar con diseño contemporáneo.
        Acceso directo a la playa y amenidades de primer nivel.`,
      tipo: 'penthouse',
      operacion: 'venta',
      precio: 890000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Bávaro',
      sector: 'Bávaro Beach',
      zona: 'Primera Línea de Playa',
      direccion: 'Residencial Oceanview, Penthouse A',
      habitaciones: 3,
      banos: 3,
      medios_banos: 1,
      estacionamientos: 2,
      m2_construccion: 280,
      m2_terreno: null,
      antiguedad: 1,
      pisos: 2,
      amenidades: JSON.stringify(['terraza_privada', 'jacuzzi', 'vista_mar', 'ascensor_privado', 'piscina']),
      caracteristicas: JSON.stringify({ aire_acondicionado: true, domótica: true, cocina_italiana: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: true,
      exclusiva: true,
      slug: 'penthouse-bavaro-beach',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Estudio Moderno en Cocotal Golf',
      codigo: 'PROP-004',
      descripcion: `Acogedor estudio con vista al campo de golf en Cocotal.
        Perfecto para inversión con programa de renta.
        Totalmente amueblado y listo para habitar.`,
      tipo: 'apartamento',
      operacion: 'venta',
      precio: 125000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Bávaro',
      sector: 'Cocotal',
      zona: 'Golf Course',
      direccion: 'Cocotal Golf & Country Club, Building C',
      habitaciones: 1,
      banos: 1,
      medios_banos: 0,
      estacionamientos: 1,
      m2_construccion: 65,
      m2_terreno: null,
      antiguedad: 3,
      pisos: 1,
      amenidades: JSON.stringify(['piscina', 'gimnasio', 'golf', 'restaurante']),
      caracteristicas: JSON.stringify({ amueblado: true, aire_acondicionado: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800',
        'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: false,
      exclusiva: false,
      slug: 'estudio-cocotal-golf',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Casa de Playa en Los Corales',
      codigo: 'PROP-005',
      descripcion: `Encantadora casa a pasos de la playa en Los Corales.
        2 habitaciones, sala abierta con cocina americana.
        Patio privado con jardín tropical. Excelente ubicación cerca de restaurantes y tiendas.`,
      tipo: 'casa',
      operacion: 'venta',
      precio: 215000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Bávaro',
      sector: 'Los Corales',
      zona: 'Cerca de Playa',
      direccion: 'Los Corales, Calle del Mar #12',
      habitaciones: 2,
      banos: 2,
      medios_banos: 0,
      estacionamientos: 1,
      m2_construccion: 110,
      m2_terreno: 200,
      antiguedad: 8,
      pisos: 1,
      amenidades: JSON.stringify(['patio', 'cerca_playa', 'jardin']),
      caracteristicas: JSON.stringify({ aire_acondicionado: true, cisterna: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800',
        'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: false,
      exclusiva: false,
      slug: 'casa-playa-los-corales',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Apartamento en Renta - Downtown Punta Cana',
      codigo: 'PROP-006',
      descripcion: `Moderno apartamento de 2 habitaciones disponible para renta mensual.
        Ubicación céntrica con fácil acceso a comercios, playas y entretenimiento.
        Incluye agua, internet y mantenimiento de áreas comunes.`,
      tipo: 'apartamento',
      operacion: 'renta',
      precio: 1200,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Punta Cana',
      sector: 'Downtown',
      zona: 'Centro Comercial',
      direccion: 'Downtown Punta Cana, Torre Norte, Apt 305',
      habitaciones: 2,
      banos: 2,
      medios_banos: 0,
      estacionamientos: 1,
      m2_construccion: 95,
      m2_terreno: null,
      antiguedad: 4,
      pisos: 1,
      amenidades: JSON.stringify(['piscina', 'gimnasio', 'lobby', 'seguridad_24h']),
      caracteristicas: JSON.stringify({ amueblado: true, aire_acondicionado: true, internet_incluido: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800',
        'https://images.unsplash.com/photo-1560185127-6ed189bf02f4?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: false,
      exclusiva: false,
      slug: 'apartamento-renta-downtown-punta-cana',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Terreno Comercial en Friusa',
      codigo: 'PROP-007',
      descripcion: `Excelente terreno comercial en zona de alto tráfico.
        Ideal para desarrollo de plaza comercial, hotel o proyecto mixto.
        Todos los servicios disponibles. Documentación al día.`,
      tipo: 'terreno',
      operacion: 'venta',
      precio: 1200000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Bávaro',
      sector: 'Friusa',
      zona: 'Zona Comercial',
      direccion: 'Avenida Principal Friusa, Km 4',
      habitaciones: null,
      banos: null,
      medios_banos: null,
      estacionamientos: null,
      m2_construccion: null,
      m2_terreno: 5000,
      antiguedad: null,
      pisos: null,
      amenidades: JSON.stringify(['agua', 'luz', 'internet', 'acceso_pavimentado']),
      caracteristicas: JSON.stringify({ uso_suelo: 'comercial', frente_calle: '50m' }),
      imagen_principal: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: false,
      exclusiva: true,
      slug: 'terreno-comercial-friusa',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Condominio Frente al Mar - Uvero Alto',
      codigo: 'PROP-008',
      descripcion: `Exclusivo condominio de 2 habitaciones con acceso directo a la playa.
        Diseño moderno con amplios ventanales que maximizan la vista al océano.
        Resort all-inclusive disponible. Excelente para inversión.`,
      tipo: 'apartamento',
      operacion: 'venta',
      precio: 375000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Uvero Alto',
      sector: 'Beachfront',
      zona: 'Resort Zone',
      direccion: 'Uvero Alto Beach Resort, Building Ocean View',
      habitaciones: 2,
      banos: 2,
      medios_banos: 0,
      estacionamientos: 1,
      m2_construccion: 120,
      m2_terreno: null,
      antiguedad: 2,
      pisos: 1,
      amenidades: JSON.stringify(['playa_privada', 'all_inclusive', 'spa', 'tennis', 'kids_club']),
      caracteristicas: JSON.stringify({ vista_mar: true, balcon: true, aire_acondicionado: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1582407947304-fd86f028f716?w=800',
        'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: true,
      exclusiva: false,
      slug: 'condominio-frente-mar-uvero-alto',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Local Comercial en Plaza San Juan',
      codigo: 'PROP-009',
      descripcion: `Local comercial de 80m2 en plaza de alto tráfico.
        Ideal para restaurante, tienda o servicios profesionales.
        Aire acondicionado central, baño privado. Estacionamiento disponible.`,
      tipo: 'local',
      operacion: 'renta',
      precio: 2500,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Bávaro',
      sector: 'San Juan',
      zona: 'Plaza Comercial',
      direccion: 'Plaza San Juan Shopping Center, Local 15',
      habitaciones: null,
      banos: 1,
      medios_banos: 0,
      estacionamientos: 3,
      m2_construccion: 80,
      m2_terreno: null,
      antiguedad: 6,
      pisos: 1,
      amenidades: JSON.stringify(['aire_central', 'seguridad', 'estacionamiento', 'area_comun']),
      caracteristicas: JSON.stringify({ frente_vitrina: '6m', altura_techo: '4m' }),
      imagen_principal: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: false,
      exclusiva: false,
      slug: 'local-comercial-plaza-san-juan',
      activo: true,
    },
    {
      tenant_id: tenantId,
      titulo: 'Villa de Lujo con Piscina Infinity',
      codigo: 'PROP-010',
      descripcion: `Impresionante villa de 5 habitaciones con piscina infinity y vista al golf.
        Diseño arquitectónico único con materiales importados.
        Suite principal con jacuzzi privado y terraza panorámica.
        Staff quarters incluido. La mejor propiedad de la zona.`,
      tipo: 'villa',
      operacion: 'venta',
      precio: 1850000,
      moneda: 'USD',
      pais: 'República Dominicana',
      provincia: 'La Altagracia',
      ciudad: 'Punta Cana',
      sector: 'Puntacana Resort',
      zona: 'Corales Golf',
      direccion: 'Puntacana Resort & Club, Corales #8',
      habitaciones: 5,
      banos: 5,
      medios_banos: 2,
      estacionamientos: 4,
      m2_construccion: 650,
      m2_terreno: 1500,
      antiguedad: 1,
      pisos: 2,
      amenidades: JSON.stringify(['piscina_infinity', 'jacuzzi', 'golf', 'staff_quarters', 'smart_home', 'cine_en_casa']),
      caracteristicas: JSON.stringify({ domotica: true, energia_solar: true, cisterna_grande: true, generador: true }),
      imagen_principal: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
      imagenes: JSON.stringify([
        'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800',
        'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800',
        'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800',
        'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800'
      ]),
      estado_propiedad: 'disponible',
      destacada: true,
      exclusiva: true,
      slug: 'villa-lujo-piscina-infinity',
      activo: true,
    },
  ];

  // Insertar propiedades
  await knex('propiedades').insert(propiedades);

  console.log(`✅ 10 propiedades demo insertadas para tenant "otro-demo"`);
}

export async function down(knex: Knex): Promise<void> {
  // Obtener el tenant_id de "otro-demo"
  const tenantResult = await knex('tenants')
    .where('slug', 'otro-demo')
    .first();

  if (!tenantResult) {
    return;
  }

  // Eliminar propiedades con códigos PROP-001 a PROP-010
  await knex('propiedades')
    .where('tenant_id', tenantResult.id)
    .whereIn('codigo', [
      'PROP-001', 'PROP-002', 'PROP-003', 'PROP-004', 'PROP-005',
      'PROP-006', 'PROP-007', 'PROP-008', 'PROP-009', 'PROP-010'
    ])
    .del();

  console.log('✅ Propiedades demo eliminadas');
}
