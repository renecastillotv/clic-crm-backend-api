/**
 * DateRangeFilter - Componente para filtrar por rango de fechas
 * 
 * Permite seleccionar períodos predefinidos o un rango personalizado
 */

import React, { useState } from 'react';
import { Calendar, X } from 'lucide-react';
import DatePicker from './DatePicker';

export type DateRangePreset = 
  | 'today' 
  | 'yesterday' 
  | 'last_week' 
  | 'this_month' 
  | 'last_month' 
  | 'last_quarter' 
  | 'last_semester' 
  | 'this_year' 
  | 'last_year'
  | 'custom';

export interface DateRangeFilterProps {
  value?: {
    preset?: DateRangePreset;
    start?: string;
    end?: string;
  };
  onChange: (value: { preset?: DateRangePreset; start?: string; end?: string }) => void;
  onClose?: () => void;
}

const DateRangeFilter: React.FC<DateRangeFilterProps> = ({
  value = {},
  onChange,
  onClose,
}) => {
  const [preset, setPreset] = useState<DateRangePreset>(value.preset || 'custom');
  const [customStart, setCustomStart] = useState(value.start || '');
  const [customEnd, setCustomEnd] = useState(value.end || '');

  const presets = [
    { value: 'today', label: 'Hoy' },
    { value: 'yesterday', label: 'Ayer' },
    { value: 'last_week', label: 'Semana pasada' },
    { value: 'this_month', label: 'Este mes' },
    { value: 'last_month', label: 'Mes pasado' },
    { value: 'last_quarter', label: 'Trimestre pasado' },
    { value: 'last_semester', label: 'Semestre pasado' },
    { value: 'this_year', label: 'Este año' },
    { value: 'last_year', label: 'Año pasado' },
    { value: 'custom', label: 'Personalizado' },
  ];

  const calculatePresetDates = (presetValue: DateRangePreset): { start?: string; end?: string } => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (presetValue) {
      case 'today':
        return {
          start: today.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          start: yesterday.toISOString().split('T')[0],
          end: yesterday.toISOString().split('T')[0],
        };
      
      case 'last_week':
        const lastWeekStart = new Date(today);
        lastWeekStart.setDate(lastWeekStart.getDate() - 7);
        return {
          start: lastWeekStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      
      case 'this_month':
        const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
          start: thisMonthStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      
      case 'last_month':
        const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
          start: lastMonthStart.toISOString().split('T')[0],
          end: lastMonthEnd.toISOString().split('T')[0],
        };
      
      case 'last_quarter':
        const currentQuarter = Math.floor(today.getMonth() / 3);
        const lastQuarterStart = new Date(today.getFullYear(), (currentQuarter - 1) * 3, 1);
        const lastQuarterEnd = new Date(today.getFullYear(), currentQuarter * 3, 0);
        return {
          start: lastQuarterStart.toISOString().split('T')[0],
          end: lastQuarterEnd.toISOString().split('T')[0],
        };
      
      case 'last_semester':
        const currentSemester = Math.floor(today.getMonth() / 6);
        const lastSemesterStart = new Date(today.getFullYear(), (currentSemester - 1) * 6, 1);
        const lastSemesterEnd = new Date(today.getFullYear(), currentSemester * 6, 0);
        return {
          start: lastSemesterStart.toISOString().split('T')[0],
          end: lastSemesterEnd.toISOString().split('T')[0],
        };
      
      case 'this_year':
        const thisYearStart = new Date(today.getFullYear(), 0, 1);
        return {
          start: thisYearStart.toISOString().split('T')[0],
          end: today.toISOString().split('T')[0],
        };
      
      case 'last_year':
        const lastYearStart = new Date(today.getFullYear() - 1, 0, 1);
        const lastYearEnd = new Date(today.getFullYear() - 1, 11, 31);
        return {
          start: lastYearStart.toISOString().split('T')[0],
          end: lastYearEnd.toISOString().split('T')[0],
        };
      
      default:
        return {};
    }
  };

  const handlePresetChange = (newPreset: DateRangePreset) => {
    setPreset(newPreset);
    
    if (newPreset === 'custom') {
      onChange({
        preset: 'custom',
        start: customStart,
        end: customEnd,
      });
    } else {
      const dates = calculatePresetDates(newPreset);
      onChange({
        preset: newPreset,
        ...dates,
      });
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', date: string) => {
    if (type === 'start') {
      setCustomStart(date);
      onChange({
        preset: 'custom',
        start: date,
        end: customEnd,
      });
    } else {
      setCustomEnd(date);
      onChange({
        preset: 'custom',
        start: customStart,
        end: date,
      });
    }
  };

  const handleClear = () => {
    setPreset('custom');
    setCustomStart('');
    setCustomEnd('');
    onChange({});
  };

  return (
    <>
      <div className="modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '16px', marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Calendar className="w-5 h-5" style={{ color: '#64748b' }} />
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#1e293b', margin: 0 }}>Seleccionar Período</h3>
        </div>
        {onClose && (
          <button 
            className="modal-close" 
            onClick={onClose}
            style={{ 
              background: 'transparent', 
              border: 'none', 
              cursor: 'pointer',
              padding: '4px',
              borderRadius: '4px',
              transition: 'background 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = '#f1f5f9'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
          >
            <X className="w-5 h-5" style={{ color: '#64748b' }} />
          </button>
        )}
      </div>

      <div className="modal-body">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Períodos predefinidos */}
          <div>
            <label style={{ 
              display: 'block', 
              fontSize: '0.875rem', 
              fontWeight: 600, 
              color: '#475569',
              marginBottom: '12px'
            }}>
              Períodos Predefinidos
            </label>
            <div style={{
              background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
              border: '1px solid #bae6fd',
              borderRadius: '12px',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: '10px'
            }}>
              {presets.map((p) => (
                <label
                  key={p.value}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderRadius: '10px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    background: preset === p.value 
                      ? 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' 
                      : 'transparent',
                    border: preset === p.value 
                      ? '2px solid #0ea5e9' 
                      : '2px solid transparent',
                    boxShadow: preset === p.value 
                      ? '0 4px 6px rgba(14, 165, 233, 0.25)' 
                      : 'none',
                    minWidth: '140px',
                    justifyContent: 'flex-start'
                  }}
                  onMouseEnter={(e) => {
                    if (preset !== p.value) {
                      e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)';
                      e.currentTarget.style.borderColor = '#7dd3fc';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (preset !== p.value) {
                      e.currentTarget.style.background = 'transparent';
                      e.currentTarget.style.borderColor = 'transparent';
                    }
                  }}
                >
                  <input
                    type="radio"
                    name="datePreset"
                    value={p.value}
                    checked={preset === p.value}
                    onChange={() => handlePresetChange(p.value as DateRangePreset)}
                    style={{
                      width: '20px',
                      height: '20px',
                      cursor: 'pointer',
                      accentColor: '#0ea5e9',
                      flexShrink: 0
                    }}
                  />
                  <span style={{ 
                    fontSize: '0.9375rem', 
                    fontWeight: preset === p.value ? 600 : 500,
                    color: preset === p.value ? '#0c4a6e' : '#0369a1',
                    whiteSpace: 'nowrap'
                  }}>
                    {p.label}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {/* Período personalizado */}
          {preset === 'custom' && (
            <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '20px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '0.875rem', 
                fontWeight: 600, 
                color: '#475569',
                marginBottom: '12px'
              }}>
                Período Personalizado
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.8125rem', 
                    color: '#64748b',
                    marginBottom: '6px',
                    fontWeight: 500
                  }}>
                    Desde
                  </label>
                  <DatePicker
                    value={customStart}
                    onChange={(date) => handleCustomDateChange('start', date || '')}
                    placeholder="Fecha inicio"
                  />
                </div>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '0.8125rem', 
                    color: '#64748b',
                    marginBottom: '6px',
                    fontWeight: 500
                  }}>
                    Hasta
                  </label>
                  <DatePicker
                    value={customEnd}
                    onChange={(date) => handleCustomDateChange('end', date || '')}
                    placeholder="Fecha fin"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="modal-footer">
        <button
          onClick={handleClear}
          className="btn-secondary"
        >
          Limpiar
        </button>
        {onClose && (
          <button
            onClick={onClose}
            className="btn-primary"
          >
            Aplicar
          </button>
        )}
      </div>
    </>
  );
};

export default DateRangeFilter;

