/**
 * PropiedadProyecto - Tab Datos del Proyecto
 * Solo visible si is_project = true
 */

import { Propiedad } from '../../../services/api';

interface Props {
  propiedadId: string;
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
}

export default function PropiedadProyecto({ propiedadId, propiedad, onUpdate }: Props) {
  return (
    <div className="propiedad-proyecto">
      <div className="section">
        <h2>Datos del Proyecto</h2>
        <p>Tab Datos del Proyecto - En desarrollo</p>
        <p>Propiedad ID: {propiedadId}</p>
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

  .section h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #0f172a;
    margin: 0 0 16px 0;
  }
`;















