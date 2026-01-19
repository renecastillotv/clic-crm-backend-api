import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

// Imports dinámicos para evitar problemas de ESM
const loadApp = async () => {
  const { testConnection } = await import('../src/config/database.js');
  const { query } = await import('../src/utils/db.js');
  const { getTable, schema } = await import('../src/database/schema.js');
  const tenantsRouter = (await import('../src/routes/tenants/index.js')).default;
  const authRouter = (await import('../src/routes/auth.js')).default;
  const webhooksRouter = (await import('../src/routes/webhooks.js')).default;
  const seccionesRouter = (await import('../src/routes/secciones.js')).default;
  const adminRouter = (await import('../src/routes/admin.js')).default;
  const catalogosRouter = (await import('../src/routes/catalogos.js')).default;
  const ubicacionesRouter = (await import('../src/routes/ubicaciones.js')).default;
  const geocodingRouter = (await import('../src/routes/geocoding.js')).default;
  const importRouter = (await import('../src/routes/import.js')).default;

  const app = express();

  // Middlewares
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'production'
    });
  });

  // Obtener primer tenant (para pruebas)
  app.get('/api/tenants/first', async (req, res) => {
    try {
      const result = await query('SELECT id, nombre, slug FROM tenants WHERE activo = true LIMIT 1');
      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'No se encontró ningún tenant activo' });
      }
      res.json(result.rows[0]);
    } catch (error) {
      console.error('Error obteniendo tenant:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  });

  // Rutas principales
  app.use('/api/auth', authRouter);
  app.use('/api/webhooks', webhooksRouter);
  app.use('/api/secciones', seccionesRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/catalogos', catalogosRouter);
  app.use('/api/ubicaciones', ubicacionesRouter);
  app.use('/api/geocoding', geocodingRouter);
  app.use('/api/import', importRouter);
  app.use('/api/tenants', tenantsRouter);

  // Ruta raíz
  app.get('/', (req, res) => {
    res.json({
      message: 'CLIC Platform API',
      version: '1.0.0',
      status: 'running'
    });
  });

  // Error handler global
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('Error:', err);
    res.status(err.statusCode || 500).json({
      error: err.message || 'Error interno del servidor',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    });
  });

  return app;
};

let appInstance: express.Application | null = null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (!appInstance) {
    appInstance = await loadApp();
  }

  return appInstance(req as any, res as any);
}
