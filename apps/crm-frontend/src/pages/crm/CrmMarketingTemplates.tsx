/**
 * CrmMarketingTemplates - Banco de Plantillas
 *
 * Guarda y reutiliza diseños favoritos para futuras campañas:
 * - Plantillas de flyers guardadas
 * - Plantillas de stories
 * - Configuraciones de branding personalizadas
 * - Organización por categorías
 */

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import {
  ArrowLeft,
  Layout,
  Smartphone,
  FileImage,
  Plus,
  Search,
  Star,
  Clock,
  Trash2,
  Copy,
  MoreVertical,
  Filter,
  Grid,
  List,
} from 'lucide-react';

// Tipos
interface Template {
  id: string;
  name: string;
  type: 'flyer' | 'story' | 'post' | 'banner';
  preview: string;
  createdAt: Date;
  isFavorite: boolean;
  usageCount: number;
}

// Por ahora sin plantillas - se agregarán cuando el usuario guarde diseños
const mockTemplates: Template[] = [];

const typeLabels: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  flyer: { label: 'Flyer', color: '#f43f5e', icon: <FileImage size={14} /> },
  story: { label: 'Story', color: '#d946ef', icon: <Smartphone size={14} /> },
  post: { label: 'Post', color: '#3b82f6', icon: <Layout size={14} /> },
  banner: { label: 'Banner', color: '#f59e0b', icon: <Layout size={14} /> },
};

