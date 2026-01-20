/**
 * MÓDULO DE CONTENIDO - Rutas CRUD
 *
 * Este módulo maneja todas las operaciones de contenido del CRM.
 * Incluye: articulos, videos, faqs, testimonios, categorias, tags
 * Está aislado para que errores aquí NO afecten otros módulos.
 */

import express, { Request, Response, NextFunction } from 'express';
import { query } from '../../utils/db.js';

const router = express.Router({ mergeParams: true });

// Tipos para request con tenantId del parent router
interface TenantParams { tenantId: string }
interface ArticuloParams extends TenantParams { articuloId: string }
interface ContenidoTagParams extends TenantParams { tipoContenido: string; contenidoId: string }
interface TestimonioParams extends TenantParams { testimonioId: string }
interface FaqParams extends TenantParams { faqId: string }
interface VideoParams extends TenantParams { videoId: string }

// ==================== RUTAS: ARTÍCULOS ====================

/**
 * GET /api/tenants/:tenantId/contenido/articulos
 */
router.get('/articulos', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { publicado, destacado, categoria_id, limit, offset } = req.query;

    let sql = `
      SELECT a.*, c.nombre as categoria_nombre, c.slug as categoria_slug
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (publicado !== undefined) {
      sql += ` AND a.publicado = $${paramIndex}`;
      params.push(publicado === 'true');
      paramIndex++;
    }
    if (destacado !== undefined) {
      sql += ` AND a.destacado = $${paramIndex}`;
      params.push(destacado === 'true');
      paramIndex++;
    }
    if (categoria_id) {
      sql += ` AND a.categoria_id = $${paramIndex}`;
      params.push(categoria_id);
      paramIndex++;
    }

    sql += ' ORDER BY a.fecha_publicacion DESC NULLS LAST, a.created_at DESC';

    if (limit) {
      sql += ` LIMIT $${paramIndex}`;
      params.push(parseInt(limit as string));
      paramIndex++;
    }
    if (offset) {
      sql += ` OFFSET $${paramIndex}`;
      params.push(parseInt(offset as string));
    }

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/articulos/:articuloId
 */
router.get('/articulos/:articuloId', async (req: Request<ArticuloParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, articuloId } = req.params;
    const sql = `
      SELECT a.*, c.nombre as categoria_nombre, c.slug as categoria_slug
      FROM articulos a
      LEFT JOIN categorias_contenido c ON a.categoria_id = c.id
      WHERE a.tenant_id = $1 AND a.id = $2
    `;
    const result = await query(sql, [tenantId, articuloId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/articulos
 */
router.post('/articulos', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const body = req.body;

    // Soportar tanto camelCase como snake_case
    const slug = body.slug;
    const titulo = body.titulo;
    const extracto = body.extracto;
    const contenido = body.contenido;
    const imagen_principal = body.imagen_principal || body.imagenPrincipal || null;
    const imagenes = body.imagenes;
    // Convertir strings vacíos a null para campos UUID
    const autor_id_raw = body.autor_id || body.autorId;
    const autor_id = autor_id_raw && autor_id_raw.trim() !== '' ? autor_id_raw : null;
    const autor_nombre = body.autor_nombre || body.autorNombre || null;
    const autor_foto = body.autor_foto || body.autorFoto || null;
    const meta_titulo = body.meta_titulo || body.metaTitulo || null;
    const meta_descripcion = body.meta_descripcion || body.metaDescripcion || null;
    const tags = body.tags || body.tagIds;
    const publicado = body.publicado;
    const destacado = body.destacado;
    const fecha_publicacion = body.fecha_publicacion || body.fechaPublicacion || null;
    // Convertir string vacío a null para campos UUID
    const categoria_id_raw = body.categoria_id || body.categoriaId;
    const categoria_id = categoria_id_raw && categoria_id_raw.trim() !== '' ? categoria_id_raw : null;
    const idioma = body.idioma;
    const traducciones = body.traducciones;

    const sql = `
      INSERT INTO articulos (
        tenant_id, slug, titulo, extracto, contenido, imagen_principal, imagenes,
        autor_id, autor_nombre, autor_foto, meta_titulo, meta_descripcion,
        tags, publicado, destacado, fecha_publicacion, categoria_id, idioma, traducciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, slug, titulo, extracto, contenido, imagen_principal,
      JSON.stringify(imagenes || []), autor_id, autor_nombre, autor_foto,
      meta_titulo, meta_descripcion, JSON.stringify(tags || []),
      publicado || false, destacado || false, fecha_publicacion,
      categoria_id, idioma || 'es', JSON.stringify(traducciones || {})
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/articulos/:articuloId
 */
router.put('/articulos/:articuloId', async (req: Request<ArticuloParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, articuloId } = req.params;
    const body = req.body;

    // Soportar tanto camelCase como snake_case
    const slug = body.slug;
    const titulo = body.titulo;
    const extracto = body.extracto;
    const contenido = body.contenido;
    const imagen_principal = body.imagen_principal || body.imagenPrincipal || null;
    const imagenes = body.imagenes;
    // Convertir strings vacíos a null para campos UUID
    const autor_id_raw = body.autor_id || body.autorId;
    const autor_id = autor_id_raw && autor_id_raw.trim() !== '' ? autor_id_raw : null;
    const autor_nombre = body.autor_nombre || body.autorNombre || null;
    const autor_foto = body.autor_foto || body.autorFoto || null;
    const meta_titulo = body.meta_titulo || body.metaTitulo || null;
    const meta_descripcion = body.meta_descripcion || body.metaDescripcion || null;
    const tags = body.tags || body.tagIds;
    const publicado = body.publicado;
    const destacado = body.destacado;
    const fecha_publicacion = body.fecha_publicacion || body.fechaPublicacion || null;
    const categoria_id_raw = body.categoria_id || body.categoriaId;
    const categoria_id = categoria_id_raw && categoria_id_raw.trim() !== '' ? categoria_id_raw : null;
    const idioma = body.idioma;
    const traducciones = body.traducciones;

    const sql = `
      UPDATE articulos SET
        slug = COALESCE($3, slug),
        titulo = COALESCE($4, titulo),
        extracto = $5,
        contenido = $6,
        imagen_principal = $7,
        imagenes = COALESCE($8, imagenes),
        autor_id = COALESCE($9, autor_id),
        autor_nombre = COALESCE($10, autor_nombre),
        autor_foto = COALESCE($11, autor_foto),
        meta_titulo = $12,
        meta_descripcion = $13,
        tags = COALESCE($14, tags),
        publicado = COALESCE($15, publicado),
        destacado = COALESCE($16, destacado),
        fecha_publicacion = $17,
        categoria_id = $18,
        idioma = COALESCE($19, idioma),
        traducciones = COALESCE($20, traducciones),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, articuloId, slug, titulo, extracto, contenido, imagen_principal,
      imagenes ? JSON.stringify(imagenes) : null, autor_id, autor_nombre, autor_foto,
      meta_titulo, meta_descripcion, tags ? JSON.stringify(tags) : null,
      publicado, destacado, fecha_publicacion, categoria_id,
      idioma, traducciones ? JSON.stringify(traducciones) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/articulos/:articuloId
 */
router.delete('/articulos/:articuloId', async (req: Request<ArticuloParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, articuloId } = req.params;
    const sql = 'DELETE FROM articulos WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, articuloId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Artículo no encontrado' });
    }
    res.json({ success: true, message: 'Artículo eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: VIDEOS ====================

/**
 * GET /api/tenants/:tenantId/contenido/videos
 */
router.get('/videos', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT v.*, c.nombre as categoria_nombre
      FROM videos v
      LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
      WHERE v.tenant_id = $1
      ORDER BY v.orden ASC, v.created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/videos/:videoId
 */
router.get('/videos/:videoId', async (req: Request<VideoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, videoId } = req.params;
    const sql = `
      SELECT v.*, c.nombre as categoria_nombre
      FROM videos v
      LEFT JOIN categorias_contenido c ON v.categoria_id = c.id
      WHERE v.tenant_id = $1 AND v.id = $2
    `;
    const result = await query(sql, [tenantId, videoId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/videos
 */
router.post('/videos', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const body = req.body;

    // Soportar tanto camelCase como snake_case
    const slug = body.slug;
    const titulo = body.titulo;
    const descripcion = body.descripcion;
    // Columnas reales en la tabla: video_url, tipo_video, video_id, embed_code
    const video_url = body.video_url || body.videoUrl || null;
    const tipo_video = body.tipo_video || body.tipoVideo || 'youtube';
    const video_id = body.video_id || body.videoId || null;
    const embed_code = body.embed_code || body.embedCode || null;
    const thumbnail = body.thumbnail || null;
    const duracion = body.duracion_segundos || body.duracionSegundos || body.duracion || 0;
    // Convertir string vacío a null para campos UUID
    const categoria_id_raw = body.categoria_id || body.categoriaId;
    const categoria_id = categoria_id_raw && categoria_id_raw.trim() !== '' ? categoria_id_raw : null;
    const publicado = body.publicado;
    const destacado = body.destacado;
    const orden = body.orden;
    const idioma = body.idioma;
    const traducciones = body.traducciones;
    const fecha_publicacion = body.fecha_publicacion || body.fechaPublicacion || null;
    // Convertir string vacío a null para campos UUID
    const autor_id_raw = body.autor_id || body.autorId;
    const autor_id = autor_id_raw && autor_id_raw.trim() !== '' ? autor_id_raw : null;
    // Slug traducciones
    const slug_traducciones = body.slug_traducciones || body.slugTraducciones || null;

    const sql = `
      INSERT INTO videos (
        tenant_id, slug, titulo, descripcion, video_url, tipo_video, video_id, embed_code, thumbnail,
        duracion_segundos, categoria_id, publicado, destacado, orden, idioma, traducciones, fecha_publicacion, autor_id, slug_traducciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, slug, titulo, descripcion, video_url, tipo_video, video_id, embed_code,
      thumbnail, duracion, categoria_id, publicado ?? true,
      destacado ?? false, orden || 0, idioma || 'es',
      traducciones ? JSON.stringify(traducciones) : null,
      fecha_publicacion, autor_id,
      slug_traducciones ? JSON.stringify(slug_traducciones) : null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/videos/:videoId
 */
router.put('/videos/:videoId', async (req: Request<VideoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, videoId } = req.params;
    const body = req.body;

    // Soportar tanto camelCase como snake_case
    const slug = body.slug;
    const titulo = body.titulo;
    const descripcion = body.descripcion;
    // Columnas reales en la tabla: video_url, tipo_video, video_id, embed_code
    const video_url = body.video_url || body.videoUrl || null;
    const tipo_video = body.tipo_video || body.tipoVideo || 'youtube';
    const video_id = body.video_id || body.videoId || null;
    const embed_code = body.embed_code || body.embedCode || null;
    const thumbnail = body.thumbnail || null;
    const duracion = body.duracion_segundos || body.duracionSegundos || body.duracion || 0;
    // Convertir string vacío a null para campos UUID
    const categoria_id_raw = body.categoria_id || body.categoriaId;
    const categoria_id = categoria_id_raw && categoria_id_raw.trim() !== '' ? categoria_id_raw : null;
    const publicado = body.publicado;
    const destacado = body.destacado;
    const orden = body.orden;
    const idioma = body.idioma;
    const traducciones = body.traducciones;
    const fecha_publicacion = body.fecha_publicacion || body.fechaPublicacion || null;
    // Convertir string vacío a null para campos UUID
    const autor_id_raw = body.autor_id || body.autorId;
    const autor_id = autor_id_raw && autor_id_raw.trim() !== '' ? autor_id_raw : null;
    // Slug traducciones
    const slug_traducciones = body.slug_traducciones || body.slugTraducciones || null;

    const sql = `
      UPDATE videos SET
        slug = COALESCE($3, slug),
        titulo = COALESCE($4, titulo),
        descripcion = $5,
        video_url = COALESCE($6, video_url),
        tipo_video = COALESCE($7, tipo_video),
        video_id = $8,
        embed_code = $9,
        thumbnail = $10,
        duracion_segundos = $11,
        categoria_id = $12,
        publicado = COALESCE($13, publicado),
        destacado = COALESCE($14, destacado),
        orden = COALESCE($15, orden),
        idioma = COALESCE($16, idioma),
        traducciones = COALESCE($17, traducciones),
        fecha_publicacion = $18,
        autor_id = COALESCE($19, autor_id),
        slug_traducciones = COALESCE($20, slug_traducciones),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, videoId, slug, titulo, descripcion, video_url, tipo_video, video_id, embed_code,
      thumbnail, duracion, categoria_id, publicado, destacado, orden,
      idioma, traducciones ? JSON.stringify(traducciones) : null, fecha_publicacion, autor_id,
      slug_traducciones ? JSON.stringify(slug_traducciones) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/videos/:videoId
 */
router.delete('/videos/:videoId', async (req: Request<VideoParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, videoId } = req.params;
    const sql = 'DELETE FROM videos WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, videoId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }
    res.json({ success: true, message: 'Video eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: FAQS ====================

/**
 * GET /api/tenants/:tenantId/contenido/faqs
 */
router.get('/faqs', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT f.*, c.nombre as categoria_nombre
      FROM faqs f
      LEFT JOIN categorias_contenido c ON f.categoria_id = c.id
      WHERE f.tenant_id = $1
      ORDER BY f.orden ASC, f.created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/faqs/:faqId
 */
router.get('/faqs/:faqId', async (req: Request<FaqParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, faqId } = req.params;
    const sql = `
      SELECT f.*, c.nombre as categoria_nombre
      FROM faqs f
      LEFT JOIN categorias_contenido c ON f.categoria_id = c.id
      WHERE f.tenant_id = $1 AND f.id = $2
    `;
    const result = await query(sql, [tenantId, faqId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/faqs
 */
router.post('/faqs', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const body = req.body;
    const pregunta = body.pregunta;
    const respuesta = body.respuesta;
    const categoria_id = body.categoria_id || body.categoriaId || null;
    const contexto = body.contexto || null;
    const publicado = body.publicado;
    const destacada = body.destacado || body.destacada;
    const orden = body.orden;
    const idioma = body.idioma;
    const traducciones = body.traducciones;

    const sql = `
      INSERT INTO faqs (
        tenant_id, pregunta, respuesta, categoria_id, contexto, publicado, destacada, orden, idioma, traducciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, pregunta, respuesta, categoria_id, contexto, publicado ?? true,
      destacada ?? false, orden || 0, idioma || 'es',
      traducciones ? JSON.stringify(traducciones) : null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/faqs/:faqId
 */
router.put('/faqs/:faqId', async (req: Request<FaqParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, faqId } = req.params;
    const body = req.body;
    const pregunta = body.pregunta;
    const respuesta = body.respuesta;
    const categoria_id = body.categoria_id || body.categoriaId || null;
    const contexto = body.contexto;
    const publicado = body.publicado;
    const destacada = body.destacado || body.destacada;
    const orden = body.orden;
    const idioma = body.idioma;
    const traducciones = body.traducciones;

    const sql = `
      UPDATE faqs SET
        pregunta = COALESCE($3, pregunta),
        respuesta = COALESCE($4, respuesta),
        categoria_id = $5,
        contexto = COALESCE($6, contexto),
        publicado = COALESCE($7, publicado),
        destacada = COALESCE($8, destacada),
        orden = COALESCE($9, orden),
        idioma = COALESCE($10, idioma),
        traducciones = COALESCE($11, traducciones),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, faqId, pregunta, respuesta, categoria_id, contexto,
      publicado, destacada, orden, idioma,
      traducciones ? JSON.stringify(traducciones) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'FAQ no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/faqs/:faqId
 */
router.delete('/faqs/:faqId', async (req: Request<FaqParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, faqId } = req.params;
    const sql = 'DELETE FROM faqs WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, faqId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'FAQ no encontrada' });
    }
    res.json({ success: true, message: 'FAQ eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: TESTIMONIOS ====================

/**
 * GET /api/tenants/:tenantId/contenido/testimonios
 */
router.get('/testimonios', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const sql = `
      SELECT * FROM testimonios
      WHERE tenant_id = $1
      ORDER BY created_at DESC
    `;
    const result = await query(sql, [tenantId]);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/testimonios/:testimonioId
 */
router.get('/testimonios/:testimonioId', async (req: Request<TestimonioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, testimonioId } = req.params;
    const sql = `
      SELECT * FROM testimonios
      WHERE tenant_id = $1 AND id = $2
    `;
    const result = await query(sql, [tenantId, testimonioId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/testimonios
 */
router.post('/testimonios', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    // Acepta tanto camelCase como snake_case
    const {
      slug, idioma,
      cliente_nombre, clienteNombre,
      cliente_cargo, clienteCargo,
      cliente_empresa, clienteEmpresa,
      cliente_foto, clienteFoto,
      cliente_ubicacion, clienteUbicacion,
      titulo, contenido,
      categoria_id, categoriaId,
      rating, publicado, destacado, verificado, fuente,
      contacto_id, contactoId,
      asesor_id, asesorId,
      propiedad_id, propiedadId,
      traducciones
    } = req.body;

    // Helper para convertir string vacío a null (UUIDs no aceptan string vacío)
    const emptyToNull = (val: any) => (val === '' || val === undefined) ? null : val;

    const sql = `
      INSERT INTO testimonios (
        tenant_id, slug, idioma, cliente_nombre, cliente_cargo, cliente_empresa, cliente_foto,
        cliente_ubicacion, titulo, contenido, categoria_id, rating, publicado,
        destacado, verificado, fuente, contacto_id, asesor_id, propiedad_id, traducciones
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId,
      slug,
      idioma || 'es',
      cliente_nombre || clienteNombre,
      emptyToNull(cliente_cargo || clienteCargo),
      emptyToNull(cliente_empresa || clienteEmpresa),
      emptyToNull(cliente_foto || clienteFoto),
      emptyToNull(cliente_ubicacion || clienteUbicacion),
      emptyToNull(titulo),
      contenido,
      emptyToNull(categoria_id || categoriaId),
      rating || 5,
      publicado ?? true,
      destacado ?? false,
      verificado ?? false,
      emptyToNull(fuente),
      emptyToNull(contacto_id || contactoId),
      emptyToNull(asesor_id || asesorId),
      emptyToNull(propiedad_id || propiedadId),
      traducciones ? JSON.stringify(traducciones) : null
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/testimonios/:testimonioId
 */
router.put('/testimonios/:testimonioId', async (req: Request<TestimonioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, testimonioId } = req.params;
    // Acepta tanto camelCase como snake_case
    const {
      slug, idioma,
      cliente_nombre, clienteNombre,
      cliente_cargo, clienteCargo,
      cliente_empresa, clienteEmpresa,
      cliente_foto, clienteFoto,
      cliente_ubicacion, clienteUbicacion,
      titulo, contenido,
      categoria_id, categoriaId,
      rating, publicado, destacado, verificado, fuente,
      contacto_id, contactoId,
      asesor_id, asesorId,
      propiedad_id, propiedadId,
      traducciones
    } = req.body;

    // Helper para convertir string vacío a null (UUIDs no aceptan string vacío)
    const emptyToNull = (val: any) => (val === '' || val === undefined) ? null : val;

    const sql = `
      UPDATE testimonios SET
        slug = COALESCE($3, slug),
        idioma = COALESCE($4, idioma),
        cliente_nombre = COALESCE($5, cliente_nombre),
        cliente_cargo = $6,
        cliente_empresa = $7,
        cliente_foto = $8,
        cliente_ubicacion = $9,
        titulo = $10,
        contenido = COALESCE($11, contenido),
        categoria_id = $12,
        rating = COALESCE($13, rating),
        publicado = COALESCE($14, publicado),
        destacado = COALESCE($15, destacado),
        verificado = COALESCE($16, verificado),
        fuente = $17,
        contacto_id = $18,
        asesor_id = $19,
        propiedad_id = $20,
        traducciones = COALESCE($21, traducciones),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId,
      testimonioId,
      slug,
      idioma,
      cliente_nombre || clienteNombre,
      emptyToNull(cliente_cargo || clienteCargo),
      emptyToNull(cliente_empresa || clienteEmpresa),
      emptyToNull(cliente_foto || clienteFoto),
      emptyToNull(cliente_ubicacion || clienteUbicacion),
      emptyToNull(titulo),
      contenido,
      emptyToNull(categoria_id || categoriaId),
      rating,
      publicado,
      destacado,
      verificado,
      emptyToNull(fuente),
      emptyToNull(contacto_id || contactoId),
      emptyToNull(asesor_id || asesorId),
      emptyToNull(propiedad_id || propiedadId),
      traducciones ? JSON.stringify(traducciones) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Testimonio no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/testimonios/:testimonioId
 */
router.delete('/testimonios/:testimonioId', async (req: Request<TestimonioParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, testimonioId } = req.params;
    const sql = 'DELETE FROM testimonios WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, testimonioId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Testimonio no encontrado' });
    }
    res.json({ success: true, message: 'Testimonio eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: CATEGORÍAS ====================

/**
 * GET /api/tenants/:tenantId/contenido/categorias
 */
router.get('/categorias', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { tipo } = req.query;

    let sql = 'SELECT * FROM categorias_contenido WHERE tenant_id = $1';
    const params: any[] = [tenantId];

    if (tipo) {
      sql += ' AND tipo = $2';
      params.push(tipo);
    }

    sql += ' ORDER BY orden ASC, nombre ASC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/categorias/:categoriaId
 */
router.get('/categorias/:categoriaId', async (req: Request<TenantParams & { categoriaId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, categoriaId } = req.params;
    const sql = 'SELECT * FROM categorias_contenido WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, categoriaId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/categorias
 */
router.post('/categorias', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { nombre, slug, tipo, descripcion, color, icono, orden, traducciones, slug_traducciones } = req.body;

    const sql = `
      INSERT INTO categorias_contenido (tenant_id, nombre, slug, tipo, descripcion, color, icono, orden, traducciones, slug_traducciones)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, nombre, slug, tipo, descripcion, color, icono, orden || 0,
      traducciones ? JSON.stringify(traducciones) : '{}',
      slug_traducciones ? JSON.stringify(slug_traducciones) : '{}'
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/categorias/:categoriaId
 */
router.put('/categorias/:categoriaId', async (req: Request<TenantParams & { categoriaId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, categoriaId } = req.params;
    const { nombre, slug, tipo, descripcion, color, icono, orden, traducciones, slug_traducciones } = req.body;

    const sql = `
      UPDATE categorias_contenido SET
        nombre = COALESCE($3, nombre),
        slug = COALESCE($4, slug),
        tipo = COALESCE($5, tipo),
        descripcion = $6,
        color = $7,
        icono = $8,
        orden = COALESCE($9, orden),
        traducciones = COALESCE($10, traducciones),
        slug_traducciones = COALESCE($11, slug_traducciones),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, categoriaId, nombre, slug, tipo, descripcion, color, icono, orden,
      traducciones ? JSON.stringify(traducciones) : null,
      slug_traducciones ? JSON.stringify(slug_traducciones) : null
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/categorias/:categoriaId
 */
router.delete('/categorias/:categoriaId', async (req: Request<TenantParams & { categoriaId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, categoriaId } = req.params;
    const sql = 'DELETE FROM categorias_contenido WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, categoriaId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Categoría no encontrada' });
    }
    res.json({ success: true, message: 'Categoría eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: CONTEOS DE CONTENIDO ====================

/**
 * GET /api/tenants/:tenantId/contenido/conteos
 * Obtiene estadísticas de conteo de contenidos (artículos, videos, faqs, testimonios)
 */
router.get('/conteos', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    // Obtener conteos de contenido
    const articulos = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE publicado = true) as publicados FROM articulos WHERE tenant_id = $1', [tenantId]);
    const videos = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE publicado = true) as publicados FROM videos WHERE tenant_id = $1', [tenantId]);
    const faqs = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE publicado = true) as publicados FROM faqs WHERE tenant_id = $1', [tenantId]);
    const testimonios = await query('SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE publicado = true) as publicados FROM testimonios WHERE tenant_id = $1', [tenantId]);

    res.json({
      articulos: {
        total: parseInt(articulos.rows[0]?.total || 0),
        publicados: parseInt(articulos.rows[0]?.publicados || 0)
      },
      videos: {
        total: parseInt(videos.rows[0]?.total || 0),
        publicados: parseInt(videos.rows[0]?.publicados || 0)
      },
      faqs: {
        total: parseInt(faqs.rows[0]?.total || 0),
        publicados: parseInt(faqs.rows[0]?.publicados || 0)
      },
      testimonios: {
        total: parseInt(testimonios.rows[0]?.total || 0),
        publicados: parseInt(testimonios.rows[0]?.publicados || 0)
      }
    });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: SEO STATS ====================

interface SeoStatParams extends TenantParams { seoStatId: string }

/**
 * GET /api/tenants/:tenantId/contenido/seo-stats
 * Obtiene registros de SEO del tenant
 */
router.get('/seo-stats', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { publicado, categoria_id } = req.query;

    let sql = `
      SELECT s.*, c.nombre as categoria_nombre
      FROM seo_stats s
      LEFT JOIN categorias_contenido c ON s.categoria_id = c.id
      WHERE s.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    if (publicado !== undefined) {
      sql += ` AND s.publicado = $${paramIndex}`;
      params.push(publicado === 'true');
      paramIndex++;
    }
    if (categoria_id) {
      sql += ` AND s.categoria_id = $${paramIndex}`;
      params.push(categoria_id);
      paramIndex++;
    }

    sql += ' ORDER BY s.orden ASC, s.created_at DESC';

    const result = await query(sql, params);
    res.json(result.rows);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/seo-stats/:seoStatId
 */
router.get('/seo-stats/:seoStatId', async (req: Request<SeoStatParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, seoStatId } = req.params;
    const sql = `
      SELECT s.*, c.nombre as categoria_nombre
      FROM seo_stats s
      LEFT JOIN categorias_contenido c ON s.categoria_id = c.id
      WHERE s.tenant_id = $1 AND s.id = $2
    `;
    const result = await query(sql, [tenantId, seoStatId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SEO Stat no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/seo-stats
 */
router.post('/seo-stats', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const body = req.body;

    // Soportar tanto camelCase como snake_case
    const titulo = body.titulo;
    const descripcion = body.descripcion || null;
    const contenido = body.contenido || null;
    const slug = body.slug || null;
    const meta_titulo = body.meta_titulo || body.metaTitulo || null;
    const meta_descripcion = body.meta_descripcion || body.metaDescripcion || null;
    // Convertir string vacío a null para campos UUID
    const categoria_id_raw = body.categoria_id || body.categoriaId;
    const categoria_id = categoria_id_raw && categoria_id_raw.trim() !== '' ? categoria_id_raw : null;
    const keywords = body.keywords || [];
    const publicado = body.publicado ?? true;
    const destacado = body.destacado ?? false;
    const orden = body.orden || 0;
    const traducciones = body.traducciones || {};
    // Nuevos campos de arrays para matching
    const operaciones = Array.isArray(body.operaciones) ? body.operaciones : [];
    const tipo_propiedad_ids = Array.isArray(body.tipo_propiedad_ids || body.tipoPropiedadIds)
      ? (body.tipo_propiedad_ids || body.tipoPropiedadIds)
      : [];
    const ubicacion_ids = Array.isArray(body.ubicacion_ids || body.ubicacionIds)
      ? (body.ubicacion_ids || body.ubicacionIds)
      : [];

    const sql = `
      INSERT INTO seo_stats (
        tenant_id, titulo, descripcion, contenido, slug, meta_titulo, meta_descripcion,
        categoria_id, keywords, publicado, destacado, orden, traducciones,
        operaciones, tipo_propiedad_ids, ubicacion_ids
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14::text[], $15::uuid[], $16::uuid[])
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, titulo, descripcion, contenido, slug, meta_titulo, meta_descripcion,
      categoria_id, JSON.stringify(keywords), publicado, destacado, orden,
      JSON.stringify(traducciones), operaciones, tipo_propiedad_ids, ubicacion_ids
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/seo-stats/:seoStatId
 */
router.put('/seo-stats/:seoStatId', async (req: Request<SeoStatParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, seoStatId } = req.params;
    const body = req.body;

    // Soportar tanto camelCase como snake_case
    const titulo = body.titulo;
    const descripcion = body.descripcion;
    const contenido = body.contenido;
    const slug = body.slug;
    const meta_titulo = body.meta_titulo || body.metaTitulo;
    const meta_descripcion = body.meta_descripcion || body.metaDescripcion;
    // Convertir string vacío a null para campos UUID
    const categoria_id_raw = body.categoria_id || body.categoriaId;
    const categoria_id = categoria_id_raw && categoria_id_raw.trim() !== '' ? categoria_id_raw : null;
    const keywords = body.keywords;
    const publicado = body.publicado;
    const destacado = body.destacado;
    const orden = body.orden;
    const traducciones = body.traducciones;
    // Nuevos campos de arrays para matching
    // Asegurar que los arrays sean válidos o null
    const operaciones = Array.isArray(body.operaciones) ? body.operaciones : null;
    const tipo_propiedad_ids = Array.isArray(body.tipo_propiedad_ids || body.tipoPropiedadIds)
      ? (body.tipo_propiedad_ids || body.tipoPropiedadIds)
      : null;
    const ubicacion_ids = Array.isArray(body.ubicacion_ids || body.ubicacionIds)
      ? (body.ubicacion_ids || body.ubicacionIds)
      : null;

    const sql = `
      UPDATE seo_stats SET
        titulo = COALESCE($3, titulo),
        descripcion = $4,
        contenido = $5,
        slug = $6,
        meta_titulo = $7,
        meta_descripcion = $8,
        categoria_id = $9,
        keywords = COALESCE($10, keywords),
        publicado = COALESCE($11, publicado),
        destacado = COALESCE($12, destacado),
        orden = COALESCE($13, orden),
        traducciones = COALESCE($14, traducciones),
        operaciones = COALESCE($15::text[], operaciones),
        tipo_propiedad_ids = COALESCE($16::uuid[], tipo_propiedad_ids),
        ubicacion_ids = COALESCE($17::uuid[], ubicacion_ids),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, seoStatId, titulo, descripcion, contenido, slug,
      meta_titulo, meta_descripcion, categoria_id,
      keywords ? JSON.stringify(keywords) : null, publicado, destacado, orden,
      traducciones ? JSON.stringify(traducciones) : null,
      operaciones, tipo_propiedad_ids, ubicacion_ids
    ]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'SEO Stat no encontrado' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/seo-stats/:seoStatId
 */
router.delete('/seo-stats/:seoStatId', async (req: Request<SeoStatParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, seoStatId } = req.params;
    const sql = 'DELETE FROM seo_stats WHERE tenant_id = $1 AND id = $2';
    const result = await query(sql, [tenantId, seoStatId]);
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'SEO Stat no encontrado' });
    }
    res.json({ success: true, message: 'SEO Stat eliminado correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: TAGS ====================

/**
 * GET /api/tenants/:tenantId/contenido/tags
 * Obtiene tags globales del tenant
 * NOTA: La tabla tags_globales no existe todavía
 */
router.get('/tags', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    // Tabla tags_globales no existe - retornar array vacío
    res.json({ tags: [] });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS: RELACIONES DE CONTENIDO ====================
// IMPORTANTE: Estas rutas DEBEN estar ANTES de /:tipoContenido/:contenidoId/tags

interface RelacionParams extends TenantParams { relacionId: string }

/**
 * GET /api/tenants/:tenantId/contenido/relaciones
 * Obtiene relaciones de contenido, opcionalmente filtradas por tipo
 *
 * Parámetros:
 * - bidireccional: si es 'true', busca donde el contenido sea origen O destino
 * - contenido_id: ID del contenido (para búsqueda bidireccional)
 * - contenido_tipo: tipo del contenido (para búsqueda bidireccional)
 * - tipo_origen, id_origen, tipo_destino: filtros unidireccionales tradicionales
 */
router.get('/relaciones', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { tipo, id_origen, tipo_origen, tipo_destino, bidireccional, contenido_id, contenido_tipo } = req.query;

    // Modo bidireccional: busca donde el contenido sea origen O destino
    // Incluye nombres/títulos de los contenidos relacionados usando subqueries
    if (bidireccional === 'true' && contenido_id && contenido_tipo) {
      const sql = `
        SELECT r.*,
          CASE
            WHEN r.id_origen = $2 AND r.tipo_origen = $3 THEN 'origen'
            ELSE 'destino'
          END as direccion,
          -- Nombre del origen
          CASE r.tipo_origen
            WHEN 'articulo' THEN (SELECT titulo FROM articulos WHERE id = r.id_origen LIMIT 1)
            WHEN 'video' THEN (SELECT titulo FROM videos WHERE id = r.id_origen LIMIT 1)
            WHEN 'faq' THEN (SELECT CASE WHEN length(pregunta) > 50 THEN substring(pregunta, 1, 50) || '...' ELSE pregunta END FROM faqs WHERE id = r.id_origen LIMIT 1)
            WHEN 'testimonio' THEN (SELECT cliente_nombre FROM testimonios WHERE id = r.id_origen LIMIT 1)
            WHEN 'seo_stat' THEN (SELECT titulo FROM seo_stats WHERE id = r.id_origen LIMIT 1)
            WHEN 'propiedad' THEN (SELECT titulo FROM propiedades WHERE id = r.id_origen LIMIT 1)
            ELSE NULL
          END as nombre_origen,
          -- Nombre del destino
          CASE r.tipo_destino
            WHEN 'articulo' THEN (SELECT titulo FROM articulos WHERE id = r.id_destino LIMIT 1)
            WHEN 'video' THEN (SELECT titulo FROM videos WHERE id = r.id_destino LIMIT 1)
            WHEN 'faq' THEN (SELECT CASE WHEN length(pregunta) > 50 THEN substring(pregunta, 1, 50) || '...' ELSE pregunta END FROM faqs WHERE id = r.id_destino LIMIT 1)
            WHEN 'testimonio' THEN (SELECT cliente_nombre FROM testimonios WHERE id = r.id_destino LIMIT 1)
            WHEN 'seo_stat' THEN (SELECT titulo FROM seo_stats WHERE id = r.id_destino LIMIT 1)
            WHEN 'propiedad' THEN (SELECT titulo FROM propiedades WHERE id = r.id_destino LIMIT 1)
            ELSE NULL
          END as nombre_destino
        FROM contenido_relaciones r
        WHERE r.tenant_id = $1
          AND (
            (r.id_origen = $2 AND r.tipo_origen = $3)
            OR
            (r.id_destino = $2 AND r.tipo_destino = $3)
          )
        ORDER BY r.orden ASC, r.created_at DESC
      `;
      const result = await query(sql, [tenantId, contenido_id, contenido_tipo]);
      return res.json({ relaciones: result.rows });
    }

    // Modo tradicional unidireccional - ahora también incluye nombres
    let sql = `
      SELECT r.*,
        -- Nombre del origen
        CASE r.tipo_origen
          WHEN 'articulo' THEN (SELECT titulo FROM articulos WHERE id = r.id_origen LIMIT 1)
          WHEN 'video' THEN (SELECT titulo FROM videos WHERE id = r.id_origen LIMIT 1)
          WHEN 'faq' THEN (SELECT CASE WHEN length(pregunta) > 50 THEN substring(pregunta, 1, 50) || '...' ELSE pregunta END FROM faqs WHERE id = r.id_origen LIMIT 1)
          WHEN 'testimonio' THEN (SELECT cliente_nombre FROM testimonios WHERE id = r.id_origen LIMIT 1)
          WHEN 'seo_stat' THEN (SELECT titulo FROM seo_stats WHERE id = r.id_origen LIMIT 1)
          WHEN 'propiedad' THEN (SELECT titulo FROM propiedades WHERE id = r.id_origen LIMIT 1)
          ELSE NULL
        END as nombre_origen,
        -- Nombre del destino
        CASE r.tipo_destino
          WHEN 'articulo' THEN (SELECT titulo FROM articulos WHERE id = r.id_destino LIMIT 1)
          WHEN 'video' THEN (SELECT titulo FROM videos WHERE id = r.id_destino LIMIT 1)
          WHEN 'faq' THEN (SELECT CASE WHEN length(pregunta) > 50 THEN substring(pregunta, 1, 50) || '...' ELSE pregunta END FROM faqs WHERE id = r.id_destino LIMIT 1)
          WHEN 'testimonio' THEN (SELECT cliente_nombre FROM testimonios WHERE id = r.id_destino LIMIT 1)
          WHEN 'seo_stat' THEN (SELECT titulo FROM seo_stats WHERE id = r.id_destino LIMIT 1)
          WHEN 'propiedad' THEN (SELECT titulo FROM propiedades WHERE id = r.id_destino LIMIT 1)
          ELSE NULL
        END as nombre_destino
      FROM contenido_relaciones r
      WHERE r.tenant_id = $1
    `;
    const params: any[] = [tenantId];
    let paramIndex = 2;

    // Filtrar por tipo de origen
    if (tipo_origen && typeof tipo_origen === 'string') {
      sql += ` AND r.tipo_origen = $${paramIndex}`;
      params.push(tipo_origen);
      paramIndex++;
    }

    // Filtrar por tipo de destino
    if (tipo_destino && typeof tipo_destino === 'string') {
      sql += ` AND r.tipo_destino = $${paramIndex}`;
      params.push(tipo_destino);
      paramIndex++;
    }

    // Filtrar por ID de origen específico
    if (id_origen && typeof id_origen === 'string') {
      sql += ` AND r.id_origen = $${paramIndex}`;
      params.push(id_origen);
      paramIndex++;
    }

    // Filtro genérico "tipo" para compatibilidad
    if (tipo && typeof tipo === 'string') {
      sql += ` AND (r.tipo_origen = $${paramIndex} OR r.tipo_destino = $${paramIndex})`;
      params.push(tipo);
      paramIndex++;
    }

    sql += ' ORDER BY r.orden ASC, r.created_at DESC';

    const result = await query(sql, params);
    res.json({ relaciones: result.rows });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/contenido/relaciones/:relacionId
 * Obtiene una relación específica
 */
router.get('/relaciones/:relacionId', async (req: Request<RelacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, relacionId } = req.params;
    const sql = `
      SELECT * FROM contenido_relaciones
      WHERE tenant_id = $1 AND id = $2
    `;
    const result = await query(sql, [tenantId, relacionId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/contenido/relaciones
 * Crea una nueva relación de contenido
 */
router.post('/relaciones', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    // Soportar tanto camelCase como snake_case
    const tipo_origen = req.body.tipo_origen || req.body.tipoOrigen;
    const id_origen = req.body.id_origen || req.body.idOrigen;
    const tipo_destino = req.body.tipo_destino || req.body.tipoDestino;
    const id_destino = req.body.id_destino || req.body.idDestino;
    const descripcion = req.body.descripcion;
    const orden = req.body.orden;
    const activa = req.body.activa;

    if (!tipo_origen || !id_origen || !tipo_destino || !id_destino) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere tipo_origen, id_origen, tipo_destino e id_destino'
      });
    }

    // Verificar que no exista la misma relación
    const existingCheck = await query(
      `SELECT id FROM contenido_relaciones
       WHERE tenant_id = $1 AND tipo_origen = $2 AND id_origen = $3
       AND tipo_destino = $4 AND id_destino = $5`,
      [tenantId, tipo_origen, id_origen, tipo_destino, id_destino]
    );

    if (existingCheck.rows.length > 0) {
      return res.status(409).json({
        error: 'Relación duplicada',
        message: 'Ya existe una relación entre estos contenidos'
      });
    }

    const sql = `
      INSERT INTO contenido_relaciones (
        tenant_id, tipo_origen, id_origen, tipo_destino, id_destino,
        descripcion, orden, activa
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const result = await query(sql, [
      tenantId, tipo_origen, id_origen, tipo_destino, id_destino,
      descripcion || null, orden || 0, activa ?? true
    ]);
    res.status(201).json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/contenido/relaciones/:relacionId
 * Actualiza una relación existente
 */
router.put('/relaciones/:relacionId', async (req: Request<RelacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, relacionId } = req.params;
    const { descripcion, orden, activa } = req.body;

    const sql = `
      UPDATE contenido_relaciones SET
        descripcion = COALESCE($3, descripcion),
        orden = COALESCE($4, orden),
        activa = COALESCE($5, activa),
        updated_at = NOW()
      WHERE tenant_id = $1 AND id = $2
      RETURNING *
    `;
    const result = await query(sql, [tenantId, relacionId, descripcion, orden, activa]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/contenido/relaciones/:relacionId
 * Elimina una relación
 */
router.delete('/relaciones/:relacionId', async (req: Request<RelacionParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, relacionId } = req.params;
    const result = await query(
      'DELETE FROM contenido_relaciones WHERE tenant_id = $1 AND id = $2 RETURNING id',
      [tenantId, relacionId]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Relación no encontrada' });
    }
    res.json({ success: true, message: 'Relación eliminada correctamente' });
  } catch (error) {
    next(error);
  }
});

// ==================== RUTAS CATCH-ALL (con parámetros dinámicos) ====================
// IMPORTANTE: Estas rutas DEBEN estar AL FINAL porque capturan patrones genéricos

/**
 * GET /api/tenants/:tenantId/contenido/:tipoContenido/:contenidoId/tags
 * Obtiene tags de un contenido específico
 * NOTA: Las tablas tags_globales y contenido_tags no existen todavía
 */
router.get('/:tipoContenido/:contenidoId/tags', async (req: Request<ContenidoTagParams>, res: Response, next: NextFunction) => {
  try {
    // Tablas tags_globales y contenido_tags no existen - retornar array vacío
    res.json([]);
  } catch (error) {
    next(error);
  }
});

export default router;
