/**
 * Servicio para gestionar propiedades inmobiliarias
 */

import { query } from '../utils/db.js';

export interface PropiedadResponse {
  id: string;
  tenantId: string;
  titulo: string;
  descripcion?: string;
  precio: number;
  ubicacion: string;
  direccion?: string;
  habitaciones?: number;
  banos?: number;
  metros?: number;
  tipo?: string;
  estado?: string;
  imagenes?: string[];
  caracteristicas?: Record<string, any>;
  agenteId?: string;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Obtiene una propiedad individual por ID
 * Por ahora retorna datos mock, pero está preparado para consultas reales
 */
export async function getPropiedadById(
  tenantId: string,
  propertyId: string
): Promise<PropiedadResponse | null> {
  try {
    // TODO: Cuando exista la tabla propiedades, implementar consulta real
    // const sql = `
    //   SELECT 
    //     id,
    //     tenant_id as "tenantId",
    //     titulo,
    //     descripcion,
    //     precio,
    //     ubicacion,
    //     direccion,
    //     habitaciones,
    //     banos,
    //     metros,
    //     tipo,
    //     estado,
    //     imagenes,
    //     caracteristicas,
    //     agente_id as "agenteId",
    //     created_at as "createdAt",
    //     updated_at as "updatedAt"
    //   FROM propiedades
    //   WHERE id = $1 AND tenant_id = $2
    //   LIMIT 1
    // `;
    // 
    // const result = await query(sql, [propertyId, tenantId]);
    // 
    // if (result.rows.length === 0) {
    //   return null;
    // }
    // 
    // return result.rows[0];

    // Datos mock para desarrollo
    console.log(`📋 Obteniendo propiedad ${propertyId} para tenant ${tenantId} (mock)`);
    
    // Generar datos mock basados en el ID
    const mockProperties: Record<string, PropiedadResponse> = {
      '1': {
        id: '1',
        tenantId,
        titulo: 'Casa Moderna en Zona Residencial',
        descripcion: 'Hermosa casa de dos pisos con amplio jardín y garaje. Ubicada en una zona tranquila y segura, ideal para familias. La propiedad cuenta con excelente iluminación natural y acabados de primera calidad.',
        precio: 250000,
        ubicacion: 'Ciudad Ejemplo, Zona Norte',
        direccion: 'Calle Principal 123, Colonia Residencial',
        habitaciones: 3,
        banos: 2,
        metros: 120,
        tipo: 'Casa',
        estado: 'Disponible',
        imagenes: [
          'https://via.placeholder.com/800x600?text=Casa+Exterior',
          'https://via.placeholder.com/800x600?text=Sala+Principal',
          'https://via.placeholder.com/800x600?text=Cocina',
          'https://via.placeholder.com/800x600?text=Dormitorio',
        ],
        caracteristicas: {
          jardin: true,
          garaje: true,
          piscina: false,
          seguridad: true,
          calefaccion: true,
          aireAcondicionado: true,
        },
      },
      '2': {
        id: '2',
        tenantId,
        titulo: 'Departamento de Lujo en el Centro',
        descripcion: 'Elegante departamento con vista panorámica en el corazón de la ciudad. Incluye amenidades de primer nivel y está completamente amueblado. Perfecto para profesionales que buscan comodidad y ubicación.',
        precio: 350000,
        ubicacion: 'Ciudad Ejemplo, Centro',
        direccion: 'Av. Principal 456, Torre Residencial, Piso 15',
        habitaciones: 4,
        banos: 3,
        metros: 150,
        tipo: 'Departamento',
        estado: 'Disponible',
        imagenes: [
          'https://via.placeholder.com/800x600?text=Vista+Panoramica',
          'https://via.placeholder.com/800x600?text=Sala+Elegante',
          'https://via.placeholder.com/800x600?text=Cocina+Integrada',
          'https://via.placeholder.com/800x600?text=Dormitorio+Principal',
        ],
        caracteristicas: {
          jardin: false,
          garaje: true,
          piscina: true,
          seguridad: true,
          calefaccion: true,
          aireAcondicionado: true,
          gimnasio: true,
          terraza: true,
        },
      },
    };

    const propiedad = mockProperties[propertyId] || null;
    
    if (!propiedad) {
      console.log(`⚠️ Propiedad ${propertyId} no encontrada (mock)`);
      return null;
    }

    return propiedad;
  } catch (error: any) {
    console.error('Error al obtener propiedad:', error);
    throw new Error(`Error al obtener propiedad: ${error.message}`);
  }
}

/**
 * Obtiene todas las propiedades de un tenant (para listados)
 * Por ahora retorna datos mock
 */
export async function getPropiedadesByTenant(
  tenantId: string,
  options: { page?: number; limit?: number; filters?: Record<string, any> } = {}
): Promise<PropiedadResponse[]> {
  try {
    // TODO: Implementar cuando exista tabla propiedades
    const page = options.page || 1;
    const limit = options.limit || 12;
    
    console.log(`📋 Obteniendo propiedades para tenant ${tenantId} (mock)`);
    
    const allProperties: PropiedadResponse[] = [
      {
        id: '1',
        tenantId,
        titulo: 'Casa Moderna en Zona Residencial',
        precio: 250000,
        ubicacion: 'Ciudad Ejemplo, Zona Norte',
        habitaciones: 3,
        banos: 2,
        metros: 120,
        tipo: 'Casa',
        estado: 'Disponible',
      },
      {
        id: '2',
        tenantId,
        titulo: 'Departamento de Lujo en el Centro',
        precio: 350000,
        ubicacion: 'Ciudad Ejemplo, Centro',
        habitaciones: 4,
        banos: 3,
        metros: 150,
        tipo: 'Departamento',
        estado: 'Disponible',
      },
    ];

    // Simular paginación
    const start = (page - 1) * limit;
    return allProperties.slice(start, start + limit);
  } catch (error: any) {
    console.error('Error al obtener propiedades:', error);
    return [];
  }
}


