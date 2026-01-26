/**
 * CrmMarketingImageConverter - Generador de Artes Inmobiliarios Profesionales
 *
 * Herramienta para crear artes de marketing inmobiliario con diseño premium:
 * - Seleccionar propiedad del inventario O ingresar datos manualmente
 * - 6 plantillas profesionales con diseño moderno
 * - Preview en tiempo real
 * - Descarga para redes sociales
 */

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { getTema, getInfoNegocio, apiFetch, type TemaColores, type InfoNegocio } from '../../services/api';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import {
  ArrowLeft,
  Upload,
  Download,
  Image,
  Loader2,
  Search,
  Home,
  Check,
  Building2,
  Sparkles,
  Smartphone,
  Monitor,
  Square,
  Edit3,
  AlertCircle,
} from 'lucide-react';

// ============================================
// TIPOS
// ============================================

interface Propiedad {
  id: string;
  titulo: string;
  codigo?: string;
  codigo_publico?: number;
  tipo?: string;
  operacion?: string;
  precio?: number;
  moneda?: string;
  precio_anterior?: number;
  ciudad?: string;
  sector?: string;
  direccion?: string;
  habitaciones?: number; // API retorna habitaciones, no recamaras
  banos?: number;
  estacionamientos?: number;
  m2_construccion?: number;
  m2_terreno?: number;
  imagen_principal?: string;
  imagenes?: string[];
  destacada?: boolean;
  exclusiva?: boolean;
}

interface ManualData {
  titulo: string;
  tipo: string;
  operacion: string;
  precio: string;
  moneda: string;
  ubicacion: string;
  habitaciones: string;
  banos: string;
  estacionamientos: string;
  metros: string;
}

interface TemplateOptions {
  showPrice: boolean;
  showFeatures: boolean;
  showLocation: boolean;
  showBadge: boolean;
  badgeText: string;
  ctaText: string;
  customTitle: string;
  customSubtitle: string;
}

type DataMode = 'property' | 'manual';
type OutputFormat = 'square' | 'story' | 'landscape';

// ============================================
// HELPERS DE RENDERIZADO PROFESIONAL
// ============================================

const formatPrice = (precio: number, moneda: string): string => {
  const symbol = moneda === 'USD' ? '$' : moneda === 'EUR' ? '€' : 'RD$';
  if (precio >= 1000000) {
    const millones = precio / 1000000;
    return `${symbol}${millones.toFixed(millones % 1 === 0 ? 0 : 1)}M`;
  }
  return `${symbol}${precio.toLocaleString()}`;
};

const formatPriceFull = (precio: number, moneda: string): string => {
  const symbol = moneda === 'USD' ? '$' : moneda === 'EUR' ? '€' : 'RD$';
  return `${symbol}${precio.toLocaleString()}`;
};

// Rectángulo redondeado
const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

// Dibujar ícono de ubicación profesional
const drawLocationIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.fillStyle = color;

  const w = size * 0.6;
  const h = size;
  const cx = x + w / 2;

  // Pin
  ctx.beginPath();
  ctx.moveTo(cx, y + h);
  ctx.bezierCurveTo(cx - w * 0.3, y + h * 0.55, cx - w / 2, y + h * 0.35, cx - w / 2, y + h * 0.25);
  ctx.arc(cx, y + h * 0.25, w / 2, Math.PI, 0, false);
  ctx.bezierCurveTo(cx + w / 2, y + h * 0.35, cx + w * 0.3, y + h * 0.55, cx, y + h);
  ctx.fill();

  // Círculo interior blanco
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(cx, y + h * 0.25, w * 0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

// Texto con sombra profesional
const drawTextWithShadow = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  shadowColor = 'rgba(0,0,0,0.5)',
  shadowBlur = 4
) => {
  ctx.save();
  ctx.shadowColor = shadowColor;
  ctx.shadowBlur = shadowBlur;
  ctx.shadowOffsetX = 2;
  ctx.shadowOffsetY = 2;
  ctx.fillText(text, x, y);
  ctx.restore();
};

// Labels de tipo y operación
const getTipoLabel = (tipo?: string): string => {
  const labels: Record<string, string> = {
    casa: 'Casa',
    departamento: 'Departamento',
    terreno: 'Terreno',
    oficina: 'Oficina',
    local: 'Local',
    bodega: 'Bodega',
  };
  return labels[tipo || ''] || tipo || '';
};

const getOperacionLabel = (op?: string): string => {
  const labels: Record<string, string> = {
    venta: 'en Venta',
    renta: 'en Renta',
    traspaso: 'en Traspaso',
  };
  return labels[op || ''] || op || '';
};

// ============================================
// DEFINICIÓN DE PLANTILLAS PROFESIONALES
// ============================================

interface PropertyTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  defaultFormat: OutputFormat;
  render: (
    ctx: CanvasRenderingContext2D,
    canvas: HTMLCanvasElement,
    propertyImage: HTMLImageElement,
    logoImg: HTMLImageElement | null,
    colores: TemaColores | null,
    contactInfo: { telefono: string | null; whatsapp: string | null; nombre: string | null },
    propertyData: {
      titulo: string;
      tipo: string;
      operacion: string;
      precio: number;
      moneda: string;
      ubicacion: string;
      habitaciones: number;
      banos: number;
      estacionamientos: number;
      metros: number;
      destacada?: boolean;
      exclusiva?: boolean;
    },
    options: TemplateOptions
  ) => void;
}

// Helper: dibujar imagen de fondo cubriendo todo el canvas
const drawFullImage = (ctx: CanvasRenderingContext2D, img: HTMLImageElement, w: number, h: number) => {
  const scale = Math.max(w / img.width, h / img.height);
  const iw = img.width * scale;
  const ih = img.height * scale;
  ctx.drawImage(img, (w - iw) / 2, (h - ih) / 2, iw, ih);
};

// Helper: dibujar frosted glass panel
const drawGlassPanel = (
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  radius: number,
  opacity = 0.65,
  color = '0,0,0'
) => {
  ctx.save();
  ctx.fillStyle = `rgba(${color},${opacity})`;
  roundRect(ctx, x, y, w, h, radius);
  ctx.fill();
  // Sutil borde de luz
  ctx.strokeStyle = `rgba(255,255,255,0.12)`;
  ctx.lineWidth = 1;
  roundRect(ctx, x, y, w, h, radius);
  ctx.stroke();
  ctx.restore();
};

// Helper: dibujar features inline como texto
const drawFeaturesInline = (
  ctx: CanvasRenderingContext2D,
  data: { habitaciones: number; banos: number; estacionamientos: number; metros: number },
  x: number, y: number, color: string, fontSize = 22
) => {
  const parts: string[] = [];
  if (data.habitaciones > 0) parts.push(`${data.habitaciones} Hab`);
  if (data.banos > 0) parts.push(`${data.banos} Baños`);
  if (data.estacionamientos > 0) parts.push(`${data.estacionamientos} Est`);
  if (data.metros > 0) parts.push(`${data.metros} m²`);
  ctx.fillStyle = color;
  ctx.font = `500 ${fontSize}px "Segoe UI", Arial, sans-serif`;
  ctx.fillText(parts.join('  ·  '), x, y);
};

