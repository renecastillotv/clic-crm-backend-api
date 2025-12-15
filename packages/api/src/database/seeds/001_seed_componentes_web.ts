import { Knex } from 'knex';

/**
 * Seed - Datos de prueba para componentes web
 * 
 * Inserta componentes de ejemplo para desarrollo
 */
export async function seed(knex: Knex): Promise<void> {
  // Primero, obtener un tenant_id de ejemplo (o crear uno si no existe)
  let tenantId: string;
  
  const tenant = await knex('tenants').first();
  
  if (!tenant) {
    // Crear un tenant de ejemplo si no existe
    const [newTenant] = await knex('tenants')
      .insert({
        nombre: 'Inmobiliaria Demo',
        slug: 'demo',
        activo: true,
      })
      .returning('id');
    tenantId = newTenant.id;
  } else {
    tenantId = tenant.id;
  }

  // Verificar si ya existen componentes para este tenant
  const existingComponents = await knex('componentes_web')
    .where('tenant_id', tenantId)
    .first();

  if (existingComponents) {
    console.log('Ya existen componentes para este tenant, saltando seed...');
    return;
  }

  // Crear tema por defecto si no existe
  const existingTema = await knex('temas_tenant')
    .where('tenant_id', tenantId)
    .first();

  if (!existingTema) {
    await knex('temas_tenant').insert({
      tenant_id: tenantId,
      nombre: 'Tema Personalizado',
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
    });
  }

  // Insertar componentes de ejemplo
  await knex('componentes_web').insert([
    {
      tenant_id: tenantId,
      tipo: 'header',
      variante: 'default',
      datos: JSON.stringify({
        logo: '',
        mostrarBusqueda: true,
        mostrarMenu: true,
      }),
      activo: true,
      orden: -1,
      pagina_id: null, // Componente global
    },
    {
      tenant_id: tenantId,
      tipo: 'hero',
      variante: 'default',
      datos: JSON.stringify({
        titulo: 'Bienvenido a Nuestra Inmobiliaria',
        subtitulo: 'Encuentra la propiedad de tus sueños en el lugar perfecto',
        textoBoton: 'Ver Propiedades',
        urlBoton: '/propiedades',
      }),
      activo: true,
      orden: 0,
      pagina_id: null, // Componente global
    },
    {
      tenant_id: tenantId,
      tipo: 'footer',
      variante: 'default',
      datos: JSON.stringify({
        textoCopyright: '© 2024 Inmobiliaria. Todos los derechos reservados.',
        telefono: '+1 234 567 890',
        email: 'contacto@inmobiliaria.com',
        direccion: 'Calle Principal 123, Ciudad',
      }),
      activo: true,
      orden: 100,
      pagina_id: null, // Componente global
    },
  ]);

  console.log('✅ Componentes de prueba insertados correctamente');
}



