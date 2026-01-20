/**
 * CertificateTemplateSelector - Selector visual de plantillas de certificados
 * Permite elegir entre plantillas predefinidas o duplicar certificados existentes
 */

import { useState } from 'react';
import {
  certificateTemplates,
  CertificateTemplate,
} from '../data/certificateTemplates';
import { Layout, Square, Copy, Check, Sparkles } from 'lucide-react';

interface Props {
  onSelectTemplate: (template: CertificateTemplate) => void;
  onDuplicateCertificate?: (certificadoId: string) => void;
  existingCertificates?: Array<{ id: string; nombre: string; campos_personalizados?: any }>;
  selectedTemplateId?: string;
}

type FilterCategory = 'todos' | 'profesional' | 'academico' | 'corporativo' | 'moderno' | 'minimalista';
type FilterAspect = 'todos' | 'horizontal' | 'cuadrado';

export default function CertificateTemplateSelector({
  onSelectTemplate,
  onDuplicateCertificate,
  existingCertificates = [],
  selectedTemplateId
}: Props) {
  const [activeTab, setActiveTab] = useState<'plantillas' | 'duplicar'>('plantillas');
  const [filterCategory, setFilterCategory] = useState<FilterCategory>('todos');
  const [filterAspect, setFilterAspect] = useState<FilterAspect>('todos');

  // Filtrar plantillas
  const filteredTemplates = certificateTemplates.filter(template => {
    if (filterCategory !== 'todos' && template.categoria !== filterCategory) return false;
    if (filterAspect !== 'todos' && template.aspecto !== filterAspect) return false;
    return true;
  });

  const categoryLabels: Record<FilterCategory, string> = {
    todos: 'Todos',
    profesional: 'Profesional',
    academico: 'Academico',
    corporativo: 'Corporativo',
    moderno: 'Moderno',
    minimalista: 'Minimalista',
  };

  return (
    <div className="template-selector">
      {/* Tabs */}
      <div className="selector-tabs">
        <button
          className={`selector-tab ${activeTab === 'plantillas' ? 'active' : ''}`}
          onClick={() => setActiveTab('plantillas')}
        >
          <Sparkles size={16} />
          Plantillas
        </button>
        {existingCertificates.length > 0 && (
          <button
            className={`selector-tab ${activeTab === 'duplicar' ? 'active' : ''}`}
            onClick={() => setActiveTab('duplicar')}
          >
            <Copy size={16} />
            Duplicar Existente
          </button>
        )}
      </div>

      {activeTab === 'plantillas' && (
        <>
          {/* Filtros */}
          <div className="selector-filters">
            <div className="filter-group">
              <label>Categoría:</label>
              <div className="filter-buttons">
                {(Object.keys(categoryLabels) as FilterCategory[]).map(cat => (
                  <button
                    key={cat}
                    className={`filter-btn ${filterCategory === cat ? 'active' : ''}`}
                    onClick={() => setFilterCategory(cat)}
                  >
                    {categoryLabels[cat]}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-group">
              <label>Formato:</label>
              <div className="filter-buttons">
                <button
                  className={`filter-btn ${filterAspect === 'todos' ? 'active' : ''}`}
                  onClick={() => setFilterAspect('todos')}
                >
                  Todos
                </button>
                <button
                  className={`filter-btn ${filterAspect === 'horizontal' ? 'active' : ''}`}
                  onClick={() => setFilterAspect('horizontal')}
                >
                  <Layout size={14} />
                  Horizontal
                </button>
                <button
                  className={`filter-btn ${filterAspect === 'cuadrado' ? 'active' : ''}`}
                  onClick={() => setFilterAspect('cuadrado')}
                >
                  <Square size={14} />
                  Cuadrado
                </button>
              </div>
            </div>
          </div>

          {/* Grid de plantillas */}
          <div className="templates-grid">
            {filteredTemplates.map(template => (
              <div
                key={template.id}
                className={`template-card ${selectedTemplateId === template.id ? 'selected' : ''} ${template.aspecto}`}
                onClick={() => onSelectTemplate(template)}
              >
                <div
                  className="template-preview"
                  style={{ background: template.preview }}
                >
                  {/* Mini preview del certificado */}
                  <div
                    className="mini-certificate"
                    style={{
                      backgroundColor: template.color_fondo,
                      borderColor: template.color_borde,
                      borderStyle: template.borde_estilo === 'ninguno' ? 'none' : 'solid',
                      borderWidth: template.borde_estilo === 'doble' ? '3px' : '1px',
                    }}
                  >
                    <div
                      className="mini-logo"
                      style={{
                        backgroundColor: template.color_acento,
                        alignSelf: template.logo_posicion === 'top-left' ? 'flex-start' :
                                   template.logo_posicion === 'top-right' ? 'flex-end' : 'center'
                      }}
                    />
                    <div
                      className="mini-title"
                      style={{ backgroundColor: template.color_texto_principal }}
                    />
                    <div
                      className="mini-name"
                      style={{ backgroundColor: template.color_texto_principal }}
                    />
                    <div
                      className="mini-line"
                      style={{ backgroundColor: template.color_acento }}
                    />
                    <div
                      className="mini-text"
                      style={{ backgroundColor: template.color_texto_secundario }}
                    />
                  </div>

                  {selectedTemplateId === template.id && (
                    <div className="selected-badge">
                      <Check size={16} />
                    </div>
                  )}
                </div>

                <div className="template-info">
                  <h4>{template.nombre}</h4>
                  <p>{template.descripcion}</p>
                  <div className="template-tags">
                    <span className="tag categoria">{template.categoria}</span>
                    <span className="tag aspecto">{template.aspecto}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {activeTab === 'duplicar' && (
        <div className="duplicate-list">
          <p className="duplicate-hint">
            Selecciona un certificado existente para usarlo como base. Se copiaran todos sus estilos y configuraciones.
          </p>

          {existingCertificates.map(cert => (
            <div
              key={cert.id}
              className="duplicate-item"
              onClick={() => onDuplicateCertificate?.(cert.id)}
            >
              <div className="duplicate-icon">
                <Copy size={20} />
              </div>
              <div className="duplicate-info">
                <h4>{cert.nombre}</h4>
                <p>Clic para duplicar este certificado</p>
              </div>
            </div>
          ))}

          {existingCertificates.length === 0 && (
            <div className="empty-state">
              <p>No hay certificados existentes para duplicar</p>
            </div>
          )}
        </div>
      )}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .template-selector {
    background: white;
    border-radius: 12px;
    overflow: hidden;
  }

  .selector-tabs {
    display: flex;
    border-bottom: 1px solid #e2e8f0;
    background: #f8fafc;
  }

  .selector-tab {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    padding: 14px 16px;
    border: none;
    background: none;
    font-size: 0.9rem;
    font-weight: 500;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .selector-tab:hover {
    color: #0f172a;
    background: #f1f5f9;
  }

  .selector-tab.active {
    color: #2563eb;
    background: white;
    box-shadow: inset 0 -2px 0 #2563eb;
  }

  .selector-filters {
    padding: 16px;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .filter-group {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .filter-group label {
    font-size: 0.8rem;
    font-weight: 500;
    color: #64748b;
    min-width: 70px;
  }

  .filter-buttons {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
  }

  .filter-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 6px 12px;
    border: 1px solid #e2e8f0;
    background: white;
    border-radius: 20px;
    font-size: 0.75rem;
    color: #64748b;
    cursor: pointer;
    transition: all 0.15s;
  }

  .filter-btn:hover {
    border-color: #2563eb;
    color: #2563eb;
  }

  .filter-btn.active {
    background: #2563eb;
    border-color: #2563eb;
    color: white;
  }

  .templates-grid {
    padding: 16px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 16px;
    max-height: 500px;
    overflow-y: auto;
  }

  .template-card {
    border: 2px solid #e2e8f0;
    border-radius: 12px;
    overflow: hidden;
    cursor: pointer;
    transition: all 0.2s;
  }

  .template-card:hover {
    border-color: #2563eb;
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.15);
    transform: translateY(-2px);
  }

  .template-card.selected {
    border-color: #2563eb;
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.2);
  }

  .template-preview {
    position: relative;
    padding: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 120px;
  }

  .template-card.cuadrado .template-preview {
    min-height: 140px;
  }

  .mini-certificate {
    width: 100%;
    max-width: 160px;
    padding: 12px;
    border-radius: 4px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    box-shadow: 0 2px 8px rgba(0,0,0,0.1);
  }

  .template-card.cuadrado .mini-certificate {
    max-width: 100px;
    aspect-ratio: 1;
    padding: 8px;
    gap: 4px;
  }

  .mini-logo {
    width: 20px;
    height: 20px;
    border-radius: 4px;
    opacity: 0.8;
  }

  .mini-title {
    width: 60%;
    height: 6px;
    border-radius: 2px;
    opacity: 0.9;
  }

  .mini-name {
    width: 50%;
    height: 8px;
    border-radius: 2px;
    opacity: 0.7;
  }

  .mini-line {
    width: 40%;
    height: 1px;
    opacity: 0.6;
  }

  .mini-text {
    width: 70%;
    height: 4px;
    border-radius: 1px;
    opacity: 0.5;
  }

  .selected-badge {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 28px;
    height: 28px;
    background: #2563eb;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 6px rgba(37, 99, 235, 0.4);
  }

  .template-info {
    padding: 12px;
    background: white;
    border-top: 1px solid #f1f5f9;
  }

  .template-info h4 {
    margin: 0 0 4px 0;
    font-size: 0.85rem;
    font-weight: 600;
    color: #0f172a;
  }

  .template-info p {
    margin: 0 0 8px 0;
    font-size: 0.7rem;
    color: #64748b;
    line-height: 1.4;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .template-tags {
    display: flex;
    gap: 6px;
  }

  .tag {
    padding: 2px 8px;
    border-radius: 10px;
    font-size: 0.65rem;
    font-weight: 500;
    text-transform: capitalize;
  }

  .tag.categoria {
    background: #f1f5f9;
    color: #475569;
  }

  .tag.aspecto {
    background: #e0f2fe;
    color: #0369a1;
  }

  /* Duplicate list */
  .duplicate-list {
    padding: 16px;
    max-height: 500px;
    overflow-y: auto;
  }

  .duplicate-hint {
    margin: 0 0 16px 0;
    padding: 12px;
    background: #f0f9ff;
    border-radius: 8px;
    font-size: 0.85rem;
    color: #0369a1;
    line-height: 1.5;
  }

  .duplicate-item {
    display: flex;
    align-items: center;
    gap: 12px;
    padding: 14px;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.15s;
    margin-bottom: 10px;
  }

  .duplicate-item:hover {
    border-color: #2563eb;
    background: #f8fafc;
  }

  .duplicate-icon {
    width: 44px;
    height: 44px;
    background: #f1f5f9;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #64748b;
  }

  .duplicate-item:hover .duplicate-icon {
    background: #dbeafe;
    color: #2563eb;
  }

  .duplicate-info h4 {
    margin: 0 0 2px 0;
    font-size: 0.9rem;
    font-weight: 600;
    color: #0f172a;
  }

  .duplicate-info p {
    margin: 0;
    font-size: 0.75rem;
    color: #64748b;
  }

  .empty-state {
    padding: 40px;
    text-align: center;
    color: #94a3b8;
  }

  @media (max-width: 640px) {
    .templates-grid {
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }

    .filter-group {
      flex-direction: column;
      align-items: flex-start;
    }
  }
`;