const propertyTemplates: PropertyTemplate[] = [
  // 1. ELEGANTE — Full-bleed image, glass panel bottom
  {
    id: 'elegante',
    name: 'Elegante',
    description: 'Imagen protagonista con panel glass inferior',
    icon: '✨',
    defaultFormat: 'landscape',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#1a1a2e';

      // Imagen full-bleed
      drawFullImage(ctx, propertyImage, w, h);

      // Overlay gradiente sutil (solo abajo)
      const grad = ctx.createLinearGradient(0, h * 0.4, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.6, 'rgba(0,0,0,0.15)');
      grad.addColorStop(1, 'rgba(0,0,0,0.55)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pad = 50;

      // Logo esquina superior izquierda con fondo glass
      if (logoImg) {
        const logoH = 50;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        drawGlassPanel(ctx, pad - 10, pad - 10, logoW + 20, logoH + 20, 12, 0.5);
        ctx.drawImage(logoImg, pad, pad, logoW, logoH);
      }

      // Badge superior derecho
      if (options.showBadge && options.badgeText) {
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        const bw = ctx.measureText(options.badgeText.toUpperCase()).width + 36;
        drawGlassPanel(ctx, w - pad - bw, pad, bw, 38, 19, 0.8, '0,0,0');
        ctx.fillStyle = primary;
        roundRect(ctx, w - pad - bw, pad, bw, 38, 19);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.badgeText.toUpperCase(), w - pad - bw / 2, pad + 19);
        ctx.textAlign = 'left';
      }

      // Custom title (glass tag top-center)
      if (options.customTitle) {
        ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
        const tw = ctx.measureText(options.customTitle).width + 48;
        const tx = (w - tw) / 2;
        drawGlassPanel(ctx, tx, pad, tw, 44, 22, 0.7);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.customTitle, w / 2, pad + 22);
        ctx.textAlign = 'left';
      }

      // Panel glass inferior
      const panelH = 180;
      const panelY = h - panelH - pad;
      drawGlassPanel(ctx, pad, panelY, w - pad * 2, panelH, 20, 0.6);

      const px = pad + 30;
      let py = panelY + 28;

      // Tipo operación
      ctx.fillStyle = primary;
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), px, py);

      // Custom subtitle
      if (options.customSubtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '500 18px "Segoe UI", Arial, sans-serif';
        ctx.fillText(options.customSubtitle, px + ctx.measureText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase()).width + 20, py + 2);
      }
      py += 35;

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), px, py);
        py += 60;
      }

      // Ubicación + Features en una línea
      ctx.textBaseline = 'top';
      if (options.showLocation && data.ubicacion) {
        drawLocationIcon(ctx, px, py + 2, 20, 'rgba(255,255,255,0.8)');
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(data.ubicacion, px + 28, py);
      }

      if (options.showFeatures) {
        ctx.textAlign = 'right';
        drawFeaturesInline(ctx, data, w - pad - 30, py, 'rgba(255,255,255,0.85)', 20);
        ctx.textAlign = 'left';
      }

      // Contacto pequeño abajo-derecha
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '500 18px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - pad, panelY - 10);
        ctx.textAlign = 'left';
      }
    },
  },

  // 2. MODERNO — Full-bleed, gradient bottom strip
  {
    id: 'moderno',
    name: 'Moderno',
    description: 'Gradiente inferior con tipografía bold',
    icon: '🔥',
    defaultFormat: 'square',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#ff6b35';

      // Imagen full-bleed
      drawFullImage(ctx, propertyImage, w, h);

      // Overlay gradiente: transparente arriba → oscuro abajo
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0)');
      grad.addColorStop(0.45, 'rgba(0,0,0,0)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
      grad.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Tinte de color primario sutil
      const colorGrad = ctx.createLinearGradient(0, h * 0.75, 0, h);
      colorGrad.addColorStop(0, 'rgba(0,0,0,0)');
      colorGrad.addColorStop(1, `${primary}40`);
      ctx.fillStyle = colorGrad;
      ctx.fillRect(0, 0, w, h);

      const pad = 45;

      // Logo top-left glass
      if (logoImg) {
        const logoH = 45;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        drawGlassPanel(ctx, pad - 8, pad - 8, logoW + 16, logoH + 16, 10, 0.45);
        ctx.drawImage(logoImg, pad, pad, logoW, logoH);
      }

      // Badge superior (ribbon con glass)
      if (options.showBadge && options.badgeText) {
        ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
        const bw = ctx.measureText(options.badgeText.toUpperCase()).width + 32;
        const bx = logoImg ? pad + (logoImg.width / logoImg.height) * 45 + 30 : pad;
        ctx.fillStyle = primary;
        roundRect(ctx, bx, pad + 5, bw, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.badgeText.toUpperCase(), bx + bw / 2, pad + 22);
        ctx.textAlign = 'left';
      }

      // Custom title tag
      if (options.customTitle) {
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        const tw = ctx.measureText(options.customTitle).width + 40;
        drawGlassPanel(ctx, w - pad - tw, pad, tw, 40, 20, 0.6);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.customTitle, w - pad - tw / 2, pad + 20);
        ctx.textAlign = 'left';
      }

      // Contenido inferior
      const bottom = h - pad;
      ctx.textBaseline = 'bottom';

      // Tipo operación
      ctx.fillStyle = primary;
      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), pad, bottom - 130);

      // Custom subtitle
      if (options.customSubtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '500 20px "Segoe UI", Arial, sans-serif';
        ctx.fillText(options.customSubtitle, pad, bottom - 105);
      }

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 60px "Segoe UI", Arial, sans-serif';
        drawTextWithShadow(ctx, formatPriceFull(data.precio, data.moneda), pad, bottom - 50);
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        drawLocationIcon(ctx, pad, bottom - 25, 20, 'rgba(255,255,255,0.7)');
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(data.ubicacion, pad + 28, bottom - 10);
      }

      // Features derecha
      if (options.showFeatures) {
        ctx.textAlign = 'right';
        drawFeaturesInline(ctx, data, w - pad, bottom - 12, 'rgba(255,255,255,0.8)', 20);
        ctx.textAlign = 'left';
      }

      // CTA botón
      if (options.ctaText) {
        const cw = 200;
        const ch = 46;
        const cx = w - pad - cw;
        const cy = bottom - 130 - ch;
        ctx.fillStyle = primary;
        roundRect(ctx, cx, cy, cw, ch, 23);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.ctaText, cx + cw / 2, cy + ch / 2);
        ctx.textAlign = 'left';
      }

      // Contacto sutil
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '500 16px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'top';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - pad, pad);
        ctx.textAlign = 'left';
      }
    },
  },

  // 3. STORY — Vertical optimizado para Instagram/Facebook Stories
  {
    id: 'story',
    name: 'Story',
    description: 'Optimizado para Instagram/Facebook Stories',
    icon: '📱',
    defaultFormat: 'story',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#6366f1';

      // Imagen full-bleed
      drawFullImage(ctx, propertyImage, w, h);

      // Overlay: oscuro arriba y abajo, transparente en medio
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.55)');
      grad.addColorStop(0.25, 'rgba(0,0,0,0.05)');
      grad.addColorStop(0.65, 'rgba(0,0,0,0.05)');
      grad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pad = 50;

      // Logo centrado arriba
      if (logoImg) {
        const logoH = 55;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        drawGlassPanel(ctx, (w - logoW - 24) / 2, pad - 8, logoW + 24, logoH + 16, 14, 0.45);
        ctx.drawImage(logoImg, (w - logoW) / 2, pad, logoW, logoH);
      }

      // Badge centrado
      if (options.showBadge && options.badgeText) {
        const badgeY = logoImg ? pad + 75 : pad + 10;
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        const bw = ctx.measureText(options.badgeText.toUpperCase()).width + 40;
        ctx.fillStyle = primary;
        roundRect(ctx, (w - bw) / 2, badgeY, bw, 40, 20);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.badgeText.toUpperCase(), w / 2, badgeY + 20);
      }

      // Custom title grande arriba
      if (options.customTitle) {
        const titleY = logoImg ? pad + 130 : pad + 60;
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        drawTextWithShadow(ctx, options.customTitle, w / 2, titleY);

        if (options.customSubtitle) {
          ctx.fillStyle = 'rgba(255,255,255,0.7)';
          ctx.font = '500 24px "Segoe UI", Arial, sans-serif';
          ctx.fillText(options.customSubtitle, w / 2, titleY + 50);
        }
      }

      // Panel glass inferior
      const panelH = 280;
      const panelY = h - panelH - pad;
      drawGlassPanel(ctx, pad - 10, panelY, w - (pad - 10) * 2, panelH, 24, 0.55);

      const px = pad + 15;
      let py = panelY + 25;

      // Tipo
      ctx.fillStyle = primary;
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), px, py);
      py += 35;

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), px, py);
        py += 65;
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        drawLocationIcon(ctx, px, py + 2, 22, 'rgba(255,255,255,0.7)');
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '500 24px "Segoe UI", Arial, sans-serif';
        ctx.fillText(data.ubicacion, px + 30, py);
        py += 40;
      }

      // Features
      if (options.showFeatures) {
        drawFeaturesInline(ctx, data, px, py, 'rgba(255,255,255,0.75)', 22);
        py += 35;
      }

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = primary;
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w / 2, py + 10);
        ctx.textAlign = 'left';
      }

      // Swipe up
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = '400 18px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText('↑ Desliza para más info', w / 2, h - 20);
      ctx.textAlign = 'left';
    },
  },

  // 4. TARJETA — Image top, clean info below, glass badges
  {
    id: 'tarjeta',
    name: 'Tarjeta',
    description: 'Diseño tipo tarjeta limpio y profesional',
    icon: '📋',
    defaultFormat: 'square',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#2563eb';

      // Fondo blanco
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      const cp = 40;
      const imgH = h * 0.58;

      // Imagen con esquinas redondeadas
      ctx.save();
      roundRect(ctx, cp, cp, w - cp * 2, imgH, 20);
      ctx.clip();
      drawFullImage(ctx, propertyImage, w - cp * 2, imgH);
      // offset draw
      ctx.restore();

      // Re-draw clipped
      ctx.save();
      roundRect(ctx, cp, cp, w - cp * 2, imgH, 20);
      ctx.clip();
      const sc = Math.max((w - cp * 2) / propertyImage.width, imgH / propertyImage.height);
      const iw = propertyImage.width * sc;
      const ih = propertyImage.height * sc;
      ctx.drawImage(propertyImage, cp + (w - cp * 2 - iw) / 2, cp + (imgH - ih) / 2, iw, ih);

      // Overlay sutil para legibilidad de badges
      const igr = ctx.createLinearGradient(0, cp, 0, cp + imgH);
      igr.addColorStop(0, 'rgba(0,0,0,0.15)');
      igr.addColorStop(0.5, 'rgba(0,0,0,0)');
      igr.addColorStop(1, 'rgba(0,0,0,0.25)');
      ctx.fillStyle = igr;
      ctx.fillRect(cp, cp, w - cp * 2, imgH);
      ctx.restore();

      // Badge glass sobre imagen
      if (options.showBadge && options.badgeText) {
        ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
        const bw = ctx.measureText(options.badgeText.toUpperCase()).width + 30;
        ctx.fillStyle = primary;
        roundRect(ctx, cp + 18, cp + 18, bw, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.badgeText.toUpperCase(), cp + 18 + bw / 2, cp + 35);
        ctx.textAlign = 'left';
      }

      // Custom title sobre imagen
      if (options.customTitle) {
        ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
        const tw = ctx.measureText(options.customTitle).width + 40;
        drawGlassPanel(ctx, (w - tw) / 2, cp + imgH - 60, tw, 44, 22, 0.65);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.customTitle, w / 2, cp + imgH - 38);
        ctx.textAlign = 'left';
      }

      // Logo esquina inferior derecha de imagen
      if (logoImg) {
        const logoH = 40;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        drawGlassPanel(ctx, w - cp - logoW - 28, cp + imgH - logoH - 26, logoW + 16, logoH + 12, 8, 0.7, '255,255,255');
        ctx.drawImage(logoImg, w - cp - logoW - 20, cp + imgH - logoH - 20, logoW, logoH);
      }

      // Info area
      const infoY = cp + imgH + 25;
      const ix = cp + 20;

      // Tipo
      ctx.fillStyle = primary;
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), ix, infoY);

      // Custom subtitle
      if (options.customSubtitle) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 18px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(options.customSubtitle, w - cp - 20, infoY + 2);
        ctx.textAlign = 'left';
      }

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 44px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), ix, infoY + 32);
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        drawLocationIcon(ctx, ix, infoY + 92, 20, '#94a3b8');
        ctx.fillStyle = '#64748b';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(data.ubicacion, ix + 28, infoY + 92);
      }

      // Features barra inferior
      if (options.showFeatures) {
        const fy = h - cp - 60;
        ctx.fillStyle = '#f1f5f9';
        roundRect(ctx, cp, fy - 8, w - cp * 2, 60, 12);
        ctx.fill();
        ctx.textAlign = 'center';
        drawFeaturesInline(ctx, data, w / 2, fy + 14, '#475569', 20);
        ctx.textAlign = 'left';
      }

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 18px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - cp - 20, infoY + 95);
        ctx.textAlign = 'left';
      }
    },
  },

  // 5. BANNER — Horizontal, full image, slim glass bottom bar
  {
    id: 'banner',
    name: 'Banner',
    description: 'Horizontal para web, Facebook y portales',
    icon: '🖼️',
    defaultFormat: 'landscape',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#059669';

      // Imagen full-bleed
      drawFullImage(ctx, propertyImage, w, h);

      // Overlay gradiente
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.1)');
      grad.addColorStop(0.5, 'rgba(0,0,0,0)');
      grad.addColorStop(0.8, 'rgba(0,0,0,0.3)');
      grad.addColorStop(1, 'rgba(0,0,0,0.7)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pad = 40;

      // Logo top-left
      if (logoImg) {
        const logoH = 45;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        drawGlassPanel(ctx, pad - 8, pad - 8, logoW + 16, logoH + 16, 10, 0.45);
        ctx.drawImage(logoImg, pad, pad, logoW, logoH);
      }

      // Badge
      if (options.showBadge && options.badgeText) {
        ctx.font = 'bold 18px "Segoe UI", Arial, sans-serif';
        const bw = ctx.measureText(options.badgeText.toUpperCase()).width + 30;
        ctx.fillStyle = primary;
        roundRect(ctx, w - pad - bw, pad, bw, 34, 17);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.badgeText.toUpperCase(), w - pad - bw / 2, pad + 17);
        ctx.textAlign = 'left';
      }

      // Custom title top center
      if (options.customTitle) {
        ctx.font = 'bold 30px "Segoe UI", Arial, sans-serif';
        const tw = ctx.measureText(options.customTitle).width + 48;
        drawGlassPanel(ctx, (w - tw) / 2, pad, tw, 48, 24, 0.6);
        ctx.fillStyle = '#fff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.customTitle, w / 2, pad + 24);
        ctx.textAlign = 'left';
      }

      // Barra glass inferior
      const barH = 100;
      const barY = h - barH;
      drawGlassPanel(ctx, 0, barY, w, barH, 0, 0.55);

      // Línea primaria arriba de la barra
      ctx.fillStyle = primary;
      ctx.fillRect(0, barY, w, 3);

      const bx = pad;
      const by = barY + 20;

      // Tipo
      ctx.fillStyle = primary;
      ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), bx, by);

      // Subtitle
      if (options.customSubtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        ctx.font = '500 16px "Segoe UI", Arial, sans-serif';
        const typeW = ctx.measureText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase()).width;
        ctx.font = '500 16px "Segoe UI", Arial, sans-serif';
        ctx.fillText(options.customSubtitle, bx + typeW + 16, by + 3);
      }

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 40px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), bx, by + 30);
      }

      // Ubicación centrado
      if (options.showLocation && data.ubicacion) {
        const ux = w / 2;
        drawLocationIcon(ctx, ux - 12, by + 35, 20, 'rgba(255,255,255,0.6)');
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(data.ubicacion, ux + 16, by + 35);
        ctx.textAlign = 'left';
      }

      // Features derecha
      if (options.showFeatures) {
        ctx.textAlign = 'right';
        drawFeaturesInline(ctx, data, w - pad, by + 38, 'rgba(255,255,255,0.8)', 20);
        ctx.textAlign = 'left';
      }

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - pad, by);
        ctx.textAlign = 'left';
      }
    },
  },

  // 6. OFERTA — Full image, accent color overlays, diagonal ribbon
  {
    id: 'oferta',
    name: 'Oferta',
    description: 'Ideal para descuentos y promociones',
    icon: '💰',
    defaultFormat: 'square',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#dc2626';
      const accent = '#fbbf24';

      // Imagen full-bleed
      drawFullImage(ctx, propertyImage, w, h);

      // Overlay oscuro
      const grad = ctx.createLinearGradient(0, 0, 0, h);
      grad.addColorStop(0, 'rgba(0,0,0,0.3)');
      grad.addColorStop(0.4, 'rgba(0,0,0,0.1)');
      grad.addColorStop(0.7, 'rgba(0,0,0,0.35)');
      grad.addColorStop(1, 'rgba(0,0,0,0.8)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      const pad = 50;

      // Ribbon diagonal
      ctx.save();
      ctx.translate(w - 130, 65);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = primary;
      ctx.shadowColor = 'rgba(0,0,0,0.4)';
      ctx.shadowBlur = 10;
      ctx.fillRect(-160, -22, 320, 44);
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.badgeText || '¡OFERTA!', 0, 0);
      ctx.restore();

      // Logo
      if (logoImg) {
        const logoH = 45;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        drawGlassPanel(ctx, pad - 8, pad - 8, logoW + 16, logoH + 16, 10, 0.45);
        ctx.drawImage(logoImg, pad, pad, logoW, logoH);
      }

      // Custom title grande
      if (options.customTitle) {
        ctx.fillStyle = accent;
        ctx.font = 'bold 38px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'top';
        drawTextWithShadow(ctx, options.customTitle, pad, pad + 80);
      }

      if (options.customSubtitle) {
        ctx.fillStyle = 'rgba(255,255,255,0.7)';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.textBaseline = 'top';
        ctx.fillText(options.customSubtitle, pad, pad + 125);
      }

      // Contenido inferior glass
      const panelH = 160;
      const panelY = h - panelH - pad;
      drawGlassPanel(ctx, pad, panelY, w - pad * 2, panelH, 20, 0.55);

      const px = pad + 25;
      let py = panelY + 22;

      // Tipo
      ctx.fillStyle = accent;
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), px, py);
      py += 32;

      // Precio GRANDE
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), px, py);
        py += 60;
      }

      // Ubicación + Features
      if (options.showLocation && data.ubicacion) {
        drawLocationIcon(ctx, px, py + 2, 20, accent);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(data.ubicacion, px + 28, py);
      }
      if (options.showFeatures) {
        ctx.textAlign = 'right';
        drawFeaturesInline(ctx, data, w - pad - 25, py, 'rgba(255,255,255,0.75)', 20);
        ctx.textAlign = 'left';
      }

      // CTA
      if (options.ctaText) {
        const cw = 220;
        const ch = 48;
        const cx = w - pad - cw - 25;
        const cy = panelY - ch - 15;
        ctx.fillStyle = accent;
        ctx.shadowColor = 'rgba(0,0,0,0.3)';
        ctx.shadowBlur = 8;
        roundRect(ctx, cx, cy, cw, ch, 24);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#1e1e1e';
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.ctaText, cx + cw / 2, cy + ch / 2);
        ctx.textAlign = 'left';
      }

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.font = '500 18px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - pad, panelY - 8);
        ctx.textAlign = 'left';
      }
    },
  },
];

