/**
 * PropiedadProyecto - Tab Datos del Proyecto
 * Solo visible si is_project = true
 *
 * Incluye:
 * - Seccion de Disponibilidad (enlace, archivo o inventario)
 */

import { Propiedad } from '../../../services/api';
import DisponibilidadSection from '../../../components/DisponibilidadSection';
import { useAuth } from '../../../contexts/AuthContext';

interface Props {
  propiedadId: string;
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
}

export default function PropiedadProyecto({ propiedadId, propiedad }: Props) {
  const { tenantActual } = useAuth();
  const tenantId = tenantActual?.id;
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

  // Extraer tipologias de la propiedad (si existen como campo JSONB)
  const tipologias = Array.isArray((propiedad as any).tipologias)
    ? (propiedad as any).tipologias.map((t: any, idx: number) => ({
        id: t.id || `tip-${idx}`,
        nombre: t.nombre || t.name || `Tipologia ${idx + 1}`,
        habitaciones: t.habitaciones || t.recamaras,
        banos: t.banos,
        m2: t.m2 || t.m2_construccion,
      }))
    : [];

  // Funcion para subir archivos
  const handleUploadFile = async (file: File): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('tipo', 'disponibilidad');

    const res = await fetch(`${API_URL}/tenants/${tenantId}/upload`, {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      throw new Error('Error al subir archivo');
    }

    const data = await res.json();
    return data.url;
  };

  return (
    <div className="propiedad-proyecto">
      {/* Seccion de Disponibilidad */}
      <div className="section">
        <div className="section-header">
          <h2>Disponibilidad</h2>
          <p className="section-description">
            Configura como mostrar la disponibilidad de unidades del proyecto
          </p>
        </div>
        <DisponibilidadSection
          propiedadId={propiedadId}
          tipologias={tipologias}
          onUploadFile={handleUploadFile}
        />
      </div>

      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propiedad-proyecto {
    max-width: 1200px;
  }

  .section {
    background: white;
    border-radius: 12px;
    padding: 24px;
    margin-bottom: 24px;
    border: 1px solid #e2e8f0;
  }

  .section-header {
    margin-bottom: 20px;
  }

  .section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 8px 0;
  }

  .section-description {
    font-size: 0.9rem;
    color: #64748b;
    margin: 0;
  }
`;
