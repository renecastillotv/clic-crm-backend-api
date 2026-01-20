// Script para verificar campos de proyectos en Alterestate
import pg from 'pg';
const { Pool } = pg;
import dotenv from 'dotenv';
dotenv.config();

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function check() {
  // Obtener API key
  const creds = await pool.query(`
    SELECT alterestate_api_key_encrypted
    FROM tenant_api_credentials
    WHERE alterestate_connected = true
    LIMIT 1
  `);

  if (!creds.rows[0]) {
    console.log('No hay credenciales de Alterestate');
    await pool.end();
    return;
  }

  const apiKey = creds.rows[0].alterestate_api_key_encrypted;
  console.log('API Key encontrada');

  // Primero obtener la lista para encontrar un proyecto con su slug real
  console.log('\nBuscando proyectos en la lista...');
  const listResponse = await fetch('https://secure.alterestate.com/api/v1/properties?page=1&limit=100', {
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json'
    }
  });

  if (!listResponse.ok) {
    console.log('Error obteniendo lista:', listResponse.status);
    await pool.end();
    return;
  }

  const listData = await listResponse.json();
  const proyecto = listData.data?.find(p => p.is_project_v2 === true);

  if (!proyecto) {
    console.log('No se encontró ningún proyecto en la lista');
    await pool.end();
    return;
  }

  console.log('Proyecto encontrado:', proyecto.name, '(CID:', proyecto.cid, ')');
  console.log('Slug real:', proyecto.slug);

  // Mostrar campos del listado primero
  console.log('\n=== CAMPOS DEL LISTADO ===');
  console.log('Campos de precio:');
  ['sale_price', 'rent_price', 'price', 'price_from', 'min_price', 'max_price',
   'us_saleprice', 'starting_price'].forEach(f => {
    if (proyecto[f] !== undefined && proyecto[f] !== null) console.log('  ' + f + ':', proyecto[f]);
  });

  console.log('\nCampos de habitaciones:');
  ['room', 'rooms', 'rooms_min', 'rooms_max', 'room_min', 'room_max'].forEach(f => {
    if (proyecto[f] !== undefined && proyecto[f] !== null) console.log('  ' + f + ':', proyecto[f]);
  });

  console.log('\nTodos los valores numéricos del listado:');
  Object.entries(proyecto).forEach(([key, value]) => {
    if (typeof value === 'number') {
      console.log(`  ${key}: ${value}`);
    }
  });

  // Ahora obtener el detalle
  const url = 'https://secure.alterestate.com/api/v1/property/' + proyecto.slug;

  console.log('Fetching:', url);

  const response = await fetch(url, {
    headers: {
      'x-api-key': apiKey,
      'Accept': 'application/json'
    }
  });

  console.log('Status:', response.status);
  const text = await response.text();

  if (response.ok) {
    try {
      const data = JSON.parse(text);
      const detail = data.data || data;

      console.log('\n=== CAMPOS DEL PROYECTO ===');
      console.log('\nCampos de precio:');
      ['sale_price', 'rent_price', 'price', 'price_from', 'min_price', 'max_price',
       'us_saleprice', 'starting_price', 'base_price', 'precio', 'precio_desde'].forEach(f => {
        if (detail[f] !== undefined && detail[f] !== null) console.log('  ' + f + ':', detail[f]);
      });

      console.log('\nCampos de habitaciones:');
      ['room', 'rooms', 'rooms_min', 'rooms_max', 'room_min', 'room_max', 'min_room', 'max_room',
       'habitaciones', 'habitaciones_min', 'habitaciones_max'].forEach(f => {
        if (detail[f] !== undefined && detail[f] !== null) console.log('  ' + f + ':', detail[f]);
      });

      console.log('\nCampos de baños:');
      ['bathroom', 'bathrooms', 'bathrooms_min', 'bathrooms_max', 'bathroom_min', 'bathroom_max',
       'min_bathroom', 'max_bathroom', 'banos', 'banos_min', 'banos_max'].forEach(f => {
        if (detail[f] !== undefined && detail[f] !== null) console.log('  ' + f + ':', detail[f]);
      });

      console.log('\nCampos de parqueos:');
      ['parkinglot', 'parking', 'parking_min', 'parking_max', 'parkinglot_min', 'parkinglot_max',
       'parqueos', 'estacionamientos'].forEach(f => {
        if (detail[f] !== undefined && detail[f] !== null) console.log('  ' + f + ':', detail[f]);
      });

      console.log('\nCampos de área:');
      ['property_area', 'area', 'area_min', 'area_max', 'property_area_min', 'property_area_max',
       'm2', 'm2_min', 'm2_max', 'terrain_area'].forEach(f => {
        if (detail[f] !== undefined && detail[f] !== null) console.log('  ' + f + ':', detail[f]);
      });

      console.log('\n=== TODOS LOS CAMPOS ===');
      console.log(Object.keys(detail).sort().join('\n'));

      // Mostrar valores de campos numéricos
      console.log('\n=== VALORES NUMÉRICOS ===');
      Object.entries(detail).forEach(([key, value]) => {
        if (typeof value === 'number' && value !== 0) {
          console.log(`  ${key}: ${value}`);
        }
      });

    } catch (e) {
      console.log('Error parsing JSON:', e.message);
      console.log('Response:', text.substring(0, 500));
    }
  } else {
    console.log('Error response:', text.substring(0, 200));
  }

  await pool.end();
}

check();
