/**
 * PropiedadContenido - Tab Contenido
 */

import { Propiedad } from '../../../services/api';

interface Props {
  propiedadId: string;
  propiedad: Propiedad;
  onUpdate: (data: Partial<Propiedad>) => Promise<void>;
}

export default function PropiedadContenido({ propiedadId, propiedad, onUpdate }: Props) {
  return (
    <div className="propiedad-contenido">
      <div className="section">
        <h2>Contenido</h2>
        <p>Tab Contenido - En desarrollo</p>
      </div>
      <style>{styles}</style>
    </div>
  );
}

const styles = `
  .propiedad-contenido {
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















