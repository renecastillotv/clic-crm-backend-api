/**
 * TIPOS COMPARTIDOS PARA RUTAS DE TENANTS
 *
 * Define interfaces para request params cuando se usa mergeParams: true
 */

import { Request, Response, NextFunction } from 'express';

// Parámetros base que siempre incluyen tenantId
export interface TenantParams {
  tenantId: string;
  [key: string]: string | undefined;
}

// Request con tenant params - usar en lugar de Request
export type TenantRequest<P = Record<string, string>> = Request<P & TenantParams>;

// Helper para extraer tenantId de forma segura
export function getTenantId(req: Request): string {
  return (req.params as TenantParams).tenantId;
}

// Tipos para handlers async con tenant
export type TenantHandler<P = Record<string, string>> = (
  req: TenantRequest<P>,
  res: Response,
  next: NextFunction
) => Promise<any>;
