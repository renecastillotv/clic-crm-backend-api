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
  MapPin,
  Check,
  Building2,
  Bed,
  Bath,
  Car,
  Ruler,
  Phone,
  Tag,
  Sparkles,
  FileImage,
  Smartphone,
  Monitor,
  Square,
  Edit3,
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

// Dibujar ícono de cama (bed) profesional
const drawBedIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size;
  const h = size * 0.7;

  // Base de la cama
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.95);
  ctx.lineTo(x + w, y + h * 0.95);
  ctx.stroke();

  // Patas
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.95);
  ctx.lineTo(x + w * 0.1, y + h);
  ctx.moveTo(x + w * 0.9, y + h * 0.95);
  ctx.lineTo(x + w * 0.9, y + h);
  ctx.stroke();

  // Colchón
  roundRect(ctx, x, y + h * 0.5, w, h * 0.4, size * 0.05);
  ctx.stroke();

  // Cabecera
  roundRect(ctx, x, y, w * 0.3, h * 0.55, size * 0.05);
  ctx.fill();

  // Almohada
  roundRect(ctx, x + w * 0.35, y + h * 0.55, w * 0.25, h * 0.2, size * 0.03);
  ctx.stroke();

  ctx.restore();
};

// Dibujar ícono de baño profesional
const drawBathIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.08;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size;
  const h = size * 0.8;

  // Ducha (cabezal)
  ctx.beginPath();
  ctx.arc(x + w * 0.7, y + h * 0.15, size * 0.12, 0, Math.PI * 2);
  ctx.stroke();

  // Tubo de ducha
  ctx.beginPath();
  ctx.moveTo(x + w * 0.7, y + h * 0.27);
  ctx.lineTo(x + w * 0.7, y + h * 0.45);
  ctx.lineTo(x + w * 0.9, y + h * 0.45);
  ctx.lineTo(x + w * 0.9, y + h * 0.1);
  ctx.stroke();

  // Bañera/base
  ctx.beginPath();
  ctx.moveTo(x, y + h * 0.5);
  ctx.lineTo(x + w, y + h * 0.5);
  ctx.stroke();

  // Tina
  roundRect(ctx, x + w * 0.05, y + h * 0.5, w * 0.9, h * 0.35, size * 0.08);
  ctx.stroke();

  // Patas
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y + h * 0.85);
  ctx.lineTo(x + w * 0.15, y + h);
  ctx.moveTo(x + w * 0.85, y + h * 0.85);
  ctx.lineTo(x + w * 0.85, y + h);
  ctx.stroke();

  ctx.restore();
};

// Dibujar ícono de estacionamiento profesional
const drawCarIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size;
  const h = size * 0.6;

  // Cuerpo del auto
  ctx.beginPath();
  ctx.moveTo(x + w * 0.1, y + h * 0.7);
  ctx.lineTo(x + w * 0.15, y + h * 0.35);
  ctx.lineTo(x + w * 0.3, y + h * 0.1);
  ctx.lineTo(x + w * 0.7, y + h * 0.1);
  ctx.lineTo(x + w * 0.85, y + h * 0.35);
  ctx.lineTo(x + w * 0.9, y + h * 0.7);
  ctx.closePath();
  ctx.stroke();

  // Ventanas
  ctx.beginPath();
  ctx.moveTo(x + w * 0.25, y + h * 0.35);
  ctx.lineTo(x + w * 0.35, y + h * 0.18);
  ctx.lineTo(x + w * 0.65, y + h * 0.18);
  ctx.lineTo(x + w * 0.75, y + h * 0.35);
  ctx.closePath();
  ctx.stroke();

  // Línea divisoria ventanas
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y + h * 0.18);
  ctx.lineTo(x + w * 0.5, y + h * 0.35);
  ctx.stroke();

  // Ruedas
  ctx.beginPath();
  ctx.arc(x + w * 0.25, y + h * 0.8, size * 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(x + w * 0.75, y + h * 0.8, size * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
};

// Dibujar ícono de metros cuadrados profesional
const drawAreaIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = size * 0.07;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  const w = size * 0.85;
  const h = size * 0.85;

  // Cuadrado exterior
  ctx.strokeRect(x, y, w, h);

  // Flechas de medición
  const arrowSize = size * 0.12;

  // Flecha horizontal inferior
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y + h + size * 0.12);
  ctx.lineTo(x + w * 0.85, y + h + size * 0.12);
  ctx.stroke();

  // Puntas flecha horizontal
  ctx.beginPath();
  ctx.moveTo(x + w * 0.15, y + h + size * 0.12);
  ctx.lineTo(x + w * 0.15 + arrowSize, y + h + size * 0.08);
  ctx.moveTo(x + w * 0.15, y + h + size * 0.12);
  ctx.lineTo(x + w * 0.15 + arrowSize, y + h + size * 0.16);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(x + w * 0.85, y + h + size * 0.12);
  ctx.lineTo(x + w * 0.85 - arrowSize, y + h + size * 0.08);
  ctx.moveTo(x + w * 0.85, y + h + size * 0.12);
  ctx.lineTo(x + w * 0.85 - arrowSize, y + h + size * 0.16);
  ctx.stroke();

  ctx.restore();
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

