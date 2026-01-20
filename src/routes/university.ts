/**
 * University Routes
 * API endpoints para gestionar cursos, secciones, videos y certificados
 */

import express, { Request, Response, Router } from 'express';
import * as universityService from '../services/universityService.js';

const router: Router = express.Router();

// ==================== CURSOS ====================

// GET /api/tenants/:tenantId/university/cursos
router.get('/cursos', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const { estado, limit, offset } = req.query;

    const result = await universityService.getCursosByTenant(tenantId, {
      estado: estado as any,
      limit: limit ? parseInt(limit as string) : undefined,
      offset: offset ? parseInt(offset as string) : undefined
    });

    res.json(result);
  } catch (error: any) {
    console.error('Error obteniendo cursos:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/tenants/:tenantId/university/cursos/:cursoId
router.get('/cursos/:cursoId', async (req: Request, res: Response) => {
  try {
    const { tenantId, cursoId } = req.params;
    const { detalle } = req.query;

    let curso;
    if (detalle === 'true') {
      curso = await universityService.getCursoConDetalle(tenantId, cursoId);
    } else {
      curso = await universityService.getCursoById(tenantId, cursoId);
    }

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(curso);
  } catch (error: any) {
    console.error('Error obteniendo curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tenants/:tenantId/university/cursos
router.post('/cursos', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const curso = await universityService.createCurso(tenantId, req.body);
    res.status(201).json(curso);
  } catch (error: any) {
    console.error('Error creando curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/university/cursos/:cursoId
router.put('/cursos/:cursoId', async (req: Request, res: Response) => {
  try {
    const { tenantId, cursoId } = req.params;
    const curso = await universityService.updateCurso(tenantId, cursoId, req.body);

    if (!curso) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json(curso);
  } catch (error: any) {
    console.error('Error actualizando curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tenants/:tenantId/university/cursos/:cursoId
router.delete('/cursos/:cursoId', async (req: Request, res: Response) => {
  try {
    const { tenantId, cursoId } = req.params;
    const deleted = await universityService.deleteCurso(tenantId, cursoId);

    if (!deleted) {
      return res.status(404).json({ error: 'Curso no encontrado' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== SECCIONES ====================

// GET /api/tenants/:tenantId/university/cursos/:cursoId/secciones
router.get('/cursos/:cursoId/secciones', async (req: Request, res: Response) => {
  try {
    const { cursoId } = req.params;
    const secciones = await universityService.getSeccionesByCurso(cursoId);
    res.json(secciones);
  } catch (error: any) {
    console.error('Error obteniendo secciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tenants/:tenantId/university/cursos/:cursoId/secciones
router.post('/cursos/:cursoId/secciones', async (req: Request, res: Response) => {
  try {
    const { cursoId } = req.params;
    const seccion = await universityService.createSeccion(cursoId, req.body);
    res.status(201).json(seccion);
  } catch (error: any) {
    console.error('Error creando sección:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/university/secciones/:seccionId
router.put('/secciones/:seccionId', async (req: Request, res: Response) => {
  try {
    const { seccionId } = req.params;
    const seccion = await universityService.updateSeccion(seccionId, req.body);

    if (!seccion) {
      return res.status(404).json({ error: 'Sección no encontrada' });
    }

    res.json(seccion);
  } catch (error: any) {
    console.error('Error actualizando sección:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tenants/:tenantId/university/secciones/:seccionId
router.delete('/secciones/:seccionId', async (req: Request, res: Response) => {
  try {
    const { seccionId } = req.params;
    const deleted = await universityService.deleteSeccion(seccionId);

    if (!deleted) {
      return res.status(404).json({ error: 'Sección no encontrada' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando sección:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/university/cursos/:cursoId/secciones/reorder
router.put('/cursos/:cursoId/secciones/reorder', async (req: Request, res: Response) => {
  try {
    const { cursoId } = req.params;
    const { ordenIds } = req.body;

    if (!Array.isArray(ordenIds)) {
      return res.status(400).json({ error: 'ordenIds debe ser un array' });
    }

    await universityService.reorderSecciones(cursoId, ordenIds);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error reordenando secciones:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== VIDEOS ====================

// GET /api/tenants/:tenantId/university/secciones/:seccionId/videos
router.get('/secciones/:seccionId/videos', async (req: Request, res: Response) => {
  try {
    const { seccionId } = req.params;
    const videos = await universityService.getVideosBySeccion(seccionId);
    res.json(videos);
  } catch (error: any) {
    console.error('Error obteniendo videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tenants/:tenantId/university/secciones/:seccionId/videos
router.post('/secciones/:seccionId/videos', async (req: Request, res: Response) => {
  try {
    const { seccionId } = req.params;
    const video = await universityService.createVideo(seccionId, req.body);
    res.status(201).json(video);
  } catch (error: any) {
    console.error('Error creando video:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/university/videos/:videoId
router.put('/videos/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const video = await universityService.updateVideo(videoId, req.body);

    if (!video) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    res.json(video);
  } catch (error: any) {
    console.error('Error actualizando video:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tenants/:tenantId/university/videos/:videoId
router.delete('/videos/:videoId', async (req: Request, res: Response) => {
  try {
    const { videoId } = req.params;
    const deleted = await universityService.deleteVideo(videoId);

    if (!deleted) {
      return res.status(404).json({ error: 'Video no encontrado' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando video:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/university/secciones/:seccionId/videos/reorder
router.put('/secciones/:seccionId/videos/reorder', async (req: Request, res: Response) => {
  try {
    const { seccionId } = req.params;
    const { ordenIds } = req.body;

    if (!Array.isArray(ordenIds)) {
      return res.status(400).json({ error: 'ordenIds debe ser un array' });
    }

    await universityService.reorderVideos(seccionId, ordenIds);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error reordenando videos:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CERTIFICADOS ====================

// GET /api/tenants/:tenantId/university/certificados
router.get('/certificados', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const certificados = await universityService.getCertificadosByTenant(tenantId);
    res.json(certificados);
  } catch (error: any) {
    console.error('Error obteniendo certificados:', error);
    res.status(500).json({ error: error.message });
  }
});

// POST /api/tenants/:tenantId/university/certificados
router.post('/certificados', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const certificado = await universityService.createCertificado(tenantId, req.body);
    res.status(201).json(certificado);
  } catch (error: any) {
    console.error('Error creando certificado:', error);
    res.status(500).json({ error: error.message });
  }
});

// PUT /api/tenants/:tenantId/university/certificados/:certificadoId
router.put('/certificados/:certificadoId', async (req: Request, res: Response) => {
  try {
    const { tenantId, certificadoId } = req.params;
    const certificado = await universityService.updateCertificado(tenantId, certificadoId, req.body);

    if (!certificado) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    res.json(certificado);
  } catch (error: any) {
    console.error('Error actualizando certificado:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tenants/:tenantId/university/certificados/:certificadoId
router.delete('/certificados/:certificadoId', async (req: Request, res: Response) => {
  try {
    const { tenantId, certificadoId } = req.params;
    const deleted = await universityService.deleteCertificado(tenantId, certificadoId);

    if (!deleted) {
      return res.status(404).json({ error: 'Certificado no encontrado' });
    }

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error eliminando certificado:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== CURSO-CERTIFICADO ====================

// POST /api/tenants/:tenantId/university/cursos/:cursoId/certificados/:certificadoId
router.post('/cursos/:cursoId/certificados/:certificadoId', async (req: Request, res: Response) => {
  try {
    const { cursoId, certificadoId } = req.params;
    const { porcentaje_requerido, requiere_examen } = req.body;

    await universityService.asignarCertificadoACurso(
      cursoId,
      certificadoId,
      porcentaje_requerido || 100,
      requiere_examen || false
    );

    res.json({ success: true });
  } catch (error: any) {
    console.error('Error asignando certificado a curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/tenants/:tenantId/university/cursos/:cursoId/certificados/:certificadoId
router.delete('/cursos/:cursoId/certificados/:certificadoId', async (req: Request, res: Response) => {
  try {
    const { cursoId, certificadoId } = req.params;
    await universityService.removerCertificadoDeCurso(cursoId, certificadoId);
    res.json({ success: true });
  } catch (error: any) {
    console.error('Error removiendo certificado de curso:', error);
    res.status(500).json({ error: error.message });
  }
});

// ==================== ESTADÍSTICAS ====================

// GET /api/tenants/:tenantId/university/stats
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const tenantId = req.params.tenantId;
    const stats = await universityService.getUniversityStats(tenantId);
    res.json(stats);
  } catch (error: any) {
    console.error('Error obteniendo estadísticas:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
