/**
 * Email SMTP Service
 *
 * Handles sending email via SMTP (MXRoute or any SMTP server).
 * Uses `nodemailer` for transport.
 */

import nodemailer from 'nodemailer';

export interface SmtpCredentials {
  host: string;
  port: number;
  username: string;
  password: string;
  secure: boolean;
}

export interface SendEmailOptions {
  from: string;
  fromName?: string;
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  html: string;
  text?: string;
  inReplyTo?: string;
  references?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

/**
 * Create a nodemailer transporter with the given credentials.
 */
function createTransport(creds: SmtpCredentials) {
  return nodemailer.createTransport({
    host: creds.host,
    port: creds.port,
    secure: creds.secure,
    auth: {
      user: creds.username,
      pass: creds.password,
    },
    tls: {
      rejectUnauthorized: false, // MXRoute sometimes has cert issues
    },
  });
}

/**
 * Test SMTP connection.
 */
export async function testConnection(creds: SmtpCredentials): Promise<{ success: boolean; error?: string }> {
  const transport = createTransport(creds);
  try {
    await transport.verify();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Connection failed' };
  } finally {
    transport.close();
  }
}

/**
 * Send an email.
 * Returns the Message-ID of the sent email.
 */
export async function sendEmail(
  creds: SmtpCredentials,
  options: SendEmailOptions
): Promise<{ messageId: string }> {
  const transport = createTransport(creds);

  try {
    const fromField = options.fromName
      ? `"${options.fromName}" <${options.from}>`
      : options.from;

    const result = await transport.sendMail({
      from: fromField,
      to: options.to,
      cc: options.cc || undefined,
      bcc: options.bcc || undefined,
      subject: options.subject,
      html: options.html,
      text: options.text || undefined,
      inReplyTo: options.inReplyTo || undefined,
      references: options.references || undefined,
      attachments: options.attachments?.map(a => ({
        filename: a.filename,
        content: a.content,
        contentType: a.contentType,
      })),
    });

    return { messageId: result.messageId };
  } finally {
    transport.close();
  }
}

/**
 * Reply to an email (sets In-Reply-To and References headers).
 */
export async function replyToEmail(
  creds: SmtpCredentials,
  options: SendEmailOptions & {
    originalMessageId: string;
    originalReferences?: string;
  }
): Promise<{ messageId: string }> {
  const references = options.originalReferences
    ? `${options.originalReferences} ${options.originalMessageId}`
    : options.originalMessageId;

  return sendEmail(creds, {
    ...options,
    inReplyTo: options.originalMessageId,
    references,
    subject: options.subject.startsWith('Re:')
      ? options.subject
      : `Re: ${options.subject}`,
  });
}

/**
 * Forward an email.
 */
export async function forwardEmail(
  creds: SmtpCredentials,
  options: SendEmailOptions
): Promise<{ messageId: string }> {
  return sendEmail(creds, {
    ...options,
    subject: options.subject.startsWith('Fwd:')
      ? options.subject
      : `Fwd: ${options.subject}`,
  });
}
