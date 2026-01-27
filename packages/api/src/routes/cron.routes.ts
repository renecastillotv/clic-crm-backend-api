/**
 * Cron Routes
 *
 * Protected endpoints called by external cron (Hetzner VPS).
 * Processes scheduled Instagram posts that are due for publishing.
 * Facebook uses native scheduling; Instagram requires this cron approach.
 */

import express, { Request, Response } from 'express';
import * as scheduledPostsService from '../services/scheduledPostsService.js';
import * as metaSocialService from '../services/metaSocialService.js';
import * as credentialsService from '../services/tenantApiCredentialsService.js';

const router = express.Router();

const CRON_SECRET = process.env.CRON_SECRET;

/**
 * GET /api/cron/process-scheduled-posts
 *
 * Called every minute by Hetzner VPS crontab.
 * Finds Instagram posts where scheduled_for <= NOW() and status = 'scheduled',
 * claims them atomically (status → processing), then publishes via Meta API.
 */
router.get('/process-scheduled-posts', async (req: Request, res: Response) => {
  // Verify cron secret
  const secret = req.headers['x-cron-secret'] as string;
  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Get due Instagram posts (atomically claim them)
    const duePosts = await scheduledPostsService.claimDueScheduledPosts('instagram', 50);

    if (duePosts.length === 0) {
      return res.json({ processed: 0, message: 'No posts due' });
    }

    const results: Array<{ id: string; status: string; error?: string }> = [];

    for (const post of duePosts) {
      try {
        // Get tenant Meta credentials
        const tokenData = await credentialsService.getMetaPageToken(post.tenantId);
        if (!tokenData || !tokenData.instagramAccountId) {
          await scheduledPostsService.updatePostStatus(post.tenantId, post.id, 'failed', undefined, 'Instagram no está conectado para este tenant');
          results.push({ id: post.id, status: 'failed', error: 'No IG credentials' });
          continue;
        }

        const imageUrls: string[] = post.imageUrls && post.imageUrls.length > 0
          ? post.imageUrls
          : post.imageUrl ? [post.imageUrl] : [];

        if (imageUrls.length === 0) {
          await scheduledPostsService.updatePostStatus(post.tenantId, post.id, 'failed', undefined, 'Instagram requiere al menos una imagen');
          results.push({ id: post.id, status: 'failed', error: 'No images' });
          continue;
        }

        let publishResult: { id: string };

        if (imageUrls.length === 1) {
          // Single image
          publishResult = await metaSocialService.publishToInstagram(
            tokenData.pageAccessToken,
            tokenData.instagramAccountId,
            { imageUrl: imageUrls[0], caption: post.message || undefined }
          );
        } else {
          // Carousel
          publishResult = await metaSocialService.publishCarouselToInstagram(
            tokenData.pageAccessToken,
            tokenData.instagramAccountId,
            { imageUrls, caption: post.message || undefined }
          );
        }

        await scheduledPostsService.updatePostStatus(post.tenantId, post.id, 'published', publishResult);
        results.push({ id: post.id, status: 'published' });
      } catch (error: any) {
        console.error(`[Cron] Failed to publish post ${post.id}:`, error.message);
        await scheduledPostsService.updatePostStatus(post.tenantId, post.id, 'failed', undefined, error.message);
        results.push({ id: post.id, status: 'failed', error: error.message });
      }
    }

    res.json({
      processed: results.length,
      published: results.filter(r => r.status === 'published').length,
      failed: results.filter(r => r.status === 'failed').length,
      results,
    });
  } catch (error: any) {
    console.error('[Cron] Error processing scheduled posts:', error.message);
    res.status(500).json({ error: 'Internal error', message: error.message });
  }
});

export default router;
