/**
 * WhatsApp Cloud API Service
 *
 * Handles sending and receiving WhatsApp messages via the Meta Cloud API.
 * Uses the WhatsApp Business Platform (Cloud API).
 *
 * Key concepts:
 * - Phone Number ID: identifies the business phone number (used for sending)
 * - WABA ID: WhatsApp Business Account ID (used for templates, phone numbers)
 * - wa_id: recipient's WhatsApp ID (typically their phone number in international format)
 * - wamid: WhatsApp Message ID (unique per message)
 *
 * All API calls go through the Meta Graph API at graph.facebook.com.
 */

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ==================== TYPES ====================

export interface WASendMessageResult {
  messaging_product: 'whatsapp';
  contacts: Array<{ input: string; wa_id: string }>;
  messages: Array<{ id: string }>;
}

export interface WAMessageTemplate {
  id: string;
  name: string;
  status: 'APPROVED' | 'PENDING' | 'REJECTED';
  category: string;
  language: string;
  components: Array<{
    type: 'HEADER' | 'BODY' | 'FOOTER' | 'BUTTONS';
    text?: string;
    format?: string;
    buttons?: Array<{ type: string; text: string; url?: string; phone_number?: string }>;
  }>;
}

export interface WABusinessProfile {
  about?: string;
  address?: string;
  description?: string;
  email?: string;
  messaging_product: 'whatsapp';
  profile_picture_url?: string;
  vertical?: string;
  websites?: string[];
}

export interface WAIncomingMessage {
  from: string; // sender's wa_id (phone number)
  id: string;   // wamid
  timestamp: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'document' | 'sticker' | 'location' | 'contacts' | 'reaction' | 'interactive' | 'button' | 'order' | 'unknown';
  text?: { body: string };
  image?: { id: string; mime_type: string; sha256: string; caption?: string };
  video?: { id: string; mime_type: string; sha256: string; caption?: string };
  audio?: { id: string; mime_type: string; sha256: string };
  document?: { id: string; mime_type: string; sha256: string; filename?: string; caption?: string };
  sticker?: { id: string; mime_type: string; sha256: string; animated: boolean };
  location?: { latitude: number; longitude: number; name?: string; address?: string };
  contacts?: Array<{
    name: { formatted_name: string; first_name?: string; last_name?: string };
    phones?: Array<{ phone: string; type?: string; wa_id?: string }>;
  }>;
  reaction?: { message_id: string; emoji: string };
  context?: { from: string; id: string }; // reply context
}

export interface WAStatusUpdate {
  id: string;        // wamid
  status: 'sent' | 'delivered' | 'read' | 'failed';
  timestamp: string;
  recipient_id: string;
  errors?: Array<{ code: number; title: string; message?: string; error_data?: { details: string } }>;
}

export interface WAWebhookValue {
  messaging_product: 'whatsapp';
  metadata: {
    display_phone_number: string;
    phone_number_id: string;
  };
  contacts?: Array<{
    profile: { name: string };
    wa_id: string;
  }>;
  messages?: WAIncomingMessage[];
  statuses?: WAStatusUpdate[];
}

// ==================== SEND MESSAGES ====================

/**
 * Send a text message via WhatsApp.
 */
export async function sendTextMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  text: string
): Promise<WASendMessageResult> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'text',
      text: { preview_url: true, body: text },
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `WhatsApp Send Text failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Send a media message (image, video, audio, document) via WhatsApp.
 */
export async function sendMediaMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  mediaType: 'image' | 'video' | 'audio' | 'document',
  mediaUrl: string,
  caption?: string,
  filename?: string
): Promise<WASendMessageResult> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const mediaPayload: any = { link: mediaUrl };
  if (caption) mediaPayload.caption = caption;
  if (filename && mediaType === 'document') mediaPayload.filename = filename;

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: mediaType,
      [mediaType]: mediaPayload,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `WhatsApp Send Media failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Send a template message via WhatsApp.
 * Template messages are required for initiating conversations outside the 24h window.
 */
