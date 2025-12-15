import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Calendar, ChevronLeft, ChevronRight, Clock, X } from 'lucide-react';

interface DatePickerProps {
  value: string | null;
  onChange: (value: string | null) => void;
  showTime?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

const DAYS_SHORT = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
const MONTHS = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export default function DatePicker({
  value,
  onChange,
  showTime = false,
  placeholder = 'Seleccionar fecha',
  minDate,
  maxDate,
  disabled = false,
  clearable = true,
  className = '',
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedHour, setSelectedHour] = useState('12');
  const [selectedMinute, setSelectedMinute] = useState('00');
  const [viewMode, setViewMode] = useState<'calendar' | 'year' | 'month'>('calendar');
  const inputRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});

  // Parsear el valor inicial
  useEffect(() => {
    if (value) {
      const date = new Date(value);
      if (!isNaN(date.getTime())) {
        setViewDate(date);
        if (showTime) {
          setSelectedHour(date.getHours().toString().padStart(2, '0'));
          setSelectedMinute(date.getMinutes().toString().padStart(2, '0'));
        }
      }
    }
  }, [value, showTime]);

  // Resetear modo de vista al cerrar
  useEffect(() => {
    if (!isOpen) {
      setViewMode('calendar');
    }
  }, [isOpen]);

  // Calcular posición del dropdown cuando se abre
  useEffect(() => {
    if (isOpen && inputRef.current) {
      const rect = inputRef.current.getBoundingClientRect();
      let dropdownHeight = showTime ? 480 : 400;
      if (viewMode === 'year') dropdownHeight = 420;
      if (viewMode === 'month') dropdownHeight = 360;
      const dropdownWidth = 320;

      // Calcular posición
      let top = rect.bottom + 8;
      let left = rect.left;

      // Si no hay espacio abajo, mostrar arriba
      if (window.innerHeight - rect.bottom < dropdownHeight + 20) {
        top = rect.top - dropdownHeight - 8;
      }

      // Si no hay espacio a la derecha, ajustar
      if (left + dropdownWidth > window.innerWidth - 20) {
        left = window.innerWidth - dropdownWidth - 20;
      }

      // Si queda muy arriba, centrar en la pantalla
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
  }, [isOpen, showTime, viewMode]);

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

    // Cerrar con Escape
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

  // Obtener días del mes
  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  // Obtener el primer día del mes (0 = Domingo, ajustamos a Lunes = 0)
  const getFirstDayOfMonth = (year: number, month: number) => {
    const day = new Date(year, month, 1).getDay();
    return day === 0 ? 6 : day - 1;
  };

  // Generar días del calendario
  const generateCalendarDays = () => {
    const year = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);
    const daysInPrevMonth = getDaysInMonth(year, month - 1);

    const days: { day: number; isCurrentMonth: boolean; date: Date }[] = [];

    // Días del mes anterior
    for (let i = firstDay - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month - 1, day),
      });
    }

    // Días del mes actual
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({
        day,
        isCurrentMonth: true,
        date: new Date(year, month, day),
      });
    }

    // Días del mes siguiente (completar 6 semanas = 42 días)
    const remainingDays = 42 - days.length;
    for (let day = 1; day <= remainingDays; day++) {
      days.push({
        day,
        isCurrentMonth: false,
        date: new Date(year, month + 1, day),
      });
    }

    return days;
  };

  // Verificar si una fecha está deshabilitada
  const isDateDisabled = (date: Date) => {
    if (minDate && date < new Date(minDate.setHours(0, 0, 0, 0))) return true;
    if (maxDate && date > new Date(maxDate.setHours(23, 59, 59, 999))) return true;
    return false;
  };

  // Verificar si es hoy
  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  // Verificar si está seleccionado
  const isSelected = (date: Date) => {
    if (!value) return false;
    const selectedDate = new Date(value);
    return date.toDateString() === selectedDate.toDateString();
  };

  // Manejar selección de día
  const handleDayClick = (date: Date) => {
    if (isDateDisabled(date)) return;

    if (showTime) {
      date.setHours(parseInt(selectedHour), parseInt(selectedMinute));
    }

    const formatted = showTime
      ? date.toISOString().slice(0, 16)
      : date.toISOString().slice(0, 10);

    onChange(formatted);

    if (!showTime) {
      setIsOpen(false);
    }
  };

  // Manejar cambio de hora
  const handleTimeChange = (hour: string, minute: string) => {
    setSelectedHour(hour);
    setSelectedMinute(minute);

    if (value) {
      const date = new Date(value);
      date.setHours(parseInt(hour), parseInt(minute));
      onChange(date.toISOString().slice(0, 16));
    }
  };

  // Formatear valor para mostrar
  const formatDisplayValue = () => {
    if (!value) return '';
    const date = new Date(value);
    if (isNaN(date.getTime())) return '';

    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();

    if (showTime) {
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      return `${day} ${month} ${year}, ${hours}:${minutes}`;
    }

    return `${day} ${month} ${year}`;
  };

  // Navegar meses
  const goToPrevMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  // Navegar años
  const goToPrevYear = () => {
    setViewDate(new Date(viewDate.getFullYear() - 1, viewDate.getMonth(), 1));
  };

  const goToNextYear = () => {
    setViewDate(new Date(viewDate.getFullYear() + 1, viewDate.getMonth(), 1));
  };

  // Generar lista de años (100 años hacia atrás desde hoy)
  const generateYears = () => {
    const currentYear = new Date().getFullYear();
    const years: number[] = [];
    // Generar años desde el año actual hasta 100 años atrás
    for (let i = currentYear; i >= currentYear - 100; i--) {
      years.push(i);
    }
    return years;
  };

  // Obtener el rango de años visible (para navegación)
  const getYearRange = () => {
    const currentYear = new Date().getFullYear();
    const startYear = Math.floor((currentYear - viewDate.getFullYear()) / 12) * 12;
    return {
      start: currentYear - startYear,
      end: currentYear - startYear - 11
    };
  };

  // Manejar selección de año
  const handleYearSelect = (year: number) => {
    setViewDate(new Date(year, viewDate.getMonth(), 1));
    setViewMode('month');
  };

  // Manejar selección de mes
  const handleMonthSelect = (month: number) => {
    setViewDate(new Date(viewDate.getFullYear(), month, 1));
    setViewMode('calendar');
  };

  // Abrir selector de año/mes
  const handleMonthYearClick = () => {
    if (viewMode === 'calendar') {
      setViewMode('year');
    } else if (viewMode === 'year') {
      setViewMode('month');
    } else {
      setViewMode('calendar');
    }
  };

  // Ir a hoy
  const goToToday = () => {
    const today = new Date();
    setViewDate(today);
    handleDayClick(today);
  };

  // Limpiar
  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  // Confirmar y cerrar
  const handleConfirm = () => {
    setIsOpen(false);
  };

  // Renderizar el dropdown usando Portal
  const renderDropdown = () => {
    if (!isOpen) return null;

    const dropdown = (
      <>
        {/* Overlay semi-transparente */}
        <div
          className="datepicker-overlay"
          onClick={() => setIsOpen(false)}
        />

        {/* Calendario */}
        <div
          ref={dropdownRef}
          className="datepicker-dropdown"
          style={dropdownStyle}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header con navegación */}
          <div className="datepicker-header">
            {viewMode === 'calendar' && (
              <>
                <button type="button" className="datepicker-nav-btn" onClick={goToPrevMonth}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  type="button" 
                  className="datepicker-month-year-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMonthYearClick();
                  }}
                  title="Haz clic para seleccionar año y mes"
                >
                  {MONTHS[viewDate.getMonth()]} {viewDate.getFullYear()}
                </button>
                <button type="button" className="datepicker-nav-btn" onClick={goToNextMonth}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {viewMode === 'year' && (
              <>
                <button type="button" className="datepicker-nav-btn" onClick={goToPrevYear}>
                  <ChevronLeft className="w-5 h-5" />
                </button>
                <button 
                  type="button" 
                  className="datepicker-month-year-btn"
                  onClick={handleMonthYearClick}
                >
                  {viewDate.getFullYear()}
                </button>
                <button type="button" className="datepicker-nav-btn" onClick={goToNextYear}>
                  <ChevronRight className="w-5 h-5" />
                </button>
              </>
            )}
            {viewMode === 'month' && (
              <button 
                type="button" 
                className="datepicker-month-year-btn"
                onClick={handleMonthYearClick}
                style={{ width: '100%' }}
              >
                {viewDate.getFullYear()}
              </button>
            )}
          </div>

          {/* Vista de calendario */}
          {viewMode === 'calendar' && (
            <>
              {/* Días de la semana */}
              <div className="datepicker-weekdays">
                {DAYS_SHORT.map((day) => (
                  <div key={day} className="datepicker-weekday">{day}</div>
                ))}
              </div>

              {/* Días del mes */}
              <div className="datepicker-days">
                {generateCalendarDays().map((item, index) => (
                  <button
                    key={index}
                    type="button"
                    className={`datepicker-day
                      ${!item.isCurrentMonth ? 'other-month' : ''}
                      ${isToday(item.date) ? 'today' : ''}
                      ${isSelected(item.date) ? 'selected' : ''}
                      ${isDateDisabled(item.date) ? 'disabled' : ''}`}
                    onClick={() => handleDayClick(item.date)}
                    disabled={isDateDisabled(item.date)}
                  >
                    {item.day}
                  </button>
                ))}
              </div>
            </>
          )}

          {/* Vista de selección de año */}
          {viewMode === 'year' && (
            <div className="datepicker-years">
              {generateYears().map((year) => (
                <button
                  key={year}
                  type="button"
                  className={`datepicker-year
                    ${year === viewDate.getFullYear() ? 'selected' : ''}
                    ${year === new Date().getFullYear() ? 'current' : ''}`}
                  onClick={() => handleYearSelect(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          )}

          {/* Vista de selección de mes */}
          {viewMode === 'month' && (
            <div className="datepicker-months">
              {MONTHS.map((month, index) => (
                <button
                  key={index}
                  type="button"
                  className={`datepicker-month
                    ${index === viewDate.getMonth() ? 'selected' : ''}
                    ${index === new Date().getMonth() && viewDate.getFullYear() === new Date().getFullYear() ? 'current' : ''}`}
                  onClick={() => handleMonthSelect(index)}
                >
                  {month}
                </button>
              ))}
            </div>
          )}

          {/* Selector de hora */}
          {showTime && (
            <div className="datepicker-time">
              <div className="datepicker-time-header">
                <Clock className="w-4 h-4" />
                <span>Hora</span>
              </div>
              <div className="datepicker-time-selects">
                <select
                  className="datepicker-time-select"
                  value={selectedHour}
                  onChange={(e) => handleTimeChange(e.target.value, selectedMinute)}
                >
                  {Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0')).map((hour) => (
                    <option key={hour} value={hour}>{hour}</option>
                  ))}
                </select>
                <span className="datepicker-time-separator">:</span>
                <select
                  className="datepicker-time-select"
                  value={selectedMinute}
                  onChange={(e) => handleTimeChange(selectedHour, e.target.value)}
                >
                  {Array.from({ length: 12 }, (_, i) => (i * 5).toString().padStart(2, '0')).map((minute) => (
                    <option key={minute} value={minute}>{minute}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Footer */}
          <div className="datepicker-footer">
            <button type="button" className="datepicker-today-btn" onClick={goToToday}>
              Hoy
            </button>
            <button type="button" className="datepicker-confirm-btn" onClick={handleConfirm}>
              Confirmar
            </button>
          </div>
        </div>
      </>
    );

    return createPortal(dropdown, document.body);
  };

  return (
    <div className={`datepicker-container ${className}`}>
      <style>{`
        .datepicker-container {
          position: relative;
          width: 100%;
        }

        .datepicker-input {
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

        .datepicker-input:hover:not(.disabled) {
          border-color: #cbd5e1;
        }

        .datepicker-input.open {
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .datepicker-input.disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .datepicker-icon {
          color: #9ca3af;
          flex-shrink: 0;
        }

        .datepicker-input.open .datepicker-icon {
          color: #6366f1;
        }

        .datepicker-value {
          flex: 1;
          font-size: 0.9rem;
          color: #1f2937;
          text-align: left;
        }

        .datepicker-placeholder {
          color: #9ca3af;
        }

        .datepicker-clear {
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

        .datepicker-clear:hover {
          background: #fee2e2;
          color: #dc2626;
        }

        /* Overlay para cerrar al hacer clic fuera */
        .datepicker-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.3);
          z-index: 99998;
          animation: datepickerFadeIn 0.15s ease-out;
        }

        .datepicker-dropdown {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
          z-index: 99999;
          overflow: hidden;
          animation: datepickerSlideIn 0.2s ease-out;
        }

        @keyframes datepickerFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes datepickerSlideIn {
          from {
            opacity: 0;
            transform: scale(0.95) translateY(-10px);
          }
          to {
            opacity: 1;
            transform: scale(1) translateY(0);
          }
        }

        .datepicker-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-bottom: 1px solid #f1f5f9;
          background: linear-gradient(135deg, #f8fafc, #ffffff);
        }

        .datepicker-nav-btn {
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

        .datepicker-nav-btn:hover {
          background: #6366f1;
          color: white;
          transform: scale(1.05);
        }

        .datepicker-month-year-btn {
          font-weight: 700;
          font-size: 1rem;
          color: #1f2937;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px 16px;
          border-radius: 8px;
          transition: all 0.15s;
          position: relative;
          user-select: none;
        }

        .datepicker-month-year-btn::after {
          content: '▼';
          font-size: 0.65rem;
          margin-left: 8px;
          opacity: 0.6;
          transition: all 0.15s;
          display: inline-block;
        }

        .datepicker-month-year-btn:hover {
          background: #f1f5f9;
          color: #6366f1;
          transform: scale(1.02);
        }

        .datepicker-month-year-btn:hover::after {
          opacity: 1;
          transform: translateY(1px);
        }

        .datepicker-month-year-btn:active {
          transform: scale(0.98);
        }

        .datepicker-years {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          padding: 16px;
          max-height: 320px;
          overflow-y: auto;
        }

        .datepicker-year {
          padding: 12px 8px;
          border-radius: 10px;
          border: none;
          background: white;
          color: #374151;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .datepicker-year:hover:not(.selected) {
          background: #f1f5f9;
          transform: scale(1.05);
        }

        .datepicker-year.current:not(.selected) {
          background: #eef2ff;
          color: #6366f1;
          font-weight: 600;
        }

        .datepicker-year.selected {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .datepicker-months {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          padding: 16px;
        }

        .datepicker-month {
          padding: 16px 8px;
          border-radius: 10px;
          border: none;
          background: white;
          color: #374151;
          font-size: 0.9rem;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.15s;
        }

        .datepicker-month:hover:not(.selected) {
          background: #f1f5f9;
          transform: scale(1.05);
        }

        .datepicker-month.current:not(.selected) {
          background: #eef2ff;
          color: #6366f1;
          font-weight: 600;
        }

        .datepicker-month.selected {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
        }

        .datepicker-weekdays {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          padding: 12px 16px 8px;
          gap: 4px;
          background: #fafbfc;
        }

        .datepicker-weekday {
          text-align: center;
          font-size: 0.7rem;
          font-weight: 700;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          padding: 4px;
        }

        .datepicker-days {
          display: grid;
          grid-template-columns: repeat(7, 1fr);
          padding: 8px 16px 16px;
          gap: 4px;
        }

        .datepicker-day {
          aspect-ratio: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.9rem;
          border-radius: 10px;
          border: none;
          background: transparent;
          color: #374151;
          cursor: pointer;
          transition: all 0.15s;
          font-weight: 500;
        }

        .datepicker-day:hover:not(.disabled):not(.selected) {
          background: #f1f5f9;
          transform: scale(1.1);
        }

        .datepicker-day.other-month {
          color: #d1d5db;
        }

        .datepicker-day.today:not(.selected) {
          background: #eef2ff;
          color: #6366f1;
          font-weight: 700;
          box-shadow: inset 0 0 0 2px #6366f1;
        }

        .datepicker-day.selected {
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-weight: 700;
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transform: scale(1.1);
        }

        .datepicker-day.disabled {
          color: #e2e8f0;
          cursor: not-allowed;
        }

        .datepicker-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
          background: #fafbfc;
          gap: 12px;
        }

        .datepicker-today-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          background: white;
          color: #6366f1;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .datepicker-today-btn:hover {
          background: #eef2ff;
          border-color: #c7d2fe;
        }

        .datepicker-confirm-btn {
          flex: 1;
          padding: 12px 16px;
          border-radius: 10px;
          border: none;
          background: linear-gradient(135deg, #6366f1, #8b5cf6);
          color: white;
          font-size: 0.85rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }

        .datepicker-confirm-btn:hover {
          box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
          transform: translateY(-1px);
        }

        /* Time Picker Section */
        .datepicker-time {
          padding: 16px 20px;
          border-top: 1px solid #f1f5f9;
          background: #fafbfc;
        }

        .datepicker-time-header {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 12px;
          color: #64748b;
          font-size: 0.8rem;
          font-weight: 600;
        }

        .datepicker-time-selects {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .datepicker-time-select {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          background: white;
          font-size: 1.1rem;
          font-weight: 700;
          color: #1f2937;
          text-align: center;
          cursor: pointer;
          transition: all 0.15s;
          appearance: none;
        }

        .datepicker-time-select:hover {
          border-color: #cbd5e1;
        }

        .datepicker-time-select:focus {
          outline: none;
          border-color: #6366f1;
          box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
        }

        .datepicker-time-separator {
          font-size: 1.5rem;
          font-weight: 700;
          color: #64748b;
        }
      `}</style>

      {/* Input */}
      <div
        ref={inputRef}
        className={`datepicker-input ${isOpen ? 'open' : ''} ${disabled ? 'disabled' : ''}`}
        onClick={() => !disabled && setIsOpen(!isOpen)}
      >
        <Calendar className="datepicker-icon w-5 h-5" />
        <span className={`datepicker-value ${!value ? 'datepicker-placeholder' : ''}`}>
          {value ? formatDisplayValue() : placeholder}
        </span>
        {clearable && value && !disabled && (
          <button type="button" className="datepicker-clear" onClick={handleClear}>
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Dropdown via Portal */}
      {renderDropdown()}
    </div>
  );
}
