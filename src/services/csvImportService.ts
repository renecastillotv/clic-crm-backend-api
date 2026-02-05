/**
 * Servicio de Importación desde CSV (Alterestate Export)
 *
 * Importa propiedades desde archivos CSV exportados de Alterestate
 * y asigna agentes basándose en coincidencia de nombres.
 */

import { query } from '../utils/db.js';
import * as fs from 'fs';
import * as path from 'path';

// ============================================================================
// TIPOS E INTERFACES
// ============================================================================

export interface CSVPropertyRow {
  Codigo: string;
  Codigo_Interno: string;
  Categoria: string;
  'Codigo Tipologia': string;
  Descripcion: string;
  'Es un proyecto': string;
  Nombre: string;
  'Nombre privado': string;
  Agentes: string;
  Pais: string;
  Provincia: string;
  Ciudad: string;
  Sector: string;
  Operacion: string;
  'Moneda (Venta)': string;
  'Precio venta': string;
  'Moneda (Alquiler)': string;
  'Precio alquiler': string;
  'Moneda (Renta temporal)': string;
  'Precio renta temporal': string;
  'Moneda (Alquiler amueblado)': string;
  'Precio Alquier Amueblado': string;
  'Moneda (Venta amueblado)': string;
  'Precio Venta Amueblado': string;
  'Moneda (Mantenimiento)': string;
  'Precio mantenimiento': string;
  'Moneda (Separacion)': string;
  'Precio separacion': string;
  Comision: string;
  'Comision de Alquiler': string;
  'Comision Compartida': string;
  Habitaciones: string;
  Banos: string;
  Estacionamientos: string;
  'Mt2 Construido': string;
  'Mt2 Terreno': string;
  Disponibilidad: string;
  Estatus: string;
  'Ult. Actualizacion': string;
  'Fecha Agregada': string;
  'Fecha de Entrega': string;
  'Fecha de Liberación': string;
  'Foto destacada': string;
  'Galeria de imagenes': string;
}

export interface AgentMapping {
  csvName: string;
  userId: string | null;
  userName: string | null;
  confidence: 'exact' | 'partial' | 'none';
}

export interface CSVAnalysisResult {
  totalRows: number;
  uniqueAgents: string[];
  agentMappings: AgentMapping[];
  unmappedAgents: string[];
  propertyAgentMap: Record<string, string>; // external_id -> agent name
}

export interface AssignmentResult {
  total: number;
  assigned: number;
  skipped: number;
  errors: Array<{ externalId: string; error: string }>;
  assignments: Array<{ externalId: string; agentName: string; userId: string }>;
}

// ============================================================================
// CONSTANTES - MAPEO DE NOMBRES DE AGENTES
// ============================================================================

/**
 * Mapeo manual de nombres de agentes del CSV a nombres en la base de datos
 * Esto permite manejar variaciones en nombres, acentos, etc.
 */
const AGENT_NAME_ALIASES: Record<string, string[]> = {
  // Formato: 'nombre_en_db': ['variante1_csv', 'variante2_csv', ...]
  'René Castillo': ['Ren� Castillo', 'Rene Castillo', 'René Castillo'],
  'Angel Freddy Baez Baez': ['Angel Freddy Baez Baez', 'Angel Freddy Báez Báez'],
  'Eddy Rosario': ['Eddy Rosario'],
  'Etnoel Reyes': ['Etnoel & Delianny Reyes Soto', 'Etnoel Reyes Soto'],
  'Delianny Reyes': ['Etnoel & Delianny Reyes Soto', 'Delianny Reyes Soto'],
  'Katerin Olivares': ['Katerin Olivares Batista', 'Katerin Olivares'],
  'Marcia Pujols': ['Marcia Pujols'],
  'Michael Lantigua': ['Michael Lantigua'],
  'Sandra Lockward': ['Sandra Lockward'],
  'Luis Manuel Guichardo': ['Luis Manuel Guichardo'],
  'Jenniffer Espinal': ['Jenniffer Espinal'],
  'Adrian Méndez': ['Adrian C. M�ndez', 'Adrian C. Méndez', 'Adrian Mendez'],
  'CLIC Inmobiliaria': ['CLIC Inmobiliaria'], // Mapear a null o a un usuario específico
};

// ============================================================================
// FUNCIONES DE PARSING CSV
// ============================================================================

/**
 * Parsea un archivo CSV con soporte para campos con comas
 */
export function parseCSV(content: string): CSVPropertyRow[] {
  const lines = content.split('\n');
  if (lines.length < 2) return [];

  const headers = parseCSVLine(lines[0]);
  const rows: CSVPropertyRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = parseCSVLine(line);
    const row: any = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push(row as CSVPropertyRow);
  }

  return rows;
}

/**
 * Parsea una línea CSV respetando comillas
 */