// Dibujar ícono de teléfono profesional
const drawPhoneIcon = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string) => {
  ctx.save();
  ctx.fillStyle = color;

  const w = size * 0.5;
  const h = size * 0.9;

  // Cuerpo del teléfono
  roundRect(ctx, x, y, w, h, size * 0.08);
  ctx.fill();

  // Pantalla (recorte interior)
  ctx.fillStyle = '#ffffff';
  roundRect(ctx, x + w * 0.12, y + h * 0.12, w * 0.76, h * 0.65, size * 0.04);
  ctx.fill();

  // Botón inferior
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(x + w / 2, y + h * 0.88, size * 0.06, 0, Math.PI * 2);
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

// Badge profesional con degradado
const drawBadge = (
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  color: string,
  style: 'pill' | 'ribbon' | 'corner' = 'pill'
) => {
  ctx.save();
  ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
  const textWidth = ctx.measureText(text).width;

  if (style === 'pill') {
    const padding = 20;
    const height = 36;
    const width = textWidth + padding * 2;

    // Sombra
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;

    // Fondo con degradado
    const gradient = ctx.createLinearGradient(x, y, x, y + height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, shadeColor(color, -20));
    ctx.fillStyle = gradient;

    roundRect(ctx, x, y, width, height, height / 2);
    ctx.fill();

    // Texto
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  } else if (style === 'ribbon') {
    const height = 40;
    const width = textWidth + 50;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + width, y);
    ctx.lineTo(x + width + 15, y + height / 2);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + width / 2, y + height / 2 + 1);
  }

  ctx.restore();
};

