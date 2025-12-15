/**
 * AmenidadModal - Modal para agregar nuevas amenidades personalizadas
 *
 * Permite seleccionar icono, nombre, categoría y traducciones
 * Guarda la amenidad en la base de datos para el tenant actual
 * Las amenidades quedan pendientes de aprobación por defecto
 */

import { useState, useEffect } from 'react';
import { getCategoriasAmenidades } from '../services/api';
import { useIdiomas, IdiomaConfig } from '../services/idiomas';
import { useAuth } from '../contexts/AuthContext';

interface AmenidadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: {
    nombre: string;
    icono: string;
    categoria: string;
    traducciones: Record<string, string>;
  }) => void;
}

// Iconos disponibles (usando emojis por ahora, luego se pueden usar iconos SVG)
const ICONOS_DISPONIBLES = [
  { value: '🏊', label: 'Piscina' },
  { value: '💪', label: 'Gimnasio' },
  { value: '🔒', label: 'Seguridad' },
  { value: '🚗', label: 'Estacionamiento' },
  { value: '🛗', label: 'Ascensor' },
  { value: '🌳', label: 'Jardín' },
  { value: '🏖️', label: 'Terraza' },
  { value: '🔥', label: 'BBQ' },
  { value: '🏀', label: 'Cancha' },
  { value: '🎮', label: 'Playground' },
  { value: '💆', label: 'Spa' },
  { value: '🧖', label: 'Sauna' },
  { value: '🛁', label: 'Jacuzzi' },
  { value: '❄️', label: 'Aire Acondicionado' },
  { value: '🍳', label: 'Cocina' },
  { value: '👔', label: 'Closets' },
  { value: '🚨', label: 'Alarmas' },
  { value: '📺', label: 'TV' },
  { value: '📶', label: 'WiFi' },
  { value: '🏋️', label: 'Gym' },
  { value: '🏃', label: 'Running Track' },
  { value: '🎯', label: 'Otro' },
];

// Traducciones de categorías para mostrarlas en español
const CATEGORIAS_LABELS: Record<string, string> = {
  'recreacion': 'Recreación',
  'seguridad': 'Seguridad',
  'servicios': 'Servicios',
  'comodidades': 'Comodidades',
  'tecnologia': 'Tecnología',
  'accesibilidad': 'Accesibilidad',
  'vistas': 'Vistas',
  'playa': 'Playa',
  'negocios': 'Negocios',
  'sostenibilidad': 'Sostenibilidad',
  'extras': 'Extras',
  'personalizada': 'Personalizada',
  'personalizadas': 'Sin Categoría',
};

const Icons = {
  x: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <line x1="18" y1="6" x2="6" y2="18"/>
      <line x1="6" y1="6" x2="18" y2="18"/>
    </svg>
  ),
  check: (props?: any) => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12"/>
    </svg>
  ),
};

