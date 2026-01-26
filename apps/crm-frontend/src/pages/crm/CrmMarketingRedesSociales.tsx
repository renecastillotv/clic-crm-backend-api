/**
 * CrmMarketingRedesSociales - Redes Sociales
 *
 * Functional page for publishing to Facebook Page and Instagram:
 * - Publish text/photo posts to FB and/or IG
 * - View recent Facebook Page posts
 * - View recent Instagram media
 * - Read and reply to comments
 */

import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  Instagram,
  Facebook,
  Send,
  Image,
  Link as LinkIcon,
  MessageSquare,
  ThumbsUp,
  Share2,
  ExternalLink,
  Loader2,
  AlertCircle,
  CheckCircle,
  XCircle,
  ChevronRight,
  RefreshCw,
  Settings,
} from 'lucide-react';

// ==================== TYPES ====================

interface MetaPost {
  id: string;
  message?: string;
  fullPicture?: string;
  createdTime: string;
  type: string;
  permalink?: string;
  likes: number;
  comments: number;
  shares: number;
}

interface MetaIGMedia {
  id: string;
  caption?: string;
  mediaUrl?: string;
  thumbnailUrl?: string;
  permalink?: string;
  mediaType: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
}

interface MetaComment {
  id: string;
  message: string;
  from?: { id: string; name: string };
  createdTime: string;
  likeCount: number;
  replies?: MetaComment[];
}

interface Credentials {
  metaConnected: boolean;
  metaPageId?: string;
  metaPageName?: string;
  metaInstagramBusinessAccountId?: string;
  metaInstagramUsername?: string;
}

type TabId = 'publish' | 'facebook' | 'instagram';

// ==================== COMPONENT ====================

