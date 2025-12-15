import { Knex } from 'knex';

/**
 * Agrega campo info_negocio para almacenar información del negocio/inmobiliaria
 * Estructura del JSON:
 * {
 *   // Identidad visual
 *   logo: string | null,           // URL del logo principal
 *   logoBlanco: string | null,     // Logo versión blanca para fondos oscuros
 *   isotipo: string | null,        // Icono/isotipo pequeño (para sidebar, favicon, etc.)
 *   favicon: string | null,        // URL del favicon
 *
 *   // Información básica
 *   nombreComercial: string | null,  // Nombre comercial (puede diferir del nombre legal)
 *   slogan: string | null,           // Eslogan de la empresa
 *   descripcion: string | null,      // Descripción corta para SEO y about
 *   descripcionLarga: string | null, // Descripción completa
 *
 *   // Contacto
 *   email: string | null,
 *   emailVentas: string | null,
 *   emailSoporte: string | null,
 *   telefono: string | null,
 *   telefonoSecundario: string | null,
 *   whatsapp: string | null,
 *
 *   // Ubicación
 *   direccion: string | null,
 *   ciudad: string | null,
 *   provincia: string | null,
 *   codigoPostal: string | null,
 *   pais: string | null,
 *   coordenadas: { lat: number, lng: number } | null,
 *
 *   // Horarios
 *   horarios: {
 *     lunes: { abierto: boolean, apertura: string, cierre: string },
 *     martes: { ... },
 *     ...
 *   } | null,
 *
 *   // Redes sociales
 *   redesSociales: {
 *     facebook: string | null,
 *     instagram: string | null,
 *     twitter: string | null,
 *     linkedin: string | null,
 *     youtube: string | null,
 *     tiktok: string | null,
 *   } | null,
 *
 *   // Información legal/corporativa
 *   rnc: string | null,              // RNC o identificación fiscal
 *   razonSocial: string | null,      // Razón social legal
 *   registroMercantil: string | null,
 *
 *   // Personalización adicional
 *   firmaCeo: string | null,         // URL imagen firma del CEO
 *   nombreCeo: string | null,        // Nombre del CEO/Director
 *   cargoCeo: string | null,         // Cargo del CEO
 *   fotoCeo: string | null,          // Foto del CEO
 *
 *   // Configuración web
 *   colorPrimario: string | null,    // Color principal de la marca
 *   colorSecundario: string | null,  // Color secundario
 * }
 */
export async function up(knex: Knex): Promise<void> {
  const hasColumn = await knex.schema.hasColumn('tenants', 'info_negocio');

  if (!hasColumn) {
    await knex.schema.alterTable('tenants', (table) => {
      table.jsonb('info_negocio').nullable().comment('Información del negocio: logo, contacto, horarios, redes sociales, etc.');
    });

    console.log('✅ Added info_negocio column to tenants table');
  } else {
    console.log('ℹ️ Column info_negocio already exists');
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.alterTable('tenants', (table) => {
    table.dropColumn('info_negocio');
  });
}
