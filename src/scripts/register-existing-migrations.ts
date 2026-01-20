/**
 * Script para registrar migraciones existentes en knex_migrations
 * Esto permite que knex no intente re-ejecutar migraciones que ya existen en la BD
 */
import knex from 'knex';
import config from '../config/knexfile.js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  console.error(`No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(knexConfig);

async function registerExistingMigrations() {
  try {
    console.log('Registering existing migrations...\n');

    // Get list of migration files
    const migrationsDir = path.join(__dirname, '../database/migrations');
    const files = fs.readdirSync(migrationsDir)
      .filter(f => f.endsWith('.ts'))
      .sort();

    // Get already registered migrations
    const registered = await db('knex_migrations').select('name');
    const registeredNames = new Set(registered.map(r => r.name));

    console.log(`Found ${files.length} migration files`);
    console.log(`Already registered: ${registeredNames.size} migrations`);

    // Migrations to skip (new ones we want to run)
    const newMigrations = new Set([
      '123_refactor_sistema_fases_productividad.ts'
    ]);

    let added = 0;
    const batch = 1; // Use batch 1 for all existing migrations

    for (const file of files) {
      if (registeredNames.has(file)) {
        continue; // Already registered
      }

      if (newMigrations.has(file)) {
        console.log(`⏭️  Skipping new migration: ${file}`);
        continue;
      }

      // Register this migration as already run
      await db('knex_migrations').insert({
        name: file,
        batch: batch,
        migration_time: new Date()
      });
      added++;
      console.log(`✅ Registered: ${file}`);
    }

    console.log(`\n✅ Registered ${added} migrations as already executed`);
    console.log('Now you can run pnpm migrate:latest to run only new migrations');

    await db.destroy();
    process.exit(0);
  } catch (error) {
    console.error('❌ Failed:', error);
    await db.destroy();
    process.exit(1);
  }
}

registerExistingMigrations();
