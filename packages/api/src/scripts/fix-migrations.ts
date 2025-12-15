import knex from 'knex';
import config from '../config/knexfile.js';
import dotenv from 'dotenv';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  console.error(`No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(knexConfig);

async function fixMigrations() {
  try {
    // Buscar migraciones problemáticas
    const problematic = await db('knex_migrations')
      .select('*')
      .where('name', 'like', '%053_seed_estados_venta%');

    console.log(`Encontradas ${problematic.length} migraciones problemáticas:`);
    problematic.forEach(m => {
      console.log(`  - ID: ${m.id}, Name: ${m.name}, Batch: ${m.batch}`);
    });

    if (problematic.length > 0) {
      console.log('\nEliminando referencias a migraciones que ya no existen...');
      await db('knex_migrations')
        .where('name', 'like', '%053_seed_estados_venta%')
        .delete();
      console.log('✅ Referencias eliminadas');
    } else {
      console.log('✅ No se encontraron migraciones problemáticas');
    }

    await db.destroy();
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await db.destroy();
    process.exit(1);
  }
}

fixMigrations();

