import { pool } from './src/config/database';

const RUTAS_ESTANDAR = [
  // Páginas estáticas (nivel 0)
  {
    prefijo: 'contacto',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'contact', fr: 'contact', pt: 'contato' },
  },
  {
    prefijo: 'politicas-de-privacidad',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'privacy-policy', fr: 'politique-confidentialite', pt: 'politica-privacidade' },
  },
  {
    prefijo: 'terminos-y-condiciones',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'terms-and-conditions', fr: 'termes-et-conditions', pt: 'termos-e-condicoes' },
  },
  {
    prefijo: 'vende-con-nosotros',
    nivel_navegacion: 0,
    alias_idiomas: { en: 'sell-with-us', fr: 'vendez-avec-nous', pt: 'venda-conosco' },
  },

  // Directorio + Single (nivel 1)
  {
    prefijo: 'asesores',
    nivel_navegacion: 1,
    alias_idiomas: { en: 'advisors', fr: 'conseillers', pt: 'assessores' },
  },
  {
    prefijo: 'blog',
    nivel_navegacion: 1,
    alias_idiomas: { en: 'blog', fr: 'blog', pt: 'blog' },
  },
  {
    prefijo: 'testimonios',
    nivel_navegacion: 1,
    alias_idiomas: { en: 'testimonials', fr: 'temoignages', pt: 'testemunhos' },
  },
  {
    prefijo: 'videos',
    nivel_navegacion: 1,
    alias_idiomas: { en: 'videos', fr: 'videos', pt: 'videos' },
  },
];

async function reseedRutas() {
  console.log('=== Re-seedeando tenants_rutas_config ===\n');
  const client = await pool.connect();

  try {
    // Get all tenants
    const tenants = await client.query('SELECT id, slug FROM tenants');
    console.log(`Encontrados ${tenants.rows.length} tenants\n`);

    for (const tenant of tenants.rows) {
      console.log(`Tenant: ${tenant.slug} (${tenant.id})`);

      // Check existing routes for this tenant
      const existingRutas = await client.query(
        'SELECT prefijo FROM tenants_rutas_config WHERE tenant_id = $1',
        [tenant.id]
      );
      const existingPrefijos = existingRutas.rows.map((r: any) => r.prefijo);
      console.log(`  Rutas existentes: ${existingPrefijos.length}`);

      // Insert only the routes that don't exist
      let inserted = 0;
      for (const ruta of RUTAS_ESTANDAR) {
        if (!existingPrefijos.includes(ruta.prefijo)) {
          await client.query(
            `INSERT INTO tenants_rutas_config (tenant_id, prefijo, nivel_navegacion, alias_idiomas, habilitado, orden)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [tenant.id, ruta.prefijo, ruta.nivel_navegacion, JSON.stringify(ruta.alias_idiomas), true, 0]
          );
          console.log(`    ✓ Ruta "${ruta.prefijo}" agregada`);
          inserted++;
        }
      }
      console.log(`  Total insertadas: ${inserted}\n`);
    }

    // Show final count
    const finalCount = await client.query('SELECT COUNT(*) FROM tenants_rutas_config');
    console.log(`\n✅ Total rutas en tenants_rutas_config: ${finalCount.rows[0].count}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

reseedRutas();
