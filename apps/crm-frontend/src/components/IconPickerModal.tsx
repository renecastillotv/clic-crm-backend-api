/**
 * IconPickerModal - Modal selector de iconos Lucide
 *
 * Componente reutilizable para seleccionar iconos de la biblioteca Lucide.
 * Muestra una grilla de iconos organizados por categorías con búsqueda.
 */

import { useState, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { X, Search, type LucideIcon } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

// Iconos más comunes organizados por categoría
const ICON_CATEGORIES: Record<string, string[]> = {
  'Populares': [
    'Star', 'Heart', 'Home', 'User', 'Settings', 'Search', 'Bell', 'Mail',
    'Phone', 'Calendar', 'Clock', 'Tag', 'Bookmark', 'Flag', 'Award', 'Crown',
    'Sparkles', 'Zap', 'Flame', 'Gift', 'Shield', 'Target', 'Eye', 'Check'
  ],
  'Inmobiliaria': [
    'Home', 'Building', 'Building2', 'Warehouse', 'Store', 'Hotel', 'Castle',
    'Landmark', 'MapPin', 'Map', 'Key', 'DoorOpen', 'DoorClosed', 'Bed',
    'Bath', 'Car', 'ParkingSquare', 'Trees', 'Mountain', 'Waves', 'Sun'
  ],
  'Negocios': [
    'Briefcase', 'DollarSign', 'CreditCard', 'Wallet', 'PiggyBank', 'TrendingUp',
    'TrendingDown', 'BarChart', 'BarChart2', 'PieChart', 'LineChart', 'Percent',
    'Receipt', 'FileText', 'Files', 'Folder', 'Archive', 'Clipboard', 'Calculator'
  ],
  'Personas': [
    'User', 'Users', 'UserPlus', 'UserMinus', 'UserCheck', 'UserX', 'Contact',
    'Contact2', 'BadgeCheck', 'Handshake', 'HeartHandshake', 'PersonStanding',
    'Baby', 'Accessibility', 'UserCircle', 'UserSquare', 'CircleUser'
  ],
  'Comunicación': [
    'Phone', 'PhoneCall', 'PhoneIncoming', 'PhoneOutgoing', 'Mail', 'Inbox',
    'Send', 'MessageSquare', 'MessageCircle', 'MessagesSquare', 'AtSign',
    'Video', 'Mic', 'Volume2', 'Bell', 'BellRing', 'Megaphone', 'Radio'
  ],
  'Estado': [
    'Check', 'CheckCircle', 'CheckSquare', 'X', 'XCircle', 'XSquare',
    'AlertCircle', 'AlertTriangle', 'Info', 'HelpCircle', 'Ban', 'ShieldAlert',
    'ShieldCheck', 'ShieldX', 'CircleDot', 'Circle', 'CircleOff', 'Loader'
  ],
  'Flechas': [
    'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUpRight',
    'ArrowDownRight', 'ChevronUp', 'ChevronDown', 'ChevronLeft', 'ChevronRight',
    'ChevronsUp', 'ChevronsDown', 'MoveUp', 'MoveDown', 'TrendingUp', 'TrendingDown'
  ],
  'Objetos': [
    'Package', 'Box', 'Boxes', 'ShoppingCart', 'ShoppingBag', 'Truck', 'Plane',
    'Car', 'Bike', 'Ship', 'Train', 'Anchor', 'Compass', 'Globe', 'Paperclip',
    'Scissors', 'Wrench', 'Hammer', 'Paintbrush', 'Palette', 'Camera', 'Image'
  ],
  'Tiempo': [
    'Clock', 'Timer', 'TimerOff', 'Hourglass', 'Calendar', 'CalendarDays',
    'CalendarCheck', 'CalendarX', 'CalendarPlus', 'Sunrise', 'Sunset', 'Sun',
    'Moon', 'Cloud', 'CloudRain', 'Snowflake', 'Thermometer', 'Wind'
  ],
  'Otros': [
    'Lightbulb', 'Lamp', 'Coffee', 'Utensils', 'Wine', 'Pizza', 'Apple',
    'Leaf', 'Flower', 'TreePine', 'Music', 'Headphones', 'Tv', 'Monitor',
    'Smartphone', 'Laptop', 'Tablet', 'Gamepad', 'Dumbbell', 'Heart', 'Smile'
  ]
};

// Todos los iconos disponibles (sin duplicados)
const ALL_ICONS = [...new Set(Object.values(ICON_CATEGORIES).flat())];

interface IconPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (iconName: string) => void;
  currentIcon?: string;
  title?: string;
}

