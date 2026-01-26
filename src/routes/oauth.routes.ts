/**
 * OAuth Callback Routes - Unauthenticated
 *
 * These routes handle OAuth callbacks from third-party providers.
 * Since OAuth redirects cannot carry Authorization headers,
 * these routes use signed state parameters for authentication.
 */

import express, { Request, Response } from 'express';
import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import * as credentialsService from '../services/tenantApiCredentialsService.js';

const router = express.Router();

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const STATE_SECRET = process.env.OAUTH_STATE_SECRET || process.env.API_CREDENTIALS_SECRET || 'dev-state-secret';

// ==================== STATE HELPERS ====================

/**
 * Creates a signed state parameter containing tenantId and userId.
 * Format: base64url(payload) + '.' + hmac_signature
 */
export function createOAuthState(tenantId: string, userId: string): string {
  const payload = {
    tenantId,
    userId,
    nonce: randomBytes(16).toString('hex'),
    exp: Date.now() + 10 * 60 * 1000, // 10 minute expiry
  };
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = createHmac('sha256', STATE_SECRET).update(data).digest('base64url');
  return `${data}.${signature}`;
}

/**
 * Verifies and decodes a signed state parameter.
 * Returns null if invalid or expired.
 */
export function verifyOAuthState(state: string): { tenantId: string; userId: string } | null {
  try {
    const dotIndex = state.indexOf('.');
    if (dotIndex === -1) return null;

    const data = state.substring(0, dotIndex);
    const signature = state.substring(dotIndex + 1);
    if (!data || !signature) return null;

    const expectedSig = createHmac('sha256', STATE_SECRET).update(data).digest('base64url');

    const sigBuffer = Buffer.from(signature, 'base64url');
    const expectedBuffer = Buffer.from(expectedSig, 'base64url');

    if (sigBuffer.length !== expectedBuffer.length || !timingSafeEqual(sigBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (payload.exp < Date.now()) return null;

    return { tenantId: payload.tenantId, userId: payload.userId };
  } catch {
    return null;
  }
}

// ==================== GOOGLE ADS CALLBACK ====================

/**
 * GET /api/oauth/google-ads/callback
 *
 * Google redirects here after user grants consent.
 */
router.get('/google-ads/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(buildPopupHTML(false, 'El usuario canceló la autorización'));
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.send(buildPopupHTML(false, 'Parámetros inválidos'));
  }

  const stateData = verifyOAuthState(state);
  if (!stateData) {
    return res.send(buildPopupHTML(false, 'Estado de seguridad inválido o expirado'));
  }

  try {
    // Determine redirect URI (must match what was used to generate auth URL)
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/google-ads/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens: any = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.refresh_token) {
      console.error('[OAuth] Google token exchange error:', tokens);
      const msg = !tokens.refresh_token && tokenResponse.ok
        ? 'No se obtuvo refresh token. Revoca el acceso en myaccount.google.com/permissions y vuelve a intentar.'
        : `Error: ${tokens.error_description || tokens.error || 'Unknown'}`;
      return res.send(buildPopupHTML(false, msg));
    }

    // Save refresh token (Customer ID = PENDING until user selects account)
    await credentialsService.saveGoogleAdsCredentials(
      stateData.tenantId,
      tokens.refresh_token,
      'PENDING',
      null,
      stateData.userId
    );

    return res.send(buildPopupHTML(true, 'Google Ads conectado exitosamente'));
  } catch (err: any) {
    console.error('[OAuth] Callback error:', err);
    return res.send(buildPopupHTML(false, 'Error interno al procesar la autorización'));
  }
});

// ==================== GOOGLE SEARCH CONSOLE CALLBACK ====================

/**
 * GET /api/oauth/google-search-console/callback
 *
 * Google redirects here after user grants Search Console access.
 */
router.get('/google-search-console/callback', async (req: Request, res: Response) => {
  const { code, state, error } = req.query;

  if (error) {
    return res.send(buildPopupHTML(false, 'El usuario canceló la autorización', 'GSC_OAUTH_RESULT'));
  }

  if (!code || !state || typeof code !== 'string' || typeof state !== 'string') {
    return res.send(buildPopupHTML(false, 'Parámetros inválidos', 'GSC_OAUTH_RESULT'));
  }

  const stateData = verifyOAuthState(state);
  if (!stateData) {
    return res.send(buildPopupHTML(false, 'Estado de seguridad inválido o expirado', 'GSC_OAUTH_RESULT'));
  }

  try {
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/google-search-console/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }),
    });

    const tokens: any = await tokenResponse.json();

    if (!tokenResponse.ok || !tokens.refresh_token) {
      console.error('[OAuth] GSC token exchange error:', tokens);
      const msg = !tokens.refresh_token && tokenResponse.ok
        ? 'No se obtuvo refresh token. Revoca el acceso en myaccount.google.com/permissions y vuelve a intentar.'
        : `Error: ${tokens.error_description || tokens.error || 'Unknown'}`;
      return res.send(buildPopupHTML(false, msg, 'GSC_OAUTH_RESULT'));
    }

    // Save refresh token (site URL = PENDING until user selects a site)
    await credentialsService.saveGoogleSearchConsoleCredentials(
      stateData.tenantId,
      tokens.refresh_token,
      'PENDING',
      stateData.userId
    );

    return res.send(buildPopupHTML(true, 'Google Search Console conectado exitosamente', 'GSC_OAUTH_RESULT'));
  } catch (err: any) {
    console.error('[OAuth] GSC callback error:', err);
    return res.send(buildPopupHTML(false, 'Error interno al procesar la autorización', 'GSC_OAUTH_RESULT'));
  }
});

// ==================== HELPERS ====================

function buildPopupHTML(success: boolean, message: string, messageType: string = 'GOOGLE_ADS_OAUTH_RESULT'): string {
  const escapedMessage = message.replace(/'/g, "\\'").replace(/"/g, '&quot;');
  return `<!DOCTYPE html>
<html>
<head>
  <title>Google - Autorización</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f8fafc; }
    .card { background: white; border-radius: 16px; padding: 40px; text-align: center; box-shadow: 0 4px 24px rgba(0,0,0,0.08); max-width: 400px; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h2 { color: #1e293b; margin: 0 0 8px; font-size: 20px; }
    p { color: #64748b; font-size: 14px; margin: 0; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h2>${success ? 'Conectado' : 'Error'}</h2>
    <p>${escapedMessage}</p>
    <p style="margin-top: 12px; font-size: 12px; color: #94a3b8;">Esta ventana se cerrará automáticamente...</p>
  </div>
  <script>
    if (window.opener) {
      window.opener.postMessage({
        type: '${messageType}',
        success: ${success},
        message: '${escapedMessage}'
      }, '*');
    }
    setTimeout(function() { window.close(); }, 2500);
  </script>
</body>
</html>`;
}

export default router;