function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const nextChar = line[i + 1];

    if (char === '"' && !inQuotes) {
      inQuotes = true;
    } else if (char === '"' && inQuotes) {
      if (nextChar === '"') {
        current += '"';
        i++; // Skip escaped quote
      } else {
        inQuotes = false;
      }
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

// ============================================================================
// FUNCIONES DE ANÁLISIS Y MAPEO
// ============================================================================

/**
 * Obtiene los usuarios de un tenant para mapeo de agentes
 */
export async function getTenantUsers(tenantId: string): Promise<Array<{
  id: string;
  nombre: string;
  apellido: string;
  fullName: string;
  email: string;
}>> {
  const sql = `
    SELECT
      u.id,
      u.nombre,
      u.apellido,
      CONCAT(u.nombre, ' ', u.apellido) as "fullName",
      u.email
    FROM usuarios u
    INNER JOIN usuarios_tenants ut ON u.id = ut.usuario_id
    WHERE ut.tenant_id = $1
      AND ut.activo = true
      AND u.activo = true
    ORDER BY u.nombre, u.apellido
  `;

  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Normaliza un nombre para comparación (quita acentos, lowercase, etc.)
 */
function normalizeName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9\s]/g, '') // Quitar caracteres especiales
    .replace(/\s+/g, ' ') // Normalizar espacios
    .trim();
}

/**
 * Busca el mejor match de un nombre de agente CSV en los usuarios de la DB
 */
function findBestUserMatch(
  csvAgentName: string,
  users: Array<{ id: string; fullName: string; nombre: string; apellido: string }>
): { userId: string | null; userName: string | null; confidence: 'exact' | 'partial' | 'none' } {
  if (!csvAgentName || csvAgentName === 'CLIC Inmobiliaria') {
    return { userId: null, userName: null, confidence: 'none' };
  }

  const normalizedCSV = normalizeName(csvAgentName);

  // 1. Buscar coincidencia exacta (normalizada)
  for (const user of users) {
    if (normalizeName(user.fullName) === normalizedCSV) {
      return { userId: user.id, userName: user.fullName, confidence: 'exact' };
    }
  }

  // 2. Buscar por aliases conocidos
  for (const [dbName, aliases] of Object.entries(AGENT_NAME_ALIASES)) {
    if (aliases.some(alias => normalizeName(alias) === normalizedCSV)) {
      const matchedUser = users.find(u =>
        normalizeName(u.fullName) === normalizeName(dbName) ||
        normalizeName(u.nombre) === normalizeName(dbName.split(' ')[0])
      );
      if (matchedUser) {
        return { userId: matchedUser.id, userName: matchedUser.fullName, confidence: 'exact' };
      }
    }
  }

  // 3. Buscar coincidencia parcial (primer nombre o apellido)
  const csvParts = normalizedCSV.split(' ');
  for (const user of users) {
    const userParts = normalizeName(user.fullName).split(' ');

    // Si el primer nombre coincide
    if (csvParts[0] === userParts[0]) {
      return { userId: user.id, userName: user.fullName, confidence: 'partial' };
    }

    // Si algún apellido coincide
    if (csvParts.some(p => userParts.includes(p) && p.length > 3)) {
      return { userId: user.id, userName: user.fullName, confidence: 'partial' };
    }
  }

  return { userId: null, userName: null, confidence: 'none' };
}

/**
 * Analiza un archivo CSV y crea mapeos de agentes
 */
export async function analyzeCSVAgents(
  csvContent: string,
  tenantId: string
): Promise<CSVAnalysisResult> {
  const rows = parseCSV(csvContent);
  const users = await getTenantUsers(tenantId);

  console.log(`📊 Analyzing ${rows.length} properties from CSV`);
  console.log(`👥 Found ${users.length} users in tenant`);

  // Extraer agentes únicos
  const agentSet = new Set<string>();
  const propertyAgentMap: Record<string, string> = {};

  rows.forEach(row => {
    const agent = row.Agentes?.trim();
    if (agent) {
      agentSet.add(agent);
      propertyAgentMap[row.Codigo] = agent;
    }
  });

  const uniqueAgents = Array.from(agentSet).sort();
  console.log(`📋 Found ${uniqueAgents.length} unique agents in CSV`);

  // Crear mapeos
  const agentMappings: AgentMapping[] = [];
  const unmappedAgents: string[] = [];

  for (const agentName of uniqueAgents) {
    const match = findBestUserMatch(agentName, users);

    agentMappings.push({
      csvName: agentName,
      userId: match.userId,
      userName: match.userName,
      confidence: match.confidence,
    });

    if (!match.userId) {
      unmappedAgents.push(agentName);
    }
  }

  return {
    totalRows: rows.length,
    uniqueAgents,
    agentMappings,
    unmappedAgents,
    propertyAgentMap,
  };
}

