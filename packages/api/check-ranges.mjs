// Check for properties with price/feature ranges
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  try {
    const creds = await pool.query(`
      SELECT alterestate_api_key_encrypted
      FROM tenant_api_credentials
      WHERE alterestate_connected = true
      LIMIT 1
    `);

    const apiKey = creds.rows[0].alterestate_api_key_encrypted;
    const headers = { 'aetoken': apiKey, 'Content-Type': 'application/json' };

    const response = await fetch('https://secure.alterestate.com/api/v1/properties/filter/', { headers });
    const data = await response.json();
    const properties = data.results || data.data || [];

    console.log('Total propiedades:', properties.length);
    console.log('\nBuscando propiedades con rangos...\n');

    let foundWithRanges = false;

    properties.forEach(p => {
      const hasRanges = p.min_price || p.max_price || p.price_from ||
        p.room_min || p.room_max ||
        p.bathroom_min || p.bathroom_max ||
        p.property_area_min || p.property_area_max ||
        p.parkinglot_min || p.parkinglot_max;

      if (hasRanges) {
        foundWithRanges = true;
        console.log(`=== CID ${p.cid}: ${p.name} ===`);
        console.log('is_project_v2:', p.is_project_v2);
        console.log('Precios:', {
          sale_price: p.sale_price,
          min_price: p.min_price,
          max_price: p.max_price,
          price_from: p.price_from
        });
        console.log('Habitaciones:', {
          room: p.room,
          room_min: p.room_min,
          room_max: p.room_max
        });
        console.log('Baños:', {
          bathroom: p.bathroom,
          bathroom_min: p.bathroom_min,
          bathroom_max: p.bathroom_max
        });
        console.log('Parqueos:', {
          parkinglot: p.parkinglot,
          parkinglot_min: p.parkinglot_min,
          parkinglot_max: p.parkinglot_max
        });
        console.log('Área:', {
          property_area: p.property_area,
          property_area_min: p.property_area_min,
          property_area_max: p.property_area_max
        });
        console.log('');
      }
    });

    if (!foundWithRanges) {
      console.log('No se encontraron propiedades con rangos en el listado.\n');

      // Mostrar campos numéricos de todas las propiedades para ver qué hay
      console.log('Campos numéricos encontrados en las propiedades:');
      const allNumericFields = new Set();

      properties.forEach(p => {
        Object.entries(p).forEach(([key, value]) => {
          if (typeof value === 'number' && value !== 0) {
            allNumericFields.add(key);
          }
        });
      });

      console.log([...allNumericFields].sort().join(', '));
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await pool.end();
  }
}

check();
