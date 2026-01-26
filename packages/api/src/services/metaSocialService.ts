/**
 * Meta Social Service
 *
 * Provides helpers for interacting with the Meta Graph API for social posting:
 * - List user's Facebook Pages
 * - Get Page Access Tokens
 * - Publish to Facebook Pages
 * - Publish to Instagram Business accounts
 * - Read posts and comments
 * - Reply to comments
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ==================== TYPES ====================

export interface MetaPage {
  id: string;
  name: string;
  category?: string;
  accessToken: string;
  instagramBusinessAccount?: {
    id: string;
    username: string;
  };
}

export interface MetaPost {
  id: string;
  message?: string;
  fullPicture?: string;
  createdTime: string;
  type: string;
  permalink?: string;
  likes: number;
  comments: number;
  shares: number;
}

export interface MetaIGMedia {
  id: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  mediaType: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
}

export interface MetaComment {
  id: string;
  message: string;
  from?: { id: string; name: string };
  createdTime: string;
  likeCount: number;
  replies?: MetaComment[];
}

// ==================== PAGES ====================

/**
 * Lists all Facebook Pages the user manages.
 * Requires: pages_show_list permission.
 */
export async function listUserPages(userAccessToken: string): Promise<MetaPage[]> {
  const fields = 'id,name,category,access_token,instagram_business_account{id,username}';
  const response = await fetch(
    `${GRAPH_API_BASE}/me/accounts?fields=${encodeURIComponent(fields)}&limit=100`,
    { headers: { Authorization: `Bearer ${userAccessToken}` } }
  );

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to list pages: ${data.error?.message || response.statusText}`);
  }

  return (data.data || []).map((page: any) => ({
    id: page.id,
    name: page.name,
    category: page.category,
    accessToken: page.access_token,
    instagramBusinessAccount: page.instagram_business_account
      ? {
          id: page.instagram_business_account.id,
          username: page.instagram_business_account.username,
        }
      : undefined,
  }));
}

// ==================== FACEBOOK PAGE PUBLISHING ====================

/**
 * Publishes a text/link post to a Facebook Page.
 */
export async function publishToPage(
  pageAccessToken: string,
  pageId: string,
  options: { message?: string; link?: string }
): Promise<{ id: string }> {
  const body: Record<string, string> = {};
  if (options.message) body.message = options.message;
  if (options.link) body.link = options.link;

  const response = await fetch(`${GRAPH_API_BASE}/${pageId}/feed`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to publish to page: ${data.error?.message || response.statusText}`);
  }

  return { id: data.id };
}

/**
 * Publishes a photo to a Facebook Page.
 */
export async function publishPhotoToPage(
  pageAccessToken: string,
  pageId: string,
  options: { imageUrl: string; caption?: string }
): Promise<{ id: string; postId: string }> {
  const body: Record<string, string> = {
    url: options.imageUrl,
  };
  if (options.caption) body.message = options.caption;

  const response = await fetch(`${GRAPH_API_BASE}/${pageId}/photos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to publish photo: ${data.error?.message || response.statusText}`);
  }

  return { id: data.id, postId: data.post_id || data.id };
}

// ==================== INSTAGRAM PUBLISHING ====================

/**
 * Creates an Instagram media container and publishes it.
 * Instagram requires a two-step process: create container then publish.
 * Image must be publicly accessible.
 */
export async function publishToInstagram(
  pageAccessToken: string,
  igAccountId: string,
  options: { imageUrl: string; caption?: string }
): Promise<{ id: string }> {
  // Step 1: Create media container
  const containerBody: Record<string, string> = {
    image_url: options.imageUrl,
  };
  if (options.caption) containerBody.caption = options.caption;

  const containerResponse = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(containerBody),
  });

  const containerData: any = await containerResponse.json();

  if (!containerResponse.ok || containerData.error) {
    throw new Error(`Failed to create IG container: ${containerData.error?.message || containerResponse.statusText}`);
  }

  const containerId = containerData.id;

  // Step 2: Wait for container to be ready (poll status)
  let attempts = 0;
  const maxAttempts = 10;

  while (attempts < maxAttempts) {
    const statusResponse = await fetch(
      `${GRAPH_API_BASE}/${containerId}?fields=status_code`,
      { headers: { Authorization: `Bearer ${pageAccessToken}` } }
    );
    const statusData: any = await statusResponse.json();

    if (statusData.status_code === 'FINISHED') break;
    if (statusData.status_code === 'ERROR') {
      throw new Error('Instagram media processing failed');
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
    attempts++;
  }

  // Step 3: Publish
  const publishResponse = await fetch(`${GRAPH_API_BASE}/${igAccountId}/media_publish`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ creation_id: containerId }),
  });

  const publishData: any = await publishResponse.json();

  if (!publishResponse.ok || publishData.error) {
    throw new Error(`Failed to publish IG media: ${publishData.error?.message || publishResponse.statusText}`);
  }

  return { id: publishData.id };
}