// ============================================================================
// FUNCIONES DE ASIGNACIÓN
// ============================================================================

/**
 * Asigna agentes a propiedades existentes basándose en external_id
 */
export async function assignAgentsToProperties(
  tenantId: string,
  propertyAgentMap: Record<string, string>, // external_id -> agent name
  agentMappings: AgentMapping[]
): Promise<AssignmentResult> {
  const result: AssignmentResult = {
    total: Object.keys(propertyAgentMap).length,
    assigned: 0,
    skipped: 0,
    errors: [],
    assignments: [],
  };

  // Crear mapa de agente CSV -> userId
  const agentToUserMap: Record<string, string | null> = {};
  agentMappings.forEach(m => {
    agentToUserMap[m.csvName] = m.userId;
  });

  // Procesar cada propiedad
  for (const [externalId, agentName] of Object.entries(propertyAgentMap)) {
    try {
      const userId = agentToUserMap[agentName];

      if (!userId) {
        result.skipped++;
        continue;
      }

      // Buscar propiedad por external_id
      const findSql = `
        SELECT id FROM propiedades
        WHERE tenant_id = $1
          AND external_id = $2
          AND external_source = 'alterestate'
        LIMIT 1
      `;
      const found = await query(findSql, [tenantId, externalId]);

      if (found.rows.length === 0) {
        result.skipped++;
        continue;
      }

      // Actualizar agente_id
      const updateSql = `
        UPDATE propiedades
        SET agente_id = $1, updated_at = NOW()
        WHERE id = $2
      `;
      await query(updateSql, [userId, found.rows[0].id]);

      result.assigned++;
      result.assignments.push({
        externalId,
        agentName,
        userId,
      });

    } catch (error: any) {
      result.errors.push({
        externalId,
        error: error.message,
      });
    }
  }

  return result;
}

/**
 * Actualiza el mapeo de agentes manualmente
 */
export async function updateAgentMapping(
  tenantId: string,
  csvAgentName: string,
  userId: string
): Promise<{ success: boolean; updated: number }> {
  // Buscar todas las propiedades con este agente en caracteristicas
  const sql = `
    UPDATE propiedades
    SET agente_id = $1, updated_at = NOW()
    WHERE tenant_id = $2
      AND external_source = 'alterestate'
      AND caracteristicas->>'agente_nombre' ILIKE $3
    RETURNING id
  `;

  const result = await query(sql, [userId, tenantId, `%${csvAgentName}%`]);

  return {
    success: true,
    updated: result.rowCount || 0,
  };
}

// ============================================================================
// FUNCIONES DE REPORTE
// ============================================================================

/**
 * Genera un reporte de propiedades sin agente asignado
 */
export async function getPropertiesWithoutAgent(tenantId: string): Promise<Array<{
  id: string;
  titulo: string;
  external_id: string;
  agente_nombre: string | null;
}>> {
  const sql = `
    SELECT
      id,
      titulo,
      external_id,
      caracteristicas->>'agente_nombre' as agente_nombre
    FROM propiedades
    WHERE tenant_id = $1
      AND external_source = 'alterestate'
      AND agente_id IS NULL
    ORDER BY created_at DESC
  `;

  const result = await query(sql, [tenantId]);
  return result.rows;
}

/**
 * Genera estadísticas de asignación de agentes
 */
export async function getAgentAssignmentStats(tenantId: string): Promise<{
  total: number;
  withAgent: number;
  withoutAgent: number;
  byAgent: Array<{ agentName: string; count: number }>;
}> {
  const totalSql = `
    SELECT COUNT(*) as count
    FROM propiedades
    WHERE tenant_id = $1 AND external_source = 'alterestate'
  `;

  const withAgentSql = `
    SELECT COUNT(*) as count
    FROM propiedades
    WHERE tenant_id = $1 AND external_source = 'alterestate' AND agente_id IS NOT NULL
  `;

  const byAgentSql = `
    SELECT
      CONCAT(u.nombre, ' ', u.apellido) as "agentName",
      COUNT(p.id) as count
    FROM propiedades p
    INNER JOIN usuarios u ON p.agente_id = u.id
    WHERE p.tenant_id = $1 AND p.external_source = 'alterestate'
    GROUP BY u.id, u.nombre, u.apellido
    ORDER BY count DESC
  `;

  const [totalResult, withAgentResult, byAgentResult] = await Promise.all([
    query(totalSql, [tenantId]),
    query(withAgentSql, [tenantId]),
    query(byAgentSql, [tenantId]),
  ]);

  const total = parseInt(totalResult.rows[0].count);
  const withAgent = parseInt(withAgentResult.rows[0].count);

  return {
    total,
    withAgent,
    withoutAgent: total - withAgent,
    byAgent: byAgentResult.rows.map(r => ({
      agentName: r.agentName,
      count: parseInt(r.count),
    })),
  };
}