export function IconPickerModal({
  isOpen,
  onClose,
  onSelect,
  currentIcon,
  title = 'Seleccionar Icono'
}: IconPickerModalProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  // Filtrar iconos basado en búsqueda
  const filteredIcons = useMemo(() => {
    if (!searchTerm.trim()) {
      if (selectedCategory) {
        return ICON_CATEGORIES[selectedCategory] || [];
      }
      return ALL_ICONS;
    }

    const term = searchTerm.toLowerCase();
    return ALL_ICONS.filter(name => name.toLowerCase().includes(term));
  }, [searchTerm, selectedCategory]);

  // Obtener componente de icono por nombre
  const getIconComponent = (name: string): LucideIcon | null => {
    const IconComponent = (LucideIcons as Record<string, LucideIcon>)[name];
    return IconComponent || null;
  };

  const handleSelect = (iconName: string) => {
    onSelect(iconName);
    onClose();
  };

  const handleClearIcon = () => {
    onSelect('');
    onClose();
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="icon-picker-overlay" onClick={onClose}>
      <div className="icon-picker-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="icon-picker-header">
          <h3>{title}</h3>
          <button className="icon-picker-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Search */}
        <div className="icon-picker-search">
          <Search size={18} className="search-icon" />
          <input
            type="text"
            placeholder="Buscar iconos..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            autoFocus
          />
        </div>

        {/* Categories */}
        <div className="icon-picker-categories">
          <button
            className={`category-btn ${!selectedCategory ? 'active' : ''}`}
            onClick={() => setSelectedCategory(null)}
          >
            Todos
          </button>
          {Object.keys(ICON_CATEGORIES).map(cat => (
            <button
              key={cat}
              className={`category-btn ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Icons Grid */}
        <div className="icon-picker-grid">
          {filteredIcons.map(name => {
            const IconComponent = getIconComponent(name);
            if (!IconComponent) return null;

            return (
              <button
                key={name}
                className={`icon-item ${currentIcon === name ? 'selected' : ''}`}
                onClick={() => handleSelect(name)}
                title={name}
              >
                <IconComponent size={24} />
                <span className="icon-name">{name}</span>
              </button>
            );
          })}

          {filteredIcons.length === 0 && (
            <div className="no-icons-found">
              No se encontraron iconos para "{searchTerm}"
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="icon-picker-footer">
          {currentIcon && (
            <button className="btn-clear-icon" onClick={handleClearIcon}>
              Quitar icono
            </button>
          )}
          <button className="btn-cancel" onClick={onClose}>
            Cancelar
          </button>
        </div>
      </div>

      <style>{`
        .icon-picker-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.15s ease-out;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.98);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .icon-picker-modal {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 720px;
          max-height: 85vh;
          display: flex;
          flex-direction: column;
          box-shadow:
            0 0 0 1px rgba(0, 0, 0, 0.05),
            0 25px 50px -12px rgba(0, 0, 0, 0.35);
          overflow: hidden;
          animation: slideUp 0.2s ease-out;
        }

        .icon-picker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 20px 24px;
          background: linear-gradient(to bottom, #ffffff, #fafbfc);
          border-bottom: 1px solid #e2e8f0;
        }

        .icon-picker-header h3 {
          margin: 0;
          font-size: 1.25rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .icon-picker-close {
          background: none;
          border: none;
          padding: 8px;
          cursor: pointer;
          color: #94a3b8;
          border-radius: 10px;
          transition: all 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .icon-picker-close:hover {
          background: #f1f5f9;
          color: #475569;
          transform: scale(1.05);
        }

        .icon-picker-search {
          position: relative;
          padding: 16px 24px;
          background: #f8fafc;
        }

        .icon-picker-search .search-icon {
          position: absolute;
          left: 40px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          pointer-events: none;
        }

        .icon-picker-search input {
          width: 100%;
          padding: 12px 16px 12px 44px;
          border: 2px solid #e2e8f0 !important;
          border-radius: 12px;
          font-size: 0.9375rem;
          outline: none !important;
          box-shadow: none !important;
          transition: all 0.2s;
          background: white;
          -webkit-appearance: none;
        }

        .icon-picker-search input::placeholder {
          color: #94a3b8;
        }

        .icon-picker-search input:focus {
          border-color: #3b82f6 !important;
          outline: none !important;
          box-shadow: none !important;
        }

        .icon-picker-categories {
          display: flex;
          flex-wrap: wrap;
          gap: 6px 8px;
          padding: 16px 24px;
          background: white;
          border-bottom: 1px solid #e2e8f0;
          justify-content: flex-start;
          align-items: center;
        }

        .category-btn {
          flex-shrink: 0;
          padding: 6px 14px;
          border: 1.5px solid #e2e8f0;
          border-radius: 20px;
          background: white;
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
          white-space: nowrap;
        }

        .category-btn:hover {
          border-color: #3b82f6;
          color: #3b82f6;
          background: #eff6ff;
        }

        .category-btn.active {
          background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
          border-color: transparent;
          color: white;
          box-shadow: 0 2px 8px rgba(59, 130, 246, 0.35);
        }

        .icon-picker-grid {
          flex: 1;
          overflow-y: auto;
          padding: 20px 24px;
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(72px, 1fr));
          gap: 10px;
          background: #fafbfc;
        }

        .icon-picker-grid::-webkit-scrollbar {
          width: 8px;
        }

        .icon-picker-grid::-webkit-scrollbar-track {
          background: transparent;
        }

        .icon-picker-grid::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }

        .icon-picker-grid::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }

        .icon-item {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 14px 8px 10px;
          border: 1.5px solid transparent;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
        }

        .icon-item:hover {
          border-color: #3b82f6;
          background: white;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
        }

        .icon-item.selected {
          border-color: #3b82f6;
          background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
          box-shadow:
            0 0 0 3px rgba(59, 130, 246, 0.15),
            0 4px 12px rgba(59, 130, 246, 0.2);
        }

        .icon-item svg {
          color: #64748b;
          transition: all 0.2s;
        }

        .icon-item:hover svg {
          color: #3b82f6;
          transform: scale(1.1);
        }

        .icon-item.selected svg {
          color: #2563eb;
        }

        .icon-name {
          font-size: 0.625rem;
          font-weight: 500;
          color: #94a3b8;
          text-align: center;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 100%;
          transition: color 0.2s;
        }

        .icon-item:hover .icon-name,
        .icon-item.selected .icon-name {
          color: #3b82f6;
        }

        .no-icons-found {
          grid-column: 1 / -1;
          padding: 60px 20px;
          text-align: center;
          color: #94a3b8;
          font-size: 0.9375rem;
        }

        .icon-picker-footer {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding: 16px 24px;
          border-top: 1px solid #e2e8f0;
          background: white;
        }

        .icon-picker-footer button {
          padding: 10px 20px;
          border-radius: 10px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn-clear-icon {
          background: white;
          border: 1.5px solid #fecaca;
          color: #dc2626;
        }

        .btn-clear-icon:hover {
          background: #fef2f2;
          border-color: #f87171;
        }

        .btn-cancel {
          background: #f1f5f9;
          border: 1.5px solid #e2e8f0;
          color: #475569;
        }

        .btn-cancel:hover {
          background: #e2e8f0;
          color: #1e293b;
        }
      `}</style>
    </div>,
    document.body
  );
}

export default IconPickerModal;
