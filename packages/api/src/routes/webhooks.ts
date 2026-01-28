/**
 * Webhooks de Clerk y DocuSeal
 *
 * - Clerk: Sincroniza usuarios automáticamente
 * - DocuSeal: Notificaciones de firma de documentos
 */

import express from 'express';
import { Webhook } from 'svix';
import { syncUsuarioFromClerk } from '../services/usuariosService.js';
import { query } from '../utils/db.js';
import * as docusealService from '../services/docusealService.js';

const router = express.Router();

// Middleware para parsear raw body (necesario para verificar firma)
router.use(express.raw({ type: 'application/json' }));

/**
 * POST /api/webhooks/clerk
 *
 * Endpoint para recibir webhooks de Clerk.
 * Eventos soportados:
 * - user.created: Crear usuario en BD
 * - user.updated: Actualizar datos del usuario
 * - user.deleted: Desactivar usuario
 */
router.post('/clerk', async (req, res) => {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('❌ CLERK_WEBHOOK_SECRET no configurado');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  // Obtener headers de Svix
  const svixId = req.headers['svix-id'] as string;
  const svixTimestamp = req.headers['svix-timestamp'] as string;
  const svixSignature = req.headers['svix-signature'] as string;

  if (!svixId || !svixTimestamp || !svixSignature) {
    return res.status(400).json({ error: 'Missing svix headers' });
  }

  const wh = new Webhook(WEBHOOK_SECRET);
  let evt: any;

  try {
    // Verificar firma del webhook
    evt = wh.verify(req.body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    });
  } catch (error: any) {
    console.error('❌ Error verificando webhook:', error.message);
    return res.status(400).json({ error: 'Invalid signature' });
  }

  const eventType = evt.type;
  const data = evt.data;

  console.log(`📩 Webhook recibido: ${eventType}`);

  try {
    switch (eventType) {
      case 'user.created':
      case 'user.updated': {
        // Sincronizar usuario
        const email = data.email_addresses?.[0]?.email_address;

        if (!email) {
          console.warn('⚠️ Usuario sin email, ignorando');
          break;
        }

        await syncUsuarioFromClerk({
          clerkId: data.id,
          email,
          nombre: data.first_name,
          apellido: data.last_name,
          avatarUrl: data.image_url,
        });

        console.log(`✅ Usuario sincronizado: ${email}`);
        break;
      }

      case 'user.deleted': {
        // Desactivar usuario
        const sql = `
          UPDATE usuarios
          SET activo = false, updated_at = NOW()
          WHERE clerk_id = $1
        `;
        await query(sql, [data.id]);
        console.log(`✅ Usuario desactivado: ${data.id}`);
        break;
      }

      default:
        console.log(`ℹ️ Evento no manejado: ${eventType}`);
    }

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Error procesando webhook:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

/**
 * POST /api/webhooks/docuseal
 *
 * Endpoint para recibir webhooks de DocuSeal.
 * Eventos soportados:
 * - form.viewed: Un firmante abrió el documento
 * - form.completed: Un firmante completó su firma
 * - form.declined: Un firmante rechazó firmar
 * - submission.completed: Todos los firmantes completaron
 * - submission.expired: La submission expiró
 */
router.post('/docuseal', express.json(), async (req, res) => {
  try {
    console.log('📩 DocuSeal webhook recibido:', req.body.event_type);

    await docusealService.procesarWebhook(req.body);

    res.status(200).json({ received: true });
  } catch (error: any) {
    console.error('❌ Error procesando webhook DocuSeal:', error);
    res.status(500).json({ error: 'Error processing webhook' });
  }
});

export default router;
