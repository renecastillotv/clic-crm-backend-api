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

const router = express.Router({ mergeParams: true });

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
      scope: 'pages_show_list,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,instagram_manage_comments',
      state,
    });

    const authUrl = `https://www.facebook.com/v21.0/dialog/oauth?${params.toString()}`;
    res.json({ authUrl });
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

    const tokenData = await credentialsService.getMetaPageToken(tenantId);
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

    if (!pageId) {
      return res.status(400).json({ error: 'Se requiere pageId' });
    }

    // Get the stored user token
    const tokenData = await credentialsService.getMetaPageToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no está conectado. Realiza el flujo OAuth primero.' });
    }

    // Use user token to get page details including page token
    const pages = await metaSocialService.listUserPages(tokenData.pageAccessToken);
    const selectedPage = pages.find(p => p.id === pageId);

    if (!selectedPage) {
      return res.status(400).json({ error: 'Página no encontrada o no tienes permisos' });
    }

    // Save the permanent Page Access Token (connected_by already set during OAuth)
    await credentialsService.saveMetaCredentials(
      tenantId,
      selectedPage.accessToken,
      selectedPage.id,
      selectedPage.name,
      selectedPage.instagramBusinessAccount?.id || null,
      selectedPage.instagramBusinessAccount?.username || null
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
    const { message, imageUrl, link, targets } = req.body;

    if (!message && !imageUrl) {
      return res.status(400).json({ error: 'Se requiere mensaje o imagen' });
    }

    const tokenData = await credentialsService.getMetaPageToken(tenantId);
    if (!tokenData || !tokenData.pageId || tokenData.pageId === 'PENDING') {
      return res.status(400).json({ error: 'Meta no está configurado completamente. Selecciona una página primero.' });
    }

    const results: Record<string, { success: boolean; postId?: string; mediaId?: string; error?: string }> = {};

    // Publish to Facebook
    if (targets?.facebook !== false) {
      try {
        if (imageUrl) {
          const fbResult = await metaSocialService.publishPhotoToPage(
            tokenData.pageAccessToken,
            tokenData.pageId,
            { imageUrl, caption: message }
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
      if (!imageUrl) {
        results.instagram = { success: false, error: 'Instagram requiere una imagen' };
      } else {
        try {
          const igResult = await metaSocialService.publishToInstagram(
            tokenData.pageAccessToken,
            tokenData.instagramAccountId,
            { imageUrl, caption: message }
          );
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

    const tokenData = await credentialsService.getMetaPageToken(tenantId);
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

    const tokenData = await credentialsService.getMetaPageToken(tenantId);
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

    const tokenData = await credentialsService.getMetaPageToken(tenantId);
    if (!tokenData) {
      return res.status(400).json({ error: 'Meta no está conectado' });
    }

    const comments = await metaSocialService.getComments(
      tokenData.pageAccessToken,
      postId
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

    const tokenData = await credentialsService.getMetaPageToken(tenantId);
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
