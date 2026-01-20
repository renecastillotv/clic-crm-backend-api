import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_5jRsErZYmJv1@ep-fancy-lab-a4hmvk6f-pooler.us-east-1.aws.neon.tech/neondb?sslmode=require'
});

async function check() {
  const result = await pool.query(`
    SELECT tipo, nombre, campos_config, componente_key
    FROM catalogo_componentes
    WHERE tipo = 'hero'
    ORDER BY nombre
  `);

  console.log('=== Componentes Hero en el catálogo ===\n');

  for (const row of result.rows) {
    console.log(`📦 ${row.nombre} (key: ${row.componente_key})`);
    const config = row.campos_config;

    if (config && config.campos && Array.isArray(config.campos)) {
      console.log(`   ✅ Tiene ${config.campos.length} campos:`);
      config.campos.forEach(c => console.log(`      - ${c.nombre} (${c.tipo}): ${c.label}`));
    } else {
      console.log(`   ⚠️ NO tiene array 'campos' definido`);
      console.log(`   Contenido de campos_config:`, JSON.stringify(config, null, 2).substring(0, 200));
    }

    if (config && config.toggles && Array.isArray(config.toggles)) {
      console.log(`   ✅ Tiene ${config.toggles.length} toggles`);
    }
    console.log('');
  }

  await pool.end();
}

check();
