/**
 * Script para ejecutar seeds usando tsx
 */
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

async function runSeeds() {
  try {
    console.log('Running seeds...');
    const seedFiles = await db.seed.run();
    
    if (seedFiles.length === 0) {
      console.log('✅ No seeds to run');
    } else {
      console.log(`✅ Ran ${seedFiles.length} seed(s):`);
      seedFiles.forEach((file: string) => {
        console.log(`   - ${file}`);
      });
    }
    
    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

runSeeds();