// ============================================
// COMPONENTE PRINCIPAL
// ============================================

const CrmMarketingImageConverter: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Estados principales
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [dataMode, setDataMode] = useState<DataMode>('property');

  // Datos del negocio
  const [colores, setColores] = useState<TemaColores | null>(null);
  const [infoNegocio, setInfoNegocio] = useState<InfoNegocio | null>(null);
  const [logoImage, setLogoImage] = useState<HTMLImageElement | null>(null);

  // Propiedades
  const [propiedades, setPropiedades] = useState<Propiedad[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProperty, setSelectedProperty] = useState<Propiedad | null>(null);

  // Datos manuales
  const [manualData, setManualData] = useState<ManualData>({
    titulo: '',
    tipo: 'casa',
    operacion: 'venta',
    precio: '',
    moneda: 'USD',
    ubicacion: '',
    habitaciones: '',
    banos: '',
    estacionamientos: '',
    metros: '',
  });

  // Imagen y plantilla
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [propertyImage, setPropertyImage] = useState<HTMLImageElement | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [selectedTemplate, setSelectedTemplate] = useState<PropertyTemplate>(propertyTemplates[0]);
  const [outputFormat, setOutputFormat] = useState<OutputFormat>('landscape');
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  // Opciones de plantilla
  const [templateOptions, setTemplateOptions] = useState<TemplateOptions>({
    showPrice: true,
    showFeatures: true,
    showLocation: true,
    showBadge: false,
    badgeText: 'EXCLUSIVA',
    ctaText: 'Consulta Ahora',
    customTitle: '',
    customSubtitle: '',
  });

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Generador de Artes',
      subtitle: 'Crea artes profesionales de marketing inmobiliario',
    });
  }, [setPageHeader]);

  // Cargar imagen como base64 usando proxy para CORS
  const loadImageAsBase64 = useCallback(async (url: string): Promise<string | null> => {
    try {
      const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      const isExternal = url.startsWith('http://') || url.startsWith('https://');

      // Usar proxy para todas las URLs externas (evita CORS)
      let fetchUrl = url;
      if (isExternal && tenantActual?.id) {
        fetchUrl = `${apiBase}/tenants/${tenantActual.id}/upload/proxy-image?url=${encodeURIComponent(url)}`;
      }

      console.log('[ImageConverter] Loading image:', { original: url, fetch: fetchUrl });
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        console.warn('[ImageConverter] Image fetch failed:', response.status, response.statusText);
        return null;
      }

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch (err) {
      console.error('[ImageConverter] Error loading image:', err);
      return null;
    }
  }, [tenantActual?.id]);

  // Helpers para InfoNegocio
  const getLogoUrl = (info: InfoNegocio): string | null => {
    const fields = ['logo', 'logo_url', 'logoUrl'];
    for (const field of fields) {
      if ((info as any)[field]) return (info as any)[field];
    }
    return null;
  };

  const getTelefono = (info: InfoNegocio): string | null => {
    return (info as any).contacto?.telefono || info.telefono_principal || null;
  };

  const getWhatsapp = (info: InfoNegocio): string | null => {
    return (info as any).contacto?.whatsapp || info.whatsapp || null;
  };

  const getNombreComercial = (info: InfoNegocio): string | null => {
    return (info as any).nombreComercial || info.nombre || null;
  };

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      if (!tenantActual?.id) return;

      try {
        const token = await getToken();

        const [temaData, infoData, propsResponse] = await Promise.all([
          getTema(tenantActual.id).catch(() => null),
          getInfoNegocio(tenantActual.id, token).catch(() => null),
          apiFetch(`/tenants/${tenantActual.id}/propiedades?limit=100`).catch(() => null),
        ]);

        if (temaData) setColores(temaData);

        if (infoData) {
          setInfoNegocio(infoData);
          const logoUrl = getLogoUrl(infoData);
          if (logoUrl) {
            const base64 = await loadImageAsBase64(logoUrl);
            if (base64) {
              const img = new window.Image();
              img.onload = () => setLogoImage(img);
              img.src = base64;
            }
          }
        }

        if (propsResponse) {
          const propsData = await propsResponse.json();
          console.log('Propiedades cargadas:', propsData);
          if (propsData?.propiedades) {
            setPropiedades(propsData.propiedades);
          } else if (Array.isArray(propsData?.data)) {
            setPropiedades(propsData.data);
          } else if (Array.isArray(propsData)) {
            setPropiedades(propsData);
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [tenantActual?.id, getToken, loadImageAsBase64]);

  // Filtrar propiedades
  const filteredProperties = propiedades.filter((p) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      p.titulo?.toLowerCase().includes(query) ||
      p.codigo?.toLowerCase().includes(query) ||
      p.codigo_publico?.toString().includes(query) ||
      p.ciudad?.toLowerCase().includes(query) ||
      p.sector?.toLowerCase().includes(query)
    );
  });

  // Obtener todas las imágenes de una propiedad (sin duplicados)
  const getPropertyImages = (prop: Propiedad): string[] => {
    const images: string[] = [];
    if (prop.imagen_principal) images.push(prop.imagen_principal);
    if (prop.imagenes) {
      for (const img of prop.imagenes) {
        if (img && !images.includes(img)) images.push(img);
      }
    }
    return images;
  };

  // Cargar imagen seleccionada de la galería
  const [imageLoading, setImageLoading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const loadPropertyImage = async (url: string) => {
    setImageLoading(true);
    setImageError(null);
    console.log('[ImageConverter] loadPropertyImage:', url);

    // Estrategia 1: Cargar directamente con CORS (rápido, sin proxy)
    const tryDirectCORS = (): Promise<HTMLImageElement> =>
      new Promise((resolve, reject) => {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          // Verificar que canvas puede acceder a la imagen (no tainted)
          try {
            const testCanvas = document.createElement('canvas');
            testCanvas.width = 1;
            testCanvas.height = 1;
            const ctx = testCanvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(img, 0, 0, 1, 1);
              testCanvas.toDataURL(); // Lanza error si está tainted
            }
            resolve(img);
          } catch {
            reject(new Error('Canvas tainted'));
          }
        };
        img.onerror = () => reject(new Error('Direct CORS load failed'));
        img.src = url;
      });

    // Estrategia 2: Cargar via proxy del backend
    const tryProxy = async (): Promise<HTMLImageElement> => {
      const base64 = await loadImageAsBase64(url);
      if (!base64) throw new Error('Proxy returned null');
      return new Promise((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Base64 image failed'));
        img.src = base64;
      });
    };

    // Intentar ambas estrategias
    let loadedImg: HTMLImageElement | null = null;

    try {
      console.log('[ImageConverter] Trying direct CORS load...');
      loadedImg = await tryDirectCORS();
      console.log('[ImageConverter] Direct CORS load succeeded');
    } catch (e) {
      console.log('[ImageConverter] Direct CORS failed:', (e as Error).message, '- trying proxy...');
      try {
        loadedImg = await tryProxy();
        console.log('[ImageConverter] Proxy load succeeded');
      } catch (e2) {
        console.error('[ImageConverter] Proxy also failed:', (e2 as Error).message);
      }
    }

    if (loadedImg) {
      setPropertyImage(loadedImg);
      setUploadedImage(loadedImg.src);
      setGeneratedImage(null);
      setImageLoading(false);
    } else {
      setImageLoading(false);
      setImageError('No se pudo cargar la imagen');
    }
  };

  // Manejar selección de propiedad
  const handleSelectProperty = async (prop: Propiedad) => {
    setSelectedProperty(prop);
    setSelectedImageIndex(0);
    setGeneratedImage(null);
    setPropertyImage(null);
    setUploadedImage(null);

    // Auto-cargar la primera imagen
    const images = getPropertyImages(prop);
    console.log('[ImageConverter] Property selected:', prop.titulo, '- Images found:', images.length, images);
    if (images.length > 0) {
      await loadPropertyImage(images[0]);
    } else {
      setImageError('Esta propiedad no tiene imágenes');
    }
  };

  // Manejar selección de imagen de la galería
  const handleSelectPropertyImage = async (index: number) => {
    if (!selectedProperty) return;
    const images = getPropertyImages(selectedProperty);
    if (index < 0 || index >= images.length) return;

    setSelectedImageIndex(index);
    await loadPropertyImage(images[index]);
  };

  // Manejar subida de imagen manual
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setUploadedImage(base64);

      const img = new window.Image();
      img.onload = () => setPropertyImage(img);
      img.src = base64;
    };
    reader.readAsDataURL(file);
  };

  // Generar imagen
  const generateImage = useCallback(() => {
    if (!propertyImage || !canvasRef.current) return;

    setProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setProcessing(false); return; }

    // Configurar tamaño según formato
    const sizes: Record<OutputFormat, { w: number; h: number }> = {
      square: { w: 1080, h: 1080 },
      story: { w: 1080, h: 1920 },
      landscape: { w: 1920, h: 1080 },
    };
    const { w, h } = sizes[outputFormat];
    canvas.width = w;
    canvas.height = h;

    // Preparar datos
    const propertyData = dataMode === 'property' && selectedProperty
      ? {
          titulo: selectedProperty.titulo || '',
          tipo: selectedProperty.tipo || 'casa',
          operacion: selectedProperty.operacion || 'venta',
          precio: selectedProperty.precio || 0,
          moneda: selectedProperty.moneda || 'USD',
          ubicacion: [selectedProperty.sector, selectedProperty.ciudad].filter(Boolean).join(', '),
          habitaciones: selectedProperty.habitaciones || 0,
          banos: selectedProperty.banos || 0,
          estacionamientos: selectedProperty.estacionamientos || 0,
          metros: selectedProperty.m2_construccion || selectedProperty.m2_terreno || 0,
          destacada: selectedProperty.destacada,
          exclusiva: selectedProperty.exclusiva,
        }
      : {
          titulo: manualData.titulo,
          tipo: manualData.tipo,
          operacion: manualData.operacion,
          precio: parseFloat(manualData.precio) || 0,
          moneda: manualData.moneda,
          ubicacion: manualData.ubicacion,
          habitaciones: parseInt(manualData.habitaciones) || 0,
          banos: parseInt(manualData.banos) || 0,
          estacionamientos: parseInt(manualData.estacionamientos) || 0,
          metros: parseInt(manualData.metros) || 0,
        };

    const contactInfo = {
      telefono: infoNegocio ? getTelefono(infoNegocio) : null,
      whatsapp: infoNegocio ? getWhatsapp(infoNegocio) : null,
      nombre: infoNegocio ? getNombreComercial(infoNegocio) : null,
    };

    // Renderizar plantilla
    selectedTemplate.render(
      ctx,
      canvas,
      propertyImage,
      logoImage,
      colores,
      contactInfo,
      propertyData,
      templateOptions
    );

    // Generar imagen final
    setGeneratedImage(canvas.toDataURL('image/jpeg', 0.95));
    setProcessing(false);
  }, [propertyImage, selectedTemplate, outputFormat, templateOptions, dataMode, selectedProperty, manualData, infoNegocio, logoImage, colores]);

  // Auto-generar cuando cambia la imagen, plantilla, formato u opciones
  useEffect(() => {
    if (propertyImage) {
      generateImage();
    }
  }, [generateImage]);

  // Descargar imagen
  const downloadImage = () => {
    if (!generatedImage) return;
    const link = document.createElement('a');
    link.download = `arte-${selectedTemplate.id}-${Date.now()}.jpg`;
    link.href = generatedImage;
    link.click();
  };

  // Cambiar plantilla
  const handleTemplateChange = (template: PropertyTemplate) => {
    setSelectedTemplate(template);
    setOutputFormat(template.defaultFormat);
    setGeneratedImage(null);
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '60vh' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite' }} />
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`${basePath}/marketing/branding`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            background: 'none',
            border: 'none',
            color: '#64748b',
            fontSize: '14px',
            cursor: 'pointer',
            padding: '8px 0',
          }}
        >
          <ArrowLeft size={18} />
          Volver a Creativos
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr 300px', gap: '24px' }}>
        {/* Panel Izquierdo - Datos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selector de modo */}
          <div style={{ background: '#f1f5f9', borderRadius: '12px', padding: '4px', display: 'flex' }}>
            <button
              onClick={() => setDataMode('property')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: dataMode === 'property' ? '#ffffff' : 'transparent',
                color: dataMode === 'property' ? '#1e293b' : '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: dataMode === 'property' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Home size={16} />
              Propiedad
            </button>
            <button
              onClick={() => setDataMode('manual')}
              style={{
                flex: 1,
                padding: '10px',
                border: 'none',
                borderRadius: '8px',
                background: dataMode === 'manual' ? '#ffffff' : 'transparent',
                color: dataMode === 'manual' ? '#1e293b' : '#64748b',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                boxShadow: dataMode === 'manual' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
            >
              <Edit3 size={16} />
              Manual
            </button>
          </div>

          {dataMode === 'property' ? (
            // Selector de propiedad
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                overflow: 'hidden',
              }}
            >
              <div style={{ padding: '16px', borderBottom: '1px solid #e2e8f0' }}>
                <div style={{ position: 'relative' }}>
                  <Search
                    size={18}
                    style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    type="text"
                    placeholder="Buscar propiedad..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '10px 12px 10px 40px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                      outline: 'none',
                    }}
                  />
                </div>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px', marginBottom: 0 }}>
                  {propiedades.length} propiedades disponibles
                </p>
              </div>

              <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
                {filteredProperties.length === 0 ? (
                  <div style={{ padding: '40px 20px', textAlign: 'center', color: '#64748b' }}>
                    <Building2 size={40} style={{ opacity: 0.3, marginBottom: '12px' }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>
                      {propiedades.length === 0 ? 'No hay propiedades cargadas' : 'No se encontraron resultados'}
                    </p>
                  </div>
                ) : (
                  filteredProperties.slice(0, 20).map((prop) => (
                    <div
                      key={prop.id}
                      onClick={() => handleSelectProperty(prop)}
                      style={{
                        padding: '12px 16px',
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        background: selectedProperty?.id === prop.id ? '#f0f9ff' : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background 0.2s',
                      }}
                    >
                      {prop.imagen_principal ? (
                        <img
                          src={prop.imagen_principal}
                          alt=""
                          style={{ width: '50px', height: '50px', borderRadius: '8px', objectFit: 'cover' }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '8px',
                            background: '#f1f5f9',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Image size={20} color="#94a3b8" />
                        </div>
                      )}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p
                          style={{
                            margin: 0,
                            fontSize: '13px',
                            fontWeight: 600,
                            color: '#1e293b',
                            whiteSpace: 'nowrap',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                          }}
                        >
                          {prop.titulo}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#64748b' }}>
                          {prop.codigo_publico ? `#${prop.codigo_publico}` : prop.codigo || ''} • {prop.ciudad || 'Sin ubicación'}
                        </p>
                        <p style={{ margin: '2px 0 0', fontSize: '13px', fontWeight: 600, color: colores?.primary || '#3b82f6' }}>
                          {prop.precio ? formatPrice(prop.precio, prop.moneda || 'USD') : 'Consultar'}
                        </p>
                      </div>
                      {selectedProperty?.id === prop.id && <Check size={18} color="#3b82f6" />}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : (
            // Formulario manual
            <div
              style={{
                background: '#ffffff',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                padding: '20px',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                    Tipo de propiedad
                  </label>
                  <select
                    value={manualData.tipo}
                    onChange={(e) => setManualData({ ...manualData, tipo: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="casa">Casa</option>
                    <option value="departamento">Departamento</option>
                    <option value="terreno">Terreno</option>
                    <option value="oficina">Oficina</option>
                    <option value="local">Local</option>
                  </select>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                    Operación
                  </label>
                  <select
                    value={manualData.operacion}
                    onChange={(e) => setManualData({ ...manualData, operacion: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  >
                    <option value="venta">Venta</option>
                    <option value="renta">Renta</option>
                    <option value="traspaso">Traspaso</option>
                  </select>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 80px', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                      Precio
                    </label>
                    <input
                      type="text"
                      placeholder="250,000"
                      value={manualData.precio}
                      onChange={(e) => setManualData({ ...manualData, precio: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                      Moneda
                    </label>
                    <select
                      value={manualData.moneda}
                      onChange={(e) => setManualData({ ...manualData, moneda: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                      }}
                    >
                      <option value="USD">USD</option>
                      <option value="MXN">MXN</option>
                      <option value="DOP">DOP</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                    Ubicación
                  </label>
                  <input
                    type="text"
                    placeholder="Colonia, Ciudad"
                    value={manualData.ubicacion}
                    onChange={(e) => setManualData({ ...manualData, ubicacion: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '14px',
                    }}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                      Hab.
                    </label>
                    <input
                      type="text"
                      placeholder="3"
                      value={manualData.habitaciones}
                      onChange={(e) => setManualData({ ...manualData, habitaciones: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                      Baños
                    </label>
                    <input
                      type="text"
                      placeholder="2"
                      value={manualData.banos}
                      onChange={(e) => setManualData({ ...manualData, banos: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                      Est.
                    </label>
                    <input
                      type="text"
                      placeholder="2"
                      value={manualData.estacionamientos}
                      onChange={(e) => setManualData({ ...manualData, estacionamientos: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '4px', display: 'block' }}>
                      m²
                    </label>
                    <input
                      type="text"
                      placeholder="180"
                      value={manualData.metros}
                      onChange={(e) => setManualData({ ...manualData, metros: e.target.value.replace(/[^0-9]/g, '') })}
                      style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #e2e8f0',
                        borderRadius: '8px',
                        fontSize: '14px',
                        textAlign: 'center',
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Imagen - Galería de propiedad o subida manual */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 12px 0' }}>
              Imagen
            </h3>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />

            {/* Galería de imágenes de la propiedad seleccionada */}
            {dataMode === 'property' && selectedProperty && getPropertyImages(selectedProperty).length > 1 && (
              <div style={{ marginBottom: '12px' }}>
                <p style={{ fontSize: '12px', color: '#64748b', margin: '0 0 8px 0' }}>
                  {getPropertyImages(selectedProperty).length} imágenes disponibles
                </p>
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                  }}
                >
                  {getPropertyImages(selectedProperty).map((imgUrl, idx) => (
                    <div
                      key={idx}
                      onClick={() => handleSelectPropertyImage(idx)}
                      style={{
                        position: 'relative',
                        width: '100%',
                        paddingBottom: '100%',
                        borderRadius: '8px',
                        overflow: 'hidden',
                        cursor: 'pointer',
                        border: selectedImageIndex === idx ? '2px solid ' + (colores?.primary || '#3b82f6') : '2px solid transparent',
                        boxShadow: selectedImageIndex === idx ? '0 0 0 1px ' + (colores?.primary || '#3b82f6') : 'none',
                      }}
                    >
                      <img
                        src={imgUrl}
                        alt={`Imagen ${idx + 1}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          opacity: selectedImageIndex === idx ? 1 : 0.7,
                          transition: 'opacity 0.2s',
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.opacity = '1'; }}
                        onMouseLeave={(e) => {
                          if (selectedImageIndex !== idx) e.currentTarget.style.opacity = '0.7';
                        }}
                      />
                      {selectedImageIndex === idx && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '20px',
                            height: '20px',
                            borderRadius: '50%',
                            background: colores?.primary || '#3b82f6',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <Check size={12} color="#fff" />
                        </div>
                      )}
                      {idx === 0 && (
                        <div
                          style={{
                            position: 'absolute',
                            bottom: '4px',
                            left: '4px',
                            padding: '2px 6px',
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: '4px',
                            fontSize: '9px',
                            color: '#fff',
                            fontWeight: 600,
                          }}
                        >
                          Principal
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Imagen seleccionada o subida */}
            {uploadedImage ? (
              <div>
                <img
                  src={uploadedImage}
                  alt="Preview"
                  style={{ width: '100%', height: '140px', objectFit: 'cover', borderRadius: '12px', marginBottom: '12px' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: '#f1f5f9',
                    border: 'none',
                    borderRadius: '8px',
                    color: '#64748b',
                    fontSize: '13px',
                    cursor: 'pointer',
                  }}
                >
                  Subir otra imagen
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                style={{
                  border: '2px dashed #e2e8f0',
                  borderRadius: '12px',
                  padding: '30px 20px',
                  textAlign: 'center',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <Upload size={32} color="#94a3b8" style={{ marginBottom: '8px' }} />
                <p style={{ margin: 0, fontSize: '13px', color: '#64748b' }}>
                  {dataMode === 'property' ? 'Selecciona una propiedad o sube una imagen' : 'Haz clic para subir imagen'}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Panel Central - Preview */}
        <div
          style={{
            background: '#ffffff',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Vista Previa
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={generateImage}
                disabled={!propertyImage || processing}
                style={{
                  padding: '10px 20px',
                  background: colores?.primary || '#3b82f6',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  cursor: propertyImage && !processing ? 'pointer' : 'not-allowed',
                  opacity: propertyImage && !processing ? 1 : 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {processing ? <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Sparkles size={16} />}
                {generatedImage ? 'Regenerar' : 'Generar'}
              </button>

              {generatedImage && (
                <button
                  onClick={downloadImage}
                  style={{
                    padding: '10px 20px',
                    background: '#10b981',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <Download size={16} />
                  Descargar
                </button>
              )}
            </div>
          </div>

          {/* Área de preview */}
          <div
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: '#f8fafc',
              borderRadius: '12px',
              minHeight: '400px',
              overflow: 'hidden',
            }}
          >
            {generatedImage ? (
              <img
                src={generatedImage}
                alt="Generated"
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  borderRadius: '8px',
                  boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                }}
              />
            ) : imageLoading ? (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={48} style={{ opacity: 0.5, marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Cargando imagen...</p>
              </div>
            ) : imageError ? (
              <div style={{ textAlign: 'center', color: '#ef4444' }}>
                <AlertCircle size={48} style={{ opacity: 0.5, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>{imageError}</p>
                <p style={{ margin: '8px 0 0', fontSize: '12px', color: '#94a3b8' }}>
                  Intenta subir la imagen manualmente
                </p>
              </div>
            ) : propertyImage ? (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <Loader2 size={48} style={{ opacity: 0.3, marginBottom: '12px', animation: 'spin 1s linear infinite' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Generando arte...</p>
              </div>
            ) : (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <Image size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Selecciona una propiedad o sube una imagen</p>
              </div>
            )}
          </div>

          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Panel Derecho - Opciones */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Selector de plantilla */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
              Plantilla
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px' }}>
              {propertyTemplates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => handleTemplateChange(template)}
                  style={{
                    padding: '12px',
                    borderRadius: '10px',
                    border: `2px solid ${selectedTemplate.id === template.id ? colores?.primary || '#3b82f6' : '#e2e8f0'}`,
                    background: selectedTemplate.id === template.id ? `${colores?.primary || '#3b82f6'}10` : '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: '24px' }}>{template.icon}</span>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                    {template.name}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Formato */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 12px 0' }}>
              Formato
            </h3>

            <div style={{ display: 'flex', gap: '8px' }}>
              {[
                { id: 'square', label: 'Cuadrado', icon: <Square size={16} />, desc: '1080x1080' },
                { id: 'story', label: 'Story', icon: <Smartphone size={16} />, desc: '1080x1920' },
                { id: 'landscape', label: 'Horizontal', icon: <Monitor size={16} />, desc: '1920x1080' },
              ].map((fmt) => (
                <button
                  key={fmt.id}
                  onClick={() => setOutputFormat(fmt.id as OutputFormat)}
                  style={{
                    flex: 1,
                    padding: '10px 8px',
                    border: `2px solid ${outputFormat === fmt.id ? colores?.primary || '#3b82f6' : '#e2e8f0'}`,
                    borderRadius: '10px',
                    background: outputFormat === fmt.id ? `${colores?.primary || '#3b82f6'}10` : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  <span style={{ color: outputFormat === fmt.id ? colores?.primary || '#3b82f6' : '#64748b' }}>{fmt.icon}</span>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: '#1e293b' }}>{fmt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Opciones de plantilla */}
          <div
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              padding: '20px',
            }}
          >
            <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: '0 0 16px 0' }}>
              Opciones
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {[
                { key: 'showPrice', label: 'Mostrar precio' },
                { key: 'showFeatures', label: 'Mostrar características' },
                { key: 'showLocation', label: 'Mostrar ubicación' },
                { key: 'showBadge', label: 'Mostrar badge' },
              ].map((opt) => (
                <label
                  key={opt.key}
                  style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                >
                  <input
                    type="checkbox"
                    checked={templateOptions[opt.key as keyof TemplateOptions] as boolean}
                    onChange={(e) => setTemplateOptions({ ...templateOptions, [opt.key]: e.target.checked })}
                    style={{ width: '18px', height: '18px', accentColor: colores?.primary || '#3b82f6' }}
                  />
                  <span style={{ fontSize: '13px', color: '#374151' }}>{opt.label}</span>
                </label>
              ))}

              {templateOptions.showBadge && (
                <div style={{ marginTop: '8px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                    Texto del badge
                  </label>
                  <select
                    value={templateOptions.badgeText}
                    onChange={(e) => setTemplateOptions({ ...templateOptions, badgeText: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                    }}
                  >
                    <option value="EXCLUSIVA">EXCLUSIVA</option>
                    <option value="NUEVA">NUEVA</option>
                    <option value="OPORTUNIDAD">OPORTUNIDAD</option>
                    <option value="REBAJADA">REBAJADA</option>
                    <option value="PREMIUM">PREMIUM</option>
                  </select>
                </div>
              )}

              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                  Título personalizado
                </label>
                <input
                  type="text"
                  value={templateOptions.customTitle}
                  onChange={(e) => setTemplateOptions({ ...templateOptions, customTitle: e.target.value })}
                  placeholder="Ej: Inversión Premium"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                  Subtítulo personalizado
                </label>
                <input
                  type="text"
                  value={templateOptions.customSubtitle}
                  onChange={(e) => setTemplateOptions({ ...templateOptions, customSubtitle: e.target.value })}
                  placeholder="Ej: Entrega inmediata"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
              </div>

              <div style={{ marginTop: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', marginBottom: '6px', display: 'block' }}>
                  Texto del CTA
                </label>
                <input
                  type="text"
                  value={templateOptions.ctaText}
                  onChange={(e) => setTemplateOptions({ ...templateOptions, ctaText: e.target.value })}
                  placeholder="Consulta Ahora"
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #e2e8f0',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
              </div>
            </div>
          </div>

          {/* Info del branding */}
          <div
            style={{
              background: '#f8fafc',
              borderRadius: '12px',
              padding: '16px',
              fontSize: '12px',
              color: '#64748b',
            }}
          >
            <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Branding aplicado:</p>
            {logoImage ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <img src={logoImage.src} alt="Logo" style={{ maxWidth: '60px', maxHeight: '30px' }} />
                <Check size={14} color="#16a34a" />
              </div>
            ) : (
              <p style={{ fontSize: '11px', color: '#f59e0b', margin: 0 }}>Sin logo configurado</p>
            )}
            <div style={{ display: 'flex', gap: '6px', marginTop: '8px' }}>
              <div
                style={{ width: '20px', height: '20px', borderRadius: '4px', background: colores?.primary || '#3b82f6' }}
                title="Primario"
              />
              <div
                style={{ width: '20px', height: '20px', borderRadius: '4px', background: colores?.secondary || '#64748b' }}
                title="Secundario"
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CrmMarketingImageConverter;