const CrmMarketingRedesSociales: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';

  // Connection state
  const [credentials, setCredentials] = useState<Credentials | null>(null);
  const [loading, setLoading] = useState(true);

  // Tab state
  const [activeTab, setActiveTab] = useState<TabId>('publish');

  // Publish form state
  const [message, setMessage] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [targetFacebook, setTargetFacebook] = useState(true);
  const [targetInstagram, setTargetInstagram] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<Record<string, { success: boolean; error?: string }> | null>(null);

  // Posts state
  const [fbPosts, setFbPosts] = useState<MetaPost[]>([]);
  const [fbPostsLoading, setFbPostsLoading] = useState(false);
  const [igMedia, setIgMedia] = useState<MetaIGMedia[]>([]);
  const [igMediaLoading, setIgMediaLoading] = useState(false);

  // Comments state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<MetaComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);

  useEffect(() => {
    setPageHeader({
      title: 'Redes Sociales',
      subtitle: 'Publica en Facebook e Instagram',
    });
  }, [setPageHeader]);

  // Load credentials
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!tenantActual?.id) return;
      try {
        const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials`);
        const data = await response.json();
        setCredentials({
          metaConnected: data.metaConnected || false,
          metaPageId: data.metaPageId,
          metaPageName: data.metaPageName,
          metaInstagramBusinessAccountId: data.metaInstagramBusinessAccountId,
          metaInstagramUsername: data.metaInstagramUsername,
        });
      } catch (error) {
        console.error('Error fetching credentials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCredentials();
  }, [tenantActual?.id]);

  const isFullyConnected = credentials?.metaConnected && credentials?.metaPageId && credentials.metaPageId !== 'PENDING';
  const hasInstagram = !!credentials?.metaInstagramBusinessAccountId;

  // Load FB posts when tab changes
  const loadFbPosts = useCallback(async () => {
    if (!tenantActual?.id || !isFullyConnected) return;
    setFbPostsLoading(true);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/posts?limit=20`);
      const data = await response.json();
      setFbPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading FB posts:', error);
    } finally {
      setFbPostsLoading(false);
    }
  }, [tenantActual?.id, isFullyConnected]);

  const loadIgMedia = useCallback(async () => {
    if (!tenantActual?.id || !hasInstagram) return;
    setIgMediaLoading(true);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/instagram-media?limit=20`);
      const data = await response.json();
      setIgMedia(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading IG media:', error);
    } finally {
      setIgMediaLoading(false);
    }
  }, [tenantActual?.id, hasInstagram]);

  useEffect(() => {
    if (activeTab === 'facebook' && fbPosts.length === 0) loadFbPosts();
    if (activeTab === 'instagram' && igMedia.length === 0) loadIgMedia();
  }, [activeTab, loadFbPosts, loadIgMedia, fbPosts.length, igMedia.length]);

  // Publish handler
  const handlePublish = async () => {
    if (!tenantActual?.id) return;
    if (!message && !imageUrl) return;
    if (!targetFacebook && !targetInstagram) return;

    setPublishing(true);
    setPublishResult(null);

    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/publish`, {
        method: 'POST',
        body: JSON.stringify({
          message: message || undefined,
          imageUrl: imageUrl || undefined,
          link: linkUrl || undefined,
          targets: { facebook: targetFacebook, instagram: targetInstagram },
        }),
      });
      const result = await response.json();
      setPublishResult(result);

      // Clear form on any success
      const anySuccess = Object.values(result).some((r: any) => r.success);
      if (anySuccess) {
        setMessage('');
        setImageUrl('');
        setLinkUrl('');
        // Reload posts
        if (targetFacebook) setTimeout(loadFbPosts, 2000);
        if (targetInstagram) setTimeout(loadIgMedia, 2000);
      }
    } catch (error: any) {
      setPublishResult({ error: { success: false, error: error.message || 'Error al publicar' } });
    } finally {
      setPublishing(false);
    }
  };

  // Comments handler
  const loadComments = async (postId: string) => {
    if (!tenantActual?.id) return;
    setSelectedPostId(postId);
    setCommentsLoading(true);
    setComments([]);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/posts/${postId}/comments`);
      const data = await response.json();
      setComments(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading comments:', error);
    } finally {
      setCommentsLoading(false);
    }
  };

  const handleReply = async (commentId: string) => {
    if (!tenantActual?.id || !replyText.trim()) return;
    setReplyLoading(true);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/comments/${commentId}/reply`, {
        method: 'POST',
        body: JSON.stringify({ message: replyText }),
      });
      setReplyText('');
      setReplyingTo(null);
      // Reload comments
      if (selectedPostId) loadComments(selectedPostId);
    } catch (error) {
      console.error('Error replying:', error);
      alert('Error al responder al comentario');
    } finally {
      setReplyLoading(false);
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('es-MX', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return dateStr;
    }
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: '#e11d48' }} />
      </div>
    );
  }

  // Not connected - show CTA
  if (!isFullyConnected) {
    return (
      <div style={{ padding: '24px', maxWidth: '700px', margin: '0 auto' }}>
        <div
          style={{
            background: 'white',
            borderRadius: '20px',
            padding: '48px',
            textAlign: 'center',
            border: '1px solid #e2e8f0',
          }}
        >
          <div
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1877f220 0%, #e11d4820 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
            }}
          >
            <Share2 size={36} color="#e11d48" />
          </div>
          <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 12px 0' }}>
            Conecta tus redes sociales
          </h2>
          <p style={{ fontSize: '15px', color: '#64748b', margin: '0 0 32px 0', lineHeight: 1.6, maxWidth: '480px', marginLeft: 'auto', marginRight: 'auto' }}>
            Para publicar en Facebook e Instagram, primero necesitas conectar tu cuenta de Meta
            y seleccionar la Pagina de Facebook de tu empresa.
          </p>
          <button
            onClick={() => navigate(`${basePath}/marketing/configuracion`)}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: 'linear-gradient(135deg, #1877f2 0%, #e11d48 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: 'pointer',
            }}
          >
            <Settings size={18} />
            Ir a Configuracion
            <ChevronRight size={18} />
          </button>

          {credentials?.metaConnected && credentials?.metaPageId === 'PENDING' && (
            <div
              style={{
                marginTop: '24px',
                padding: '16px 24px',
                background: '#fef3c7',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                justifyContent: 'center',
              }}
            >
              <AlertCircle size={18} color="#92400e" />
              <span style={{ fontSize: '13px', color: '#92400e', fontWeight: 500 }}>
                Meta esta conectado pero no has seleccionado una pagina. Ve a Configuracion para elegir tu pagina.
              </span>
            </div>
          )}
        </div>

        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  // Connected - full UI
  return (
    <div style={{ padding: '24px', maxWidth: '1000px' }}>
      {/* Connection status bar */}
      <div
        style={{
          background: 'white',
          borderRadius: '16px',
          padding: '16px 24px',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: '#1877f215',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#1877f2',
            }}
          >
            <Facebook size={20} />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
              {credentials.metaPageName}
            </div>
            <div style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <CheckCircle size={12} /> Conectado
            </div>
          </div>
        </div>

        {hasInstagram && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '40px',
                height: '40px',
                borderRadius: '10px',
                background: '#e11d4815',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#e11d48',
              }}
            >
              <Instagram size={20} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>
                @{credentials.metaInstagramUsername}
              </div>
              <div style={{ fontSize: '12px', color: '#16a34a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <CheckCircle size={12} /> Conectado
              </div>
            </div>
          </div>
        )}

        <div style={{ marginLeft: 'auto' }}>
          <button
            onClick={() => navigate(`${basePath}/marketing/configuracion`)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 14px',
              background: '#f1f5f9',
              border: 'none',
              borderRadius: '8px',
              fontSize: '12px',
              fontWeight: 500,
              color: '#64748b',
              cursor: 'pointer',
            }}
          >
            <Settings size={14} />
            Configuracion
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div
        style={{
          display: 'flex',
          gap: '4px',
          marginBottom: '24px',
          background: '#f1f5f9',
          borderRadius: '12px',
          padding: '4px',
        }}
      >
        {[
          { id: 'publish' as TabId, label: 'Publicar', icon: <Send size={16} /> },
          { id: 'facebook' as TabId, label: 'Facebook', icon: <Facebook size={16} /> },
          ...(hasInstagram ? [{ id: 'instagram' as TabId, label: 'Instagram', icon: <Instagram size={16} /> }] : []),
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '10px 16px',
              background: activeTab === tab.id ? 'white' : 'transparent',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: activeTab === tab.id ? 600 : 500,
              color: activeTab === tab.id ? '#1e293b' : '#64748b',
              cursor: 'pointer',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
              transition: 'all 0.15s',
            }}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== PUBLISH TAB ==================== */}
      {activeTab === 'publish' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Post form */}
          <div
            style={{
              background: 'white',
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
                Nueva publicacion
              </h3>
            </div>

            <div style={{ padding: '24px' }}>
              {/* Message textarea */}
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escribe tu publicacion..."
                style={{
                  width: '100%',
                  minHeight: '120px',
                  padding: '16px',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  color: '#1e293b',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
                onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
                onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
              />

              {/* Image URL */}
              <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <Image size={14} />
                    URL de imagen {targetInstagram ? '(requerida para IG)' : '(opcional)'}
                  </label>
                  <input
                    type="url"
                    value={imageUrl}
                    onChange={(e) => setImageUrl(e.target.value)}
                    placeholder="https://ejemplo.com/imagen.jpg"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              </div>

              {/* Link URL (FB only) */}
              {!imageUrl && targetFacebook && (
                <div style={{ marginTop: '12px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                    <LinkIcon size={14} />
                    URL del enlace (opcional, solo Facebook)
                  </label>
                  <input
                    type="url"
                    value={linkUrl}
                    onChange={(e) => setLinkUrl(e.target.value)}
                    placeholder="https://ejemplo.com/propiedad"
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      border: '1px solid #e2e8f0',
                      borderRadius: '8px',
                      fontSize: '13px',
                      color: '#1e293b',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                </div>
              )}

              {/* Image preview */}
              {imageUrl && (
                <div style={{ marginTop: '12px' }}>
                  <img
                    src={imageUrl}
                    alt="Preview"
                    style={{
                      maxWidth: '200px',
                      maxHeight: '200px',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      objectFit: 'cover',
                    }}
                    onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                  />
                </div>
              )}

              {/* Targets */}
              <div style={{ marginTop: '20px', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={targetFacebook}
                    onChange={(e) => setTargetFacebook(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#1877f2' }}
                  />
                  <Facebook size={16} color="#1877f2" />
                  <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                    Facebook Page
                  </span>
                </label>

                {hasInstagram && (
                  <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={targetInstagram}
                      onChange={(e) => setTargetInstagram(e.target.checked)}
                      style={{ width: '18px', height: '18px', accentColor: '#e11d48' }}
                    />
                    <Instagram size={16} color="#e11d48" />
                    <span style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b' }}>
                      Instagram
                    </span>
                  </label>
                )}
              </div>

              {/* Instagram image warning */}
              {targetInstagram && !imageUrl && (
                <div
                  style={{
                    marginTop: '12px',
                    padding: '10px 14px',
                    background: '#fef3c7',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <AlertCircle size={14} color="#92400e" />
                  <span style={{ fontSize: '12px', color: '#92400e' }}>
                    Instagram requiere una imagen publica accesible por URL
                  </span>
                </div>
              )}

              {/* Submit button */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={handlePublish}
                  disabled={publishing || (!message && !imageUrl) || (!targetFacebook && !targetInstagram)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: publishing || (!message && !imageUrl) || (!targetFacebook && !targetInstagram)
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #1877f2 0%, #e11d48 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: publishing || (!message && !imageUrl) || (!targetFacebook && !targetInstagram) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {publishing ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      Publicando...
                    </>
                  ) : (
                    <>
                      <Send size={16} />
                      Publicar
                    </>
                  )}
                </button>

                {message.length > 0 && (
                  <span style={{ fontSize: '12px', color: '#94a3b8' }}>
                    {message.length} caracteres
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Publish result */}
          {publishResult && (
            <div
              style={{
                background: 'white',
                borderRadius: '12px',
                border: '1px solid #e2e8f0',
                padding: '16px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              {Object.entries(publishResult).map(([platform, result]) => (
                <div key={platform} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  {result.success ? (
                    <CheckCircle size={16} color="#16a34a" />
                  ) : (
                    <XCircle size={16} color="#ef4444" />
                  )}
                  <span style={{ fontSize: '13px', fontWeight: 500, color: result.success ? '#16a34a' : '#ef4444', textTransform: 'capitalize' }}>
                    {platform}: {result.success ? 'Publicado exitosamente' : result.error || 'Error'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== FACEBOOK TAB ==================== */}
      {activeTab === 'facebook' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Publicaciones recientes
            </h3>
            <button
              onClick={loadFbPosts}
              disabled={fbPostsLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} style={fbPostsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              Actualizar
            </button>
          </div>

          {fbPostsLoading && fbPosts.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#1877f2' }} />
            </div>
          ) : fbPosts.length === 0 ? (
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '48px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}
            >
              <Facebook size={32} color="#94a3b8" />
              <p style={{ fontSize: '14px', color: '#64748b', margin: '12px 0 0 0' }}>
                No hay publicaciones recientes
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {fbPosts.map((post) => (
                <div
                  key={post.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  <div style={{ display: 'flex', gap: '16px', padding: '20px 24px' }}>
                    {post.fullPicture && (
                      <img
                        src={post.fullPicture}
                        alt=""
                        style={{
                          width: '80px',
                          height: '80px',
                          borderRadius: '10px',
                          objectFit: 'cover',
                          flexShrink: 0,
                        }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontSize: '14px', color: '#1e293b', margin: '0 0 8px 0', lineHeight: 1.5, wordBreak: 'break-word' }}>
                        {post.message ? (post.message.length > 200 ? post.message.substring(0, 200) + '...' : post.message) : '(Sin texto)'}
                      </p>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#94a3b8' }}>
                        <span>{formatDate(post.createdTime)}</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <ThumbsUp size={12} /> {post.likes}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <MessageSquare size={12} /> {post.comments}
                        </span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Share2 size={12} /> {post.shares}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Post actions */}
                  <div
                    style={{
                      padding: '12px 24px',
                      borderTop: '1px solid #f1f5f9',
                      display: 'flex',
                      gap: '12px',
                    }}
                  >
                    {post.comments > 0 && (
                      <button
                        onClick={() => loadComments(post.id)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: selectedPostId === post.id ? '#eff6ff' : '#f1f5f9',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: selectedPostId === post.id ? '#3b82f6' : '#64748b',
                          cursor: 'pointer',
                        }}
                      >
                        <MessageSquare size={12} />
                        Ver comentarios ({post.comments})
                      </button>
                    )}
                    {post.permalink && (
                      <a
                        href={post.permalink}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          padding: '6px 12px',
                          background: '#f1f5f9',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: 500,
                          color: '#64748b',
                          cursor: 'pointer',
                          textDecoration: 'none',
                        }}
                      >
                        <ExternalLink size={12} />
                        Ver en Facebook
                      </a>
                    )}
                  </div>

                  {/* Comments section */}
                  {selectedPostId === post.id && (
                    <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      {commentsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '16px' }}>
                          <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: '#3b82f6' }} />
                        </div>
                      ) : comments.length === 0 ? (
                        <p style={{ fontSize: '13px', color: '#64748b', textAlign: 'center', margin: 0 }}>
                          No hay comentarios
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {comments.map((comment) => (
                            <div key={comment.id}>
                              <div
                                style={{
                                  background: 'white',
                                  borderRadius: '10px',
                                  padding: '12px 16px',
                                  border: '1px solid #e2e8f0',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>
                                    {comment.from?.name || 'Usuario'}
                                  </span>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                    {formatDate(comment.createdTime)}
                                  </span>
                                  {comment.likeCount > 0 && (
                                    <span style={{ fontSize: '11px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '2px' }}>
                                      <ThumbsUp size={10} /> {comment.likeCount}
                                    </span>
                                  )}
                                </div>
                                <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                                  {comment.message}
                                </p>

                                {/* Reply button */}
                                <button
                                  onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                  style={{
                                    marginTop: '8px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    padding: '4px 8px',
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    color: '#3b82f6',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <MessageSquare size={12} />
                                  Responder
                                </button>

                                {/* Reply form */}
                                {replyingTo === comment.id && (
                                  <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
                                    <input
                                      type="text"
                                      value={replyText}
                                      onChange={(e) => setReplyText(e.target.value)}
                                      placeholder="Escribe tu respuesta..."
                                      style={{
                                        flex: 1,
                                        padding: '8px 12px',
                                        border: '1px solid #e2e8f0',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        outline: 'none',
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && replyText.trim()) handleReply(comment.id);
                                      }}
                                    />
                                    <button
                                      onClick={() => handleReply(comment.id)}
                                      disabled={replyLoading || !replyText.trim()}
                                      style={{
                                        padding: '8px 14px',
                                        background: '#3b82f6',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '6px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '4px',
                                      }}
                                    >
                                      {replyLoading ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={12} />}
                                    </button>
                                  </div>
                                )}
                              </div>

                              {/* Nested replies */}
                              {comment.replies && comment.replies.length > 0 && (
                                <div style={{ marginLeft: '24px', marginTop: '8px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {comment.replies.map((reply) => (
                                    <div
                                      key={reply.id}
                                      style={{
                                        background: 'white',
                                        borderRadius: '8px',
                                        padding: '10px 14px',
                                        border: '1px solid #e2e8f0',
                                      }}
                                    >
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                        <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                                          {reply.from?.name || 'Usuario'}
                                        </span>
                                        <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                                          {formatDate(reply.createdTime)}
                                        </span>
                                      </div>
                                      <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
                                        {reply.message}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ==================== INSTAGRAM TAB ==================== */}
      {activeTab === 'instagram' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Publicaciones de Instagram
            </h3>
            <button
              onClick={loadIgMedia}
              disabled={igMediaLoading}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 14px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '12px',
                fontWeight: 500,
                color: '#64748b',
                cursor: 'pointer',
              }}
            >
              <RefreshCw size={14} style={igMediaLoading ? { animation: 'spin 1s linear infinite' } : {}} />
              Actualizar
            </button>
          </div>

          {igMediaLoading && igMedia.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#e11d48' }} />
            </div>
          ) : igMedia.length === 0 ? (
            <div
              style={{
                background: 'white',
                borderRadius: '16px',
                padding: '48px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}
            >
              <Instagram size={32} color="#94a3b8" />
              <p style={{ fontSize: '14px', color: '#64748b', margin: '12px 0 0 0' }}>
                No hay publicaciones recientes
              </p>
            </div>
          ) : (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: '16px',
              }}
            >
              {igMedia.map((media) => (
                <div
                  key={media.id}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    border: '1px solid #e2e8f0',
                    overflow: 'hidden',
                  }}
                >
                  {(media.mediaUrl || media.thumbnailUrl) && (
                    <div style={{ position: 'relative', paddingBottom: '100%', background: '#f1f5f9' }}>
                      <img
                        src={media.mediaUrl || media.thumbnailUrl}
                        alt=""
                        style={{
                          position: 'absolute',
                          inset: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      {media.mediaType === 'VIDEO' && (
                        <div
                          style={{
                            position: 'absolute',
                            top: '8px',
                            right: '8px',
                            padding: '4px 8px',
                            background: 'rgba(0,0,0,0.6)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: 'white',
                          }}
                        >
                          VIDEO
                        </div>
                      )}
                    </div>
                  )}

                  <div style={{ padding: '14px 16px' }}>
                    {media.caption && (
                      <p style={{ fontSize: '13px', color: '#1e293b', margin: '0 0 8px 0', lineHeight: 1.4, wordBreak: 'break-word' }}>
                        {media.caption.length > 100 ? media.caption.substring(0, 100) + '...' : media.caption}
                      </p>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '12px', color: '#94a3b8' }}>
                      <span>{formatDate(media.timestamp)}</span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <ThumbsUp size={11} /> {media.likeCount}
                      </span>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <MessageSquare size={11} /> {media.commentsCount}
                      </span>
                    </div>

                    <div style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
                      {media.commentsCount > 0 && (
                        <button
                          onClick={() => loadComments(media.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            background: selectedPostId === media.id ? '#fce7f3' : '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: selectedPostId === media.id ? '#e11d48' : '#64748b',
                            cursor: 'pointer',
                          }}
                        >
                          <MessageSquare size={11} />
                          Comentarios
                        </button>
                      )}
                      {media.permalink && (
                        <a
                          href={media.permalink}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            padding: '5px 10px',
                            background: '#f1f5f9',
                            border: 'none',
                            borderRadius: '6px',
                            fontSize: '11px',
                            fontWeight: 500,
                            color: '#64748b',
                            textDecoration: 'none',
                          }}
                        >
                          <ExternalLink size={11} />
                          Ver en IG
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Comments for IG media */}
                  {selectedPostId === media.id && (
                    <div style={{ padding: '12px 16px', borderTop: '1px solid #f1f5f9', background: '#f8fafc' }}>
                      {commentsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px' }}>
                          <Loader2 size={16} style={{ animation: 'spin 1s linear infinite', color: '#e11d48' }} />
                        </div>
                      ) : comments.length === 0 ? (
                        <p style={{ fontSize: '12px', color: '#64748b', textAlign: 'center', margin: 0 }}>
                          No hay comentarios
                        </p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {comments.map((comment) => (
                            <div
                              key={comment.id}
                              style={{
                                background: 'white',
                                borderRadius: '8px',
                                padding: '10px 12px',
                                border: '1px solid #e2e8f0',
                              }}
                            >
                              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                                <span style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>
                                  {comment.from?.name || 'Usuario'}
                                </span>
                                <span style={{ fontSize: '10px', color: '#94a3b8' }}>
                                  {formatDate(comment.createdTime)}
                                </span>
                              </div>
                              <p style={{ fontSize: '12px', color: '#374151', margin: 0 }}>
                                {comment.message}
                              </p>
                              <button
                                onClick={() => setReplyingTo(replyingTo === comment.id ? null : comment.id)}
                                style={{
                                  marginTop: '6px',
                                  padding: '3px 6px',
                                  background: 'none',
                                  border: 'none',
                                  fontSize: '11px',
                                  fontWeight: 500,
                                  color: '#e11d48',
                                  cursor: 'pointer',
                                }}
                              >
                                Responder
                              </button>
                              {replyingTo === comment.id && (
                                <div style={{ marginTop: '6px', display: 'flex', gap: '6px' }}>
                                  <input
                                    type="text"
                                    value={replyText}
                                    onChange={(e) => setReplyText(e.target.value)}
                                    placeholder="Responder..."
                                    style={{
                                      flex: 1,
                                      padding: '6px 10px',
                                      border: '1px solid #e2e8f0',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      outline: 'none',
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' && replyText.trim()) handleReply(comment.id);
                                    }}
                                  />
                                  <button
                                    onClick={() => handleReply(comment.id)}
                                    disabled={replyLoading || !replyText.trim()}
                                    style={{
                                      padding: '6px 10px',
                                      background: '#e11d48',
                                      color: 'white',
                                      border: 'none',
                                      borderRadius: '6px',
                                      fontSize: '11px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {replyLoading ? <Loader2 size={10} style={{ animation: 'spin 1s linear infinite' }} /> : <Send size={10} />}
                                  </button>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default CrmMarketingRedesSociales;
