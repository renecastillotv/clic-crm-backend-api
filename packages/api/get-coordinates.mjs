/**
 * Script para obtener coordenadas y bounds de sectores usando Google Geocoding API
 * Uso: node get-coordinates.mjs [--limit=50] [--dry-run] [--tipo=sector]
 */

import pg from 'pg';
const { Client } = pg;

const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require';
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || 'AIzaSyCCkIN5-1ts3A55EywUce3BOK6sFOIvtT8';

// Parsear argumentos
const args = process.argv.slice(2);
const options = {
  limit: parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] || '50'),
  dryRun: args.includes('--dry-run'),
};

console.log('=== OBTENER COORDENADAS DE GOOGLE ===');
console.log(`Opciones: limit=${options.limit}, dryRun=${options.dryRun}\n`);

if (!GOOGLE_API_KEY && !options.dryRun) {
  console.error('ERROR: Se requiere GOOGLE_API_KEY en variables de entorno');
  console.log('\nPara ejecutar:');
  console.log('  GOOGLE_API_KEY=xxx node get-coordinates.mjs --limit=50');
  console.log('\nO con --dry-run para ver que se procesaría:');
  console.log('  node get-coordinates.mjs --dry-run');
  process.exit(1);
}

const client = new Client({ connectionString: DATABASE_URL });
await client.connect();

/**
 * Obtener coordenadas y bounds de Google Geocoding API
 */
async function getCoordinates(searchQuery) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(searchQuery)}&key=${GOOGLE_API_KEY}&language=es&region=do`;

  const response = await fetch(url);
  const data = await response.json();

  if (data.status === 'OK' && data.results.length > 0) {
    const result = data.results[0];
    const location = result.geometry.location;
    const viewport = result.geometry.viewport;

    return {
      lat: location.lat,
      lng: location.lng,
      formatted_address: result.formatted_address,
      bounds: viewport ? {
        north: viewport.northeast.lat,
        south: viewport.southwest.lat,
        east: viewport.northeast.lng,
        west: viewport.southwest.lng,
      } : null,
      place_id: result.place_id,
      types: result.types,
    };
  }

  return null;
}

// Obtener sectores sin coordenadas
const sectores = await client.query(`
  SELECT
    s.id,
    s.nombre as sector,
    c.nombre as ciudad,
    p.nombre as provincia
  FROM ubicaciones s
  JOIN ubicaciones c ON s.parent_id = c.id
  JOIN ubicaciones p ON c.parent_id = p.id
  WHERE s.tipo = 'sector'
    AND s.activo = true
    AND s.latitud IS NULL
  ORDER BY
    CASE p.nombre
      WHEN 'Santo Domingo' THEN 1
      WHEN 'Santiago' THEN 2
      WHEN 'La Altagracia' THEN 3
      ELSE 4
    END,
    s.nombre
  LIMIT $1
`, [options.limit]);

console.log(`Sectores sin coordenadas: ${sectores.rows.length}\n`);

if (sectores.rows.length === 0) {
  console.log('Todos los sectores tienen coordenadas');
  await client.end();
  process.exit(0);
}

let actualizados = 0;
let errores = 0;

for (const sector of sectores.rows) {
  // Construir query de búsqueda
  const searchQuery = `${sector.sector}, ${sector.ciudad}, República Dominicana`;

  console.log(`📍 ${sector.sector} (${sector.ciudad})`);

  if (options.dryRun) {
    console.log(`   [DRY RUN] Buscaría: "${searchQuery}"`);
    continue;
  }

  try {
    const coords = await getCoordinates(searchQuery);

    if (coords) {
      // Verificar que las coordenadas estén en RD (aprox)
      if (coords.lat >= 17.5 && coords.lat <= 20.0 && coords.lng >= -72.0 && coords.lng <= -68.0) {
        await client.query(`
          UPDATE ubicaciones
          SET latitud = $1,
              longitud = $2,
              bounds = COALESCE($3::jsonb, bounds),
              updated_at = NOW()
          WHERE id = $4
        `, [coords.lat, coords.lng, coords.bounds ? JSON.stringify(coords.bounds) : null, sector.id]);

        console.log(`   ✓ ${coords.lat.toFixed(6)}, ${coords.lng.toFixed(6)}${coords.bounds ? ' +bounds' : ''}`);
        actualizados++;
      } else {
        console.log(`   ⚠️ Coordenadas fuera de RD: ${coords.lat}, ${coords.lng}`);
        errores++;
      }
    } else {
      console.log(`   ❌ No encontrado`);
      errores++;
    }

    // Pausa para respetar rate limits de Google
    await new Promise(r => setTimeout(r, 200));

  } catch (error) {
    console.log(`   ❌ Error: ${error.message}`);
    errores++;
  }
}

// Resumen
console.log('\n=== RESUMEN ===');
console.log(`Actualizados: ${actualizados}`);
console.log(`Errores/No encontrados: ${errores}`);

// Estado final
const stats = await client.query(`
  SELECT
    COUNT(*) FILTER (WHERE latitud IS NOT NULL) as con_coords,
    COUNT(*) FILTER (WHERE latitud IS NULL) as sin_coords
  FROM ubicaciones
  WHERE tipo = 'sector' AND activo = true
`);

console.log(`\nEstado actual:`);
console.log(`  Con coordenadas: ${stats.rows[0].con_coords}`);
console.log(`  Sin coordenadas: ${stats.rows[0].sin_coords}`);

await client.end();
console.log('\n✅ Proceso completado');
