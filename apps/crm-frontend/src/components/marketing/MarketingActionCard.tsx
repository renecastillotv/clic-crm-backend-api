/**
 * Shared Marketing UI Components
 *
 * ActionCard, Section, QuickStat - used across marketing pages
 */

import React from 'react';
import { ChevronRight, AlertCircle } from 'lucide-react';

// ─── ActionCard ───────────────────────────────────────────────

export interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
  status?: 'active' | 'coming_soon' | 'needs_config';
  onClick?: () => void;
}

export const ActionCard: React.FC<ActionCardProps> = ({
  icon,
  title,
  description,
  color,
  status = 'active',
  onClick,
}) => {
  const isDisabled = status === 'coming_soon';

  return (
    <div
      onClick={!isDisabled ? onClick : undefined}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '24px',
        border: '1px solid #e2e8f0',
        cursor: isDisabled ? 'default' : 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
        overflow: 'hidden',
        opacity: isDisabled ? 0.7 : 1,
      }}
      onMouseEnter={(e) => {
        if (!isDisabled) {
          e.currentTarget.style.transform = 'translateY(-4px)';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0, 0, 0, 0.12)';
          e.currentTarget.style.borderColor = color;
        }
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0)';
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.borderColor = '#e2e8f0';
      }}
    >
      {status === 'coming_soon' && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 10px',
            background: '#f1f5f9',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#64748b',
          }}
        >
          Proximamente
        </div>
      )}
      {status === 'needs_config' && (
        <div
          style={{
            position: 'absolute',
            top: '12px',
            right: '12px',
            padding: '4px 10px',
            background: '#fef3c7',
            borderRadius: '20px',
            fontSize: '11px',
            fontWeight: 600,
            color: '#92400e',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
          }}
        >
          <AlertCircle size={12} />
          Configurar
        </div>
      )}

      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '14px',
          background: `linear-gradient(135deg, ${color}20 0%, ${color}10 100%)`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          color: color,
        }}
      >
        {icon}
      </div>

      <h3
        style={{
          fontSize: '16px',
          fontWeight: 600,
          color: '#1e293b',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '13px',
          color: '#64748b',
          lineHeight: 1.5,
          marginBottom: '16px',
        }}
      >
        {description}
      </p>

      {!isDisabled && (
        <button
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '10px 16px',
            background: `linear-gradient(135deg, ${color} 0%, ${color}dd 100%)`,
            color: 'white',
            border: 'none',
            borderRadius: '10px',
            fontSize: '13px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'all 0.2s',
          }}
        >
          {status === 'needs_config' ? 'Configurar' : 'Abrir'}
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  );
};

// ─── Section ──────────────────────────────────────────────────

export interface SectionProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  color?: string;
}

export const Section: React.FC<SectionProps> = ({ title, subtitle, children, icon, color = '#3b82f6' }) => (
  <div style={{ marginBottom: '40px' }}>
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '20px',
      }}
    >
      {icon && (
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: `${color}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color,
          }}
        >
          {icon}
        </div>
      )}
      <div>
        <h2
          style={{
            fontSize: '18px',
            fontWeight: 700,
            color: '#1e293b',
            margin: 0,
          }}
        >
          {title}
        </h2>
        {subtitle && (
          <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>{subtitle}</p>
        )}
      </div>
    </div>
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
        gap: '20px',
      }}
    >
      {children}
    </div>
  </div>
);

// ─── QuickStat ────────────────────────────────────────────────

export interface QuickStatProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  trend?: 'up' | 'down' | 'neutral';
  trendValue?: string;
}

export const QuickStat: React.FC<QuickStatProps> = ({ label, value, icon, color, trend, trendValue }) => (
  <div
    style={{
      background: 'white',
      borderRadius: '12px',
      padding: '20px',
      border: '1px solid #e2e8f0',
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
    }}
  >
    <div
      style={{
        width: '48px',
        height: '48px',
        borderRadius: '12px',
        background: `${color}15`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: color,
      }}
    >
      {icon}
    </div>
    <div>
      <div style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500, marginBottom: '4px' }}>
        {label}
      </div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
        <span style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b' }}>{value}</span>
        {trendValue && (
          <span
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: trend === 'up' ? '#16a34a' : trend === 'down' ? '#ef4444' : '#64748b',
            }}
          >
            {trend === 'up' ? '+' : trend === 'down' ? '-' : ''}{trendValue}
          </span>
        )}
      </div>
    </div>
  </div>
);
