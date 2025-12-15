/**
 * Script to add missing sectors for Santo Domingo area
 * Run with: node add-sectores.mjs
 */

import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

function generarSlug(texto) {
  return texto
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[ñ]/g, 'n')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 100);
}

async function main() {
  const client = await pool.connect();

  try {
    // Get city IDs
    const cities = await client.query(`
      SELECT id, nombre FROM ubicaciones
      WHERE tipo = 'ciudad' AND nombre IN (
        'Distrito Nacional',
        'Santo Domingo Este',
        'Santo Domingo Norte',
        'Santo Domingo Oeste'
      )
    `);

    const cityMap = {};
    cities.rows.forEach(c => {
      cityMap[c.nombre] = c.id;
    });

    console.log('Found cities:', Object.keys(cityMap));

    // Get existing sectors to avoid duplicates
    const existing = await client.query(`
      SELECT LOWER(nombre) as nombre, parent_id FROM ubicaciones WHERE tipo = 'sector'
    `);

    const existingSet = new Set();
    existing.rows.forEach(s => {
      existingSet.add(`${s.parent_id}:${s.nombre}`);
    });

    const sectorExists = (parentId, nombre) => {
      return existingSet.has(`${parentId}:${nombre.toLowerCase()}`);
    };

    // DISTRITO NACIONAL sectors
    const sectoresDN = [
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
      { nombre: 'Zona Universitaria', alias: ['UASD', 'Universidad'] },
    ];

    // SANTO DOMINGO ESTE sectors
    const sectoresSDE = [
      { nombre: 'Alma Rosa I', alias: ['Alma Rosa 1', 'Alma Rosa Uno'] },
      { nombre: 'Alma Rosa II', alias: ['Alma Rosa 2', 'Alma Rosa Dos'] },
      { nombre: 'Brisas del Este' },
      { nombre: 'Cancino' },
      { nombre: 'Cancino Adentro' },
      { nombre: 'Ciudad del Almirante', alias: ['El Almirante', 'Almirante'] },
      { nombre: 'Ciudad Juan Bosch' },
      { nombre: 'El Tamarindo', alias: ['Tamarindo'] },
      { nombre: 'Ensanche Isabelita', alias: ['Isabelita', 'La Isabelita'] },
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

    // SANTO DOMINGO NORTE sectors
    const sectoresSDN = [
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

    // SANTO DOMINGO OESTE sectors
    const sectoresSDO = [
      { nombre: 'Alameda' },
      { nombre: 'Buenos Aires de Herrera' },
      { nombre: 'El Cafe', alias: ['El Café'] },
      { nombre: 'El Libertador' },
      { nombre: 'Herrera' },
      { nombre: 'La Altagracia' },
      { nombre: 'Las Caobas' },
      { nombre: 'Manoguayabo' },
      { nombre: 'Pueblo Nuevo' },
      { nombre: 'Villa Aura' },
    ];

    // Insert function
    const insertSectors = async (cityName, sectors) => {
      const parentId = cityMap[cityName];
      if (!parentId) {
        console.log(`City ${cityName} not found, skipping...`);
        return;
      }

      console.log(`\nInserting sectors for ${cityName}...`);
      let added = 0;
      let skipped = 0;

      for (const sector of sectors) {
        if (sectorExists(parentId, sector.nombre)) {
          skipped++;
          continue;
        }

        try {
          await client.query(`
            INSERT INTO ubicaciones (parent_id, tipo, nivel, nombre, slug, alias, destacado, mostrar_en_menu, mostrar_en_filtros, activo, orden)
            VALUES ($1, 'sector', 4, $2, $3, $4, false, true, true, true, 0)
          `, [
            parentId,
            sector.nombre,
            generarSlug(sector.nombre),
            sector.alias ? JSON.stringify(sector.alias) : null
          ]);
          added++;
          console.log(`  + ${sector.nombre}`);
        } catch (err) {
          if (err.code !== '23505') { // Ignore duplicate key errors
            console.log(`  ! Error: ${sector.nombre} - ${err.message}`);
          } else {
            skipped++;
          }
        }
      }

      console.log(`  ${cityName}: ${added} added, ${skipped} skipped`);
    };

    // Insert all
    await insertSectors('Distrito Nacional', sectoresDN);
    await insertSectors('Santo Domingo Este', sectoresSDE);
    await insertSectors('Santo Domingo Norte', sectoresSDN);
    await insertSectors('Santo Domingo Oeste', sectoresSDO);

    console.log('\n✅ Done!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
