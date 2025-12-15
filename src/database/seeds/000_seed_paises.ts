import { Knex } from 'knex';

/**
 * Seed - Países
 * 
 * Inserta países comunes con códigos ISO
 */
export async function seed(knex: Knex): Promise<void> {
  // Verificar si ya hay países
  const existingPaises = await knex('paises').first();
  if (existingPaises) {
    console.log('Ya existen países en la base de datos, saltando seed...');
    return;
  }

  // Países comunes (Latinoamérica y otros importantes)
  const paises = [
    // Latinoamérica
    { codigo: 'MX', nombre: 'México', nombre_en: 'Mexico', moneda: 'MXN', zona_horaria: 'America/Mexico_City' },
    { codigo: 'DO', nombre: 'República Dominicana', nombre_en: 'Dominican Republic', moneda: 'DOP', zona_horaria: 'America/Santo_Domingo' },
    { codigo: 'AR', nombre: 'Argentina', nombre_en: 'Argentina', moneda: 'ARS', zona_horaria: 'America/Argentina/Buenos_Aires' },
    { codigo: 'CL', nombre: 'Chile', nombre_en: 'Chile', moneda: 'CLP', zona_horaria: 'America/Santiago' },
    { codigo: 'CO', nombre: 'Colombia', nombre_en: 'Colombia', moneda: 'COP', zona_horaria: 'America/Bogota' },
    { codigo: 'PE', nombre: 'Perú', nombre_en: 'Peru', moneda: 'PEN', zona_horaria: 'America/Lima' },
    { codigo: 'VE', nombre: 'Venezuela', nombre_en: 'Venezuela', moneda: 'VES', zona_horaria: 'America/Caracas' },
    { codigo: 'EC', nombre: 'Ecuador', nombre_en: 'Ecuador', moneda: 'USD', zona_horaria: 'America/Guayaquil' },
    { codigo: 'GT', nombre: 'Guatemala', nombre_en: 'Guatemala', moneda: 'GTQ', zona_horaria: 'America/Guatemala' },
    { codigo: 'CR', nombre: 'Costa Rica', nombre_en: 'Costa Rica', moneda: 'CRC', zona_horaria: 'America/Costa_Rica' },
    { codigo: 'PA', nombre: 'Panamá', nombre_en: 'Panama', moneda: 'PAB', zona_horaria: 'America/Panama' },
    { codigo: 'HN', nombre: 'Honduras', nombre_en: 'Honduras', moneda: 'HNL', zona_horaria: 'America/Tegucigalpa' },
    { codigo: 'NI', nombre: 'Nicaragua', nombre_en: 'Nicaragua', moneda: 'NIO', zona_horaria: 'America/Managua' },
    { codigo: 'SV', nombre: 'El Salvador', nombre_en: 'El Salvador', moneda: 'USD', zona_horaria: 'America/El_Salvador' },
    { codigo: 'CU', nombre: 'Cuba', nombre_en: 'Cuba', moneda: 'CUP', zona_horaria: 'America/Havana' },
    { codigo: 'PR', nombre: 'Puerto Rico', nombre_en: 'Puerto Rico', moneda: 'USD', zona_horaria: 'America/Puerto_Rico' },
    { codigo: 'UY', nombre: 'Uruguay', nombre_en: 'Uruguay', moneda: 'UYU', zona_horaria: 'America/Montevideo' },
    { codigo: 'PY', nombre: 'Paraguay', nombre_en: 'Paraguay', moneda: 'PYG', zona_horaria: 'America/Asuncion' },
    { codigo: 'BO', nombre: 'Bolivia', nombre_en: 'Bolivia', moneda: 'BOB', zona_horaria: 'America/La_Paz' },
    { codigo: 'BR', nombre: 'Brasil', nombre_en: 'Brazil', moneda: 'BRL', zona_horaria: 'America/Sao_Paulo' },
    
    // Norteamérica
    { codigo: 'US', nombre: 'Estados Unidos', nombre_en: 'United States', moneda: 'USD', zona_horaria: 'America/New_York' },
    { codigo: 'CA', nombre: 'Canadá', nombre_en: 'Canada', moneda: 'CAD', zona_horaria: 'America/Toronto' },
    
    // Europa
    { codigo: 'ES', nombre: 'España', nombre_en: 'Spain', moneda: 'EUR', zona_horaria: 'Europe/Madrid' },
    { codigo: 'FR', nombre: 'Francia', nombre_en: 'France', moneda: 'EUR', zona_horaria: 'Europe/Paris' },
    { codigo: 'IT', nombre: 'Italia', nombre_en: 'Italy', moneda: 'EUR', zona_horaria: 'Europe/Rome' },
    { codigo: 'DE', nombre: 'Alemania', nombre_en: 'Germany', moneda: 'EUR', zona_horaria: 'Europe/Berlin' },
    { codigo: 'GB', nombre: 'Reino Unido', nombre_en: 'United Kingdom', moneda: 'GBP', zona_horaria: 'Europe/London' },
    { codigo: 'PT', nombre: 'Portugal', nombre_en: 'Portugal', moneda: 'EUR', zona_horaria: 'Europe/Lisbon' },
  ];

  await knex('paises').insert(paises);
  console.log(`✅ Insertados ${paises.length} países`);
}

