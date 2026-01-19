import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import pg from 'pg';

// Cargar variables de entorno
dotenv.config();

const { Pool } = pg;

// Crear pool de conexión
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

// Query helper
async function query(text: string, params?: any[]) {
  const client = await pool.connect();
  try {
    return await client.query(text, params);
  } finally {
    client.release();
  }
}

// Test connection
async function testConnection() {
  try {
    await query('SELECT 1');
    console.log('✅ Conexión a BD exitosa');
    return true;
  } catch (error) {
    console.error('❌ Error de conexión a BD:', error);
    return false;
  }
}

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

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'CLIC Platform API',
    version: '1.0.0',
    status: 'running'
  });
});

// API root
app.get('/api', (req, res) => {
  res.json({
    message: 'API CRM',
    version: '1.0.0'
  });
});

// Database test
app.get('/api/db/test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ status: 'success', message: 'Conexión a la base de datos exitosa' });
    } else {
      res.status(500).json({ status: 'error', message: 'Error al conectar' });
    }
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message });
  }
});

// Get first tenant
app.get('/api/tenants/first', async (req, res) => {
  try {
    const result = await query('SELECT id, nombre, slug FROM tenants WHERE activo = true LIMIT 1');
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No hay tenants en la base de datos' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener tenant', message: error.message });
  }
});

// Get tenant by slug
app.get('/api/tenants/slug/:slug', async (req, res) => {
  try {
    const { slug } = req.params;
    const result = await query(
      'SELECT id, nombre, slug, dominio_personalizado, configuracion, activo FROM tenants WHERE slug = $1',
      [slug]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener tenant', message: error.message });
  }
});

// Detect tenant by hostname
app.get('/api/tenants/detect', async (req, res) => {
  try {
    const { hostname, baseDomain } = req.query;

    if (!hostname || typeof hostname !== 'string') {
      return res.status(400).json({ error: 'Hostname requerido' });
    }

    // First check custom domain
    let result = await query(
      'SELECT id, nombre, slug, dominio_personalizado, configuracion, activo FROM tenants WHERE dominio_personalizado = $1 AND activo = true',
      [hostname]
    );

    if (result.rows.length === 0) {
      // Check subdomain
      const domain = typeof baseDomain === 'string' ? baseDomain : 'clicpropiedades.com';
      if (hostname.endsWith(`.${domain}`)) {
        const subdomain = hostname.replace(`.${domain}`, '');
        result = await query(
          'SELECT id, nombre, slug, dominio_personalizado, configuracion, activo FROM tenants WHERE slug = $1 AND activo = true',
          [subdomain]
        );
      }
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Tenant no encontrado para este dominio' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al detectar tenant', message: error.message });
  }
});

// Get tenant propiedades list
app.get('/api/tenants/:tenantId/propiedades', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { limit = 50, offset = 0 } = req.query;

    const result = await query(
      `SELECT
        id, titulo, slug, precio, moneda_id, operacion_id,
        tipo_id, estado_publicacion, direccion, ciudad, pais,
        imagen_principal, imagenes, dormitorios, banos, metros_construidos,
        descripcion_corta, created_at, updated_at
       FROM propiedades
       WHERE tenant_id = $1 AND activo = true
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [tenantId, Number(limit), Number(offset)]
    );

    res.json(result.rows);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener propiedades', message: error.message });
  }
});

// Get single propiedad
app.get('/api/tenants/:tenantId/propiedades/:id', async (req, res) => {
  try {
    const { tenantId, id } = req.params;

    const result = await query(
      'SELECT * FROM propiedades WHERE tenant_id = $1 AND id = $2',
      [tenantId, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener propiedad', message: error.message });
  }
});

// Error handler
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Error interno del servidor'
  });
});

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.method} ${req.path} no existe`
  });
});

// Vercel handler
export default async function handler(req: VercelRequest, res: VercelResponse) {
  return app(req as any, res as any);
}
