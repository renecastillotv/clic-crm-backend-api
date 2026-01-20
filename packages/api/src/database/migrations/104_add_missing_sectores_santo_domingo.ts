/**
 * Migration: Add missing sectors for Santo Domingo area
 *
 * Based on official data from:
 * - https://www.inmobiliaria.com.do/foros/foro-principal/conoce-los-sectores-del-distrito-nacional-en-santo-domingo/
 * - https://mercanef.com/barrios-del-distrito-nacional-y-sub-barrios/
 * - ONE (Oficina Nacional de Estadística) División Territorial 2020
 */

import type { Knex } from 'knex';

// Helper to generate slug with optional suffix
function generarSlug(texto: string, suffix?: string): string {
  let slug = texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);

  if (suffix) {
    slug = `${slug}-${suffix}`;
  }
  return slug;
}

interface SectorData {
  nombre: string;
  alias?: string[];
  latitud?: string;
  longitud?: string;
}

export async function up(knex: Knex): Promise<void> {
  // Get existing city IDs
  const distritoNacional = await knex('ubicaciones')
    .where({ nombre: 'Distrito Nacional', tipo: 'ciudad' })
    .first();

  const santoDomingoEste = await knex('ubicaciones')
    .where({ nombre: 'Santo Domingo Este', tipo: 'ciudad' })
    .first();

  const santoDomingoNorte = await knex('ubicaciones')
    .where({ nombre: 'Santo Domingo Norte', tipo: 'ciudad' })
    .first();

  const santoDomingoOeste = await knex('ubicaciones')
    .where({ nombre: 'Santo Domingo Oeste', tipo: 'ciudad' })
    .first();

  if (!distritoNacional) {
    console.log('Distrito Nacional not found, skipping...');
    return;
  }

  // Get existing sectors to avoid duplicates
  const existingSectors = await knex('ubicaciones')
    .where({ tipo: 'sector' })
    .select('nombre', 'parent_id');

  const existingNames = new Map<string, Set<string>>();
  existingSectors.forEach(s => {
    const key = s.parent_id;
    if (!existingNames.has(key)) {
      existingNames.set(key, new Set());
    }
    existingNames.get(key)!.add(s.nombre.toLowerCase());
  });

  // Helper to check if sector exists
  const sectorExists = (parentId: string, nombre: string): boolean => {
    const set = existingNames.get(parentId);
    return set ? set.has(nombre.toLowerCase()) : false;
  };

  // Get existing slugs to check for duplicates
  const existingSlugs = await knex('ubicaciones').select('slug');
  const slugSet = new Set(existingSlugs.map(s => s.slug));

  // Helper to check if slug exists
  const slugExists = (slug: string): boolean => slugSet.has(slug);

  // ============================================
  // DISTRITO NACIONAL - Missing sectors (71 total)
  // ============================================
  const sectoresDN: SectorData[] = [
    // Official 71 sectors from ONE
    { nombre: '24 de Abril', alias: ['24 de abril', 'Veinticuatro de Abril'] },
    { nombre: 'Altos de Arroyo Hondo', alias: ['Altos Arroyo Hondo'] },
    { nombre: 'Arroyo Manzano' },
    { nombre: 'Buenos Aires', alias: ['Buenos Aires DN'] },
    { nombre: 'El Cacique', alias: ['Cacique'] },
    { nombre: 'Centro de los Heroes', alias: ['Centro de los Héroes', 'Los Héroes', 'Los Heroes'] },
    { nombre: 'Centro Olimpico', alias: ['Centro Olímpico', 'Centro Olímpico Juan Pablo Duarte'] },
    { nombre: 'Cerros de Arroyo Hondo' },
    { nombre: 'Domingo Savio', alias: ['Domingo Sabio'] },
    { nombre: 'Ensanche Capotillo', alias: ['Capotillo'] },
    { nombre: 'Ensanche Espaillat', alias: ['Espaillat'] },
    { nombre: 'Ensanche La Fe', alias: ['La Fe'] },
    { nombre: 'Ensanche Quisqueya', alias: ['Quisqueya'] },
    { nombre: 'General Antonio Duverge', alias: ['General Antonio Duvergé', 'Antonio Duvergé', 'Duverge'] },
    { nombre: 'Gualey' },
    { nombre: 'Honduras del Norte' },
    { nombre: 'Honduras del Oeste' },
    { nombre: 'Jardin Botanico', alias: ['Jardín Botánico'] },
    { nombre: 'Jardin Zoologico', alias: ['Jardín Zoológico', 'Zoológico'] },
    { nombre: 'Jardines del Sur' },
    { nombre: 'La Hondonada' },
    { nombre: 'La Isabela' },
    { nombre: 'Las Praderas' },
    { nombre: 'La Zurza', alias: ['Zurza'] },
    { nombre: 'Los Jardines' },
    { nombre: 'Los Peralejos', alias: ['Peralejos'] },
    { nombre: 'Los Proceres', alias: ['Los Próceres', 'Próceres'] },
    { nombre: 'Mata Hambre' },
    { nombre: 'Mejoramiento Social' },
    { nombre: 'Miramar' },
    { nombre: 'Nuestra Senora de la Paz', alias: ['Nuestra Señora de la Paz', 'La Paz'] },
    { nombre: 'Palma Real' },
    { nombre: 'Paseo de los Indios', alias: ['Paseo de Los Indios'] },
    { nombre: 'San Diego' },
    { nombre: 'San Juan Bosco' },
    { nombre: 'Simon Bolivar', alias: ['Simón Bolívar', 'Simón Bolivar'] },
    { nombre: 'Tropical Metaldom', alias: ['Metaldom'] },
    { nombre: 'Viejo Arroyo Hondo' },
    { nombre: 'Villas Agricolas', alias: ['Villas Agrícolas'] },
    { nombre: 'Villa Consuelo' },
    { nombre: 'Villa Francisca' },
    { nombre: 'Villa Juana' },
    { nombre: 'Zona Colonial', alias: ['Ciudad Colonial'] },
    { nombre: 'Zona Universitaria', alias: ['UASD', 'Ciudad Universitaria'] },
  ];

  // ============================================
  // SANTO DOMINGO ESTE - Sectors
  // ============================================
  const sectoresSDE: SectorData[] = [
    { nombre: 'Alma Rosa I', alias: ['Alma Rosa 1', 'Alma Rosa Uno'] },
    { nombre: 'Alma Rosa II', alias: ['Alma Rosa 2', 'Alma Rosa Dos'] },
    { nombre: 'Brisas del Este' },
    { nombre: 'Cancino' },
    { nombre: 'Cancino Adentro' },
    { nombre: 'Ciudad del Almirante', alias: ['El Almirante', 'Almirante'] },
    { nombre: 'Ciudad Juan Bosch' },
    { nombre: 'El Tamarindo', alias: ['Tamarindo'] },
    { nombre: 'Ensanche Isabelita', alias: ['Isabelita', 'La Isabelita'] },
    { nombre: 'Ensanche Ozama', alias: ['Ozama'] },
    { nombre: 'Hainamosa' },
    { nombre: 'Invivienda' },
    { nombre: 'La Barquita' },
    { nombre: 'Las Americas', alias: ['Las Américas'] },
    { nombre: 'Las Palmas de Alma Rosa', alias: ['Las Palmas'] },
    { nombre: 'Los Frailes' },
    { nombre: 'Los Mameyes', alias: ['Mameyes'] },
    { nombre: 'Los Mina', alias: ['San Lorenzo de Los Mina', 'Los Minas'] },
    { nombre: 'Los Mina Norte' },
    { nombre: 'Los Mina Sur' },
    { nombre: 'Los Tres Brazos', alias: ['Tres Brazos'] },
    { nombre: 'Los Tres Ojos', alias: ['Tres Ojos'] },
    { nombre: 'Lucerna' },
    { nombre: 'Maquiteria', alias: ['Maquitería'] },
    { nombre: 'Mendoza' },
    { nombre: 'Ozama' },
    { nombre: 'Paraiso Oriental', alias: ['Paraíso Oriental'] },
    { nombre: 'Perla Antillana' },
    { nombre: 'Ralma' },
    { nombre: 'San Isidro' },
    { nombre: 'Sans Souci', alias: ['Sans Sousi', 'San Souci'] },
    { nombre: 'Urbanizacion Fernandez', alias: ['Urb. Fernández', 'Fernández'] },
    { nombre: 'Urbanizacion Italia', alias: ['Urb. Italia', 'Italia'] },
    { nombre: 'Villa Duarte' },
    { nombre: 'Villa Esfuerzo' },
    { nombre: 'Villa Faro' },
    { nombre: 'Villa Liberacion', alias: ['Villa Liberación'] },
    { nombre: 'Yolanda Morales', alias: ['Urb. Yolanda Morales'] },
  ];

  // ============================================
  // SANTO DOMINGO NORTE - Sectors
  // ============================================
  const sectoresSDN: SectorData[] = [
    { nombre: 'Buena Vista' },
    { nombre: 'Carretera Duarte', alias: ['Km Duarte'] },
    { nombre: 'Charles de Gaulle' },
    { nombre: 'Ciudad Modelo' },
    { nombre: 'Don Honorio' },
    { nombre: 'El Embrujo' },
    { nombre: 'Guaricano' },
    { nombre: 'Hacienda Estrella' },
    { nombre: 'La Victoria' },
    { nombre: 'Las Colinas' },
    { nombre: 'Los Alcarrizos' },
    { nombre: 'Los Jardines del Norte' },
    { nombre: 'Palmarejo' },
    { nombre: 'Pantoja' },
    { nombre: 'Sabana Perdida' },
    { nombre: 'Villa Liberacion Norte', alias: ['Villa Liberación Norte'] },
    { nombre: 'Villa Mella' },
    { nombre: 'Vista Hermosa' },
  ];

  // ============================================
  // SANTO DOMINGO OESTE - Sectors
  // ============================================
  const sectoresSDO: SectorData[] = [
    { nombre: 'Alameda' },
    { nombre: 'Buenos Aires de Herrera' },
    { nombre: 'El Cafe', alias: ['El Café'] },
    { nombre: 'El Libertador' },
    { nombre: 'Herrera' },
    { nombre: 'Honduras del Oeste SDO' },
    { nombre: 'La Altagracia' },
    { nombre: 'Las Caobas' },
    { nombre: 'Los Rios SDO', alias: ['Los Ríos'] },
    { nombre: 'Manoguayabo' },
    { nombre: 'Pueblo Nuevo' },
    { nombre: 'Villa Aura' },
  ];

  // Helper to get a unique slug
  const getUniqueSlug = (nombre: string, suffix?: string): string => {
    let slug = generarSlug(nombre, suffix);
    if (!slugExists(slug)) {
      slugSet.add(slug);
      return slug;
    }
    // Try with dn, sde, sdn, sdo suffixes
    const suffixes = ['dn', 'sde', 'sdn', 'sdo', '2', '3'];
    for (const s of suffixes) {
      const newSlug = generarSlug(nombre, s);
      if (!slugExists(newSlug)) {
        slugSet.add(newSlug);
        return newSlug;
      }
    }
    // Fallback: add random suffix
    const randomSlug = generarSlug(nombre, Date.now().toString());
    slugSet.add(randomSlug);
    return randomSlug;
  };

  // Insert sectors for Distrito Nacional
  console.log('Inserting missing sectors for Distrito Nacional...');
  for (const sector of sectoresDN) {
    if (!sectorExists(distritoNacional.id, sector.nombre)) {
      try {
        const slug = getUniqueSlug(sector.nombre);
        await knex('ubicaciones').insert({
          parent_id: distritoNacional.id,
          tipo: 'sector',
          nivel: 4,
          nombre: sector.nombre,
          slug,
          alias: sector.alias ? JSON.stringify(sector.alias) : null,
          latitud: sector.latitud || null,
          longitud: sector.longitud || null,
          destacado: false,
          mostrar_en_menu: true,
          mostrar_en_filtros: true,
          activo: true,
          orden: 0,
        });
        console.log(`  + Added: ${sector.nombre} (slug: ${slug})`);
      } catch (err: any) {
        console.log(`  ! Error adding ${sector.nombre}: ${err.message}`);
      }
    }
  }

  // Insert sectors for Santo Domingo Este
  if (santoDomingoEste) {
    console.log('Inserting missing sectors for Santo Domingo Este...');
    for (const sector of sectoresSDE) {
      if (!sectorExists(santoDomingoEste.id, sector.nombre)) {
        try {
          const slug = getUniqueSlug(sector.nombre);
          await knex('ubicaciones').insert({
            parent_id: santoDomingoEste.id,
            tipo: 'sector',
            nivel: 4,
            nombre: sector.nombre,
            slug,
            alias: sector.alias ? JSON.stringify(sector.alias) : null,
            latitud: sector.latitud || null,
            longitud: sector.longitud || null,
            destacado: false,
            mostrar_en_menu: true,
            mostrar_en_filtros: true,
            activo: true,
            orden: 0,
          });
          console.log(`  + Added: ${sector.nombre} (slug: ${slug})`);
        } catch (err: any) {
          console.log(`  ! Error adding ${sector.nombre}: ${err.message}`);
        }
      }
    }
  }

  // Insert sectors for Santo Domingo Norte
  if (santoDomingoNorte) {
    console.log('Inserting missing sectors for Santo Domingo Norte...');
    for (const sector of sectoresSDN) {
      if (!sectorExists(santoDomingoNorte.id, sector.nombre)) {
        try {
          const slug = getUniqueSlug(sector.nombre);
          await knex('ubicaciones').insert({
            parent_id: santoDomingoNorte.id,
            tipo: 'sector',
            nivel: 4,
            nombre: sector.nombre,
            slug,
            alias: sector.alias ? JSON.stringify(sector.alias) : null,
            latitud: sector.latitud || null,
            longitud: sector.longitud || null,
            destacado: false,
            mostrar_en_menu: true,
            mostrar_en_filtros: true,
            activo: true,
            orden: 0,
          });
          console.log(`  + Added: ${sector.nombre} (slug: ${slug})`);
        } catch (err: any) {
          console.log(`  ! Error adding ${sector.nombre}: ${err.message}`);
        }
      }
    }
  }

  // Insert sectors for Santo Domingo Oeste
  if (santoDomingoOeste) {
    console.log('Inserting missing sectors for Santo Domingo Oeste...');
    for (const sector of sectoresSDO) {
      if (!sectorExists(santoDomingoOeste.id, sector.nombre)) {
        try {
          const slug = getUniqueSlug(sector.nombre);
          await knex('ubicaciones').insert({
            parent_id: santoDomingoOeste.id,
            tipo: 'sector',
            nivel: 4,
            nombre: sector.nombre,
            slug,
            alias: sector.alias ? JSON.stringify(sector.alias) : null,
            latitud: sector.latitud || null,
            longitud: sector.longitud || null,
            destacado: false,
            mostrar_en_menu: true,
            mostrar_en_filtros: true,
            activo: true,
            orden: 0,
          });
          console.log(`  + Added: ${sector.nombre} (slug: ${slug})`);
        } catch (err: any) {
          console.log(`  ! Error adding ${sector.nombre}: ${err.message}`);
        }
      }
    }
  }

  console.log('Migration complete!');
}

export async function down(knex: Knex): Promise<void> {
  // This migration only adds data, rollback would need to identify and remove
  // specific records which could be risky. Left as no-op.
  console.log('Rollback not implemented for data migration');
}
