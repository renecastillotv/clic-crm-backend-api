/**
 * Meta Messaging Service
 *
 * Handles sending and reading Facebook Messenger DMs via the Meta Graph API.
 * Uses the Pages Messaging API (requires pages_messaging scope).
 *
 * Key concepts:
 * - PSID (Page-Scoped User ID): unique ID for a user within a page context
 * - Page Access Token: token with pages_messaging permission
 * - Conversations: threaded message exchanges between page and user
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ==================== TYPES ====================

export interface MetaMessageRecipient {
  id: string; // PSID
}

export interface MetaSendMessageResult {
  recipient_id: string;
  message_id: string;
}

export interface MetaConversation {
  id: string;
  updated_time: string;
  participants: {
    data: Array<{ id: string; name: string; email?: string }>;
  };
  messages?: {
    data: MetaMessage[];
  };
}

export interface MetaMessage {
  id: string;
  message: string;
  from: { id: string; name: string; email?: string };
  to: { data: Array<{ id: string; name: string }> };
  created_time: string;
  attachments?: {
    data: Array<{
      id: string;
      mime_type: string;
      name?: string;
      size: number;
      image_data?: { url: string; width: number; height: number };
      video_data?: { url: string };
      file_url?: string;
    }>;
  };
}

export interface MetaUserProfile {
  id: string;
  first_name?: string;
  last_name?: string;
  name?: string;
  profile_pic?: string;
}

// ==================== SEND MESSAGES ====================

/**
 * Send a text message to a user via Facebook Messenger.
 */
export async function sendTextMessage(
  pageAccessToken: string,
  recipientPsid: string,
  text: string
): Promise<MetaSendMessageResult> {
  const url = `${GRAPH_API_BASE}/me/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      messaging_type: 'RESPONSE',
      message: { text },
      access_token: pageAccessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Meta Send Message failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Send a message with an attachment (image, video, audio, file).
 */
export async function sendAttachmentMessage(
  pageAccessToken: string,
  recipientPsid: string,
  attachmentType: 'image' | 'video' | 'audio' | 'file',
  attachmentUrl: string,
  text?: string
): Promise<MetaSendMessageResult> {
  const url = `${GRAPH_API_BASE}/me/messages`;

  const messagePayload: any = {
    attachment: {
      type: attachmentType,
      payload: { url: attachmentUrl, is_reusable: true },
    },
  };

  // Text can only be sent alongside certain attachment types
  if (text) {
    messagePayload.text = text;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      messaging_type: 'RESPONSE',
      message: messagePayload,
      access_token: pageAccessToken,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Meta Send Attachment failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

// ==================== READ CONVERSATIONS ====================

/**
 * List conversations for a Facebook Page.
 * Returns conversations sorted by updated_time DESC.
 */
export async function listPageConversations(
  pageAccessToken: string,
  pageId: string,
  limit: number = 25
): Promise<{ data: MetaConversation[]; paging?: any }> {
  const params = new URLSearchParams({
    fields: 'id,updated_time,participants',
    limit: String(limit),
    access_token: pageAccessToken,
  });

  const url = `${GRAPH_API_BASE}/${pageId}/conversations?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Meta List Conversations failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Get messages for a specific conversation.
 */
export async function getConversationMessages(
  pageAccessToken: string,
  conversationId: string,
  limit: number = 25
): Promise<{ data: MetaMessage[]; paging?: any }> {
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
      `Meta Get Messages failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Get a single conversation by ID with its participants and recent messages.
 */
export async function getConversation(
  pageAccessToken: string,
  conversationId: string
): Promise<MetaConversation> {
  const params = new URLSearchParams({
    fields: 'id,updated_time,participants,messages{id,message,from,to,created_time,attachments}',
    access_token: pageAccessToken,
  });

  const url = `${GRAPH_API_BASE}/${conversationId}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Meta Get Conversation failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

// ==================== USER PROFILE ====================

/**
 * Get user profile by PSID (Page-Scoped User ID).
 * Returns name and profile picture.
 */
export async function getUserProfile(
  pageAccessToken: string,
  psid: string
): Promise<MetaUserProfile> {
  const params = new URLSearchParams({
    fields: 'first_name,last_name,name,profile_pic',
    access_token: pageAccessToken,
  });

  const url = `${GRAPH_API_BASE}/${psid}?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `Meta Get User Profile failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

// ==================== SENDER ACTIONS ====================

/**
 * Send a sender action (typing indicator, mark seen).
 */
export async function sendSenderAction(
  pageAccessToken: string,
  recipientPsid: string,
  action: 'typing_on' | 'typing_off' | 'mark_seen'
): Promise<void> {
  const url = `${GRAPH_API_BASE}/me/messages`;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      recipient: { id: recipientPsid },
      sender_action: action,
      access_token: pageAccessToken,
    }),
  });
}