// ==================== READ POSTS ====================

/**
 * Gets recent posts from a Facebook Page.
 */
export async function getPagePosts(
  pageAccessToken: string,
  pageId: string,
  limit: number = 25
): Promise<MetaPost[]> {
  const fields = 'id,message,full_picture,created_time,type,permalink_url,likes.summary(true),comments.summary(true),shares';

  const response = await fetch(
    `${GRAPH_API_BASE}/${pageId}/posts?fields=${encodeURIComponent(fields)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${pageAccessToken}` } }
  );

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to get posts: ${data.error?.message || response.statusText}`);
  }

  return (data.data || []).map((post: any) => ({
    id: post.id,
    message: post.message,
    fullPicture: post.full_picture,
    createdTime: post.created_time,
    type: post.type || 'status',
    permalink: post.permalink_url,
    likes: post.likes?.summary?.total_count || 0,
    comments: post.comments?.summary?.total_count || 0,
    shares: post.shares?.count || 0,
  }));
}

/**
 * Gets recent Instagram media.
 */
export async function getInstagramMedia(
  pageAccessToken: string,
  igAccountId: string,
  limit: number = 25
): Promise<MetaIGMedia[]> {
  const fields = 'id,caption,media_url,thumbnail_url,permalink,media_type,timestamp,like_count,comments_count';

  const response = await fetch(
    `${GRAPH_API_BASE}/${igAccountId}/media?fields=${encodeURIComponent(fields)}&limit=${limit}`,
    { headers: { Authorization: `Bearer ${pageAccessToken}` } }
  );

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to get IG media: ${data.error?.message || response.statusText}`);
  }

  return (data.data || []).map((media: any) => ({
    id: media.id,
    caption: media.caption,
    mediaUrl: media.media_url,
    thumbnailUrl: media.thumbnail_url,
    permalink: media.permalink,
    mediaType: media.media_type,
    timestamp: media.timestamp,
    likeCount: media.like_count || 0,
    commentsCount: media.comments_count || 0,
  }));
}

// ==================== COMMENTS ====================

/**
 * Gets comments on a Facebook post or Instagram media.
 */
export async function getComments(
  pageAccessToken: string,
  objectId: string
): Promise<MetaComment[]> {
  const fields = 'id,message,from,created_time,like_count,comments{id,message,from,created_time,like_count}';

  const response = await fetch(
    `${GRAPH_API_BASE}/${objectId}/comments?fields=${encodeURIComponent(fields)}&limit=50`,
    { headers: { Authorization: `Bearer ${pageAccessToken}` } }
  );

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to get comments: ${data.error?.message || response.statusText}`);
  }

  return (data.data || []).map((comment: any) => ({
    id: comment.id,
    message: comment.message,
    from: comment.from ? { id: comment.from.id, name: comment.from.name } : undefined,
    createdTime: comment.created_time,
    likeCount: comment.like_count || 0,
    replies: comment.comments?.data?.map((reply: any) => ({
      id: reply.id,
      message: reply.message,
      from: reply.from ? { id: reply.from.id, name: reply.from.name } : undefined,
      createdTime: reply.created_time,
      likeCount: reply.like_count || 0,
    })) || [],
  }));
}

/**
 * Replies to a comment.
 */
export async function replyToComment(
  pageAccessToken: string,
  commentId: string,
  message: string
): Promise<{ id: string }> {
  const response = await fetch(`${GRAPH_API_BASE}/${commentId}/comments`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${pageAccessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ message }),
  });

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to reply: ${data.error?.message || response.statusText}`);
  }

  return { id: data.id };
}
