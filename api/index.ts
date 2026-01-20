/**
 * Vercel Serverless Function Entry Point
 *
 * Este archivo importa la aplicación Express completa desde src/index.ts
 * y la expone como una función serverless de Vercel.
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import app from '../src/index.js';

// Vercel handler - usa la app completa con todas las rutas
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
