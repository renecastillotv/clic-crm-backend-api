/**
 * Rutas de Autenticación
 *
 * Endpoints para sincronizar usuarios con Clerk y gestionar sesiones.
 */

import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { requireAuth, optionalAuth, createClerkUser, deleteClerkUser, updateClerkUser, clerkClient } from '../middleware/clerkAuth.js';
import {
  getUsuarioByEmail,
  getUsuarioByClerkId,
  getUsuarioConRoles,
  syncUsuarioFromClerk,
  getModulosAccesibles,
  getPermisosVersion,
  updateUsuarioPerfil,
  upsertPerfilAsesor,
  getPerfilAsesor,
} from '../services/usuariosService.js';

// Configurar multer para subida de avatares
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'uploads', 'avatars');
    // Crear directorio si no existe
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

const uploadAvatar = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo se permiten imágenes.'));
    }
  },
});

const router = express.Router();

/**
 * POST /api/auth/sync
 *
 * Sincroniza usuario de Clerk con la base de datos.
 * Llamado después del login en el frontend.
 *
 * Body:
 * - clerkId: ID del usuario en Clerk
 * - email: Email del usuario
 * - firstName: Nombre (opcional)
 * - lastName: Apellido (opcional)
 * - avatarUrl: URL del avatar (opcional)
 */
router.post('/sync', requireAuth, async (req, res) => {
  try {
    const { clerkId, email, firstName, lastName, avatarUrl } = req.body;

    if (!clerkId || !email) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere clerkId y email',
      });
    }

    console.log(`🔄 Sincronizando usuario: ${email} (Clerk ID: ${clerkId})`);

    // Sincronizar usuario
    const usuario = await syncUsuarioFromClerk({
      clerkId,
      email,
      nombre: firstName,
      apellido: lastName,
      avatarUrl,
    });

    // Obtener usuario con roles
    const usuarioCompleto = await getUsuarioConRoles(usuario.id);

    console.log(`✅ Usuario sincronizado: ${email}`);

    res.json(usuarioCompleto);
  } catch (error: any) {
    console.error('❌ Error en /auth/sync:', error);
    res.status(500).json({
      error: 'Error al sincronizar usuario',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/me
 *
 * Obtiene el usuario actual autenticado con todos sus roles y tenants.
 * Requiere token de Clerk en el header Authorization.
 * Query params opcionales:
 * - tenantId: Si se proporciona, incluye el perfil de asesor para ese tenant
 */
router.get('/me', requireAuth, async (req, res) => {
  const startTime = Date.now();
  try {
    const clerkUserId = req.auth?.userId;
    const { tenantId } = req.query;

    if (!clerkUserId) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'No se encontró información del usuario',
      });
    }

    // Buscar usuario por Clerk ID
    const usuario = await getUsuarioByClerkId(clerkUserId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe en el sistema. Debe sincronizarse primero.',
        clerkUserId,
      });
    }

    // Obtener usuario completo con roles
    const usuarioCompleto = await getUsuarioConRoles(usuario.id);

    if (!usuarioCompleto) {
      console.error(`⚠️ getUsuarioConRoles devolvió null para usuario ${usuario.id}`);
      return res.status(500).json({
        error: 'Error al obtener datos del usuario',
        message: 'No se pudieron cargar los datos completos del usuario',
      });
    }

    // Si se proporciona tenantId, incluir perfil de asesor
    if (tenantId && typeof tenantId === 'string') {
      const perfilAsesor = await getPerfilAsesor(usuario.id, tenantId);
      if (perfilAsesor) {
        (usuarioCompleto as any).perfilAsesor = perfilAsesor;
      }
    }

    const duration = Date.now() - startTime;
    if (duration > 1000) {
      console.warn(`⚠️ /auth/me tardó ${duration}ms para usuario ${usuario.email}`);
    }

    res.json(usuarioCompleto);
  } catch (error: any) {
    const duration = Date.now() - startTime;
    console.error(`❌ Error en /auth/me (${duration}ms):`, error.message, error.stack);
    res.status(500).json({
      error: 'Error al obtener usuario',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/modulos/:tenantId
 *
 * Obtiene los módulos accesibles para el usuario en un tenant específico.
 */
router.get('/modulos/:tenantId', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({
        error: 'No autenticado',
      });
    }

    const usuario = await getUsuarioByClerkId(clerkUserId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
      });
    }

    const modulos = await getModulosAccesibles(usuario.id, tenantId);

    // DEBUG: Log detallado de módulos devueltos
    console.log(`📋 [/auth/modulos] Usuario: ${usuario.email}, Tenant: ${tenantId}`);
    console.log(`📋 [/auth/modulos] Módulos devueltos: ${modulos.length}`);
    console.log(`📋 [/auth/modulos] IDs: ${modulos.map((m: any) => m.id).join(', ')}`);

    res.json(modulos);
  } catch (error: any) {
    console.error('❌ Error en /auth/modulos:', error);
    res.status(500).json({
      error: 'Error al obtener módulos',
      message: error.message,
    });
  }
});

