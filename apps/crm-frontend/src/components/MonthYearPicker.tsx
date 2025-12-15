/**
 * MonthYearPicker - Selector de mes y año (sin día)
 */

import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';

interface MonthYearPickerProps {
  value: string | null; // Formato: "YYYY-MM" o null
  onChange: (value: string | null) => void;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function MonthYearPicker({
  value,
  onChange,
  placeholder = 'Seleccionar mes y año',
  minDate,
  maxDate,
  disabled = false,
  clearable = true,
  className = '',
}: MonthYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewYear, setViewYear] = useState<number>(new Date().getFullYear());
  const inputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Parsear el valor inicial
  useEffect(() => {
    if (value) {
      const [year, month] = value.split('-').map(Number);
      if (!isNaN(year) && !isNaN(month)) {
        setViewYear(year);
      }
    } else {
      setViewYear(new Date().getFullYear());
    }
  }, [value]);

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      const dropdownHeight = 400;
      const dropdownWidth = 420;

      let top = rect.bottom + 8;
      let left = rect.left;

      if (window.innerHeight - rect.bottom < dropdownHeight + 20) {
        top = rect.top - dropdownHeight - 8;
      }

      if (left + dropdownWidth > window.innerWidth - 20) {
        left = window.innerWidth - dropdownWidth - 20;
      }

      if (top < 20) {
        top = Math.max(20, (window.innerHeight - dropdownHeight) / 2);
      }

      setDropdownStyle({
        position: 'fixed',
        top: `${top}px`,
        left: `${left}px`,
        width: `${dropdownWidth}px`,
      });
    }
  }, [isOpen]);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (
        inputRef.current && !inputRef.current.contains(target) &&
        dropdownRef.current && !dropdownRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  // Verificar si un mes está deshabilitado
  const isMonthDisabled = (year: number, month: number) => {
    if (minDate) {
      const minYear = minDate.getFullYear();
      const minMonth = minDate.getMonth();
      if (year < minYear || (year === minYear && month < minMonth)) return true;
    }
    if (maxDate) {
      const maxYear = maxDate.getFullYear();
      const maxMonth = maxDate.getMonth();
      if (year > maxYear || (year === maxYear && month > maxMonth)) return true;
    }
    return false;
  };

  // Verificar si está seleccionado
  const isSelected = (year: number, month: number) => {
    if (!value) return false;
    const [selectedYear, selectedMonth] = value.split('-').map(Number);
    return year === selectedYear && month === selectedMonth;
  };

  // Manejar selección de mes
  const handleMonthClick = (year: number, month: number) => {
    if (isMonthDisabled(year, month)) return;
    const formatted = `${year}-${String(month + 1).padStart(2, '0')}`;
    onChange(formatted);
    setIsOpen(false);
  };

  // Formatear valor para mostrar
  const formatDisplayValue = () => {
    if (!value) return '';
    const [year, month] = value.split('-').map(Number);
    if (isNaN(year) || isNaN(month)) return '';
    return `${MONTHS[month - 1]} ${year}`;
  };

  // Navegar años
  const goToPrevYear = () => {
    setViewYear(viewYear - 1);
  };

  const goToNextYear = () => {
    setViewYear(viewYear + 1);
  };

  // Limpiar
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  // Renderizar el dropdown usando Portal
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <>
        <div
          className="monthyearpicker-overlay"
          onClick={() => setIsOpen(false)}
        />
        <div
          ref={dropdownRef}
          className="monthyearpicker-dropdown"
          style={dropdownStyle}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="monthyearpicker-header">
            <button type="button" className="monthyearpicker-nav-btn" onClick={goToPrevYear}>
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="monthyearpicker-year">{viewYear}</span>
            <button type="button" className="monthyearpicker-nav-btn" onClick={goToNextYear}>
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="monthyearpicker-months">
            {MONTHS.map((month, index) => {
              const isDisabled = isMonthDisabled(viewYear, index);
              const isSelectedMonth = isSelected(viewYear, index);
              return (
                <button
                  key={index}
                  type="button"
                  className={`monthyearpicker-month
                    ${isSelectedMonth ? 'selected' : ''}
                    ${isDisabled ? 'disabled' : ''}`}
                  onClick={() => handleMonthClick(viewYear, index)}
                  disabled={isDisabled}
                >
                  {month}
                </button>
              );
            })}
          </div>
        </div>
      </>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className={`monthyearpicker-container ${className}`}>
      <style>{`
        .monthyearpicker-container {
          position: relative;
          width: 100%;
        }

        .monthyearpicker-input {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 14px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          transition: all 0.2s;
          min-height: 44px;
        }

        .monthyearpicker-input:hover:not(.disabled) {
          border-color: #cbd5e1;
        }

        .monthyearpicker-input.open {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .monthyearpicker-input.disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .monthyearpicker-icon {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .monthyearpicker-input.open .monthyearpicker-icon {
          color: #6366f1;
        }

        .monthyearpicker-value {
          flex: 1;
          font-size: 0.9rem;
          color: #1f2937;
          text-align: left;
        }

        .monthyearpicker-placeholder {
          color: #9ca3af;
        }

        .monthyearpicker-clear {
          width: 20px;
          height: 20px;
          border-radius: 50%;
          border: none;
          background: #f1f5f9;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          flex-shrink: 0;
        }

        .monthyearpicker-clear:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        .monthyearpicker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 99998;
          animation: monthyearpickerFadeIn 0.15s ease-out;
        }

        .monthyearpicker-dropdown {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          z-index: 99999;
          overflow: hidden;
          animation: monthyearpickerSlideIn 0.2s ease-out;
        }

        @keyframes monthyearpickerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes monthyearpickerSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .monthyearpicker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #f8fafc, #ffffff);
        }

        .monthyearpicker-nav-btn {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          border: none;
          background: white;
          color: #64748b;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
        }

        .monthyearpicker-nav-btn:hover {
          background: #6366f1;
          color: white;
          transform: scale(1.05);
        }

        .monthyearpicker-year {
          font-weight: 700;
          font-size: 1.2rem;
          color: #1f2937;
        }

        .monthyearpicker-months {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          padding: 20px;
          gap: 10px;
        }

        .monthyearpicker-month {
          padding: 14px 18px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 500;
          font-size: 0.95rem;
          text-align: center;
        }

        .monthyearpicker-month:hover:not(.disabled):not(.selected) {
          background: #f1f5f9;
          border-color: #cbd5e1;
          transform: scale(1.05);
        }

        .monthyearpicker-month.selected {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-weight: 700;
          border-color: #6366f1;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .monthyearpicker-month.disabled {
          color: #e2e8f0;
          cursor: not-allowed;
          background: #f8fafc;
        }
      `}</style>

      <div
        ref={inputRef}
        className={`monthyearpicker-input ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Calendar className="monthyearpicker-icon w-5 h-5" />
        <span className={`monthyearpicker-value ${!value ? 'monthyearpicker-placeholder' : ''}`}>
          {value ? formatDisplayValue() : placeholder}
        </span>
        {clearable && value && !disabled && (
          <button type="button" className="monthyearpicker-clear" onClick={handleClear}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {renderDropdown()}
    </div>
  );
}

