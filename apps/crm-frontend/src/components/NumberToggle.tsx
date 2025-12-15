/**
 * NumberToggle - Componente para seleccionar números rápidamente (1-5) o ingresar uno mayor
 * 
 * Usado para campos como habitaciones, baños, estacionamientos, etc.
 */

interface NumberToggleProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min?: number;
  max?: number;
  quickOptions?: number[];
}

export default function NumberToggle({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  quickOptions = [1, 2, 3, 4, 5],
}: NumberToggleProps) {
  const numValue = value ? parseFloat(value) : null;
  const maxQuickOption = quickOptions[quickOptions.length - 1];
  const showCustomInput = numValue === null || numValue > maxQuickOption || numValue === 0;

  return (
    <div className="number-toggle-group">
      <label>{label}</label>
      <div className="number-toggle-container">
        <div className="quick-options">
          {quickOptions.map((num) => (
            <button
              key={num}
              type="button"
              className={`quick-option ${numValue === num ? 'active' : ''}`}
              onClick={() => onChange(num.toString())}
            >
              {num}
            </button>
          ))}
        </div>
        <div className="custom-input-wrapper">
          <input
            type="number"
            min={min}
            max={max}
            step={label.toLowerCase().includes('medio') ? 0.5 : 1}
            value={value || ''}
            onChange={(e) => onChange(e.target.value)}
            placeholder="0"
            className="custom-number-input"
            onClick={(e) => {
              // Si está vacío o es 0, seleccionar el texto para facilitar edición
              if (!value || value === '0') {
                (e.target as HTMLInputElement).select();
              }
            }}
          />
        </div>
      </div>
      <style>{`
        .number-toggle-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .number-toggle-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          letter-spacing: -0.01em;
        }

        .number-toggle-container {
          display: flex;
          gap: 6px;
          align-items: center;
        }

        .quick-options {
          display: flex;
          gap: 4px;
        }

        .quick-option {
          width: 40px;
          height: 40px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          color: #475569;
          font-weight: 600;
          font-size: 0.9rem;
          cursor: pointer;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .quick-option:hover {
          border-color: #1e293b;
          color: #0f172a;
          transform: translateY(-2px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .quick-option.active {
          background: #1e293b;
          color: white;
          border-color: #1e293b;
          box-shadow: 0 4px 12px rgba(15, 23, 42, 0.2);
        }

        .custom-input-wrapper {
          flex: 0 0 auto;
          width: 55px;
        }

        .custom-number-input {
          width: 100%;
          padding: 10px 6px;
          border: 2px solid #e2e8f0;
          border-radius: 8px;
          font-size: 0.9rem;
          font-weight: 500;
          transition: all 0.3s;
          background: white;
          color: #0f172a;
          -moz-appearance: textfield;
          text-align: center;
        }

        .custom-number-input::-webkit-inner-spin-button,
        .custom-number-input::-webkit-outer-spin-button {
          -webkit-appearance: none !important;
          appearance: none !important;
          margin: 0;
          display: none;
        }

        .custom-number-input:hover {
          border-color: #cbd5e1;
        }

        .custom-number-input:focus {
          outline: none;
          border-color: #1e293b;
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.08);
        }
      `}</style>
    </div>
  );
}

