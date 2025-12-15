import knex from 'knex';
import dotenv from 'dotenv';
import config from '../config/knexfile.js';

dotenv.config();

const environment = process.env.NODE_ENV || 'development';
const knexConfig = config[environment as keyof typeof config];

if (!knexConfig) {
  console.error(`No configuration found for environment: ${environment}`);
  process.exit(1);
}

const db = knex(knexConfig);

async function crearTenantCLIC() {
  try {
    console.log('📝 Creando tenant CLIC Inmobiliaria...');
    
    // Verificar si ya existe
    const existente = await db('tenants').where({ slug: 'clic' }).first();
    
    if (existente) {
      console.log('⚠️ El tenant con slug "clic" ya existe');
      console.log(`   ID: ${existente.id}`);
      console.log(`   Nombre: ${existente.nombre}`);
    } else {
      // Verificar qué países existen
      const paises = await db('paises').select('codigo');
      console.log(`   Países disponibles: ${paises.map((p: any) => p.codigo).join(', ')}`);
      
      // Usar null si no hay países configurados, o el primero disponible
      let codigoPais = null;
      if (paises.length > 0) {
        // Buscar DO primero, sino usar el primero disponible
        const paisDO = paises.find((p: any) => p.codigo === 'DO');
        codigoPais = paisDO ? 'DO' : paises[0].codigo;
      }
      
      // Crear el nuevo tenant
      const tenantData: any = {
        nombre: 'CLIC Inmobiliaria',
        slug: 'clic',
        idioma_default: 'es',
        idiomas_disponibles: JSON.stringify(['es', 'en']),
        configuracion: JSON.stringify({}),
        activo: true,
      };
      
      if (codigoPais) {
        tenantData.codigo_pais = codigoPais;
      }
      
      const [tenant] = await db('tenants')
        .insert(tenantData)
        .returning(['id', 'nombre', 'slug']);
      
      console.log('✅ Tenant creado exitosamente:');
      console.log(`   ID: ${tenant.id}`);
      console.log(`   Nombre: ${tenant.nombre}`);
      console.log(`   Slug: ${tenant.slug}`);
      
      // Crear tema por defecto para el tenant
      const [tema] = await db('temas_tenant')
        .insert({
          tenant_id: tenant.id,
          nombre: 'Tema CLIC Inmobiliaria',
          colores: JSON.stringify({
            primary: '#667eea',
            secondary: '#764ba2',
            accent: '#f56565',
            background: '#ffffff',
            text: '#1a202c',
            textSecondary: '#718096',
            border: '#e2e8f0',
            success: '#48bb78',
            warning: '#ed8936',
            error: '#f56565',
          }),
          activo: true,
        })
        .returning(['id']);
      
      console.log('✅ Tema creado para el tenant');
    }
    
    await db.destroy();
    console.log('✅ Proceso completado');
    process.exit(0);
  } catch (error: any) {
    console.error('❌ Error:', error.message);
    await db.destroy();
    process.exit(1);
  }
}

crearTenantCLIC();

