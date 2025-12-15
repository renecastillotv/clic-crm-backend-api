/**
 * Script to fix sectors for Distrito Nacional
 * - Remove incorrectly assigned sectors
 * - Add complete official list with proper aliases
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
    // Get Distrito Nacional ID
    const dnResult = await client.query(`
      SELECT id FROM ubicaciones WHERE nombre = 'Distrito Nacional' AND tipo = 'ciudad'
    `);
    const dnId = dnResult.rows[0]?.id;

    if (!dnId) {
      console.log('Distrito Nacional not found!');
      return;
    }

    console.log('Distrito Nacional ID:', dnId);

    // First, delete ALL existing sectors for DN to start fresh
    console.log('\n1. Removing all existing sectors from Distrito Nacional...');
    const deleteResult = await client.query(`
      DELETE FROM ubicaciones WHERE parent_id = $1 AND tipo = 'sector'
    `, [dnId]);
    console.log(`   Deleted ${deleteResult.rowCount} sectors`);

    // Complete list of Distrito Nacional sectors with proper aliases
    const sectoresDN = [
      { nombre: '16 de Agosto', alias: ['Dieciseis de Agosto'] },
      { nombre: '24 de Abril', alias: ['Veinticuatro de Abril'] },
      { nombre: '30 de Mayo', alias: ['Treinta de Mayo'] },
      { nombre: 'Aesa' },
      { nombre: 'Alfimar' },
      { nombre: 'Altos de Arroyo Hondo', alias: ['Altos Arroyo Hondo'] },
      { nombre: 'Altos de Arroyo Hondo II', alias: ['Altos de Arroyo Hondo 2', 'Altos Arroyo Hondo II', 'Altos Arroyo Hondo 2'] },
      { nombre: 'Altos de Arroyo Hondo III', alias: ['Altos de Arroyo Hondo 3', 'Altos Arroyo Hondo III', 'Altos Arroyo Hondo 3'] },
      { nombre: 'Antillas' },
      { nombre: 'Arroyo Hondo' },
      { nombre: 'Arroyo Hondo II', alias: ['Arroyo Hondo 2'] },
      { nombre: 'Arroyo Hondo Viejo', alias: ['Viejo Arroyo Hondo'] },
      { nombre: 'Arroyo Manzano' },
      { nombre: 'Atala' },
      { nombre: 'Atlantida', alias: ['Atlántida'] },
      { nombre: 'Autopista 30 de Mayo' },
      { nombre: 'Av. Anacaona', alias: ['Avenida Anacaona', 'Anacaona'] },
      { nombre: 'Av. George Washington', alias: ['Avenida George Washington', 'George Washington', 'Malecon', 'Malecón'] },
      { nombre: 'Av. Independencia', alias: ['Avenida Independencia'] },
      { nombre: 'Av. Monumental', alias: ['Avenida Monumental', 'Monumental'] },
      { nombre: 'Barrio Azul' },
      { nombre: 'Barrio Cuba', alias: ['Cuba'] },
      { nombre: 'Bella Vista', alias: ['Ensanche Bella Vista', 'Ens. Bella Vista'] },
      { nombre: 'Beta' },
      { nombre: 'Borojol' },
      { nombre: 'Brisas del Norte' },
      { nombre: 'Buena Vista' },
      { nombre: 'Buenos Aires del Mirador', alias: ['Buenos Aires Mirador'] },
      { nombre: 'Cachiman', alias: ['Cachimán'] },
      { nombre: 'Carmen Maria', alias: ['Carmen María'] },
      { nombre: 'Centro de los Heroes', alias: ['Centro de los Héroes', 'Los Heroes', 'Los Héroes'] },
      { nombre: 'Centro Olimpico Juan Pablo Duarte', alias: ['Centro Olímpico Juan Pablo Duarte', 'Centro Olimpico', 'Centro Olímpico'] },
      { nombre: 'Cerros de Arroyo Hondo' },
      { nombre: 'Chichiguao' },
      { nombre: 'Churchill' },
      { nombre: 'Ciudad Moderna' },
      { nombre: 'Ciudad Nueva' },
      { nombre: 'Ciudad Real' },
      { nombre: 'Colinas de Arroyo Hondo' },
      { nombre: 'Colinas de los Rios', alias: ['Colinas de los Ríos'] },
      { nombre: 'Colinas del Seminario' },
      { nombre: 'Constelacion', alias: ['Constelación'] },
      { nombre: 'Costa Caribe' },
      { nombre: 'Costa Verde' },
      { nombre: 'Country Club' },
      { nombre: 'Cristo Rey' },
      { nombre: 'Cuesta Brava' },
      { nombre: 'Cuesta Hermosa I', alias: ['Cuesta Hermosa 1', 'Cuesta Hermosa'] },
      { nombre: 'Cuesta Hermosa II', alias: ['Cuesta Hermosa 2'] },
      { nombre: 'Cuesta Hermosa III', alias: ['Cuesta Hermosa 3'] },
      { nombre: 'Domingo Savio', alias: ['Domingo Sabio'] },
      { nombre: 'Dominicanos Ausentes' },
      { nombre: 'Don Bosco' },
      { nombre: 'Don Honorio' },
      { nombre: 'Don Panchito' },
      { nombre: 'El Aguacate' },
      { nombre: 'El Cacique', alias: ['Cacique'] },
      { nombre: 'El Caliche', alias: ['Caliche'] },
      { nombre: 'El Cerro', alias: ['Cerro'] },
      { nombre: 'El Claret', alias: ['Claret'] },
      { nombre: 'El Ducado', alias: ['Ducado'] },
      { nombre: 'El Ensanchito', alias: ['Ensanchito'] },
      { nombre: 'El Manguito', alias: ['Manguito'] },
      { nombre: 'El Millon', alias: ['El Millón', 'Millon', 'Millón'] },
      { nombre: 'El Milloncito', alias: ['Milloncito'] },
      { nombre: 'El Pedregal', alias: ['Pedregal'] },
      { nombre: 'El Pino', alias: ['Pino'] },
      { nombre: 'El Portal', alias: ['Portal'] },
      { nombre: 'El Semillero', alias: ['Semillero'] },
      { nombre: 'El Vergel', alias: ['Vergel'] },
      { nombre: 'El Yaquito', alias: ['Yaquito'] },
      { nombre: 'Enriquillo I', alias: ['Enriquillo 1', 'Enriquillo'] },
      { nombre: 'Enriquillo II', alias: ['Enriquillo 2'] },
      { nombre: 'Enriquillo III', alias: ['Enriquillo 3'] },
      { nombre: 'Ensanche 27 de Febrero', alias: ['27 de Febrero'] },
      { nombre: 'Ensanche Capotillo', alias: ['Capotillo'] },
      { nombre: 'Ensanche Espaillat', alias: ['Espaillat'] },
      { nombre: 'Ensanche Independencia' },
      { nombre: 'Ensanche Kennedy', alias: ['Kennedy'] },
      { nombre: 'Ensanche La Fe', alias: ['La Fe'] },
      { nombre: 'Ensanche Lugo', alias: ['Lugo'] },
      { nombre: 'Ensanche Luperon', alias: ['Ensanche Luperón', 'Luperon', 'Luperón'] },
      { nombre: 'Ensanche Miraflores' },
      { nombre: 'Ensanche Naco', alias: ['Naco', 'Ens. Naco'] },
      { nombre: 'Ensanche Paraiso', alias: ['Ensanche Paraíso', 'Paraiso', 'Paraíso'] },
      { nombre: 'Ensanche Serralles', alias: ['Serrallés', 'Serralles'] },
      { nombre: 'Esperanza' },
      { nombre: 'Estancia Nueva' },
      { nombre: 'Evaristo Morales' },
      { nombre: 'Gacela' },
      { nombre: 'Gala' },
      { nombre: 'Gazcue', alias: ['Gascue', 'Gazcué'] },
      { nombre: 'General Antonio Duverge', alias: ['General Antonio Duvergé', 'Antonio Duverge', 'Antonio Duvergé', 'Duverge', 'Duvergé'] },
      { nombre: 'Gildamar' },
      { nombre: 'Guachupita' },
      { nombre: 'Gualey' },
      { nombre: 'Honduras' },
      { nombre: 'Honduras del Norte' },
      { nombre: 'Honduras del Oeste' },
      { nombre: 'Invi Sur' },
      { nombre: 'Isabel Villas' },
      { nombre: 'Jardin Botanico', alias: ['Jardín Botánico', 'Jardin Botanico Nacional', 'Jardín Botánico Nacional'] },
      { nombre: 'Jardines del Caribe' },
      { nombre: 'Jardines del Norte' },
      { nombre: 'Jardines del Sur I y II', alias: ['Jardines del Sur', 'Jardines del Sur I', 'Jardines del Sur II', 'Jardines del Sur 1', 'Jardines del Sur 2'] },
      { nombre: 'Jardin Zoologico', alias: ['Jardín Zoológico', 'Zoologico', 'Zoológico'] },
      { nombre: 'Julieta Morales' },
      { nombre: 'Kg' },
      { nombre: 'Kilometro XI', alias: ['Kilómetro XI', 'Kilometro 11', 'Kilómetro 11', 'Km 11', 'Km XI'] },
      { nombre: 'La Agustina' },
      { nombre: 'La Agustinita' },
      { nombre: 'La Atarazana', alias: ['Atarazana'] },
      { nombre: 'La Caridad', alias: ['Caridad'] },
      { nombre: 'La Carmelita', alias: ['Carmelita'] },
      { nombre: 'La Castellana', alias: ['Castellana'] },
      { nombre: 'La Ceiba', alias: ['Ceiba'] },
      { nombre: 'La Cementera', alias: ['Cementera'] },
      { nombre: 'La Cienega', alias: ['La Ciénaga', 'Cienega', 'Ciénaga'] },
      { nombre: 'La Cuarenta', alias: ['Cuarenta'] },
      { nombre: 'Laderas de Arroyo Hondo' },
      { nombre: 'La Esperilla', alias: ['Esperilla', 'Ensanche La Esperilla'] },
      { nombre: 'La Feria', alias: ['Feria'] },
      { nombre: 'La Hondonada', alias: ['Hondonada'] },
      { nombre: 'La Isabela', alias: ['Isabela'] },
      { nombre: 'La Javilla', alias: ['Javilla'] },
      { nombre: 'La Julia', alias: ['Julia'] },
      { nombre: 'La Meseta', alias: ['Meseta'] },
      { nombre: 'Lanna Gautier' },
      { nombre: 'La Primavera', alias: ['Primavera'] },
      { nombre: 'La Puya', alias: ['Puya'] },
      { nombre: 'Las Acacias', alias: ['Acacias'] },
      { nombre: 'Las Auroras', alias: ['Auroras'] },
      { nombre: 'Las Canitas', alias: ['Las Cañitas', 'Canitas', 'Cañitas'] },
      { nombre: 'Las Colinas del Seminario I', alias: ['Las Colinas del Seminario 1', 'Colinas del Seminario I', 'Colinas del Seminario 1'] },
      { nombre: 'Las Flores', alias: ['Flores'] },
      { nombre: 'Las Ochocientas', alias: ['Ochocientas'] },
      { nombre: 'Las Piedras', alias: ['Piedras'] },
      { nombre: 'Las Praderas', alias: ['Praderas'] },
      { nombre: 'Las Villas', alias: ['Villas'] },
      { nombre: 'La Yaguita', alias: ['Yaguita'] },
      { nombre: 'La Yuca', alias: ['Yuca'] },
      { nombre: 'La Zurza', alias: ['Zurza'] },
      { nombre: 'Libertad' },
      { nombre: 'Loma del Chivo' },
      { nombre: 'Lomas de Arroyo Hondo' },
      { nombre: 'Los Angeles', alias: ['Los Ángeles'] },
      { nombre: 'Los Cacicazgos', alias: ['Cacicazgos'] },
      { nombre: 'Los Galindez', alias: ['Los Galíndez', 'Galindez', 'Galíndez'] },
      { nombre: 'Los Girasoles I', alias: ['Los Girasoles 1', 'Girasoles I', 'Girasoles 1'] },
      { nombre: 'Los Girasoles II', alias: ['Los Girasoles 2', 'Girasoles II', 'Girasoles 2'] },
      { nombre: 'Los Girasoles III', alias: ['Los Girasoles 3', 'Girasoles III', 'Girasoles 3'] },
      { nombre: 'Los Guandules', alias: ['Guandules'] },
      { nombre: 'Los Guayuyos', alias: ['Guayuyos'] },
      { nombre: 'Los Jardines', alias: ['Jardines'] },
      { nombre: 'Los Jardines del Embajador', alias: ['Jardines del Embajador'] },
      { nombre: 'Los Jardines del Sur', alias: ['Jardines del Sur'] },
      { nombre: 'Los Laureles', alias: ['Laureles'] },
      { nombre: 'Los Maestros', alias: ['Maestros'] },
      { nombre: 'Los Manguitos', alias: ['Manguitos'] },
      { nombre: 'Los Millones', alias: ['Millones'] },
      { nombre: 'Los Olmos', alias: ['Olmos'] },
      { nombre: 'Los Peralejos', alias: ['Peralejos'] },
      { nombre: 'Los Pinos', alias: ['Pinos'] },
      { nombre: 'Los Platanitos', alias: ['Platanitos'] },
      { nombre: 'Los Praditos', alias: ['Praditos'] },
      { nombre: 'Los Prados', alias: ['Prados'] },
      { nombre: 'Los Proceres', alias: ['Los Próceres', 'Proceres', 'Próceres'] },
      { nombre: 'Los Ramirez', alias: ['Los Ramírez', 'Ramirez', 'Ramírez'] },
      { nombre: 'Los Restauradores', alias: ['Restauradores'] },
      { nombre: 'Los Rios', alias: ['Los Ríos', 'Rios', 'Ríos'] },
      { nombre: 'Los Totumos', alias: ['Totumos'] },
      { nombre: 'Luz Consuelo Norte' },
      { nombre: 'Luz Consuelo Sur' },
      { nombre: 'Madre Vieja' },
      { nombre: 'Malecon', alias: ['Malecón'] },
      { nombre: 'Manganagua' },
      { nombre: 'Manresa o Altagracia', alias: ['Manresa', 'Altagracia'] },
      { nombre: 'Mar Azul' },
      { nombre: 'Maria Auxiliadora', alias: ['María Auxiliadora'] },
      { nombre: 'Maria Josefina', alias: ['María Josefina'] },
      { nombre: 'Marien', alias: ['Marién'] },
      { nombre: 'Maripili' },
      { nombre: 'Mata Hambre' },
      { nombre: 'Mejoramiento Social' },
      { nombre: 'Milloncito' },
      { nombre: 'Mirador de Girasoles' },
      { nombre: 'Mirador Norte' },
      { nombre: 'Mirador Sur' },
      { nombre: 'Miraflores' },
      { nombre: 'Miramar' },
      { nombre: 'Nordesa I', alias: ['Nordesa 1', 'Nordesa'] },
      { nombre: 'Nordesa II', alias: ['Nordesa 2'] },
      { nombre: 'Nuestra Senora de la Paz', alias: ['Nuestra Señora de la Paz', 'La Paz'] },
      { nombre: 'Ofelia' },
      { nombre: 'Palma Real' },
      { nombre: 'Pantoja' },
      { nombre: 'Paravel' },
      { nombre: 'Paseo de los Indios', alias: ['Parque Mirador Sur', 'Paseo de Los Indios'] },
      { nombre: 'Perantuen', alias: ['Perantuén'] },
      { nombre: 'Piantini', alias: ['Ensanche Piantini', 'Ens. Piantini'] },
      { nombre: 'Pinos Norte' },
      { nombre: 'Plaza' },
      { nombre: 'Pradera Hermosa' },
      { nombre: 'Proyecto Habitacional La Zurza' },
      { nombre: 'Proyecto Jose Contreras', alias: ['Proyecto José Contreras', 'Jose Contreras', 'José Contreras'] },
      { nombre: 'Puerta de Hierro' },
      { nombre: 'Puerto Isabela' },
      { nombre: 'Puerto Rico' },
      { nombre: 'Quisqueya', alias: ['Ensanche Quisqueya', 'Ens. Quisqueya'] },
      { nombre: 'Renacimiento' },
      { nombre: 'Reparto Aguedita' },
      { nombre: 'Reparto Miguelina' },
      { nombre: 'Residencial Colinas del Seminario' },
      { nombre: 'Residencial Condado' },
      { nombre: 'Residencial Karla' },
      { nombre: 'Residencial Kg' },
      { nombre: 'Residencial Ortega y Gasset' },
      { nombre: 'Residencial Rosmil' },
      { nombre: 'Residencial Yuca de los Rios', alias: ['Residencial Yuca de los Ríos'] },
      { nombre: 'Roca del Mar' },
      { nombre: 'San Carlos' },
      { nombre: 'San Diego' },
      { nombre: 'Sandra I', alias: ['Sandra 1', 'Sandra'] },
      { nombre: 'Sandra II', alias: ['Sandra 2'] },
      { nombre: 'San Gabriel' },
      { nombre: 'San Geronimo', alias: ['San Gerónimo'] },
      { nombre: 'San Jose', alias: ['San José'] },
      { nombre: 'San Lazaro', alias: ['San Lázaro'] },
      { nombre: 'San Martin de Porres', alias: ['San Martín de Porres'] },
      { nombre: 'San Rafael' },
      { nombre: 'Santa Barbara', alias: ['Santa Bárbara'] },
      { nombre: 'Semillero' },
      { nombre: 'Seminario' },
      { nombre: 'Simon Bolivar', alias: ['Simón Bolívar'] },
      { nombre: 'Solimar' },
      { nombre: 'Urbanizacion Fernandez', alias: ['Urbanización Fernández', 'Urb. Fernandez', 'Urb. Fernández', 'Fernandez', 'Fernández'] },
      { nombre: 'Urbanizacion Independencia', alias: ['Urbanización Independencia', 'Urb. Independencia'] },
      { nombre: 'Urbanizacion Pradera Verde', alias: ['Urbanización Pradera Verde', 'Urb. Pradera Verde', 'Pradera Verde'] },
      { nombre: 'Urbanizacion Real', alias: ['Urbanización Real', 'Urb. Real'] },
      { nombre: 'Urbanizacion Tropical', alias: ['Urbanización Tropical', 'Urb. Tropical', 'Tropical'] },
      { nombre: 'Velacasa' },
      { nombre: 'Villa Alejandrina II', alias: ['Villa Alejandrina 2', 'Villa Alejandrina'] },
      { nombre: 'Villa Amanda' },
      { nombre: 'Villa Claudia' },
      { nombre: 'Villa Colores' },
      { nombre: 'Villa Consuelo' },
      { nombre: 'Villa Diana' },
      { nombre: 'Villa Fontana' },
      { nombre: 'Villa Francisca' },
      { nombre: 'Villa Isabel' },
      { nombre: 'Villa Juana' },
      { nombre: 'Villa Maria', alias: ['Villa María'] },
      { nombre: 'Villa Marina' },
      { nombre: 'Villa Naco' },
      { nombre: 'Villa Progreso' },
      { nombre: 'Villas Agricolas', alias: ['Villas Agrícolas'] },
      { nombre: 'Zona Colonial', alias: ['Ciudad Colonial'] },
      { nombre: 'Zona Universitaria', alias: ['UASD', 'Universidad', 'Ciudad Universitaria'] },
    ];

    console.log(`\n2. Inserting ${sectoresDN.length} sectors for Distrito Nacional...`);

    let added = 0;
    let errors = 0;

    for (const sector of sectoresDN) {
      try {
        await client.query(`
          INSERT INTO ubicaciones (parent_id, tipo, nivel, nombre, slug, alias, destacado, mostrar_en_menu, mostrar_en_filtros, activo, orden)
          VALUES ($1, 'sector', 4, $2, $3, $4, false, true, true, true, 0)
        `, [
          dnId,
          sector.nombre,
          generarSlug(sector.nombre),
          sector.alias ? JSON.stringify(sector.alias) : null
        ]);
        added++;
      } catch (err) {
        console.log(`   Error: ${sector.nombre} - ${err.message}`);
        errors++;
      }
    }

    console.log(`\n✅ Done! Added ${added} sectors, ${errors} errors`);

    // Also remove incorrectly assigned sectors from other cities
    console.log('\n3. Removing incorrectly assigned sectors from other cities...');

    // Santo Domingo Norte - remove incorrect ones
    const sdnResult = await client.query(`
      SELECT id FROM ubicaciones WHERE nombre = 'Santo Domingo Norte' AND tipo = 'ciudad'
    `);
    const sdnId = sdnResult.rows[0]?.id;

    if (sdnId) {
      const incorrectSDN = ['Don Honorio', 'El Embrujo', 'Los Alcarrizos', 'Pantoja', 'Buena Vista'];
      for (const name of incorrectSDN) {
        const del = await client.query(`
          DELETE FROM ubicaciones WHERE parent_id = $1 AND nombre = $2 AND tipo = 'sector'
        `, [sdnId, name]);
        if (del.rowCount > 0) {
          console.log(`   Removed from SDN: ${name}`);
        }
      }
    }

    // Santo Domingo Este - remove incorrect ones
    const sdeResult = await client.query(`
      SELECT id FROM ubicaciones WHERE nombre = 'Santo Domingo Este' AND tipo = 'ciudad'
    `);
    const sdeId = sdeResult.rows[0]?.id;

    if (sdeId) {
      const incorrectSDE = ['Urbanizacion Fernandez', 'Urbanizacion Italia', 'Yolanda Morales'];
      for (const name of incorrectSDE) {
        const del = await client.query(`
          DELETE FROM ubicaciones WHERE parent_id = $1 AND nombre = $2 AND tipo = 'sector'
        `, [sdeId, name]);
        if (del.rowCount > 0) {
          console.log(`   Removed from SDE: ${name}`);
        }
      }
    }

    console.log('\n✅ All done!');

  } catch (err) {
    console.error('Error:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
