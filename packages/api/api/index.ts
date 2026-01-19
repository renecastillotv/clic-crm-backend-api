import type { VercelRequest, VercelResponse } from '@vercel/node';

// Re-export la app de Express como handler de Vercel
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Cargar la app de forma dinámica para evitar problemas de ESM
  const { default: app } = await import('../src/index.js');
  return app(req as any, res as any);
}
