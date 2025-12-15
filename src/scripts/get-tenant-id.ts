/**
 * Script para obtener el ID del tenant de ejemplo
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

async function getTenantId() {
  try {
    const tenant = await db('tenants').first();
    
    if (tenant) {
      console.log(`Tenant ID: ${tenant.id}`);
      console.log(`Tenant nombre: ${tenant.nombre}`);
      console.log(`Tenant slug: ${tenant.slug}`);
      return tenant.id;
    } else {
      console.log('No hay tenants en la base de datos');
      return null;
    }
    
    await db.destroy();
  } catch (error) {
    console.error('Error:', error);
    await db.destroy();
    process.exit(1);
  }
}

getTenantId().then(() => process.exit(0));



