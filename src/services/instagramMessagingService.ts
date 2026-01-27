/**
 * Instagram Messaging Service
 *
 * Handles sending and reading Instagram DMs via the Meta Graph API.
 * Uses the Instagram Messaging API (requires instagram_manage_messages scope).
 *
 * Key differences from Facebook Messenger:
 * - Uses Instagram-Scoped User ID (IGSID) instead of PSID
 * - Messages sent via Page Access Token but targeted to IG Business Account
 * - Webhook object type is 'instagram' (not 'page')
 * - Entry ID in webhooks is the Instagram Business Account ID
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ==================== TYPES ====================

export interface IGSendMessageResult {
  recipient_id: string;
  message_id: string;
}

export interface IGConversation {
  id: string;
  updated_time: string;
  participants: {
    data: Array<{ id: string; username?: string; name?: string }>;
  };
  messages?: {
    data: IGMessage[];
  };
}

export interface IGMessage {
  id: string;
  message: string;
  from: { id: string; username?: string };
  to: { data: Array<{ id: string; username?: string }> };
  created_time: string;
  attachments?: {
    data: Array<{
      type: string;
      payload?: { url: string };
    }>;
  };
}

export interface IGUserProfile {
  id: string;
  name?: string;
  username?: string;
  profile_picture_url?: string;
}

// ==================== SEND MESSAGES ====================

/**
 * Send a text message to a user via Instagram DM.
 * Uses the Page Access Token (same token as Facebook, with instagram_manage_messages scope).
 */
export async function sendTextMessage(
  pageAccessToken: string,
  igBusinessAccountId: string,
  recipientIgsid: string,
  text: string
): Promise<IGSendMessageResult> {
  const url = `${GRAPH_API_BASE}/${igBusinessAccountId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { text },
      access_token: pageAccessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Instagram Send Message failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Send a media message (image, video, audio) via Instagram DM.
 */
export async function sendMediaMessage(
  pageAccessToken: string,
  igBusinessAccountId: string,
  recipientIgsid: string,
  mediaType: 'image' | 'video' | 'audio',
  mediaUrl: string
): Promise<IGSendMessageResult> {
  const url = `${GRAPH_API_BASE}/${igBusinessAccountId}/messages`;

  const attachmentPayload: any = {
    type: mediaType,
    payload: { url: mediaUrl },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientIgsid },
      message: { attachment: attachmentPayload },
      access_token: pageAccessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Instagram Send Media failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

// ==================== READ CONVERSATIONS ====================

/**
 * List conversations for an Instagram Business Account.
 */
export async function listConversations(
  pageAccessToken: string,
  igBusinessAccountId: string,
  limit: number = 25
): Promise<{ data: IGConversation[]; paging?: any }> {
  const params = new URLSearchParams({
    fields: 'id,updated_time,participants',
    limit: String(limit),
    platform: 'instagram',
    access_token: pageAccessToken,
  });

  const url = `${GRAPH_API_BASE}/${igBusinessAccountId}/conversations?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Instagram List Conversations failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Get messages for a specific Instagram conversation.
 */
export async function getConversationMessages(
  pageAccessToken: string,
  conversationId: string,
  limit: number = 25
): Promise<{ data: IGMessage[]; paging?: any }> {
  const params = new URLSearchParams({
    fields: 'id,message,from,to,created_time,attachments',
    limit: String(limit),
    access_token: pageAccessToken,
  });

  const url = `${GRAPH_API_BASE}/${conversationId}/messages?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Instagram Get Messages failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

// ==================== USER PROFILE ====================

/**
 * Get Instagram user profile by IGSID.
 * Note: Limited fields available via Instagram API compared to Facebook.
 */
export async function getUserProfile(
  pageAccessToken: string,
  igsid: string
): Promise<IGUserProfile> {
  const params = new URLSearchParams({
    fields: 'id,name,username,profile_picture_url',
    access_token: pageAccessToken,
  });

  const url = `${GRAPH_API_BASE}/${igsid}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    // Instagram profile lookup is more restrictive; fail gracefully
    return { id: igsid };
  }

  return response.json() as any;
}
