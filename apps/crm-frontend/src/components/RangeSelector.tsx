/**
 * RangeSelector - Selector de rango visual para valores numéricos
 * 
 * Usado para campos como condición (1-10)
 */

interface RangeSelectorProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  min: number;
  max: number;
  step?: number;
  labels?: { [key: number]: string };
}

export default function RangeSelector({
  label,
  value,
  onChange,
  min,
  max,
  step = 1,
  labels = {},
}: RangeSelectorProps) {
  const numValue = value ? parseInt(value) : null;
  const options = Array.from({ length: (max - min) / step + 1 }, (_, i) => min + i * step);

  return (
    <div className="range-selector-group">
      <label>{label}</label>
      <div className="range-selector-container">
        <div className="range-options">
          {options.map((num) => {
            const isActive = numValue === num;
            const labelText = labels[num] || num.toString();
            const intensity = ((num - min) / (max - min)) * 100;
            
            return (
              <button
                key={num}
                type="button"
                className={`range-option ${isActive ? 'active' : ''}`}
                onClick={() => onChange(num.toString())}
                style={{
                  '--intensity': `${intensity}%`,
                } as React.CSSProperties}
                title={labelText}
              >
                <span className="range-number">{num}</span>
                {labels[num] && (
                  <span className="range-label">{labels[num]}</span>
                )}
              </button>
            );
          })}
        </div>
        {numValue !== null && (
          <div className="range-value-display">
            <span className="value-label">Valor seleccionado:</span>
            <span className="value-number">{numValue}</span>
            {labels[numValue] && (
              <span className="value-text">{labels[numValue]}</span>
            )}
          </div>
        )}
      </div>
      <style>{`
        .range-selector-group {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .range-selector-group label {
          font-weight: 600;
          color: #1e293b;
          font-size: 0.9rem;
          letter-spacing: -0.01em;
        }

        .range-selector-container {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .range-options {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(80px, 1fr));
          gap: 8px;
        }

        .range-option {
          padding: 16px 12px;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          position: relative;
          overflow: hidden;
        }

        .range-option::before {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: calc(var(--intensity) * 0.04);
          background: linear-gradient(90deg, #10b981 0%, #f59e0b 50%, #ef4444 100%);
          opacity: 0.3;
          transition: opacity 0.3s;
        }

        .range-option:hover {
          border-color: #1e293b;
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
        }

        .range-option:hover::before {
          opacity: 0.5;
        }

        .range-option.active {
          background: #1e293b;
          border-color: #1e293b;
          color: white;
          box-shadow: 0 4px 16px rgba(15, 23, 42, 0.3);
        }

        .range-option.active::before {
          opacity: 0.6;
        }

        .range-number {
          font-size: 1.5rem;
          font-weight: 700;
          line-height: 1;
        }

        .range-label {
          font-size: 0.75rem;
          font-weight: 500;
          opacity: 0.8;
          text-align: center;
        }

        .range-option.active .range-label {
          opacity: 1;
        }

        .range-value-display {
          padding: 16px;
          background: #f8fafc;
          border: 2px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .value-label {
          font-size: 0.9rem;
          color: #64748b;
          font-weight: 500;
        }

        .value-number {
          font-size: 1.5rem;
          font-weight: 700;
          color: #1e293b;
        }

        .value-text {
          font-size: 0.9rem;
          color: #475569;
          font-weight: 500;
          margin-left: auto;
        }
      `}</style>
    </div>
  );
}