export async function sendTemplateMessage(
  accessToken: string,
  phoneNumberId: string,
  to: string,
  templateName: string,
  languageCode: string = 'es',
  components?: Array<{
    type: 'header' | 'body' | 'button';
    parameters: Array<{ type: string; text?: string; image?: { link: string }; document?: { link: string; filename: string } }>;
    sub_type?: string;
    index?: number;
  }>
): Promise<WASendMessageResult> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  const template: any = {
    name: templateName,
    language: { code: languageCode },
  };
  if (components && components.length > 0) {
    template.components = components;
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to,
      type: 'template',
      template,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `WhatsApp Send Template failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Mark a message as read (sends read receipt to the sender).
 */
export async function markMessageAsRead(
  accessToken: string,
  phoneNumberId: string,
  messageId: string
): Promise<void> {
  const url = `${GRAPH_API_BASE}/${phoneNumberId}/messages`;

  await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      status: 'read',
      message_id: messageId,
    }),
  });
}

// ==================== BUSINESS PROFILE ====================

/**
 * Get the WhatsApp Business Profile for a phone number.
 */
export async function getBusinessProfile(
  accessToken: string,
  phoneNumberId: string
): Promise<WABusinessProfile | null> {
  const params = new URLSearchParams({
    fields: 'about,address,description,email,profile_picture_url,websites,vertical',
    access_token: accessToken,
  });

  const url = `${GRAPH_API_BASE}/${phoneNumberId}/whatsapp_business_profile?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const data: any = await response.json();
  return data.data?.[0] || null;
}

// ==================== MESSAGE TEMPLATES ====================

/**
 * List message templates for a WhatsApp Business Account.
 */
export async function getMessageTemplates(
  accessToken: string,
  wabaId: string,
  limit: number = 50
): Promise<{ data: WAMessageTemplate[]; paging?: any }> {
  const params = new URLSearchParams({
    fields: 'id,name,status,category,language,components',
    limit: String(limit),
    access_token: accessToken,
  });

  const url = `${GRAPH_API_BASE}/${wabaId}/message_templates?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `WhatsApp Get Templates failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

// ==================== MEDIA ====================

/**
 * Get media URL from a media ID (for downloading incoming media).
 * WhatsApp media URLs are temporary and require the access token to download.
 */
export async function getMediaUrl(
  accessToken: string,
  mediaId: string
): Promise<{ url: string; mime_type: string; sha256: string; file_size: number }> {
  const url = `${GRAPH_API_BASE}/${mediaId}?access_token=${accessToken}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `WhatsApp Get Media URL failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  return response.json() as any;
}

/**
 * Download media content from a WhatsApp media URL.
 * Returns the raw buffer and content type.
 */
export async function downloadMedia(
  accessToken: string,
  mediaUrl: string
): Promise<{ buffer: Buffer; contentType: string }> {
  const response = await fetch(mediaUrl, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error(`WhatsApp Download Media failed: ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const contentType = response.headers.get('content-type') || 'application/octet-stream';

  return { buffer, contentType };
}

// ==================== PHONE NUMBERS ====================

/**
 * Get phone numbers registered for a WhatsApp Business Account.
 */
export async function getPhoneNumbers(
  accessToken: string,
  wabaId: string
): Promise<Array<{ id: string; display_phone_number: string; verified_name: string; quality_rating: string }>> {
  const params = new URLSearchParams({
    fields: 'id,display_phone_number,verified_name,quality_rating',
    access_token: accessToken,
  });

  const url = `${GRAPH_API_BASE}/${wabaId}/phone_numbers?${params}`;
  const response = await fetch(url);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      `WhatsApp Get Phone Numbers failed: ${response.status} - ${JSON.stringify(error)}`
    );
  }

  const data: any = await response.json();
  return data.data || [];
}
