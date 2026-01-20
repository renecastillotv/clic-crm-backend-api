/**
 * ToggleSwitch - Toggle ON/OFF moderno y elegante
 */

interface ToggleSwitchProps {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

export default function ToggleSwitch({
  label,
  description,
  checked,
  onChange,
  disabled = false,
}: ToggleSwitchProps) {
  return (
    <div className="toggle-switch-group">
      <div className="toggle-content">
        <div className="toggle-text">
          <label className="toggle-label">{label}</label>
          {description && <p className="toggle-description">{description}</p>}
        </div>
        <button
          type="button"
          className={`toggle-switch ${checked ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
          onClick={() => !disabled && onChange(!checked)}
          disabled={disabled}
          role="switch"
          aria-checked={checked}
        >
          <span className="toggle-slider" />
        </button>
      </div>
      <style>{`
        .toggle-switch-group {
          width: 100%;
        }

        .toggle-content {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
          padding: 16px 20px;
          background: white;
          border: 2px solid #e2e8f0;
          border-radius: 12px;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .toggle-content:hover:not(.disabled) {
          border-color: #cbd5e1;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .toggle-text {
          flex: 1;
        }

        .toggle-label {
          display: block;
          font-weight: 600;
          font-size: 0.95rem;
          color: #0f172a;
          margin-bottom: 4px;
          letter-spacing: -0.01em;
        }

        .toggle-description {
          margin: 0;
          font-size: 0.85rem;
          color: #64748b;
          line-height: 1.4;
        }

        .toggle-switch {
          position: relative;
          width: 56px;
          height: 32px;
          background: #cbd5e1;
          border: none;
          border-radius: 16px;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          flex-shrink: 0;
          padding: 0;
          outline: none;
        }

        .toggle-switch:focus-visible {
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.1);
        }

        .toggle-switch.active {
          background: #1e293b;
        }

        .toggle-switch.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .toggle-slider {
          position: absolute;
          top: 4px;
          left: 4px;
          width: 24px;
          height: 24px;
          background: white;
          border-radius: 50%;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
        }

        .toggle-switch.active .toggle-slider {
          transform: translateX(24px);
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.3);
        }

        .toggle-switch:hover:not(.disabled) {
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.05);
        }

        .toggle-switch.active:hover:not(.disabled) {
          box-shadow: 0 0 0 4px rgba(15, 23, 42, 0.1);
        }
      `}</style>
    </div>
  );
}
















