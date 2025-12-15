import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import { query } from './utils/db.js';
import { getTable, schema } from './database/schema.js';
import tenantsRouter from './routes/tenants.js';
import authRouter from './routes/auth.js';
import webhooksRouter from './routes/webhooks.js';
import seccionesRouter from './routes/secciones.js';
import adminRouter from './routes/admin.js';
import catalogosRouter from './routes/catalogos.js';
import ubicacionesRouter from './routes/ubicaciones.js';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Log para debugging
console.log('🔧 Puerto configurado para el servidor API:', PORT);
console.log('🔧 DATABASE_URL configurada:', process.env.DATABASE_URL ? 'Sí' : 'No');

// Middlewares
app.use(cors());
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Obtener primer tenant (para pruebas)
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

// Obtener tenant por slug
app.get('/api/tenants/slug/:slug', async (req, res) => {
  try {
    const { getTenantBySlug } = await import('./services/tenantsService.js');
    const { slug } = req.params;
    const tenant = await getTenantBySlug(slug);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado' });
    }
    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al obtener tenant', message: error.message });
  }
});

// Detectar tenant por hostname (subdominio o dominio personalizado)
app.get('/api/tenants/detect', async (req, res) => {
  try {
    const { getTenantByHostname } = await import('./services/tenantsService.js');
    const { hostname, baseDomain } = req.query;
    
    if (!hostname || typeof hostname !== 'string') {
      return res.status(400).json({ error: 'Hostname requerido' });
    }
    
    const domain = typeof baseDomain === 'string' ? baseDomain : 'dominiosaas.com';
    const tenant = await getTenantByHostname(hostname, domain);
    
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant no encontrado para este dominio' });
    }
    
    res.json(tenant);
  } catch (error: any) {
    res.status(500).json({ error: 'Error al detectar tenant', message: error.message });
  }
});

// Test database connection
app.get('/api/db/test', async (req, res) => {
  try {
    const isConnected = await testConnection();
    if (isConnected) {
      res.json({ 
        status: 'success', 
        message: 'Conexión a la base de datos exitosa' 
      });
    } else {
      res.status(500).json({ 
        status: 'error', 
        message: 'Error al conectar con la base de datos' 
      });
    }
  } catch (error: any) {
    res.status(500).json({ 
      status: 'error', 
      message: 'Error al conectar con la base de datos',
      error: error.message 
    });
  }
});

// API Routes
app.get('/api', (req, res) => {
  res.json({ 
    message: 'API CRM',
    version: '1.0.0'
  });
});

// Schema endpoint - Consultar el esquema de la base de datos
app.get('/api/schema', (req, res) => {
  res.json({
    tables: schema.tables.length,
    relationships: schema.relationships.length,
    schema: schema,
  });
});

// Schema endpoint - Obtener información de una tabla específica
app.get('/api/schema/:tableName', (req, res) => {
  const { tableName } = req.params;
  const table = getTable(tableName);
  
  if (!table) {
    return res.status(404).json({
      error: 'Tabla no encontrada',
      message: `La tabla "${tableName}" no existe en el esquema`,
    });
  }
  
  res.json(table);
});

// Rutas de autenticación
app.use('/api/auth', authRouter);

// Rutas de webhooks (Clerk)
app.use('/api/webhooks', webhooksRouter);

// Rutas de tenants
app.use('/api/tenants', tenantsRouter);

// Rutas de secciones (catálogo global y rutas anidadas en tenants)
app.use('/api/secciones', seccionesRouter);
app.use('/api', seccionesRouter); // Para rutas /api/tenants/:tenantId/secciones

// Rutas de administración de la plataforma
app.use('/api/admin', adminRouter);

// Rutas de catálogos (amenidades, operaciones, categorías, monedas)
app.use('/api/catalogos', catalogosRouter);

// Rutas de ubicaciones
app.use('/api/ubicaciones', ubicacionesRouter);

// Nota: Las rutas de datos dinámicos están anidadas en /api/tenants/:tenantId/dynamic-data

// Iniciar servidor
if (process.env.NODE_ENV !== 'production' || process.env.VERCEL !== '1') {
  app.listen(PORT, async () => {
    console.log(`🚀 API server running on port ${PORT}`);
    
    // Probar conexión a la base de datos al iniciar
    if (process.env.DATABASE_URL) {
      await testConnection();
    } else {
      console.warn('⚠️  DATABASE_URL no está configurada');
    }
  });
}

// Export para Vercel Serverless Functions
export default app;