/**
 * GET /api/auth/permissions/version/:tenantId
 *
 * Retorna la versión actual de permisos del tenant (para cache invalidation).
 * El frontend compara con su versión cacheada para decidir si refetch.
 */
router.get('/permissions/version/:tenantId', requireAuth, async (req, res) => {
  try {
    const { tenantId } = req.params;
    const version = await getPermisosVersion(tenantId);
    res.json({ version });
  } catch (error: any) {
    console.error('❌ Error en /auth/permissions/version:', error);
    res.status(500).json({ error: 'Error al obtener versión de permisos' });
  }
});

/**
 * GET /api/auth/user-by-email
 *
 * Busca un usuario por email (para verificar si existe antes de crear).
 * Endpoint público para el flujo de registro.
 */
router.get('/user-by-email', async (req, res) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({
        error: 'Email requerido',
      });
    }

    const usuario = await getUsuarioByEmail(email);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        exists: false,
      });
    }

    // Solo devolver info básica (no sensible)
    res.json({
      exists: true,
      id: usuario.id,
      hasClerkId: !!usuario.clerkId,
    });
  } catch (error: any) {
    console.error('❌ Error en /auth/user-by-email:', error);
    res.status(500).json({
      error: 'Error al buscar usuario',
      message: error.message,
    });
  }
});

/**
 * PUT /api/auth/profile
 *
 * Actualiza el perfil del usuario autenticado.
 * Sincroniza nombre y apellido con Clerk.
 * Soporta subida de avatar (multipart/form-data).
 *
 * Body (JSON o FormData):
 * - nombre: Nombre del usuario
 * - apellido: Apellido del usuario
 * - telefono: Teléfono
 * - direccion: Dirección
 * - ciudad: Ciudad
 * - estado: Estado/Provincia
 * - codigoPostal: Código postal
 * - pais: País
 * - empresa: Empresa
 * - cargo: Cargo
 * - departamento: Departamento
 * - avatar: Archivo de imagen (opcional, solo en FormData)
 */