const CrmMarketingTemplates: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const [templates, setTemplates] = useState<Template[]>(mockTemplates);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<'recent' | 'popular' | 'name'>('recent');

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  useEffect(() => {
    setPageHeader({
      title: 'Banco de Plantillas',
      subtitle: 'Guarda y reutiliza tus diseños favoritos',
    });
  }, [setPageHeader]);

  // Filtrar y ordenar templates
  const filteredTemplates = templates
    .filter((t) => {
      if (searchQuery && !t.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      if (filterType && t.type !== filterType) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.usageCount - a.usageCount;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return b.createdAt.getTime() - a.createdAt.getTime();
      }
    });

  // Toggle favorito
  const toggleFavorite = (id: string) => {
    setTemplates((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isFavorite: !t.isFavorite } : t))
    );
  };

  // Eliminar template
  const deleteTemplate = (id: string) => {
    if (confirm('¿Eliminar esta plantilla?')) {
      setTemplates((prev) => prev.filter((t) => t.id !== id));
    }
  };

  // Formatear fecha
  const formatDate = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Hoy';
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return date.toLocaleDateString();
  };

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <button
          onClick={() => navigate(`${basePath}/marketing`)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            background: '#f1f5f9',
            border: 'none',
            borderRadius: '8px',
            color: '#64748b',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          <ArrowLeft size={16} />
          Volver al Marketing Hub
        </button>

      </div>

      {/* Lista de plantillas */}
      {filteredTemplates.length === 0 ? (
        <div
          style={{
            background: 'white',
            borderRadius: '16px',
            border: '1px solid #e2e8f0',
            padding: '60px',
            textAlign: 'center',
          }}
        >
          <Layout size={64} color="#e2e8f0" style={{ marginBottom: '16px' }} />
          <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
            Aún no tienes plantillas guardadas
          </h3>
          <p style={{ fontSize: '14px', color: '#64748b', margin: '0 0 24px 0', maxWidth: '400px', marginLeft: 'auto', marginRight: 'auto' }}>
            Las plantillas te permiten reutilizar configuraciones de diseño.
            Próximamente podrás guardar tus flyers y stories favoritos como plantillas.
          </p>
          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
            <button
              onClick={() => navigate(`${basePath}/marketing/flyers`)}
              style={{
                padding: '12px 20px',
                background: '#f43f5e',
                color: 'white',
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
              <FileImage size={18} />
              Crear Flyer
            </button>
            <button
              onClick={() => navigate(`${basePath}/marketing/stories`)}
              style={{
                padding: '12px 20px',
                background: '#d946ef',
                color: 'white',
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
              <Smartphone size={18} />
              Crear Story
            </button>
          </div>
        </div>
      ) : viewMode === 'grid' ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px' }}>
          {filteredTemplates.map((template) => {
            const typeInfo = typeLabels[template.type];
            return (
              <div
                key={template.id}
                style={{
                  background: 'white',
                  borderRadius: '16px',
                  border: '1px solid #e2e8f0',
                  overflow: 'hidden',
                  transition: 'all 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.1)';
                  e.currentTarget.style.transform = 'translateY(-2px)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }}
              >
                {/* Preview */}
                <div
                  style={{
                    height: '180px',
                    background: `linear-gradient(135deg, ${typeInfo.color}20 0%, ${typeInfo.color}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                  }}
                >
                  <span style={{ fontSize: '64px' }}>{template.preview}</span>

                  {/* Badge de tipo */}
                  <span
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '12px',
                      padding: '4px 10px',
                      background: typeInfo.color,
                      color: 'white',
                      borderRadius: '6px',
                      fontSize: '11px',
                      fontWeight: 600,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {typeInfo.icon}
                    {typeInfo.label}
                  </span>

                  {/* Favorito */}
                  <button
                    onClick={() => toggleFavorite(template.id)}
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '12px',
                      padding: '8px',
                      background: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    }}
                  >
                    <Star
                      size={18}
                      fill={template.isFavorite ? '#f59e0b' : 'none'}
                      color={template.isFavorite ? '#f59e0b' : '#94a3b8'}
                    />
                  </button>
                </div>

                {/* Info */}
                <div style={{ padding: '16px' }}>
                  <h4 style={{ fontSize: '15px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>
                    {template.name}
                  </h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Clock size={12} />
                      {formatDate(template.createdAt)}
                    </span>
                    <span>•</span>
                    <span>{template.usageCount} usos</span>
                  </div>

                  {/* Acciones */}
                  <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
                    <button
                      onClick={() => {
                        alert('Usar esta plantilla para crear un nuevo diseño');
                      }}
                      style={{
                        flex: 1,
                        padding: '10px',
                        background: typeInfo.color,
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '13px',
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      Usar
                    </button>
                    <button
                      onClick={() => alert('Duplicar plantilla')}
                      style={{
                        padding: '10px',
                        background: '#f1f5f9',
                        color: '#64748b',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <Copy size={16} />
                    </button>
                    <button
                      onClick={() => deleteTemplate(template.id)}
                      style={{
                        padding: '10px',
                        background: '#fef2f2',
                        color: '#ef4444',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                      }}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        // Vista lista
        <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
          {filteredTemplates.map((template, idx) => {
            const typeInfo = typeLabels[template.type];
            return (
              <div
                key={template.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '16px',
                  padding: '16px 20px',
                  borderBottom: idx < filteredTemplates.length - 1 ? '1px solid #f1f5f9' : 'none',
                }}
              >
                {/* Preview */}
                <div
                  style={{
                    width: '60px',
                    height: '60px',
                    borderRadius: '10px',
                    background: `linear-gradient(135deg, ${typeInfo.color}20 0%, ${typeInfo.color}10 100%)`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '28px',
                  }}
                >
                  {template.preview}
                </div>

                {/* Info */}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                      {template.name}
                    </h4>
                    {template.isFavorite && <Star size={14} fill="#f59e0b" color="#f59e0b" />}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        padding: '2px 8px',
                        background: `${typeInfo.color}20`,
                        color: typeInfo.color,
                        borderRadius: '4px',
                        fontSize: '11px',
                        fontWeight: 600,
                      }}
                    >
                      {typeInfo.label}
                    </span>
                    <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                      {formatDate(template.createdAt)} • {template.usageCount} usos
                    </span>
                  </div>
                </div>

                {/* Acciones */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => alert('Usar plantilla')}
                    style={{
                      padding: '8px 16px',
                      background: typeInfo.color,
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '12px',
                      fontWeight: 600,
                      cursor: 'pointer',
                    }}
                  >
                    Usar
                  </button>
                  <button
                    onClick={() => toggleFavorite(template.id)}
                    style={{
                      padding: '8px',
                      background: '#f1f5f9',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Star
                      size={16}
                      fill={template.isFavorite ? '#f59e0b' : 'none'}
                      color={template.isFavorite ? '#f59e0b' : '#94a3b8'}
                    />
                  </button>
                  <button
                    onClick={() => deleteTemplate(template.id)}
                    style={{
                      padding: '8px',
                      background: '#fef2f2',
                      color: '#ef4444',
                      border: 'none',
                      borderRadius: '8px',
                      cursor: 'pointer',
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Info */}
      <div
        style={{
          marginTop: '24px',
          padding: '20px',
          background: 'linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)',
          border: '1px solid #e9d5ff',
          borderRadius: '12px',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '16px',
        }}
      >
        <Layout size={24} color="#a855f7" />
        <div>
          <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#7c3aed', margin: '0 0 4px 0' }}>
            Cómo guardar plantillas
          </h4>
          <p style={{ fontSize: '13px', color: '#8b5cf6', margin: 0, lineHeight: 1.5 }}>
            Cuando crees un flyer o story que te guste, podrás guardarlo como plantilla para reutilizarlo.
            Las plantillas guardan la configuración de colores, posición del logo y estilo visual.
          </p>
        </div>
      </div>
    </div>
  );
};

export default CrmMarketingTemplates;