export default function AmenidadModal({
  isOpen,
  onClose,
  onSubmit,
}: AmenidadModalProps) {
  const { tenantActual } = useAuth();
  const { idiomas, loading: loadingIdiomas } = useIdiomas(tenantActual?.id);

  const [nombre, setNombre] = useState('');
  const [iconoSeleccionado, setIconoSeleccionado] = useState('');
  const [categoria, setCategoria] = useState('personalizadas');
  const [traducciones, setTraducciones] = useState<Record<string, string>>({});
  const [categorias, setCategorias] = useState<string[]>([]);
  const [loadingCategorias, setLoadingCategorias] = useState(false);

  // Filtrar solo idiomas activos
  const idiomasActivos = idiomas.filter(i => i.activo);

  // Cargar categorías al abrir el modal
  useEffect(() => {
    if (isOpen) {
      setLoadingCategorias(true);
      getCategoriasAmenidades()
        .then(cats => {
          // Filtrar 'personalizada' si existe y agregar 'personalizadas' como "Sin Categoría"
          const filteredCats = cats.filter(c => c !== 'personalizada' && c !== 'personalizadas');
          setCategorias(filteredCats);
        })
        .catch(err => {
          console.error('Error cargando categorías:', err);
          setCategorias([]);
        })
        .finally(() => setLoadingCategorias(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim() || !iconoSeleccionado) {
      return;
    }

    onSubmit({
      nombre: nombre.trim(),
      icono: iconoSeleccionado,
      categoria,
      traducciones,
    });

    // Reset form
    setNombre('');
    setIconoSeleccionado('');
    setCategoria('personalizadas');
    setTraducciones({});
    onClose();
  };

  const handleClose = () => {
    setNombre('');
    setIconoSeleccionado('');
    setCategoria('personalizadas');
    setTraducciones({});
    onClose();
  };

  const getCategoriaLabel = (cat: string) => {
    return CATEGORIAS_LABELS[cat] || cat.charAt(0).toUpperCase() + cat.slice(1);
  };

  return (
    <div className="amenidad-modal-overlay" onClick={handleClose}>
      <div className="amenidad-modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="amenidad-modal-header">
          <h2>Agregar Nueva Amenidad</h2>
          <button className="close-btn" onClick={handleClose}>
            <Icons.x />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="amenidad-modal-form">
          {/* Selección de Icono */}
          <div className="form-section-modal">
            <label className="section-label">Selecciona un Icono *</label>
            <div className="iconos-grid">
              {ICONOS_DISPONIBLES.map((icono) => (
                <button
                  key={icono.value}
                  type="button"
                  className={`icono-option ${iconoSeleccionado === icono.value ? 'active' : ''}`}
                  onClick={() => setIconoSeleccionado(icono.value)}
                  title={icono.label}
                >
                  <span className="icono-emoji">{icono.value}</span>
                  <span className="icono-label">{icono.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Nombre */}
          <div className="form-section-modal">
            <label htmlFor="amenidad-nombre" className="section-label">
              Nombre de la Amenidad *
            </label>
            <input
              id="amenidad-nombre"
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Piscina Olímpica"
              required
            />
          </div>

          {/* Categoría */}
          <div className="form-section-modal">
            <label htmlFor="amenidad-categoria" className="section-label">
              Categoría
            </label>
            <p className="section-hint">
              Selecciona una categoría existente para que la amenidad aparezca junto con las demás de ese tipo, o elige "Sin Categoría" para que aparezca en una sección aparte.
            </p>
            <select
              id="amenidad-categoria"
              value={categoria}
              onChange={(e) => setCategoria(e.target.value)}
              disabled={loadingCategorias}
            >
              <option value="personalizadas">Sin Categoría (Personalizadas)</option>
              {categorias.map((cat) => (
                <option key={cat} value={cat}>
                  {getCategoriaLabel(cat)}
                </option>
              ))}
            </select>
          </div>

          {/* Traducciones */}
          {idiomasActivos.length > 1 && (
            <div className="form-section-modal">
              <label className="section-label">Traducciones (Opcional)</label>
              <p className="section-hint">
                Agrega el nombre de la amenidad en cada idioma habilitado para tu empresa.
              </p>
              {loadingIdiomas ? (
                <p className="loading-text">Cargando idiomas...</p>
              ) : (
                <div className="traducciones-grid">
                  {idiomasActivos.map((idioma) => (
                    <div key={idioma.code} className="traduccion-input-group">
                      <label htmlFor={`traduccion-${idioma.code}`}>
                        <span className="idioma-flag">{idioma.flagEmoji}</span>
                        {idioma.labelNativo}
                      </label>
                      <input
                        id={`traduccion-${idioma.code}`}
                        type="text"
                        value={traducciones[idioma.code] || ''}
                        onChange={(e) =>
                          setTraducciones((prev) => ({
                            ...prev,
                            [idioma.code]: e.target.value,
                          }))
                        }
                        placeholder={`Nombre en ${idioma.labelNativo}`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="approval-info pending">
            <p>
              <strong>⏳ Pendiente de Aprobación:</strong> Esta amenidad será guardada pero requerirá aprobación del administrador antes de estar disponible en el catálogo.
            </p>
          </div>

          {/* Botones */}
          <div className="amenidad-modal-actions">
            <button type="button" className="btn-cancel" onClick={handleClose}>
              Cancelar
            </button>
            <button
              type="submit"
              className="btn-submit"
              disabled={!nombre.trim() || !iconoSeleccionado}
            >
              <Icons.check />
              Guardar Amenidad
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .amenidad-modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
          padding: 20px;
          animation: fadeIn 0.2s;
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        .amenidad-modal-content {
          background: white;
          border-radius: 20px;
          width: 100%;
          max-width: 850px;
          max-height: 90vh;
          overflow-y: auto;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
          animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .amenidad-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 28px 32px;
          border-bottom: 2px solid #f1f5f9;
        }

        .amenidad-modal-header h2 {
          margin: 0;
          font-size: 1.75rem;
          font-weight: 700;
          color: #0f172a;
          letter-spacing: -0.02em;
        }

        .close-btn {
          background: none;
          border: none;
          color: #64748b;
          cursor: pointer;
          padding: 8px;
          border-radius: 8px;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .close-btn:hover {
          background: #f1f5f9;
          color: #0f172a;
        }

        .amenidad-modal-form {
          padding: 32px;
        }

        .form-section-modal {
          margin-bottom: 28px;
        }

        .section-label {
          display: block;
          font-weight: 600;
          color: #1e293b;
          font-size: 0.95rem;
          margin-bottom: 12px;
          letter-spacing: -0.01em;
        }

        .section-hint {
          font-size: 0.85rem;
          color: #64748b;
          margin: 0 0 12px 0;
          line-height: 1.5;
        }

        .iconos-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
          gap: 12px;
        }

        .icono-option {
          padding: 16px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          background: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
        }

        .icono-option:hover {
          border-color: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .icono-option.active {
          background: #1e293b;
          border-color: #1e293b;
          color: white;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.3);
        }

        .icono-emoji {
          font-size: 2rem;
          line-height: 1;
        }

        .icono-label {
          font-size: 0.75rem;
          font-weight: 500;
          text-align: center;
        }

        .amenidad-modal-form input[type="text"],
        .amenidad-modal-form select {
          width: 100%;
          padding: 14px 16px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          font-size: 0.95rem;
          transition: all 0.3s;
          font-family: inherit;
          background: white;
          color: #0f172a;
          font-weight: 500;
        }

        .amenidad-modal-form input[type="text"]:hover,
        .amenidad-modal-form select:hover {
          border-color: #cbd5e1;
        }

        .amenidad-modal-form input[type="text"]:focus,
        .amenidad-modal-form select:focus {
          outline: none;
          border-color: #1e293b;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }

        .amenidad-modal-form select {
          cursor: pointer;
          appearance: none;
          background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
          background-repeat: no-repeat;
          background-position: right 12px center;
          background-size: 20px;
          padding-right: 44px;
        }

        .traducciones-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
          gap: 16px;
        }

        .traduccion-input-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .traduccion-input-group label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
          letter-spacing: 0.05em;
        }

        .approval-info {
          padding: 16px;
          background: #f0fdf4;
          border: 2px solid #bbf7d0;
          border-radius: 10px;
          margin-bottom: 24px;
        }

        .approval-info.pending {
          background: #fefce8;
          border-color: #fde047;
        }

        .approval-info.pending p {
          color: #854d0e;
        }

        .approval-info p {
          margin: 0;
          font-size: 0.9rem;
          color: #166534;
          line-height: 1.5;
        }

        .approval-info strong {
          font-weight: 600;
        }

        .loading-text {
          color: #64748b;
          font-size: 0.9rem;
          font-style: italic;
        }

        .idioma-flag {
          margin-right: 6px;
          font-size: 1.1em;
        }

        .amenidad-modal-actions {
          display: flex;
          gap: 12px;
          justify-content: flex-end;
          padding-top: 24px;
          border-top: 2px solid #f1f5f9;
        }

        .btn-cancel,
        .btn-submit {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 14px 24px;
          border: none;
          border-radius: 10px;
          font-weight: 600;
          font-size: 0.95rem;
          cursor: pointer;
          transition: all 0.3s;
          letter-spacing: -0.01em;
        }

        .btn-cancel {
          background: white;
          color: #475569;
          border: 2px solid #e2e8f0;
        }

        .btn-cancel:hover {
          background: #f8fafc;
          border-color: #cbd5e1;
        }

        .btn-submit {
          background: #16a34a;
          color: white;
          box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);
        }

        .btn-submit:hover:not(:disabled) {
          background: #15803d;
          transform: translateY(-2px);
          box-shadow: 0 6px 20px rgba(22, 163, 74, 0.4);
        }

        .btn-submit:disabled {
          opacity: 0.5;
          cursor: not-allowed;
          transform: none;
        }
      `}</style>
    </div>
  );
}

