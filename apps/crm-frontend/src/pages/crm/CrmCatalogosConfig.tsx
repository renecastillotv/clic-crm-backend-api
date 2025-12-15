/**
 * CrmCatalogosConfig - Lista de elementos personalizables del tenant
 *
 * Muestra las categorías de elementos que se pueden personalizar.
 * Al hacer clic en una categoría, navega a la página de edición.
 *
 * NOTA: tipo_propiedad y tipo_operacion usan tablas separadas
 * (categorias_propiedades y operaciones) con soporte multi-tenant
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useCatalogos, type TipoCatalogo } from '../../contexts/CatalogosContext';
import { usePageHeader } from '../../layouts/CrmLayout';
import {
  Home,
  Key,
  User,
  Phone,
  Tag,
  FileText,
  Briefcase,
  Users,
  ChevronRight,
  CircleDollarSign,
  Puzzle,
  Target,
  Sparkles,
  type LucideIcon
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Tipo extendido que incluye los catálogos de tabla separada
type TipoCatalogoExtendido = TipoCatalogo | 'tipo_propiedad' | 'tipo_operacion' | 'estado_venta' | 'extensiones_contacto' | 'fuentes_lead' | 'amenidades';

interface CatalogoConfig {
  tipo: TipoCatalogoExtendido;
  titulo: string;
  descripcion: string;
  icono: LucideIcon;
  color: string;
  tablaSeparada?: boolean; // true si usa categorias_propiedades u operaciones
  sinConteo?: boolean; // true si no debe mostrar conteo
}

const CATALOGOS_CONFIG: CatalogoConfig[] = [
  { tipo: 'tipo_propiedad', titulo: 'Tipos de Propiedad', descripcion: 'Casa, apartamento, local, terreno, etc.', icono: Home, color: '#3b82f6', tablaSeparada: true },
  { tipo: 'tipo_operacion', titulo: 'Tipos de Operación', descripcion: 'Venta, alquiler, traspaso, etc.', icono: Key, color: '#10b981', tablaSeparada: true },
  { tipo: 'amenidades', titulo: 'Amenidades Personalizadas', descripcion: 'Piscina, gimnasio, seguridad, etc.', icono: Sparkles, color: '#6366f1', tablaSeparada: true },
  { tipo: 'tipo_contacto', titulo: 'Tipos de Contacto', descripcion: 'Cliente, propietario, desarrollador, etc.', icono: User, color: '#8b5cf6' },
  { tipo: 'extensiones_contacto', titulo: 'Extensiones de Contacto', descripcion: 'Lead, Cliente, Asesor, Desarrollador, etc.', icono: Puzzle, color: '#7c3aed', tablaSeparada: true },
  { tipo: 'fuentes_lead', titulo: 'Fuentes de Lead', descripcion: 'Web, referido, portales, redes sociales, etc.', icono: Target, color: '#f59e0b', sinConteo: true },
  { tipo: 'tipo_actividad', titulo: 'Tipos de Actividad', descripcion: 'Llamada, reunión, visita, email, etc.', icono: Phone, color: '#f97316' },
  { tipo: 'etiqueta_propiedad', titulo: 'Etiquetas de Propiedad', descripcion: 'Exclusiva, destacada, rebajada, nueva, etc.', icono: Tag, color: '#ec4899' },
  { tipo: 'tipo_documento', titulo: 'Tipos de Documento', descripcion: 'Cédula, pasaporte, RNC, licencia, etc.', icono: FileText, color: '#64748b' },
  { tipo: 'especialidad_asesor', titulo: 'Especialidades de Asesor', descripcion: 'Residencial, comercial, industrial, lujo, etc.', icono: Briefcase, color: '#0891b2' },
  { tipo: 'tipo_asesor', titulo: 'Tipos de Asesor', descripcion: 'Niveles con % de comisión: senior, junior, etc.', icono: Users, color: '#7c3aed' },
  { tipo: 'estado_venta', titulo: 'Estados de Venta', descripcion: 'En proceso, completada, cancelada, etc.', icono: CircleDollarSign, color: '#059669', tablaSeparada: true },
];

export default function CrmCatalogosConfig() {
  const { tenantActual } = useAuth();
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { catalogos, isLoading } = useCatalogos();

  // Estado para conteos de tablas separadas
  const [conteosSeparados, setConteosSeparados] = useState<Record<string, number>>({
    tipo_propiedad: 0,
    tipo_operacion: 0,
    estado_venta: 0,
    extensiones_contacto: 0,
    amenidades: 0,
  });
  const [loadingSeparados, setLoadingSeparados] = useState(true);

  // Cargar conteos de tablas separadas
  useEffect(() => {
    async function fetchConteos() {
      if (!tenantActual?.id) return;
      try {
        const response = await fetch(`${API_URL}/tenants/${tenantActual.id}/catalogos-separados/conteos`);
        if (response.ok) {
          const data = await response.json();
          setConteosSeparados(data.conteos);
        }
      } catch (error) {
        console.error('Error fetching conteos separados:', error);
      } finally {
        setLoadingSeparados(false);
      }
    }
    fetchConteos();
  }, [tenantActual?.id]);

  // Configurar header
  useEffect(() => {
    setPageHeader({
      title: 'Personalizar Elementos',
      subtitle: 'Configura los tipos, etiquetas y opciones de tu CRM',
      backButton: {
        label: 'Volver',
        onClick: () => navigate(`/crm/${tenantActual?.slug}/configuracion`),
      },
    });
  }, [setPageHeader, tenantActual?.slug, navigate]);

  const getItemCount = (config: CatalogoConfig): number => {
    if (config.tablaSeparada) {
      return conteosSeparados[config.tipo] || 0;
    }
    return catalogos[config.tipo as TipoCatalogo]?.length || 0;
  };

  const loading = isLoading || loadingSeparados;

  return (
    <div className="personalizar-config">
      {loading ? (
        <div className="loading">Cargando...</div>
      ) : (
        <div className="categorias-grid">
          {CATALOGOS_CONFIG.map(config => {
            const itemCount = getItemCount(config);
            const Icon = config.icono;

            return (
              <div
                key={config.tipo}
                className="categoria-card"
                onClick={() => navigate(config.tipo)}
              >
                <div className="categoria-icon" style={{ backgroundColor: `${config.color}15`, color: config.color }}>
                  <Icon size={24} />
                </div>
                <div className="categoria-content">
                  <h3>{config.titulo}</h3>
                  <p>{config.descripcion}</p>
                </div>
                <div className="categoria-meta">
                  {!config.sinConteo && <span className="items-count">{itemCount}</span>}
                  <ChevronRight size={20} className="chevron" />
                </div>
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        .personalizar-config {
          padding: 0;
        }

        .loading {
          padding: 60px;
          text-align: center;
          color: #64748b;
        }

        .categorias-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
          gap: 16px;
        }

        .categoria-card {
          display: flex;
          align-items: center;
          gap: 16px;
          padding: 20px 24px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .categoria-card:hover {
          border-color: #cbd5e1;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
          transform: translateY(-1px);
        }

        .categoria-card:hover .chevron {
          transform: translateX(4px);
        }

        .categoria-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .categoria-content {
          flex: 1;
          min-width: 0;
        }

        .categoria-content h3 {
          margin: 0 0 4px 0;
          font-size: 1rem;
          font-weight: 600;
          color: #0f172a;
        }

        .categoria-content p {
          margin: 0;
          font-size: 0.875rem;
          color: #64748b;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .categoria-meta {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #94a3b8;
        }

        .items-count {
          font-size: 0.875rem;
          font-weight: 500;
          padding: 4px 10px;
          background: #f1f5f9;
          color: #475569;
          border-radius: 20px;
        }

        .chevron {
          transition: transform 0.2s;
        }

        @media (max-width: 600px) {
          .categorias-grid {
            grid-template-columns: 1fr;
          }

          .categoria-card {
            padding: 16px;
          }

          .categoria-icon {
            width: 40px;
            height: 40px;
          }
        }
      `}</style>
    </div>
  );
}
