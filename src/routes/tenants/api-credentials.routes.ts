/**
 * MÓDULO DE CREDENCIALES API - Rutas para gestionar integraciones externas
 *
 * Este módulo maneja las credenciales de APIs externas del tenant:
 * - Google (Search Console, Ads)
 * - Meta (Facebook, Instagram, Ads)
 * - Email (Mailchimp, SendGrid, etc.)
 * - WhatsApp Business
 *
 * También maneja las cuentas sociales de asesores individuales.
 */

import express, { Request, Response, NextFunction } from 'express';
import * as credentialsService from '../../services/tenantApiCredentialsService.js';
import { createOAuthState } from '../oauth.routes.js';
import * as googleAdsService from '../../services/googleAdsService.js';
import * as gscService from '../../services/googleSearchConsoleService.js';
import * as metaAdsService from '../../services/metaAdsService.js';
import * as metaSocialService from '../../services/metaSocialService.js';
import * as socialCopyService from '../../services/socialCopyService.js';
import * as scheduledPostsService from '../../services/scheduledPostsService.js';
import * as hashtagGroupsService from '../../services/hashtagGroupsService.js';
import { getPropiedadById } from '../../services/propiedadesCrmService.js';
import { resolveUserScope } from '../../middleware/scopeResolver.js';

const router = express.Router({ mergeParams: true });

// Resolve user scope (dbUserId, alcances) for all api-credentials routes
router.use(resolveUserScope);

interface TenantParams { tenantId: string }
interface UserParams extends TenantParams { usuarioId: string }

// ==================== CREDENCIALES DEL TENANT ====================

/**
 * GET /api/tenants/:tenantId/api-credentials
 * Obtiene el estado de todas las integraciones del tenant
 */
router.get('/', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const credentials = await credentialsService.getTenantApiCredentials(tenantId);

    if (!credentials) {
      return res.status(404).json({ error: 'Credenciales no encontradas' });
    }

    res.json(credentials);
  } catch (error) {
    next(error);
  }
});

// ==================== GOOGLE SEARCH CONSOLE ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/google-search-console
 * Guarda las credenciales de Google Search Console
 */
