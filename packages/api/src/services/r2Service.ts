/**
 * R2 Service - Servicio para subir archivos a Cloudflare R2
 * 
 * Usa AWS SDK v3 compatible con R2
 * Integra Sharp para optimización de imágenes
 */

import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import sharp from 'sharp';
import { randomUUID } from 'crypto';

// Configuración de R2 - Compatible con múltiples nombres de variables
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || process.env.CLOUDFLARE_R2_ACCOUNT_ID || process.env.CF_R2_ACCOUNT_ID || '';
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || process.env.CF_R2_ACCESS_KEY_ID || '';
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || process.env.CF_R2_SECRET_ACCESS_KEY || '';
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || process.env.CLOUDFLARE_R2_BUCKET_NAME || process.env.CF_R2_BUCKET_NAME || '';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || process.env.CLOUDFLARE_R2_PUBLIC_URL || process.env.CF_R2_PUBLIC_URL || ''; // URL pública del bucket (ej: https://pub-xxxxx.r2.dev)

// Cliente S3 configurado para R2
const s3Client = new S3Client({
  region: 'auto',
  endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: R2_ACCESS_KEY_ID,
    secretAccessKey: R2_SECRET_ACCESS_KEY,
  },
});

export interface UploadImageOptions {
  tenantId: string;
  folder?: string; // 'propiedades', 'usuarios', 'documentos', etc.
  maxWidth?: number; // Ancho máximo para redimensionar (default: 1920)
  maxHeight?: number; // Alto máximo para redimensionar (default: 1920)
  quality?: number; // Calidad JPEG (1-100, default: 85)
  format?: 'jpeg' | 'webp' | 'png'; // Formato de salida (default: 'webp')
}

export interface UploadResult {
  url: string;
  key: string; // Clave en R2 (para poder eliminarlo después)
  width: number;
  height: number;
  size: number; // Tamaño en bytes
  format: string;
}

/**
 * Optimiza y sube una imagen a R2
 */
export async function uploadImage(
  buffer: Buffer,
  originalName: string,
  options: UploadImageOptions
): Promise<UploadResult> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY || !R2_BUCKET_NAME) {
    throw new Error('Configuración de R2 incompleta. Verifica las variables de entorno.');
  }

  const {
    tenantId,
    folder = 'propiedades',
    maxWidth = 1920,
    maxHeight = 1920,
    quality = 85,
    format = 'webp',
  } = options;

  try {
    // Obtener metadata de la imagen original
    const metadata = await sharp(buffer).metadata();
    const originalWidth = metadata.width || 0;
    const originalHeight = metadata.height || 0;

    // Redimensionar y optimizar la imagen
    let processedImage = sharp(buffer);

    // Redimensionar si es necesario
    if (originalWidth > maxWidth || originalHeight > maxHeight) {
      processedImage = processedImage.resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true,
      });
    }

    // Aplicar optimizaciones según el formato
    if (format === 'webp') {
      processedImage = processedImage.webp({ quality });
    } else if (format === 'jpeg') {
      processedImage = processedImage.jpeg({ quality, mozjpeg: true });
    } else if (format === 'png') {
      processedImage = processedImage.png({ quality, compressionLevel: 9 });
    }

    // Convertir a buffer
    const optimizedBuffer = await processedImage.toBuffer();

    // Obtener metadata de la imagen procesada
    const processedMetadata = await sharp(optimizedBuffer).metadata();
    const finalWidth = processedMetadata.width || originalWidth;
    const finalHeight = processedMetadata.height || originalHeight;

    // Generar nombre único para el archivo
    const fileExtension = format === 'webp' ? 'webp' : format === 'jpeg' ? 'jpg' : 'png';
    const uniqueId = randomUUID();
    const sanitizedName = originalName.replace(/[^a-zA-Z0-9.-]/g, '_').toLowerCase();
    const fileName = `${uniqueId}-${sanitizedName}.${fileExtension}`;
    const key = `${tenantId}/${folder}/${fileName}`;

    // Subir a R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: optimizedBuffer,
      ContentType: `image/${format === 'jpeg' ? 'jpeg' : format}`,
      CacheControl: 'public, max-age=31536000', // Cache por 1 año
    });

    await s3Client.send(command);

    // Construir URL pública
    const url = R2_PUBLIC_URL 
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.r2.cloudflarestorage.com/${key}`;

    return {
      url,
      key,
      width: finalWidth,
      height: finalHeight,
      size: optimizedBuffer.length,
      format,
    };
  } catch (error: any) {
    console.error('Error al subir imagen a R2:', error);
    throw new Error(`Error al subir imagen: ${error.message}`);
  }
}

/**
 * Verifica si un archivo ya existe en R2 (para evitar duplicados)
 */
export async function checkFileExists(key: string): Promise<boolean> {
  try {
    const command = new HeadObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
    return true;
  } catch (error: any) {
    if (error.name === 'NotFound' || error.$metadata?.httpStatusCode === 404) {
      return false;
    }
    throw error;
  }
}

/**
 * Elimina un archivo de R2
 */
export async function deleteFile(key: string): Promise<void> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
    });
    await s3Client.send(command);
  } catch (error: any) {
    console.error('Error al eliminar archivo de R2:', error);
    throw new Error(`Error al eliminar archivo: ${error.message}`);
  }
}

/**
 * Genera un hash del contenido del archivo para detectar duplicados
 */
export async function getFileHash(buffer: Buffer): Promise<string> {
  const crypto = await import('crypto');
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

export interface UploadDocumentOptions {
  tenantId: string;
  folder?: string; // 'actividades/evidencias', 'documentos', etc.
}

export interface UploadDocumentResult {
  url: string;
  key: string;
  size: number;
}

/**
 * Sube un documento (PDF, DOC, DOCX) a R2 sin optimización
 */
export async function uploadDocument(
  buffer: Buffer,
  filename: string,
  options: UploadDocumentOptions
): Promise<UploadDocumentResult> {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error('R2 no está configurado. Verifica las variables de entorno.');
  }

  try {
    // Generar clave única para el archivo
    const timestamp = Date.now();
    const randomId = randomUUID().substring(0, 8);
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    const folder = options.folder || 'documentos';
    const key = `${options.tenantId}/${folder}/${timestamp}-${randomId}-${sanitizedFilename}`;

    // Determinar content type
    const ext = filename.toLowerCase().split('.').pop();
    const mimeTypes: Record<string, string> = {
      pdf: 'application/pdf',
      doc: 'application/msword',
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    };
    const contentType = mimeTypes[ext || ''] || 'application/octet-stream';

    // Subir a R2
    const command = new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: 'public, max-age=31536000, immutable',
    });

    await s3Client.send(command);

    // Construir URL pública
    const url = R2_PUBLIC_URL
      ? `${R2_PUBLIC_URL}/${key}`
      : `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${key}`;

    return {
      url,
      key,
      size: buffer.length,
    };
  } catch (error: any) {
    console.error('Error al subir documento a R2:', error);
    throw new Error(`Error al subir documento: ${error.message}`);
  }
}

