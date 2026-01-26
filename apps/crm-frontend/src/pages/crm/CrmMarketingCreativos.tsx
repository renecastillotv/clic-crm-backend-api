/**
 * CrmMarketingCreativos - Layout wrapper for creative tools
 *
 * Provides a tab bar to switch between:
 * - Artes (Image Converter)
 * - Flyers (Flyer Generator)
 * - Stories (Stories Creator)
 * - Plantillas (Template Bank)
 *
 * Uses React Router <Outlet> to render the active tool.
 */

import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { Image, FileImage, Sparkles, Layout } from 'lucide-react';

const tabs = [
  { id: 'artes', label: 'Artes', icon: <Image size={16} />, path: 'artes' },
  { id: 'flyers', label: 'Flyers', icon: <FileImage size={16} />, path: 'flyers' },
  { id: 'stories', label: 'Stories', icon: <Sparkles size={16} />, path: 'stories' },
  { id: 'plantillas', label: 'Plantillas', icon: <Layout size={16} />, path: 'plantillas' },
];

const CrmMarketingCreativos: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  // Determine which tab is active from the URL
  const activeTab = tabs.find((t) => location.pathname.includes(`/creativos/${t.path}`))?.id || 'artes';

  useEffect(() => {
    setPageHeader({
      title: 'Creativos',
      subtitle: 'Herramientas de diseno y contenido visual',
    });
  }, [setPageHeader]);

  return (
    <div>
      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          padding: '8px 24px',
          background: '#f8fafc',
          borderBottom: '1px solid #e2e8f0',
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => navigate(`${basePath}/marketing/creativos/${tab.path}`)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                background: isActive ? 'white' : 'transparent',
                color: isActive ? '#1e293b' : '#64748b',
                fontSize: '13px',
                fontWeight: isActive ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: isActive ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = '#f1f5f9';
                  e.currentTarget.style.color = '#334155';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#64748b';
                }
              }}
            >
              {tab.icon}
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Active tool rendered via Outlet */}
      <Outlet />
    </div>
  );
};

export default CrmMarketingCreativos;
