import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { testConnection } from './config/database.js';
import { query } from './utils/db.js';
import { getTable, schema } from './database/schema.js';
// Router modular de tenants (incluye módulos aislados + legacy fallback)
import tenantsRouter from './routes/tenants/index.js';
import authRouter from './routes/auth.js';
import webhooksRouter from './routes/webhooks.js';
import seccionesRouter from './routes/secciones.js';
import adminRouter from './routes/admin.js';
import catalogosRouter from './routes/catalogos.js';
import ubicacionesRouter from './routes/ubicaciones.js';
import geocodingRouter from './routes/geocoding.js';
import importRouter from './routes/import.js';
import oauthRouter from './routes/oauth.routes.js';
import cronRouter from './routes/cron.routes.js';
import metaWebhooksRouter from './routes/meta-webhooks.routes.js';
import publicRouter from './routes/public.routes.js';

// Cargar variables de entorno
dotenv.config();

// ============================================================================
// UTILIDADES DE MANEJO DE ERRORES
// ============================================================================

/**
 * Wrapper para rutas async - captura errores y los pasa al error handler
 * Uso: router.get('/ruta', asyncHandler(async (req, res) => { ... }))
 */
export const asyncHandler = (fn: (req: Request, res: Response, next: NextFunction) => Promise<any>) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Clase de error personalizada para errores de la API
 */
export class ApiError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(statusCode: number, message: string, isOperational = true) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Logger estructurado para la API
 */
export const logger = {
  info: (message: string, meta?: Record<string, any>) => {
    console.log(JSON.stringify({ level: 'info', message, timestamp: new Date().toISOString(), ...meta }));
  },
  warn: (message: string, meta?: Record<string, any>) => {
    console.warn(JSON.stringify({ level: 'warn', message, timestamp: new Date().toISOString(), ...meta }));
  },
  error: (message: string, error?: Error | any, meta?: Record<string, any>) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      timestamp: new Date().toISOString(),
      error: error?.message || error,
      stack: error?.stack,
      ...meta
    }));
  },
  debug: (message: string, meta?: Record<string, any>) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(JSON.stringify({ level: 'debug', message, timestamp: new Date().toISOString(), ...meta }));
    }
  }
};

const app = express();
const PORT = process.env.PORT || 3001;

// Log para debugging
console.log('🔧 Puerto configurado para el servidor API:', PORT);
console.log('🔧 DATABASE_URL configurada:', process.env.DATABASE_URL ? 'Sí' : 'No');

// Middlewares - CORS configuration for Vercel
const allowedOrigins = [
  'https://clic-crm-frontend.vercel.app',
  'https://crm.clicinmobiliaria.com',
  'http://localhost:5173',
  'http://localhost:3000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, etc)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      // Allow any vercel preview deployments
      if (origin.includes('.vercel.app')) {
        callback(null, true);
      } else {
        callback(null, true); // Allow all for now, can restrict later
      }
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  exposedHeaders: ['X-Scope-Status'],
}));

// Handle preflight requests explicitly
app.options('*', cors());

// Meta Webhooks: mount BEFORE express.json() to preserve raw body for HMAC signature verification
app.use('/api/webhooks/meta', express.raw({ type: 'application/json' }), metaWebhooksRouter);

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

// Rutas públicas (sin autenticación - para landing pages de tenants)
app.use('/api/public', publicRouter);

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
app.use('/api/catalogo', catalogosRouter); // Alias para compatibilidad

// Rutas de ubicaciones
app.use('/api/ubicaciones', ubicacionesRouter);

// Rutas de geocoding (Google Maps)
app.use('/api/geocoding', geocodingRouter);

// Rutas de importación (Alterestate, EasyBroker)
app.use('/api/import', importRouter);

// Rutas OAuth (callbacks sin autenticación - Google, Meta)
app.use('/api/oauth', oauthRouter);

// Rutas Cron (protegidas por X-Cron-Secret header)
app.use('/api/cron', cronRouter);

// Nota: Las rutas de datos dinámicos están anidadas en /api/tenants/:tenantId/dynamic-data

// ============================================================================
// RUTAS PÚBLICAS (sin autenticación)
// ============================================================================

// Verificación pública de certificados
app.get('/api/public/verificar-certificado/:codigo', async (req: Request, res: Response) => {
  try {
    const { codigo } = req.params;

    const sql = `
      SELECT
        ce.id,
        ce.codigo_verificacion,
        ce.fecha_emision,
        ce.url_pdf,
        ce.nombre_estudiante,
        i.nombre_usuario,
        i.email_usuario,
        c.titulo as nombre_curso,
        cert.nombre as nombre_certificado,
        cert.imagen_template,
        cert.campos_personalizados,
        t.nombre as nombre_empresa
      FROM university_certificados_emitidos ce
      JOIN university_inscripciones i ON ce.inscripcion_id = i.id
      JOIN university_cursos c ON i.curso_id = c.id
      JOIN university_certificados cert ON ce.certificado_id = cert.id
      JOIN tenants t ON i.tenant_id = t.id
      WHERE ce.codigo_verificacion = $1
    `;
    const result = await query(sql, [codigo]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    // Combinar datos del certificado con campos personalizados
    const row = result.rows[0];
    const campos = row.campos_personalizados || {};

    res.json({
      ...row,
      // Usar logo del certificado de los campos personalizados
      logo_empresa: campos.logo_empresa || null,
      firma_imagen: campos.firma_imagen,
      firma_nombre: campos.firma_nombre,
      firma_cargo: campos.firma_cargo,
      sello_imagen: campos.sello_imagen,
    });
  } catch (error: any) {
    console.error('Error verificando certificado:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ============================================================================
// GLOBAL ERROR HANDLER - CRÍTICO PARA ESTABILIDAD
// ============================================================================

/**
 * Middleware para rutas no encontradas (404)
 */
app.use((req: Request, res: Response) => {
  logger.warn('Ruta no encontrada', {
    method: req.method,
    path: req.path,
    ip: req.ip
  });
  res.status(404).json({
    error: 'Not Found',
    message: `La ruta ${req.method} ${req.path} no existe`,
    statusCode: 404
  });
});

/**
 * Global Error Handler - Captura TODOS los errores no manejados
 * IMPORTANTE: Este middleware DEBE estar después de todas las rutas
 */
app.use((err: any, req: Request, res: Response, _next: NextFunction) => {
  // Log del error
  logger.error('Error no capturado en la API', err, {
    method: req.method,
    path: req.path,
    query: req.query,
    body: req.method !== 'GET' ? req.body : undefined,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Determinar código de estado
  const statusCode = err.statusCode || err.status || 500;

  // Respuesta al cliente
  const response: Record<string, any> = {
    error: err.name || 'Internal Server Error',
    message: process.env.NODE_ENV === 'development'
      ? err.message
      : statusCode === 500
        ? 'Error interno del servidor'
        : err.message,
    statusCode
  };

  // En desarrollo, incluir stack trace
  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
});

// ============================================================================
// MANEJO DE ERRORES NO CAPTURADOS A NIVEL DE PROCESO
// ============================================================================

process.on('uncaughtException', (error: Error) => {
  logger.error('EXCEPCIÓN NO CAPTURADA - El servidor continuará', error);
  // NO hacer process.exit() para mantener el servidor funcionando
});

process.on('unhandledRejection', (reason: any) => {
  logger.error('PROMESA RECHAZADA NO MANEJADA', reason);
  // NO hacer process.exit() para mantener el servidor funcionando
});

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