router.put('/profile', requireAuth, uploadAvatar.single('avatar'), async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'No se encontró información del usuario',
      });
    }

    // Buscar usuario en BD
    const usuario = await getUsuarioByClerkId(clerkUserId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe en el sistema',
      });
    }

    console.log(`🔄 Actualizando perfil de: ${usuario.email}`);

    // Extraer datos del body (funciona tanto con JSON como con FormData)
    const {
      nombre,
      apellido,
      telefono,
      direccion,
      ciudad,
      estado,
      codigoPostal,
      pais,
      empresa,
      cargo,
      departamento,
      // Campos de asesor
      biografia,
      especialidades,
      aniosExperiencia,
      licencia,
      redesSociales,
      tenantId,
    } = req.body;

    // Preparar datos para actualizar en BD local (tabla usuarios)
    const updateData: any = {};

    if (nombre !== undefined) updateData.nombre = nombre;
    if (apellido !== undefined) updateData.apellido = apellido;
    if (telefono !== undefined) updateData.telefono = telefono;
    if (direccion !== undefined) updateData.direccion = direccion;
    if (ciudad !== undefined) updateData.ciudad = ciudad;
    if (estado !== undefined) updateData.estado = estado;
    if (codigoPostal !== undefined) updateData.codigoPostal = codigoPostal;
    if (pais !== undefined) updateData.pais = pais;
    if (empresa !== undefined) updateData.empresa = empresa;
    if (cargo !== undefined) updateData.cargo = cargo;
    if (departamento !== undefined) updateData.departamento = departamento;

    // Si hay avatar subido, procesar
    let avatarUrl = usuario.avatarUrl;
    if (req.file) {
      // Generar URL del avatar
      const baseUrl = process.env.API_BASE_URL || `http://localhost:${process.env.PORT || 3001}`;
      avatarUrl = `${baseUrl}/uploads/avatars/${req.file.filename}`;
      updateData.avatarUrl = avatarUrl;

      // Subir imagen a Clerk
      try {
        // Leer el archivo como buffer (async para no bloquear)
        const imageBuffer = await fs.promises.readFile(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const mimeType = req.file.mimetype;
        const dataUrl = `data:${mimeType};base64,${base64Image}`;

        // Actualizar imagen de perfil en Clerk
        await clerkClient.users.updateUserProfileImage(clerkUserId, {
          file: dataUrl as any, // Clerk SDK acepta data URLs como string
        });
        console.log(`✅ Avatar actualizado en Clerk`);
      } catch (clerkError: any) {
        console.error('⚠️ Error al actualizar avatar en Clerk:', clerkError.message);
        // No fallar la operación, el avatar local se actualizó
      }
    }

    // Sincronizar nombre y apellido con Clerk
    if (nombre !== undefined || apellido !== undefined) {
      try {
        await updateClerkUser(clerkUserId, {
          firstName: nombre,
          lastName: apellido,
        });
        console.log(`✅ Nombre/Apellido sincronizado con Clerk`);
      } catch (clerkError: any) {
        console.error('⚠️ Error al sincronizar con Clerk:', clerkError.message);
        // No fallar la operación, los datos locales se actualizarán
      }
    }

    // Actualizar en BD local (tabla usuarios)
    const usuarioActualizado = await updateUsuarioPerfil(usuario.id, updateData);

    // Si hay datos de asesor y tenantId, actualizar perfil de asesor
    const tieneDataAsesor = biografia !== undefined || especialidades !== undefined ||
                           aniosExperiencia !== undefined || licencia !== undefined ||
                           redesSociales !== undefined;

    if (tieneDataAsesor && tenantId) {
      try {
        // Parsear redesSociales si viene como string (FormData)
        let redesSocialesObj = redesSociales;
        if (typeof redesSociales === 'string') {
          try {
            redesSocialesObj = JSON.parse(redesSociales);
          } catch (e) {
            redesSocialesObj = {};
          }
        }

        console.log(`🔄 Actualizando perfil de asesor en tenant: ${tenantId}`);
        await upsertPerfilAsesor(usuario.id, tenantId, {
          biografia,
          especialidades,
          experienciaAnos: aniosExperiencia,
          licencia,
          redesSociales: redesSocialesObj,
        });
        console.log(`✅ Perfil de asesor actualizado`);
      } catch (asesorError: any) {
        console.error('⚠️ Error al actualizar perfil de asesor:', asesorError.message);
        // No fallar la operación principal
      }
    }

    // Obtener usuario completo con roles
    const usuarioCompleto = await getUsuarioConRoles(usuario.id);

    // Agregar datos de perfil asesor si existe
    if (tenantId) {
      const perfilAsesor = await getPerfilAsesor(usuario.id, tenantId);
      if (perfilAsesor) {
        (usuarioCompleto as any).perfilAsesor = perfilAsesor;
      }
    }

    console.log(`✅ Perfil actualizado: ${usuario.email}`);

    res.json(usuarioCompleto);
  } catch (error: any) {
    console.error('❌ Error en PUT /auth/profile:', error);
    res.status(500).json({
      error: 'Error al actualizar perfil',
      message: error.message,
    });
  }
});

/**
 * POST /api/auth/change-password
 *
 * Cambia la contraseña del usuario autenticado.
 * Utiliza Clerk Backend API para actualizar la contraseña.
 *
 * Body:
 * - currentPassword: Contraseña actual (para verificación futura)
 * - newPassword: Nueva contraseña
 */
router.post('/change-password', requireAuth, async (req, res) => {
  try {
    const clerkUserId = req.auth?.userId;

    if (!clerkUserId) {
      return res.status(401).json({
        error: 'No autenticado',
        message: 'No se encontró información del usuario',
      });
    }

    const { currentPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({
        error: 'Datos incompletos',
        message: 'Se requiere la nueva contraseña',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        error: 'Contraseña muy corta',
        message: 'La contraseña debe tener al menos 8 caracteres',
      });
    }

    // Buscar usuario en BD
    const usuario = await getUsuarioByClerkId(clerkUserId);

    if (!usuario) {
      return res.status(404).json({
        error: 'Usuario no encontrado',
        message: 'El usuario no existe en el sistema',
      });
    }

    console.log(`🔐 Cambiando contraseña de: ${usuario.email}`);

    // Actualizar contraseña en Clerk
    try {
      await clerkClient.users.updateUser(clerkUserId, {
        password: newPassword,
      });
      console.log(`✅ Contraseña actualizada en Clerk para: ${usuario.email}`);
    } catch (clerkError: any) {
      console.error('❌ Error al cambiar contraseña en Clerk:', clerkError.message);

      // Manejar errores específicos de Clerk
      if (clerkError.message?.includes('password')) {
        return res.status(400).json({
          error: 'Contraseña inválida',
          message: 'La contraseña no cumple con los requisitos de seguridad',
        });
      }

      throw clerkError;
    }

    res.json({
      success: true,
      message: 'Contraseña actualizada correctamente',
    });
  } catch (error: any) {
    console.error('❌ Error en POST /auth/change-password:', error);
    res.status(500).json({
      error: 'Error al cambiar contraseña',
      message: error.message,
    });
  }
});

export default router;