router.post('/google-search-console', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { refreshToken, siteUrl, connectedBy } = req.body;

    if (!refreshToken || !siteUrl || !connectedBy) {
      return res.status(400).json({ error: 'Se requiere refreshToken, siteUrl y connectedBy' });
    }

    await credentialsService.saveGoogleSearchConsoleCredentials(
      tenantId,
      refreshToken,
      siteUrl,
      connectedBy
    );

    res.json({ success: true, message: 'Google Search Console conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/google-search-console
 * Desconecta Google Search Console
 */
router.delete('/google-search-console', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectGoogleSearchConsole(tenantId);
    res.json({ success: true, message: 'Google Search Console desconectado' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-search-console/auth-url
 * Generates the Google OAuth consent URL for Search Console.
 */
router.get('/google-search-console/auth-url', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const connectedBy = (req.query.connectedBy as string) || 'unknown';

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GOOGLE_OAUTH_CLIENT_ID no configurado en el servidor' });
    }

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/google-search-console/callback`;

    const state = createOAuthState(tenantId, connectedBy);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/webmasters.readonly',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-search-console/sites
 * Lists all sites the user has access to in Search Console.
 */
router.get('/google-search-console/sites', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const refreshToken = await credentialsService.getGoogleSearchConsoleToken(tenantId);

    if (!refreshToken) {
      return res.status(400).json({ error: 'Google Search Console no está conectado' });
    }

    const sites = await gscService.listSites(refreshToken);
    res.json(sites);
  } catch (error: any) {
    console.error('[GSC] Error listing sites:', error.message);
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/google-search-console/site-url
 * Updates the selected site URL after the user picks a site.
 */
router.put('/google-search-console/site-url', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { siteUrl } = req.body;

    if (!siteUrl) {
      return res.status(400).json({ error: 'Se requiere siteUrl' });
    }

    const refreshToken = await credentialsService.getGoogleSearchConsoleToken(tenantId);
    if (!refreshToken) {
      return res.status(400).json({ error: 'Google Search Console no está conectado. Realiza el flujo OAuth primero.' });
    }

    // Update only the site URL (token and connected_by stay unchanged)
    await credentialsService.updateGoogleSearchConsoleSiteUrl(tenantId, siteUrl);

    res.json({ success: true, siteUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-search-console/performance
 * Gets search analytics data (clicks, impressions, CTR, position).
 * Query params: startDate, endDate, dimension (query|page|date), limit
 */
router.get('/google-search-console/performance', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate, dimension, limit: rowLimit } = req.query;

    const tokenData = await credentialsService.getGoogleSearchConsoleToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Google Search Console no está conectado' });
    }

    // Get the selected site URL
    const credentials = await credentialsService.getTenantApiCredentials(tenantId);
    if (!credentials || !credentials.googleSearchConsoleSiteUrl || credentials.googleSearchConsoleSiteUrl === 'PENDING') {
      return res.status(400).json({ error: 'No se ha seleccionado un sitio en Search Console' });
    }

    // Default to last 28 days
    const end = endDate as string || new Date().toISOString().split('T')[0];
    const start = startDate as string || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 28);
      return d.toISOString().split('T')[0];
    })();

    const dim = (dimension as string) || 'query';
    const lim = parseInt(rowLimit as string) || 25;

    let result;
    if (dim === 'date') {
      const rows = await gscService.getDailyPerformance(tokenData, credentials.googleSearchConsoleSiteUrl, start, end);
      result = { rows, totals: null };
    } else if (dim === 'page') {
      const rows = await gscService.getTopPages(tokenData, credentials.googleSearchConsoleSiteUrl, start, end, lim);
      result = { rows };
    } else {
      const rows = await gscService.getTopQueries(tokenData, credentials.googleSearchConsoleSiteUrl, start, end, lim);
      result = { rows };
    }

    res.json(result);
  } catch (error: any) {
    console.error('[GSC] Error getting performance:', error.message);
    next(error);
  }
});

// ==================== GOOGLE ADS ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/google-ads
 * Guarda las credenciales de Google Ads
 */
router.post('/google-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { refreshToken, customerId, managerId, connectedBy } = req.body;

    if (!refreshToken || !customerId || !connectedBy) {
      return res.status(400).json({ error: 'Se requiere refreshToken, customerId y connectedBy' });
    }

    await credentialsService.saveGoogleAdsCredentials(
      tenantId,
      refreshToken,
      customerId,
      managerId || null,
      connectedBy
    );

    res.json({ success: true, message: 'Google Ads conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/google-ads
 * Desconecta Google Ads
 */
router.delete('/google-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectGoogleAds(tenantId);
    res.json({ success: true, message: 'Google Ads desconectado' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/auth-url
 * Generates the Google OAuth consent URL for connecting Google Ads.
 * The frontend opens this URL in a popup window.
 */
router.get('/google-ads/auth-url', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const connectedBy = (req.query.connectedBy as string) || 'unknown';

    const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({ error: 'GOOGLE_OAUTH_CLIENT_ID no configurado en el servidor' });
    }

    // Build redirect URI dynamically
    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/google-ads/callback`;

    // Create signed state with tenant + user info
    const state = createOAuthState(tenantId, connectedBy);

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'https://www.googleapis.com/auth/adwords',
      access_type: 'offline',
      prompt: 'consent',
      state,
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/google-ads/customer-id
 * Updates the Google Ads Customer ID after the user selects an account.
 * Called after OAuth when the user picks which account to connect.
 */
router.put('/google-ads/customer-id', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { customerId } = req.body;

    if (!customerId) {
      return res.status(400).json({ error: 'Se requiere customerId' });
    }

    // Validate format: 10 digits, optionally formatted as XXX-XXX-XXXX
    const cleanId = customerId.replace(/-/g, '');
    if (!/^\d{10}$/.test(cleanId)) {
      return res.status(400).json({ error: 'Customer ID debe ser 10 dígitos (ej: 123-456-7890)' });
    }

    // Format as XXX-XXX-XXXX for storage
    const formattedId = `${cleanId.slice(0, 3)}-${cleanId.slice(3, 6)}-${cleanId.slice(6)}`;

    // Get existing token to preserve it
    const existing = await credentialsService.getGoogleAdsToken(tenantId);
    if (!existing) {
      return res.status(400).json({ error: 'Google Ads no está conectado. Realiza el flujo OAuth primero.' });
    }

    // Re-save with the selected customer ID
    await credentialsService.saveGoogleAdsCredentials(
      tenantId,
      existing.refreshToken,
      formattedId,
      null,
      'system'
    );

    res.json({ success: true, customerId: formattedId });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/accounts
 * Lists accessible Google Ads customer accounts after OAuth.
 * Used to let the user choose which account to connect.
 */
router.get('/google-ads/accounts', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const tokenData = await credentialsService.getGoogleAdsToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Google Ads no está conectado' });
    }

    const accounts = await googleAdsService.listAccessibleCustomers(tokenData.refreshToken);
    res.json(accounts);
  } catch (error: any) {
    console.error('[Google Ads] Error listing accounts:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/campaigns
 * Gets campaigns with performance metrics for the connected account.
 */
router.get('/google-ads/campaigns', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const tokenData = await credentialsService.getGoogleAdsToken(tenantId);
    if (!tokenData || !tokenData.customerId || tokenData.customerId === 'PENDING') {
      return res.status(400).json({ error: 'Google Ads no está configurado completamente' });
    }

    const dateRange = startDate && endDate
      ? { startDate: startDate as string, endDate: endDate as string }
      : undefined;

    const campaigns = await googleAdsService.getCampaigns(
      tokenData.refreshToken,
      tokenData.customerId,
      dateRange
    );

    res.json(campaigns);
  } catch (error: any) {
    console.error('[Google Ads] Error getting campaigns:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/google-ads/campaigns/:campaignId/stats
 * Gets daily performance stats for a specific campaign.
 */
router.get('/google-ads/campaigns/:campaignId/stats', async (req: Request<TenantParams & { campaignId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, campaignId } = req.params;
    const { startDate, endDate } = req.query;

    const tokenData = await credentialsService.getGoogleAdsToken(tenantId);
    if (!tokenData || !tokenData.customerId || tokenData.customerId === 'PENDING') {
      return res.status(400).json({ error: 'Google Ads no está configurado completamente' });
    }

    const dateRange = startDate && endDate
      ? { startDate: startDate as string, endDate: endDate as string }
      : undefined;

    const stats = await googleAdsService.getCampaignStats(
      tokenData.refreshToken,
      tokenData.customerId,
      campaignId,
      dateRange
    );

    res.json(stats);
  } catch (error: any) {
    console.error('[Google Ads] Error getting campaign stats:', error.message);
    next(error);
  }
});

// ==================== META (FACEBOOK/INSTAGRAM) ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/meta
 * Guarda las credenciales de Meta (Facebook/Instagram)
 */
router.post('/meta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const {
      pageAccessToken,
      pageId,
      pageName,
      instagramAccountId,
      instagramUsername,
      connectedBy
    } = req.body;

    if (!pageAccessToken || !pageId || !pageName || !connectedBy) {
      return res.status(400).json({
        error: 'Se requiere pageAccessToken, pageId, pageName y connectedBy'
      });
    }

    await credentialsService.saveMetaCredentials(
      tenantId,
      pageAccessToken,
      pageId,
      pageName,
      instagramAccountId || null,
      instagramUsername || null,
      connectedBy
    );

    res.json({ success: true, message: 'Meta conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta
 * Desconecta Meta
 */
router.delete('/meta', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectMeta(tenantId);
    res.json({ success: true, message: 'Meta desconectado' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/auth-url
 * Generates the Facebook OAuth consent URL for Meta Social (posting/comments).
 */
router.get('/meta/auth-url', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const connectedBy = (req.query.connectedBy as string) || 'unknown';

    const appId = process.env.META_APP_ID;
    if (!appId) {
      return res.status(500).json({ error: 'META_APP_ID no configurado en el servidor' });
    }

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/meta-social/callback`;

    const state = createOAuthState(tenantId, connectedBy);

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,pages_messaging,instagram_basic,instagram_content_publish,instagram_manage_comments,instagram_manage_messages',
      state,
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/my-connection
 * Returns the current user's Meta connection status.
 * Checks per-user credentials first, then tenant fallback.
 */
router.get('/meta/my-connection', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const userId = (req as any).scope?.dbUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Check per-user credentials
    const userCreds = await credentialsService.getUserMetaCredentials(tenantId, userId);
    if (userCreds && userCreds.pageId && userCreds.pageId !== 'PENDING') {
      return res.json({
        connected: true,
        source: 'user',
        pageId: userCreds.pageId,
        pageName: userCreds.pageName || null,
        instagramAccountId: userCreds.instagramAccountId || null,
        instagramUsername: userCreds.instagramUsername || null,
      });
    }

    // Check if user has pending OAuth (PENDING page)
    if (userCreds && userCreds.pageId === 'PENDING') {
      return res.json({
        connected: false,
        source: null,
        pendingPageSelection: true,
      });
    }

    // Fallback: check tenant-level credentials
    const tenantCreds = await credentialsService.getMetaPageToken(tenantId);
    if (tenantCreds && tenantCreds.pageId && tenantCreds.pageId !== 'PENDING') {
      return res.json({
        connected: true,
        source: 'tenant',
        pageId: tenantCreds.pageId,
        pageName: undefined,
        instagramAccountId: tenantCreds.instagramAccountId || null,
        instagramUsername: undefined,
      });
    }

    return res.json({ connected: false, source: null });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta/my-connection
 * Disconnects the current user's Meta account.
 */
router.delete('/meta/my-connection', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const userId = (req as any).scope?.dbUserId;
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    await credentialsService.disconnectUserMeta(userId);
    res.json({ success: true, message: 'Meta desconectado' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/pages
 * Lists accessible Facebook Pages after OAuth.
 */
router.get('/meta/pages', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no está conectado' });
    }

    const pages = await metaSocialService.listUserPages(tokenData.pageAccessToken);

    // Return pages without access tokens (security)
    res.json(pages.map(p => ({
      id: p.id,
      name: p.name,
      category: p.category,
      instagramBusinessAccount: p.instagramBusinessAccount,
    })));
  } catch (error: any) {
    console.error('[Meta Social] Error listing pages:', error.message);
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/meta/page
 * Selects a Facebook Page after OAuth. Saves the page access token.
 */
router.put('/meta/page', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { pageId } = req.body;
    const userId = (req as any).scope?.dbUserId;

    if (!pageId) {
      return res.status(400).json({ error: 'Se requiere pageId' });
    }
    if (!userId) {
      return res.status(401).json({ error: 'Usuario no autenticado' });
    }

    // Get the stored user token (saved during OAuth with PENDING page)
    const userCreds = await credentialsService.getUserMetaCredentials(tenantId, userId);
    if (!userCreds) {
      // Fallback: try tenant credentials (backward compat)
      const tenantCreds = await credentialsService.getMetaPageToken(tenantId);
      if (!tenantCreds) {
        return res.status(400).json({ error: 'Meta no está conectado. Realiza el flujo OAuth primero.' });
      }
      // Use tenant flow (old behavior)
      const pages = await metaSocialService.listUserPages(tenantCreds.pageAccessToken);
      const selectedPage = pages.find(p => p.id === pageId);
      if (!selectedPage) {
        return res.status(400).json({ error: 'Página no encontrada o no tienes permisos' });
      }
      await credentialsService.saveMetaCredentials(
        tenantId,
        selectedPage.accessToken,
        selectedPage.id,
        selectedPage.name,
        selectedPage.instagramBusinessAccount?.id || null,
        selectedPage.instagramBusinessAccount?.username || null
      );
      return res.json({
        success: true,
        pageId: selectedPage.id,
        pageName: selectedPage.name,
        instagramAccountId: selectedPage.instagramBusinessAccount?.id || null,
        instagramUsername: selectedPage.instagramBusinessAccount?.username || null,
      });
    }

    // Use user credentials flow (new per-user behavior)
    const pages = await metaSocialService.listUserPages(userCreds.pageAccessToken);
    const selectedPage = pages.find(p => p.id === pageId);
    if (!selectedPage) {
      return res.status(400).json({ error: 'Página no encontrada o no tienes permisos' });
    }

    // Save the Page Access Token to user's asesor_social_accounts
    await credentialsService.saveUserMetaCredentials(
      tenantId,
      userId,
      selectedPage.accessToken,
      selectedPage.id,
      selectedPage.name,
      selectedPage.instagramBusinessAccount?.id || null,
      selectedPage.instagramBusinessAccount?.username || null,
      new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      ['pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish', 'instagram_manage_comments', 'instagram_manage_messages']
    );

    res.json({
      success: true,
      pageId: selectedPage.id,
      pageName: selectedPage.name,
      instagramAccountId: selectedPage.instagramBusinessAccount?.id || null,
      instagramUsername: selectedPage.instagramBusinessAccount?.username || null,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/meta/publish
 * Publishes to Facebook Page and/or Instagram.
 */
router.post('/meta/publish', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { message, imageUrl, imageUrls, link, targets } = req.body;

    if (!message && !imageUrl && (!imageUrls || imageUrls.length === 0)) {
      return res.status(400).json({ error: 'Se requiere mensaje o imagen' });
    }

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData || !tokenData.pageId || tokenData.pageId === 'PENDING') {
      return res.status(400).json({ error: 'Meta no está configurado completamente. Selecciona una página primero.' });
    }

    const allImages: string[] = imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
    const results: Record<string, { success: boolean; postId?: string; mediaId?: string; error?: string }> = {};

    // Publish to Facebook
    if (targets?.facebook !== false) {
      try {
        if (allImages.length > 1) {
          // Multi-photo album
          const fbResult = await metaSocialService.publishMultiPhotoToPage(
            tokenData.pageAccessToken,
            tokenData.pageId,
            { imageUrls: allImages, caption: message }
          );
          results.facebook = { success: true, postId: fbResult.id };
        } else if (allImages.length === 1) {
          const fbResult = await metaSocialService.publishPhotoToPage(
            tokenData.pageAccessToken,
            tokenData.pageId,
            { imageUrl: allImages[0], caption: message }
          );
          results.facebook = { success: true, postId: fbResult.postId };
        } else {
          const fbResult = await metaSocialService.publishToPage(
            tokenData.pageAccessToken,
            tokenData.pageId,
            { message, link }
          );
          results.facebook = { success: true, postId: fbResult.id };
        }
      } catch (error: any) {
        results.facebook = { success: false, error: error.message };
      }
    }

    // Publish to Instagram (requires image)
    if (targets?.instagram && tokenData.instagramAccountId) {
      if (allImages.length === 0) {
        results.instagram = { success: false, error: 'Instagram requiere al menos una imagen' };
      } else {
        try {
          let igResult: { id: string };
          if (allImages.length > 1) {
            igResult = await metaSocialService.publishCarouselToInstagram(
              tokenData.pageAccessToken,
              tokenData.instagramAccountId,
              { imageUrls: allImages, caption: message }
            );
          } else {
            igResult = await metaSocialService.publishToInstagram(
              tokenData.pageAccessToken,
              tokenData.instagramAccountId,
              { imageUrl: allImages[0], caption: message }
            );
          }
          results.instagram = { success: true, mediaId: igResult.id };
        } catch (error: any) {
          results.instagram = { success: false, error: error.message };
        }
      }
    }

    res.json(results);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/posts
 * Gets recent Facebook Page posts.
 */
router.get('/meta/posts', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 25;

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData || !tokenData.pageId || tokenData.pageId === 'PENDING') {
      return res.status(400).json({ error: 'Meta no está configurado completamente' });
    }

    const posts = await metaSocialService.getPagePosts(
      tokenData.pageAccessToken,
      tokenData.pageId,
      limit
    );

    res.json(posts);
  } catch (error: any) {
    console.error('[Meta Social] Error getting posts:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/instagram-media
 * Gets recent Instagram media.
 */
router.get('/meta/instagram-media', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const limit = parseInt(req.query.limit as string) || 25;

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData || !tokenData.instagramAccountId) {
      return res.status(400).json({ error: 'Instagram no está conectado' });
    }

    const media = await metaSocialService.getInstagramMedia(
      tokenData.pageAccessToken,
      tokenData.instagramAccountId,
      limit
    );

    res.json(media);
  } catch (error: any) {
    console.error('[Meta Social] Error getting IG media:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/posts/:postId/comments
 * Gets comments on a post.
 */
router.get('/meta/posts/:postId/comments', async (req: Request<TenantParams & { postId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, postId } = req.params;

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no está conectado' });
    }

    const platform = (req.query.platform as string) === 'instagram' ? 'instagram' : 'facebook';
    const comments = await metaSocialService.getComments(
      tokenData.pageAccessToken,
      postId,
      platform
    );

    res.json(comments);
  } catch (error: any) {
    console.error('[Meta Social] Error getting comments:', error.message);
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/meta/comments/:commentId/reply
 * Replies to a comment.
 */
router.post('/meta/comments/:commentId/reply', async (req: Request<TenantParams & { commentId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, commentId } = req.params;
    const { message } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Se requiere mensaje' });
    }

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no está conectado' });
    }

    const result = await metaSocialService.replyToComment(
      tokenData.pageAccessToken,
      commentId,
      message
    );

    res.json(result);
  } catch (error: any) {
    console.error('[Meta Social] Error replying to comment:', error.message);
    next(error);
  }
});

// ==================== META SOCIAL - AI COPY & SCHEDULING ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/meta/generate-copy
 * Generates AI social media copy suggestions for a property.
 */
router.post('/meta/generate-copy', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { propiedadId } = req.body;

    if (!propiedadId) {
      return res.status(400).json({ error: 'Se requiere propiedadId' });
    }

    const propiedad = await getPropiedadById(tenantId, propiedadId);
    if (!propiedad) {
      return res.status(404).json({ error: 'Propiedad no encontrada' });
    }

    const suggestions = await socialCopyService.generateSocialCopy({
      titulo: propiedad.titulo,
      descripcion: propiedad.descripcion,
      tipo: propiedad.tipo,
      operacion: propiedad.operacion,
      precio: propiedad.precio,
      moneda: propiedad.moneda,
      ciudad: propiedad.ciudad,
      sector: propiedad.sector,
      habitaciones: propiedad.habitaciones,
      banos: propiedad.banos,
      m2_construccion: propiedad.m2_construccion,
      amenidades: propiedad.amenidades,
    });

    res.json({ suggestions });
  } catch (error: any) {
    console.error('[Meta Social] Error generating copy:', error.message);
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/meta/schedule
 * Schedules a post for future publishing.
 * Facebook: uses native scheduling via Meta API.
 * Instagram: saves to DB for cron-based publishing.
 */
router.post('/meta/schedule', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { message, imageUrl, imageUrls, linkUrl, scheduledFor, propiedadId, platform } = req.body;

    const allImages: string[] = imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];

    if (!message && allImages.length === 0) {
      return res.status(400).json({ error: 'Se requiere message o imagen(es)' });
    }
    if (!scheduledFor) {
      return res.status(400).json({ error: 'Se requiere scheduledFor (unix timestamp en segundos)' });
    }

    const scheduledTimestamp = Number(scheduledFor);
    const nowSec = Math.floor(Date.now() / 1000);
    const minTime = nowSec + 10 * 60; // 10 minutes from now
    const maxTime = nowSec + 75 * 24 * 60 * 60; // 75 days from now

    if (scheduledTimestamp < minTime) {
      return res.status(400).json({ error: 'La publicacion debe programarse al menos 10 minutos en el futuro' });
    }
    if (scheduledTimestamp > maxTime) {
      return res.status(400).json({ error: 'La publicacion no puede programarse mas de 75 dias en el futuro' });
    }

    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no esta conectado' });
    }

    const targetPlatform = platform || 'facebook';
    const scheduledForISO = new Date(scheduledTimestamp * 1000).toISOString();

    if (targetPlatform === 'instagram') {
      // Instagram: save to DB only. Cron will publish when due.
      if (allImages.length === 0) {
        return res.status(400).json({ error: 'Instagram requiere al menos una imagen' });
      }
      if (!tokenData.instagramAccountId) {
        return res.status(400).json({ error: 'Instagram no esta conectado' });
      }

      const scheduledPost = await scheduledPostsService.createScheduledPost(tenantId, {
        platform: 'instagram',
        message: message || undefined,
        imageUrl: allImages[0],
        imageUrls: allImages,
        linkUrl: linkUrl || undefined,
        propiedadId: propiedadId || undefined,
        scheduledFor: scheduledForISO,
        createdBy: (req as any).scope?.dbUserId || undefined,
      });

      return res.json({ scheduledPost });
    }

    // Facebook: use native scheduling via Meta API
    let metaResult: { id: string };

    if (allImages.length > 1) {
      metaResult = await metaSocialService.publishMultiPhotoToPage(
        tokenData.pageAccessToken,
        tokenData.pageId,
        { imageUrls: allImages, caption: message, scheduledPublishTime: scheduledTimestamp }
      );
    } else if (allImages.length === 1) {
      const photoResult = await metaSocialService.publishPhotoToPage(
        tokenData.pageAccessToken,
        tokenData.pageId,
        { imageUrl: allImages[0], caption: message, scheduledPublishTime: scheduledTimestamp }
      );
      metaResult = { id: photoResult.postId || photoResult.id };
    } else {
      metaResult = await metaSocialService.publishToPage(
        tokenData.pageAccessToken,
        tokenData.pageId,
        { message, link: linkUrl, scheduledPublishTime: scheduledTimestamp }
      );
    }

    const scheduledPost = await scheduledPostsService.createScheduledPost(tenantId, {
      platform: 'facebook',
      metaPostId: metaResult.id,
      message: message || undefined,
      imageUrl: allImages[0] || undefined,
      imageUrls: allImages,
      linkUrl: linkUrl || undefined,
      propiedadId: propiedadId || undefined,
      scheduledFor: scheduledForISO,
      createdBy: (req as any).scope?.dbUserId || undefined,
      metaResponse: metaResult,
    });

    res.json({ scheduledPost });
  } catch (error: any) {
    console.error('[Meta Social] Error scheduling post:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/scheduled-posts
 * Lists scheduled posts for the tenant.
 */
router.get('/meta/scheduled-posts', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const status = req.query.status as string | undefined;

    const userId = (req as any).scope?.dbUserId;
    const isPlatformAdmin = (req as any).scope?.isPlatformAdmin;
    const posts = await scheduledPostsService.getScheduledPosts(tenantId, status, isPlatformAdmin ? undefined : userId);
    res.json(posts);
  } catch (error: any) {
    console.error('[Meta Social] Error getting scheduled posts:', error.message);
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta/scheduled-posts/:postId
 * Cancels a scheduled post (deletes from Meta + updates local status).
 */
router.delete('/meta/scheduled-posts/:postId', async (req: Request<TenantParams & { postId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, postId } = req.params;

    const scheduledPost = await scheduledPostsService.getScheduledPostById(tenantId, postId);
    if (!scheduledPost) {
      return res.status(404).json({ error: 'Post programado no encontrado' });
    }

    if (scheduledPost.status !== 'scheduled') {
      return res.status(400).json({ error: 'Solo se pueden cancelar posts con status "scheduled"' });
    }

    // Delete from Meta if we have a Meta post ID
    if (scheduledPost.metaPostId) {
      // Use post creator's credentials to delete from Meta
      let tokenData = null;
      if (scheduledPost.createdBy) {
        tokenData = await credentialsService.getUserMetaCredentialsByUserId(scheduledPost.createdBy);
      }
      if (!tokenData) {
        tokenData = await credentialsService.getMetaPageToken(tenantId);
      }
      if (tokenData) {
        await metaSocialService.deleteScheduledPost(
          tokenData.pageAccessToken,
          scheduledPost.metaPostId
        );
      }
    }

    await scheduledPostsService.updatePostStatus(tenantId, postId, 'cancelled');
    res.json({ success: true });
  } catch (error: any) {
    console.error('[Meta Social] Error cancelling scheduled post:', error.message);
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/meta/scheduled-posts/:postId
 * Edits a scheduled post.
 * Facebook: deletes old post from Meta, creates new one with updated content.
 * Instagram (cron): updates DB record directly (not sent to Meta yet).
 */
router.put('/meta/scheduled-posts/:postId', async (req: Request<TenantParams & { postId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, postId } = req.params;
    const { message, imageUrl, imageUrls, linkUrl, scheduledFor } = req.body;

    const existing = await scheduledPostsService.getScheduledPostById(tenantId, postId);
    if (!existing) {
      return res.status(404).json({ error: 'Post programado no encontrado' });
    }
    if (existing.status !== 'scheduled') {
      return res.status(400).json({ error: 'Solo se pueden editar posts con status "scheduled"' });
    }

    const allImages: string[] = imageUrls && imageUrls.length > 0 ? imageUrls : imageUrl ? [imageUrl] : [];
    const newScheduledFor = scheduledFor ? Number(scheduledFor) : undefined;

    if (newScheduledFor) {
      const nowSec = Math.floor(Date.now() / 1000);
      if (newScheduledFor < nowSec + 10 * 60) {
        return res.status(400).json({ error: 'La publicacion debe programarse al menos 10 minutos en el futuro' });
      }
    }

    if (existing.platform === 'instagram') {
      // Instagram: just update DB
      const updated = await scheduledPostsService.updateScheduledPost(tenantId, postId, {
        message,
        imageUrl: allImages[0] || undefined,
        imageUrls: allImages.length > 0 ? allImages : undefined,
        linkUrl,
        scheduledFor: newScheduledFor ? new Date(newScheduledFor * 1000).toISOString() : undefined,
      });
      return res.json({ scheduledPost: updated });
    }

    // Facebook: delete old post from Meta, create new one
    const userId = (req as any).scope?.dbUserId;
    const tokenData = await credentialsService.getMetaCredentialsWithFallback(tenantId, userId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no esta conectado' });
    }

    // Delete old from Meta
    if (existing.metaPostId) {
      await metaSocialService.deleteScheduledPost(tokenData.pageAccessToken, existing.metaPostId);
    }

    // Create new scheduled post on Meta
    const scheduledTimestamp = newScheduledFor || Math.floor(new Date(existing.scheduledFor).getTime() / 1000);
    const finalMessage = message !== undefined ? message : existing.message;
    const finalImages = allImages.length > 0 ? allImages : existing.imageUrls.length > 0 ? existing.imageUrls : existing.imageUrl ? [existing.imageUrl] : [];
    const finalLinkUrl = linkUrl !== undefined ? linkUrl : existing.linkUrl;

    let metaResult: { id: string };

    if (finalImages.length > 1) {
      metaResult = await metaSocialService.publishMultiPhotoToPage(
        tokenData.pageAccessToken,
        tokenData.pageId,
        { imageUrls: finalImages, caption: finalMessage || undefined, scheduledPublishTime: scheduledTimestamp }
      );
    } else if (finalImages.length === 1) {
      const photoResult = await metaSocialService.publishPhotoToPage(
        tokenData.pageAccessToken,
        tokenData.pageId,
        { imageUrl: finalImages[0], caption: finalMessage || undefined, scheduledPublishTime: scheduledTimestamp }
      );
      metaResult = { id: photoResult.postId || photoResult.id };
    } else {
      metaResult = await metaSocialService.publishToPage(
        tokenData.pageAccessToken,
        tokenData.pageId,
        { message: finalMessage || undefined, link: finalLinkUrl || undefined, scheduledPublishTime: scheduledTimestamp }
      );
    }

    const updated = await scheduledPostsService.updateScheduledPost(tenantId, postId, {
      message: finalMessage || undefined,
      imageUrl: finalImages[0] || undefined,
      imageUrls: finalImages,
      linkUrl: finalLinkUrl || undefined,
      scheduledFor: new Date(scheduledTimestamp * 1000).toISOString(),
      metaPostId: metaResult.id,
      metaResponse: metaResult,
    });

    res.json({ scheduledPost: updated });
  } catch (error: any) {
    console.error('[Meta Social] Error editing scheduled post:', error.message);
    next(error);
  }
});

// ==================== HASHTAG GROUPS ====================

/**
 * GET /api/tenants/:tenantId/api-credentials/meta/hashtag-groups
 * Lists all hashtag groups for the tenant.
 */
router.get('/meta/hashtag-groups', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const groups = await hashtagGroupsService.listHashtagGroups(tenantId);
    res.json(groups);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/meta/hashtag-groups
 * Creates a new hashtag group.
 */
router.post('/meta/hashtag-groups', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { name, hashtags, category } = req.body;

    if (!name || !hashtags || !Array.isArray(hashtags) || hashtags.length === 0) {
      return res.status(400).json({ error: 'Se requiere name y hashtags (array no vacio)' });
    }

    const group = await hashtagGroupsService.createHashtagGroup(tenantId, {
      name,
      hashtags,
      category,
      createdBy: (req as any).scope?.dbUserId || undefined,
    });

    res.json(group);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/meta/hashtag-groups/:groupId
 * Updates a hashtag group.
 */
router.put('/meta/hashtag-groups/:groupId', async (req: Request<TenantParams & { groupId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, groupId } = req.params;
    const { name, hashtags, category } = req.body;

    const updated = await hashtagGroupsService.updateHashtagGroup(tenantId, groupId, {
      name,
      hashtags,
      category,
    });

    if (!updated) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    res.json(updated);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta/hashtag-groups/:groupId
 * Deletes a hashtag group.
 */
router.delete('/meta/hashtag-groups/:groupId', async (req: Request<TenantParams & { groupId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, groupId } = req.params;
    const deleted = await hashtagGroupsService.deleteHashtagGroup(tenantId, groupId);

    if (!deleted) {
      return res.status(404).json({ error: 'Grupo no encontrado' });
    }

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

// ==================== META ADS ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/meta-ads
 * Guarda las credenciales de Meta Ads
 */
router.post('/meta-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { accessToken, adAccountId, businessId, connectedBy } = req.body;

    if (!accessToken || !adAccountId || !connectedBy) {
      return res.status(400).json({ error: 'Se requiere accessToken, adAccountId y connectedBy' });
    }

    await credentialsService.saveMetaAdsCredentials(
      tenantId,
      accessToken,
      adAccountId,
      businessId || null,
      connectedBy
    );

    res.json({ success: true, message: 'Meta Ads conectado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/meta-ads
 * Desconecta Meta Ads
 */
router.delete('/meta-ads', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectMetaAds(tenantId);
    res.json({ success: true, message: 'Meta Ads desconectado' });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta-ads/auth-url
 * Generates the Facebook OAuth consent URL for Meta Ads.
 */
router.get('/meta-ads/auth-url', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const connectedBy = (req.query.connectedBy as string) || 'unknown';

    const appId = process.env.META_APP_ID;
    if (!appId) {
      return res.status(500).json({ error: 'META_APP_ID no configurado en el servidor' });
    }

    const protocol = req.get('x-forwarded-proto') || req.protocol;
    const host = req.get('host') || '';
    const redirectUri = `${protocol}://${host}/api/oauth/meta/callback`;

    const state = createOAuthState(tenantId, connectedBy);

    const params = new URLSearchParams({
      client_id: appId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: 'ads_read,ads_management,business_management',
      state,
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    res.json({ authUrl });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta-ads/ad-accounts
 * Lists accessible ad accounts after OAuth.
 */
router.get('/meta-ads/ad-accounts', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;

    const tokenData = await credentialsService.getMetaAdsToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta Ads no está conectado' });
    }

    const accounts = await metaAdsService.listAdAccounts(tokenData.accessToken);
    res.json(accounts);
  } catch (error: any) {
    console.error('[Meta Ads] Error listing ad accounts:', error.message);
    next(error);
  }
});

/**
 * PUT /api/tenants/:tenantId/api-credentials/meta-ads/ad-account
 * Updates the selected ad account ID after the user picks one.
 */
router.put('/meta-ads/ad-account', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { adAccountId, businessId } = req.body;

    if (!adAccountId) {
      return res.status(400).json({ error: 'Se requiere adAccountId' });
    }

    const tokenData = await credentialsService.getMetaAdsToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta Ads no está conectado. Realiza el flujo OAuth primero.' });
    }

    await credentialsService.updateMetaAdsAdAccountId(tenantId, adAccountId, businessId || null);
    res.json({ success: true, adAccountId });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta-ads/campaigns
 * Gets campaigns with performance metrics for the connected ad account.
 */
router.get('/meta-ads/campaigns', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const tokenData = await credentialsService.getMetaAdsToken(tenantId);
    if (!tokenData || !tokenData.adAccountId || tokenData.adAccountId === 'PENDING') {
      return res.status(400).json({ error: 'Meta Ads no está configurado completamente' });
    }

    const dateRange = startDate && endDate
      ? { startDate: startDate as string, endDate: endDate as string }
      : undefined;

    const campaigns = await metaAdsService.getCampaigns(
      tokenData.accessToken,
      tokenData.adAccountId,
      dateRange
    );

    res.json(campaigns);
  } catch (error: any) {
    console.error('[Meta Ads] Error getting campaigns:', error.message);
    next(error);
  }
});

/**
 * GET /api/tenants/:tenantId/api-credentials/meta-ads/campaigns/:campaignId/stats
 * Gets daily performance stats for a specific Meta campaign.
 */
router.get('/meta-ads/campaigns/:campaignId/stats', async (req: Request<TenantParams & { campaignId: string }>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, campaignId } = req.params;
    const { startDate, endDate } = req.query;

    const tokenData = await credentialsService.getMetaAdsToken(tenantId);
    if (!tokenData || !tokenData.adAccountId || tokenData.adAccountId === 'PENDING') {
      return res.status(400).json({ error: 'Meta Ads no está configurado completamente' });
    }

    const dateRange = startDate && endDate
      ? { startDate: startDate as string, endDate: endDate as string }
      : undefined;

    const stats = await metaAdsService.getCampaignStats(
      tokenData.accessToken,
      campaignId,
      dateRange
    );

    res.json(stats);
  } catch (error: any) {
    console.error('[Meta Ads] Error getting campaign stats:', error.message);
    next(error);
  }
});

// ==================== EMAIL ====================

/**
 * POST /api/tenants/:tenantId/api-credentials/email
 * Guarda las credenciales de Email Marketing
 */
router.post('/email', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { provider, apiKey, senderName, senderEmail, listId, connectedBy } = req.body;

    if (!provider || !apiKey || !senderName || !senderEmail || !connectedBy) {
      return res.status(400).json({
        error: 'Se requiere provider, apiKey, senderName, senderEmail y connectedBy'
      });
    }

    const validProviders = ['mailchimp', 'sendgrid', 'mailjet', 'ses'];
    if (!validProviders.includes(provider)) {
      return res.status(400).json({
        error: `Proveedor inválido. Opciones: ${validProviders.join(', ')}`
      });
    }

    await credentialsService.saveEmailCredentials(
      tenantId,
      provider,
      apiKey,
      senderName,
      senderEmail,
      listId || null,
      connectedBy
    );

    res.json({ success: true, message: `${provider} conectado exitosamente` });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/smtp
 * Guarda las credenciales SMTP personalizadas
 */
router.post('/smtp', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { host, port, username, password, secure, senderName, senderEmail, connectedBy } = req.body;

    if (!host || !port || !username || !password || !senderName || !senderEmail || !connectedBy) {
      return res.status(400).json({
        error: 'Se requiere host, port, username, password, senderName, senderEmail y connectedBy'
      });
    }

    await credentialsService.saveSmtpCredentials(
      tenantId,
      host,
      port,
      username,
      password,
      secure !== false,
      senderName,
      senderEmail,
      connectedBy
    );

    res.json({ success: true, message: 'SMTP configurado exitosamente' });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/email
 * Desconecta Email
 */
router.delete('/email', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    await credentialsService.disconnectEmail(tenantId);
    res.json({ success: true, message: 'Email desconectado' });
  } catch (error) {
    next(error);
  }
});

// ==================== CUENTAS SOCIALES DE ASESORES ====================

/**
 * GET /api/tenants/:tenantId/api-credentials/asesores/:usuarioId/social
 * Obtiene las cuentas sociales de un asesor
 */
router.get('/asesores/:usuarioId/social', async (req: Request<UserParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const accounts = await credentialsService.getAsesorSocialAccounts(tenantId, usuarioId);
    res.json(accounts);
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/tenants/:tenantId/api-credentials/asesores/:usuarioId/social
 * Guarda una cuenta social de asesor
 */
router.post('/asesores/:usuarioId/social', async (req: Request<UserParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId, usuarioId } = req.params;
    const {
      platform,
      accessToken,
      accountId,
      accountName,
      accountUsername,
      profilePictureUrl,
      tokenExpiresAt,
      scopes
    } = req.body;

    if (!platform || !accessToken || !accountId || !accountName) {
      return res.status(400).json({
        error: 'Se requiere platform, accessToken, accountId y accountName'
      });
    }

    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({
        error: `Plataforma inválida. Opciones: ${validPlatforms.join(', ')}`
      });
    }

    const account = await credentialsService.saveAsesorSocialAccount(
      tenantId,
      usuarioId,
      platform,
      accessToken,
      accountId,
      accountName,
      accountUsername || null,
      profilePictureUrl || null,
      tokenExpiresAt ? new Date(tokenExpiresAt) : null,
      scopes || []
    );

    res.json(account);
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/tenants/:tenantId/api-credentials/asesores/:usuarioId/social/:platform
 * Desconecta una cuenta social de asesor
 */
router.delete('/asesores/:usuarioId/social/:platform', async (req: Request<UserParams & { platform: string }>, res: Response, next: NextFunction) => {
  try {
    const { usuarioId, platform } = req.params;

    const validPlatforms = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube'];
    if (!validPlatforms.includes(platform)) {
      return res.status(400).json({ error: 'Plataforma inválida' });
    }

    await credentialsService.disconnectAsesorSocialAccount(usuarioId, platform as any);
    res.json({ success: true, message: `${platform} desconectado` });
  } catch (error) {
    next(error);
  }
});

// ==================== ESTADÍSTICAS DE USO ====================

/**
 * GET /api/tenants/:tenantId/api-credentials/usage
 * Obtiene estadísticas de uso de APIs
 */
router.get('/usage', async (req: Request<TenantParams>, res: Response, next: NextFunction) => {
  try {
    const { tenantId } = req.params;
    const { startDate, endDate } = req.query;

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const end = endDate ? new Date(endDate as string) : new Date();

    const stats = await credentialsService.getApiUsageStats(tenantId, start, end);
    res.json(stats);
  } catch (error) {
    next(error);
  }
});

export default router;
