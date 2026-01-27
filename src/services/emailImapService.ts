/**
 * Email IMAP Service
 *
 * Handles IMAP connections for reading email from MXRoute (or any IMAP server).
 * Uses `imapflow` for modern Promise-based IMAP access.
 * Uses `mailparser` for parsing raw email content.
 */

import { ImapFlow } from 'imapflow';
import { simpleParser, ParsedMail } from 'mailparser';

export interface ImapCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export interface ParsedEmail {
  messageId: string | null;
  uid: number;
  from: string;
  fromName: string;
  to: string;
  cc: string | null;
  bcc: string | null;
  subject: string;
  html: string;
  text: string;
  date: Date | null;
  inReplyTo: string | null;
  references: string | null;
  attachments: Array<{
    filename: string;
    contentType: string;
    size: number;
    content: Buffer;
  }>;
  flags: Set<string>;
}

/**
 * Create an ImapFlow client with the given credentials.
 */
function createClient(creds: ImapCredentials): ImapFlow {
  return new ImapFlow({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: {
      user: creds.username,
      pass: creds.password,
    },
    logger: false,
  });
}

/**
 * Test IMAP connection. Returns true if successful, throws on failure.
 */
export async function testConnection(creds: ImapCredentials): Promise<{ success: boolean; error?: string }> {
  const client = createClient(creds);
  try {
    await client.connect();
    await client.logout();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' };
  }
}

/**
 * List mailbox folders.
 */
export async function listFolders(creds: ImapCredentials): Promise<string[]> {
  const client = createClient(creds);
  try {
    await client.connect();
    const folders: string[] = [];
    const tree = await client.list();
    for (const folder of tree) {
      folders.push(folder.path);
    }
    await client.logout();
    return folders;
  } catch (error) {
    try { await client.logout(); } catch {}
    throw error;
  }
}

/**
 * Fetch emails from INBOX since a given UID (incremental sync).
 * If sinceUid is null, fetches the latest `limit` emails.
 */
export async function fetchEmails(
  creds: ImapCredentials,
  options: {
    folder?: string;
    sinceUid?: string | null;
    limit?: number;
  } = {}
): Promise<ParsedEmail[]> {
  const { folder = 'INBOX', sinceUid, limit = 50 } = options;
  const client = createClient(creds);
  const emails: ParsedEmail[] = [];

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      let range: string;

      if (sinceUid) {
        // Incremental: fetch UIDs greater than last synced
        const uid = parseInt(sinceUid);
        range = `${uid + 1}:*`;
      } else {
        // Initial sync: fetch latest N messages
        const status = client.mailbox;
        if (!status || !status.exists || status.exists === 0) {
          return [];
        }
        const start = Math.max(1, status.exists - limit + 1);
        range = `${start}:*`;
      }

      for await (const msg of client.fetch(
        sinceUid ? { uid: range } : range,
        {
          uid: true,
          flags: true,
          envelope: true,
          source: true,
        }
      )) {
        try {
          const parsed = await simpleParser(msg.source);
          emails.push(parsedMailToEmail(parsed, msg.uid, msg.flags));
        } catch {
          // Skip unparseable messages
        }
      }
    } finally {
      lock.release();
    }

    await client.logout();
  } catch (error) {
    try { await client.logout(); } catch {}
    throw error;
  }

  return emails;
}

/**
 * Fetch a single email by UID.
 */
export async function fetchEmailByUid(
  creds: ImapCredentials,
  uid: number,
  folder: string = 'INBOX'
): Promise<ParsedEmail | null> {
  const client = createClient(creds);

  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);

    try {
      const msg = await client.fetchOne(String(uid), {
        uid: true,
        flags: true,
        source: true,
      }, { uid: true });

      if (!msg || !msg.source) return null;

      const parsed = await simpleParser(msg.source);
      return parsedMailToEmail(parsed, msg.uid, msg.flags);
    } finally {
      lock.release();
    }
  } catch (error) {
    try { await client.logout(); } catch {}
    throw error;
  }
}

/**
 * Fetch emails from Sent folder.
 */
export async function fetchSentEmails(
  creds: ImapCredentials,
  limit: number = 50
): Promise<ParsedEmail[]> {
  // Common sent folder names for MXRoute / general IMAP
  const sentFolders = ['Sent', 'INBOX.Sent', 'Sent Messages', 'Sent Items'];

  const folders = await listFolders(creds);
  const sentFolder = sentFolders.find(sf => folders.includes(sf)) || 'Sent';

  return fetchEmails(creds, { folder: sentFolder, limit });
}

/**
 * Mark a message as read.
 */
export async function markAsRead(
  creds: ImapCredentials,
  uid: number,
  folder: string = 'INBOX'
): Promise<void> {
  const client = createClient(creds);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      await client.messageFlagsAdd(String(uid), ['\\Seen'], { uid: true });
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    try { await client.logout(); } catch {}
    throw error;
  }
}

/**
 * Mark/unmark a message as flagged (starred).
 */
export async function toggleFlagged(
  creds: ImapCredentials,
  uid: number,
  flagged: boolean,
  folder: string = 'INBOX'
): Promise<void> {
  const client = createClient(creds);
  try {
    await client.connect();
    const lock = await client.getMailboxLock(folder);
    try {
      if (flagged) {
        await client.messageFlagsAdd(String(uid), ['\\Flagged'], { uid: true });
      } else {
        await client.messageFlagsRemove(String(uid), ['\\Flagged'], { uid: true });
      }
    } finally {
      lock.release();
    }
    await client.logout();
  } catch (error) {
    try { await client.logout(); } catch {}
    throw error;
  }
}

// ==================== HELPERS ====================

function parsedMailToEmail(
  parsed: ParsedMail,
  uid: number,
  flags: Set<string>
): ParsedEmail {
  const fromAddr = parsed.from?.value?.[0];
  const toAddrs = parsed.to
    ? (Array.isArray(parsed.to) ? parsed.to : [parsed.to])
        .flatMap(a => a.value)
        .map(v => v.address || '')
        .join(', ')
    : '';
  const ccAddrs = parsed.cc
    ? (Array.isArray(parsed.cc) ? parsed.cc : [parsed.cc])
        .flatMap(a => a.value)
        .map(v => v.address || '')
        .join(', ')
    : null;

  return {
    messageId: parsed.messageId || null,
    uid,
    from: fromAddr?.address || '',
    fromName: fromAddr?.name || fromAddr?.address || '',
    to: toAddrs,
    cc: ccAddrs,
    bcc: null, // BCC not available via IMAP
    subject: parsed.subject || '(Sin asunto)',
    html: parsed.html || parsed.textAsHtml || '',
    text: parsed.text || '',
    date: parsed.date || null,
    inReplyTo: parsed.inReplyTo || null,
    references: Array.isArray(parsed.references)
      ? parsed.references.join(' ')
      : parsed.references || null,
    attachments: (parsed.attachments || []).map(a => ({
      filename: a.filename || 'attachment',
      contentType: a.contentType || 'application/octet-stream',
      size: a.size || 0,
      content: a.content,
    })),
    flags,
  };
}