// Oscurecer/aclarar color
const shadeColor = (color: string, percent: number): string => {
  const num = parseInt(color.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = (num >> 16) + amt;
  const G = ((num >> 8) & 0x00ff) + amt;
  const B = (num & 0x0000ff) + amt;
  return `#${(
    0x1000000 +
    (R < 255 ? (R < 1 ? 0 : R) : 255) * 0x10000 +
    (G < 255 ? (G < 1 ? 0 : G) : 255) * 0x100 +
    (B < 255 ? (B < 1 ? 0 : B) : 255)
  )
    .toString(16)
    .slice(1)}`;
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

const propertyTemplates: PropertyTemplate[] = [
  // 1. ELEGANTE MINIMALISTA
  {
    id: 'elegante',
    name: 'Elegante',
    description: 'Diseño limpio y sofisticado con barra lateral',
    icon: '✨',
    defaultFormat: 'landscape',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#1a1a2e';
      const sidebarWidth = w * 0.35;

      // Imagen principal (lado derecho)
      const imgAreaW = w - sidebarWidth;
      const imgScale = Math.max(imgAreaW / propertyImage.width, h / propertyImage.height);
      const imgW = propertyImage.width * imgScale;
      const imgH = propertyImage.height * imgScale;
      ctx.drawImage(
        propertyImage,
        sidebarWidth + (imgAreaW - imgW) / 2,
        (h - imgH) / 2,
        imgW,
        imgH
      );

      // Overlay suave sobre imagen
      const imgOverlay = ctx.createLinearGradient(sidebarWidth, 0, sidebarWidth + 150, 0);
      imgOverlay.addColorStop(0, 'rgba(0,0,0,0.4)');
      imgOverlay.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = imgOverlay;
      ctx.fillRect(sidebarWidth, 0, 150, h);

      // Sidebar con degradado
      const sideGradient = ctx.createLinearGradient(0, 0, 0, h);
      sideGradient.addColorStop(0, primary);
      sideGradient.addColorStop(1, shadeColor(primary, -30));
      ctx.fillStyle = sideGradient;
      ctx.fillRect(0, 0, sidebarWidth, h);

      // Línea decorativa dorada
      ctx.fillStyle = '#d4af37';
      ctx.fillRect(sidebarWidth - 4, 0, 4, h);

      const padding = 50;
      let yPos = padding + 30;

      // Logo
      if (logoImg) {
        const logoH = 60;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, padding, yPos, Math.min(logoW, sidebarWidth - padding * 2), logoH);
        yPos += logoH + 50;
      }

      // Tipo y operación
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.font = '500 24px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), padding, yPos);
      yPos += 45;

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#d4af37';
        ctx.font = 'bold 52px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), padding, yPos);
        yPos += 70;

        // Línea bajo precio
        ctx.fillStyle = 'rgba(212, 175, 55, 0.3)';
        ctx.fillRect(padding, yPos, sidebarWidth - padding * 2, 2);
        yPos += 40;
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        ctx.fillStyle = '#ffffff';
        ctx.font = '500 26px "Segoe UI", Arial, sans-serif';

        // Ícono de ubicación
        drawLocationIcon(ctx, padding, yPos - 5, 28, '#d4af37');
        ctx.fillText(data.ubicacion, padding + 40, yPos);
        yPos += 60;
      }

      // Características
      if (options.showFeatures) {
        const iconSize = 32;
        const iconColor = '#ffffff';
        const spacing = 75;
        let featX = padding;

        ctx.fillStyle = '#ffffff';
        ctx.font = '600 28px "Segoe UI", Arial, sans-serif';

        if (data.habitaciones > 0) {
          drawBedIcon(ctx, featX, yPos, iconSize, iconColor);
          ctx.fillText(String(data.habitaciones), featX + iconSize + 10, yPos + iconSize * 0.6);
          featX += spacing;
        }
        if (data.banos > 0) {
          drawBathIcon(ctx, featX, yPos, iconSize, iconColor);
          ctx.fillText(String(data.banos), featX + iconSize + 10, yPos + iconSize * 0.6);
          featX += spacing;
        }
        if (data.estacionamientos > 0) {
          drawCarIcon(ctx, featX, yPos, iconSize, iconColor);
          ctx.fillText(String(data.estacionamientos), featX + iconSize + 10, yPos + iconSize * 0.6);
          featX += spacing;
        }
        yPos += iconSize + 50;

        if (data.metros > 0) {
          drawAreaIcon(ctx, padding, yPos, iconSize, iconColor);
          ctx.fillText(`${data.metros} m²`, padding + iconSize + 15, yPos + iconSize * 0.5);
        }
      }

      // Contacto en la parte inferior
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '500 22px "Segoe UI", Arial, sans-serif';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', padding, h - padding);
      }

      // Badge si aplica (en la imagen)
      if (options.showBadge && options.badgeText) {
        drawBadge(ctx, options.badgeText.toUpperCase(), sidebarWidth + 30, 30, data.exclusiva ? '#c41e3a' : '#d4af37', 'pill');
      }
    },
  },

  // 2. MODERNO BOLD
  {
    id: 'moderno',
    name: 'Moderno',
    description: 'Diseño impactante con tipografía grande',
    icon: '🔥',
    defaultFormat: 'square',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#ff6b35';

      // Imagen de fondo completa
      const imgScale = Math.max(w / propertyImage.width, h / propertyImage.height);
      const imgW = propertyImage.width * imgScale;
      const imgH = propertyImage.height * imgScale;
      ctx.drawImage(propertyImage, (w - imgW) / 2, (h - imgH) / 2, imgW, imgH);

      // Overlay degradado dramático
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(0,0,0,0.2)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(0.75, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.95)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      const padding = 50;

      // Badge superior
      if (options.showBadge && options.badgeText) {
        drawBadge(ctx, options.badgeText.toUpperCase(), padding, padding, primary, 'ribbon');
      }

      // Logo esquina superior derecha
      if (logoImg) {
        const logoH = 50;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, w - padding - logoW, padding, logoW, logoH);
      }

      // Contenido inferior
      const bottomY = h - padding;

      // Precio GRANDE
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.textBaseline = 'bottom';
        drawTextWithShadow(ctx, formatPriceFull(data.precio, data.moneda), padding, bottomY - 120);
      }

      // Tipo y operación
      ctx.fillStyle = primary;
      ctx.font = 'bold 28px "Segoe UI", Arial, sans-serif';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), padding, bottomY - 70);

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '500 26px "Segoe UI", Arial, sans-serif';
        drawLocationIcon(ctx, padding, bottomY - 52, 24, primary);
        ctx.fillText(data.ubicacion, padding + 35, bottomY - 35);
      }

      // Características en línea
      if (options.showFeatures) {
        const iconSize = 28;
        const iconColor = 'rgba(255,255,255,0.9)';
        let featX = w - padding;
        ctx.textAlign = 'right';
        ctx.font = '600 24px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';

        const features: string[] = [];
        if (data.habitaciones > 0) features.push(`${data.habitaciones} Hab`);
        if (data.banos > 0) features.push(`${data.banos} Baños`);
        if (data.estacionamientos > 0) features.push(`${data.estacionamientos} Est`);
        if (data.metros > 0) features.push(`${data.metros} m²`);

        ctx.fillText(features.join('  •  '), featX, bottomY - 35);
      }

      // Contacto / CTA
      if (options.ctaText) {
        const ctaWidth = 220;
        const ctaHeight = 50;
        const ctaX = w - padding - ctaWidth;
        const ctaY = bottomY - 130;

        // Fondo del botón
        const btnGradient = ctx.createLinearGradient(ctaX, ctaY, ctaX + ctaWidth, ctaY);
        btnGradient.addColorStop(0, primary);
        btnGradient.addColorStop(1, shadeColor(primary, 20));
        ctx.fillStyle = btnGradient;
        roundRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, 25);
        ctx.fill();

        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.ctaText, ctaX + ctaWidth / 2, ctaY + ctaHeight / 2);
      }
    },
  },

  // 3. STORY VERTICAL
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

      // Imagen de fondo completa
      const imgScale = Math.max(w / propertyImage.width, h / propertyImage.height);
      const imgW = propertyImage.width * imgScale;
      const imgH = propertyImage.height * imgScale;
      ctx.drawImage(propertyImage, (w - imgW) / 2, (h - imgH) / 2, imgW, imgH);

      // Overlay degradado vertical
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(0,0,0,0.6)');
      gradient.addColorStop(0.3, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(0.7, 'rgba(0,0,0,0.1)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.85)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      const padding = 60;

      // Parte superior
      let topY = padding + 40;

      // Logo centrado arriba
      if (logoImg) {
        const logoH = 70;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, (w - logoW) / 2, topY, logoW, logoH);
        topY += logoH + 40;
      }

      // Badge
      if (options.showBadge && options.badgeText) {
        ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
        const badgeWidth = ctx.measureText(options.badgeText.toUpperCase()).width + 50;
        drawBadge(ctx, options.badgeText.toUpperCase(), (w - badgeWidth) / 2, topY, primary, 'pill');
      }

      // Parte inferior
      const bottomPadding = 180;
      let bottomY = h - bottomPadding;

      // Tipo
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.font = '500 28px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), w / 2, bottomY);
      bottomY += 60;

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 64px "Segoe UI", Arial, sans-serif';
        drawTextWithShadow(ctx, formatPriceFull(data.precio, data.moneda), w / 2, bottomY);
        bottomY += 50;
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '500 28px "Segoe UI", Arial, sans-serif';
        ctx.fillText(data.ubicacion, w / 2, bottomY);
        bottomY += 60;
      }

      // Características centradas
      if (options.showFeatures) {
        const iconSize = 32;
        const iconColor = '#ffffff';
        const features: { icon: string; value: number }[] = [];

        if (data.habitaciones > 0) features.push({ icon: 'bed', value: data.habitaciones });
        if (data.banos > 0) features.push({ icon: 'bath', value: data.banos });
        if (data.estacionamientos > 0) features.push({ icon: 'car', value: data.estacionamientos });
        if (data.metros > 0) features.push({ icon: 'area', value: data.metros });

        const featureWidth = 80;
        const totalWidth = features.length * featureWidth;
        let featX = (w - totalWidth) / 2;

        ctx.font = '600 26px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';

        features.forEach((f) => {
          const iconX = featX + featureWidth / 2 - iconSize / 2;
          if (f.icon === 'bed') drawBedIcon(ctx, iconX, bottomY, iconSize, iconColor);
          else if (f.icon === 'bath') drawBathIcon(ctx, iconX, bottomY, iconSize, iconColor);
          else if (f.icon === 'car') drawCarIcon(ctx, iconX, bottomY, iconSize, iconColor);
          else if (f.icon === 'area') drawAreaIcon(ctx, iconX, bottomY, iconSize, iconColor);

          ctx.fillText(f.icon === 'area' ? `${f.value}m²` : String(f.value), featX + featureWidth / 2, bottomY + iconSize + 30);
          featX += featureWidth;
        });
      }

      // Swipe up / CTA
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.font = '400 22px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('↑ Desliza para más info', w / 2, h - 50);

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = primary;
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w / 2, h - 90);
      }
    },
  },

  // 4. TARJETA PROFESIONAL
  {
    id: 'tarjeta',
    name: 'Tarjeta',
    description: 'Diseño tipo tarjeta con información clara',
    icon: '📋',
    defaultFormat: 'square',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#2563eb';
      const cardPadding = 40;

      // Fondo blanco
      ctx.fillStyle = '#f8fafc';
      ctx.fillRect(0, 0, w, h);

      // Imagen en la parte superior (60%)
      const imgAreaH = h * 0.58;
      const imgScale = Math.max(w / propertyImage.width, imgAreaH / propertyImage.height);
      const imgW = propertyImage.width * imgScale;
      const imgH = propertyImage.height * imgScale;

      // Clip para imagen
      ctx.save();
      roundRect(ctx, cardPadding, cardPadding, w - cardPadding * 2, imgAreaH, 20);
      ctx.clip();
      ctx.drawImage(
        propertyImage,
        cardPadding + (w - cardPadding * 2 - imgW) / 2,
        cardPadding + (imgAreaH - imgH) / 2,
        imgW,
        imgH
      );
      ctx.restore();

      // Overlay sutil sobre imagen
      ctx.save();
      roundRect(ctx, cardPadding, cardPadding, w - cardPadding * 2, imgAreaH, 20);
      ctx.clip();
      const imgOverlay = ctx.createLinearGradient(0, cardPadding, 0, cardPadding + imgAreaH);
      imgOverlay.addColorStop(0, 'rgba(0,0,0,0.1)');
      imgOverlay.addColorStop(0.7, 'rgba(0,0,0,0)');
      imgOverlay.addColorStop(1, 'rgba(0,0,0,0.4)');
      ctx.fillStyle = imgOverlay;
      ctx.fillRect(cardPadding, cardPadding, w - cardPadding * 2, imgAreaH);
      ctx.restore();

      // Badge en imagen
      if (options.showBadge && options.badgeText) {
        drawBadge(ctx, options.badgeText.toUpperCase(), cardPadding + 20, cardPadding + 20, primary, 'pill');
      }

      // Logo en imagen (esquina inferior derecha de la imagen)
      if (logoImg) {
        const logoH = 45;
        const logoW = (logoImg.width / logoImg.height) * logoH;

        // Fondo semi-transparente para logo
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        roundRect(ctx, w - cardPadding - logoW - 30, cardPadding + imgAreaH - logoH - 30, logoW + 20, logoH + 10, 8);
        ctx.fill();

        ctx.drawImage(logoImg, w - cardPadding - logoW - 20, cardPadding + imgAreaH - logoH - 25, logoW, logoH);
      }

      // Área de información
      const infoY = cardPadding + imgAreaH + 30;
      const infoX = cardPadding + 20;

      // Tipo y operación
      ctx.fillStyle = primary;
      ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), infoX, infoY);

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#1e293b';
        ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), infoX, infoY + 35);
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 24px "Segoe UI", Arial, sans-serif';
        drawLocationIcon(ctx, infoX, infoY + 100, 22, '#64748b');
        ctx.fillText(data.ubicacion, infoX + 30, infoY + 102);
      }

      // Características en barra inferior
      if (options.showFeatures) {
        const featY = h - cardPadding - 70;
        const iconSize = 28;
        const iconColor = primary;

        // Barra de fondo
        ctx.fillStyle = '#f1f5f9';
        roundRect(ctx, cardPadding, featY - 10, w - cardPadding * 2, 70, 12);
        ctx.fill();

        const features: { draw: (x: number, y: number) => void; label: string }[] = [];
        if (data.habitaciones > 0) features.push({ draw: (x, y) => drawBedIcon(ctx, x, y, iconSize, iconColor), label: `${data.habitaciones}` });
        if (data.banos > 0) features.push({ draw: (x, y) => drawBathIcon(ctx, x, y, iconSize, iconColor), label: `${data.banos}` });
        if (data.estacionamientos > 0) features.push({ draw: (x, y) => drawCarIcon(ctx, x, y, iconSize, iconColor), label: `${data.estacionamientos}` });
        if (data.metros > 0) features.push({ draw: (x, y) => drawAreaIcon(ctx, x, y, iconSize, iconColor), label: `${data.metros}m²` });

        const featureSpacing = (w - cardPadding * 2) / features.length;
        ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#1e293b';
        ctx.textAlign = 'center';

        features.forEach((f, i) => {
          const fx = cardPadding + featureSpacing * i + featureSpacing / 2;
          f.draw(fx - iconSize / 2, featY + 5);
          ctx.fillText(f.label, fx, featY + iconSize + 20);
        });
      }

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = '#64748b';
        ctx.font = '500 20px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - cardPadding - 20, infoY + 105);
      }
    },
  },

  // 5. BANNER HORIZONTAL
  {
    id: 'banner',
    name: 'Banner',
    description: 'Formato horizontal para web y Facebook',
    icon: '🖼️',
    defaultFormat: 'landscape',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#059669';
      const panelWidth = w * 0.4;

      // Imagen (lado derecho, 60%)
      const imgAreaW = w - panelWidth;
      const imgScale = Math.max(imgAreaW / propertyImage.width, h / propertyImage.height);
      const imgW = propertyImage.width * imgScale;
      const imgH = propertyImage.height * imgScale;
      ctx.drawImage(
        propertyImage,
        panelWidth + (imgAreaW - imgW) / 2,
        (h - imgH) / 2,
        imgW,
        imgH
      );

      // Panel izquierdo
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, panelWidth, h);

      // Barra de color superior
      ctx.fillStyle = primary;
      ctx.fillRect(0, 0, panelWidth, 8);

      const padding = 50;
      let yPos = 60;

      // Logo
      if (logoImg) {
        const logoH = 55;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, padding, yPos, Math.min(logoW, panelWidth - padding * 2), logoH);
        yPos += logoH + 45;
      }

      // Tipo y operación
      ctx.fillStyle = primary;
      ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'top';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), padding, yPos);
      yPos += 45;

      // Precio
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#111827';
        ctx.font = 'bold 48px "Segoe UI", Arial, sans-serif';
        ctx.fillText(formatPriceFull(data.precio, data.moneda), padding, yPos);
        yPos += 70;
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        ctx.fillStyle = '#6b7280';
        ctx.font = '500 24px "Segoe UI", Arial, sans-serif';
        drawLocationIcon(ctx, padding, yPos, 24, '#6b7280');
        ctx.fillText(data.ubicacion, padding + 35, yPos + 2);
        yPos += 60;
      }

      // Línea separadora
      ctx.fillStyle = '#e5e7eb';
      ctx.fillRect(padding, yPos, panelWidth - padding * 2, 2);
      yPos += 30;

      // Características en grid 2x2
      if (options.showFeatures) {
        const iconSize = 30;
        const iconColor = primary;
        const colWidth = (panelWidth - padding * 2) / 2;

        ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
        ctx.fillStyle = '#374151';

        const features: { draw: (x: number, y: number) => void; label: string }[] = [];
        if (data.habitaciones > 0) features.push({ draw: (x, y) => drawBedIcon(ctx, x, y, iconSize, iconColor), label: `${data.habitaciones} Habitaciones` });
        if (data.banos > 0) features.push({ draw: (x, y) => drawBathIcon(ctx, x, y, iconSize, iconColor), label: `${data.banos} Baños` });
        if (data.estacionamientos > 0) features.push({ draw: (x, y) => drawCarIcon(ctx, x, y, iconSize, iconColor), label: `${data.estacionamientos} Estac.` });
        if (data.metros > 0) features.push({ draw: (x, y) => drawAreaIcon(ctx, x, y, iconSize, iconColor), label: `${data.metros} m²` });

        features.forEach((f, i) => {
          const col = i % 2;
          const row = Math.floor(i / 2);
          const fx = padding + col * colWidth;
          const fy = yPos + row * 55;

          f.draw(fx, fy);
          ctx.fillText(f.label, fx + iconSize + 12, fy + iconSize * 0.65);
        });
      }

      // Contacto en la parte inferior
      ctx.fillStyle = '#f3f4f6';
      ctx.fillRect(0, h - 70, panelWidth, 70);

      ctx.fillStyle = '#374151';
      ctx.font = '600 22px "Segoe UI", Arial, sans-serif';
      ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', padding, h - 35);

      // Badge en la imagen
      if (options.showBadge && options.badgeText) {
        drawBadge(ctx, options.badgeText.toUpperCase(), panelWidth + 30, 30, primary, 'pill');
      }
    },
  },

  // 6. DESCUENTO / OFERTA
  {
    id: 'oferta',
    name: 'Oferta',
    description: 'Ideal para propiedades con descuento',
    icon: '💰',
    defaultFormat: 'square',
    render: (ctx, canvas, propertyImage, logoImg, colores, contactInfo, data, options) => {
      const w = canvas.width;
      const h = canvas.height;
      const primary = colores?.primary || '#dc2626';
      const accent = '#fbbf24';

      // Imagen de fondo
      const imgScale = Math.max(w / propertyImage.width, h / propertyImage.height);
      const imgW = propertyImage.width * imgScale;
      const imgH = propertyImage.height * imgScale;
      ctx.drawImage(propertyImage, (w - imgW) / 2, (h - imgH) / 2, imgW, imgH);

      // Overlay oscuro
      const gradient = ctx.createLinearGradient(0, 0, 0, h);
      gradient.addColorStop(0, 'rgba(0,0,0,0.4)');
      gradient.addColorStop(0.5, 'rgba(0,0,0,0.3)');
      gradient.addColorStop(1, 'rgba(0,0,0,0.9)');
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, w, h);

      const padding = 50;

      // Banner de "OFERTA" diagonal
      ctx.save();
      ctx.translate(w - 150, 80);
      ctx.rotate(Math.PI / 4);
      ctx.fillStyle = primary;
      ctx.fillRect(-150, -25, 300, 50);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(options.badgeText || '¡OFERTA!', 0, 0);
      ctx.restore();

      // Logo
      if (logoImg) {
        const logoH = 50;
        const logoW = (logoImg.width / logoImg.height) * logoH;
        ctx.drawImage(logoImg, padding, padding, logoW, logoH);
      }

      // Tipo
      ctx.fillStyle = accent;
      ctx.font = 'bold 26px "Segoe UI", Arial, sans-serif';
      ctx.textAlign = 'left';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${getTipoLabel(data.tipo)} ${getOperacionLabel(data.operacion)}`.toUpperCase(), padding, h - 240);

      // Precio nuevo GRANDE
      if (options.showPrice && data.precio > 0) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 72px "Segoe UI", Arial, sans-serif';
        drawTextWithShadow(ctx, formatPriceFull(data.precio, data.moneda), padding, h - 160);
      }

      // Ubicación
      if (options.showLocation && data.ubicacion) {
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '500 26px "Segoe UI", Arial, sans-serif';
        ctx.textBaseline = 'bottom';
        drawLocationIcon(ctx, padding, h - 105, 24, accent);
        ctx.fillText(data.ubicacion, padding + 35, h - 85);
      }

      // Características
      if (options.showFeatures) {
        const features: string[] = [];
        if (data.habitaciones > 0) features.push(`${data.habitaciones} Hab`);
        if (data.banos > 0) features.push(`${data.banos} Baños`);
        if (data.estacionamientos > 0) features.push(`${data.estacionamientos} Est`);
        if (data.metros > 0) features.push(`${data.metros}m²`);

        ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.font = '500 24px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText(features.join('  •  '), padding, h - 50);
      }

      // CTA / Botón
      if (options.ctaText) {
        const ctaWidth = 240;
        const ctaHeight = 55;
        const ctaX = w - padding - ctaWidth;
        const ctaY = h - padding - ctaHeight - 30;

        ctx.fillStyle = accent;
        roundRect(ctx, ctaX, ctaY, ctaWidth, ctaHeight, 28);
        ctx.fill();

        ctx.fillStyle = '#1e1e1e';
        ctx.font = 'bold 22px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(options.ctaText, ctaX + ctaWidth / 2, ctaY + ctaHeight / 2);
      }

      // Contacto
      if (contactInfo.telefono || contactInfo.whatsapp) {
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px "Segoe UI", Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'bottom';
        ctx.fillText(contactInfo.telefono || contactInfo.whatsapp || '', w - padding, h - 50);
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
      const isR2Url = url.includes('r2.dev') || url.includes('cloudflarestorage.com');
      let fetchUrl = url;

      if (isR2Url && tenantActual?.id) {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
        fetchUrl = `${apiBase}/tenants/${tenantActual.id}/upload/proxy-image?url=${encodeURIComponent(url)}`;
      }

      const response = await fetch(fetchUrl);
      if (!response.ok) return null;

      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(null);
        reader.readAsDataURL(blob);
      });
    } catch {
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
  const loadPropertyImage = async (url: string) => {
    const base64 = await loadImageAsBase64(url);
    if (base64) {
      const img = new window.Image();
      img.onload = () => {
        setPropertyImage(img);
        setUploadedImage(base64);
        setGeneratedImage(null);
      };
      img.src = base64;
    }
  };

  // Manejar selección de propiedad
  const handleSelectProperty = async (prop: Propiedad) => {
    setSelectedProperty(prop);
    setSelectedImageIndex(0);
    setGeneratedImage(null);

    // Auto-cargar la primera imagen
    const images = getPropertyImages(prop);
    if (images.length > 0) {
      await loadPropertyImage(images[0]);
    } else {
      setPropertyImage(null);
      setUploadedImage(null);
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
  const generateImage = () => {
    if (!propertyImage || !canvasRef.current) return;

    setProcessing(true);
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

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
  };

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
                Generar
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
            ) : propertyImage ? (
              <div style={{ textAlign: 'center', color: '#64748b' }}>
                <FileImage size={48} style={{ opacity: 0.3, marginBottom: '12px' }} />
                <p style={{ margin: 0, fontSize: '14px' }}>Haz clic en "Generar" para crear el arte</p>
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
