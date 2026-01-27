/**
 * CrmMarketingRedesSociales - Redes Sociales
 *
 * Functional page for publishing to Facebook Page and Instagram:
 * - Publish text/photo posts to FB and/or IG
 * - View recent Facebook Page posts
 * - View recent Instagram media
 * - Read and reply to comments
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth as useClerkAuth } from '@clerk/clerk-react';
import { usePageHeader } from '../../layouts/CrmLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiFetch } from '../../services/api';
import {
  Instagram,
  Facebook,
  Send,
  Image,
  Upload,
  X,
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
  Clock,
  Calendar,
  Trash2,
  Sparkles,
  Search,
  Building2,
  Edit3,
  Hash,
  BarChart3,
  TrendingUp,
  Eye,
  Plus,
  Save,
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
  source?: 'user' | 'tenant' | null;
  pendingPageSelection?: boolean;
}

interface MetaPage {
  id: string;
  name: string;
  category?: string;
  instagramBusinessAccount?: { id: string; username: string };
}

interface CopySuggestion {
  tone: string;
  text: string;
  hashtags: string[];
}

interface ScheduledPost {
  id: string;
  platform: string;
  metaPostId: string | null;
  message: string | null;
  imageUrl: string | null;
  propiedadId: string | null;
  propiedadTitulo?: string | null;
  scheduledFor: string;
  status: string;
  createdAt: string;
  imageUrls?: string[];
  errorMessage?: string | null;
}

interface PropertyResult {
  id: string;
  titulo: string;
  descripcion?: string;
  tipo: string;
  operacion: string;
  precio?: number;
  moneda?: string;
  ciudad?: string;
  sector?: string;
  imagen_principal?: string;
  imagenes?: string[];
}

interface HashtagGroup {
  id: string;
  name: string;
  hashtags: string[];
  category: string | null;
}

type TabId = 'publish' | 'facebook' | 'instagram' | 'scheduled' | 'analytics';

// ==================== COMPONENT ====================

const CrmMarketingRedesSociales: React.FC = () => {
  const navigate = useNavigate();
  const { setPageHeader } = usePageHeader();
  const { tenantActual } = useAuth();
  const { getToken } = useClerkAuth();

  const basePath = tenantActual?.slug ? `/crm/${tenantActual.slug}` : '/crm';
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  // Image upload state
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string>('');

  // Posts state
  const [fbPosts, setFbPosts] = useState<MetaPost[]>([]);
  const [fbPostsLoading, setFbPostsLoading] = useState(false);
  const [fbPostsError, setFbPostsError] = useState(false);
  const [igMedia, setIgMedia] = useState<MetaIGMedia[]>([]);
  const [igMediaLoading, setIgMediaLoading] = useState(false);

  // Comments state
  const [selectedPostId, setSelectedPostId] = useState<string | null>(null);
  const [comments, setComments] = useState<MetaComment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyLoading, setReplyLoading] = useState(false);

  // Property selector state
  const [propertySearch, setPropertySearch] = useState('');
  const [propertyResults, setPropertyResults] = useState<PropertyResult[]>([]);
  const [propertySearching, setPropertySearching] = useState(false);
  const [propertySearchError, setPropertySearchError] = useState('');
  const [hasSearchedProperties, setHasSearchedProperties] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<PropertyResult | null>(null);
  const [showPropertySearch, setShowPropertySearch] = useState(false);
  const [selectedPropertyImage, setSelectedPropertyImage] = useState<string>('');

  // AI copy state
  const [copySuggestions, setCopySuggestions] = useState<CopySuggestion[]>([]);
  const [generatingCopy, setGeneratingCopy] = useState(false);
  const [copyCooldown, setCopyCooldown] = useState(false);

  // Scheduling state
  const [scheduleEnabled, setScheduleEnabled] = useState(false);
  const [scheduleDate, setScheduleDate] = useState('');
  const [scheduleTime, setScheduleTime] = useState('10:00');

  // Scheduled posts tab state
  const [scheduledPosts, setScheduledPosts] = useState<ScheduledPost[]>([]);
  const [scheduledPostsLoading, setScheduledPostsLoading] = useState(false);
  const [cancellingPostId, setCancellingPostId] = useState<string | null>(null);
  const [scheduledSortAsc, setScheduledSortAsc] = useState(true);
  const [scheduledPlatformFilter, setScheduledPlatformFilter] = useState<'all' | 'facebook' | 'instagram'>('all');

  // Multi-image state
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const multiFileInputRef = useRef<HTMLInputElement>(null);

  // Hashtag groups state
  const [hashtagGroups, setHashtagGroups] = useState<HashtagGroup[]>([]);
  const [showHashtagPanel, setShowHashtagPanel] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupHashtags, setNewGroupHashtags] = useState('');
  const [savingHashtagGroup, setSavingHashtagGroup] = useState(false);
  const [deletingGroupId, setDeletingGroupId] = useState<string | null>(null);

  // Edit modal state
  const [editingPost, setEditingPost] = useState<ScheduledPost | null>(null);
  const [editMessage, setEditMessage] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Preview toggle
  const [previewPlatform, setPreviewPlatform] = useState<'facebook' | 'instagram'>('facebook');
  const [showPreview, setShowPreview] = useState(false);

  // OAuth & page selection state
  const [connectLoading, setConnectLoading] = useState(false);
  const [availablePages, setAvailablePages] = useState<MetaPage[]>([]);
  const [showPageSelector, setShowPageSelector] = useState(false);
  const popupRef = useRef<Window | null>(null);

  const isFullyConnected = credentials?.metaConnected && credentials?.metaPageId && credentials.metaPageId !== 'PENDING';
  const hasInstagram = !!credentials?.metaInstagramBusinessAccountId;

  // Build header with connection status in actions slot
  useEffect(() => {
    if (!isFullyConnected) {
      setPageHeader({
        title: 'Redes Sociales',
        subtitle: 'Publica en Facebook e Instagram',
      });
      return;
    }

    setPageHeader({
      title: 'Redes Sociales',
      subtitle: 'Publica en Facebook e Instagram',
      actions: (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#1877f215', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1877f2' }}>
              <Facebook size={14} />
            </div>
            <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{credentials?.metaPageName}</span>
            <CheckCircle size={12} color="#16a34a" />
            {credentials?.source && (
              <span style={{ fontSize: '10px', color: credentials.source === 'user' ? '#16a34a' : '#f59e0b', fontWeight: 500 }}>
                ({credentials.source === 'user' ? 'tu cuenta' : 'empresa'})
              </span>
            )}
          </div>
          {hasInstagram && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <div style={{ width: '28px', height: '28px', borderRadius: '7px', background: '#e11d4815', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#e11d48' }}>
                <Instagram size={14} />
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>@{credentials?.metaInstagramUsername}</span>
              <CheckCircle size={12} color="#16a34a" />
            </div>
          )}
          {credentials?.source === 'user' && (
            <button
              onClick={handleDisconnectMeta}
              title="Desconectar Meta"
              style={{ display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px', background: '#fef2f2', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: '#ef4444', cursor: 'pointer' }}
            >
              <XCircle size={13} />
              Desconectar
            </button>
          )}
        </div>
      ),
    });
  }, [setPageHeader, isFullyConnected, hasInstagram, credentials, navigate, basePath, handleDisconnectMeta]);

  // Load credentials (per-user)
  useEffect(() => {
    const fetchCredentials = async () => {
      if (!tenantActual?.id) return;
      try {
        const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/my-connection`);
        const data = await response.json();
        setCredentials({
          metaConnected: data.connected || false,
          metaPageId: data.pageId || undefined,
          metaPageName: data.pageName || undefined,
          metaInstagramBusinessAccountId: data.instagramAccountId || undefined,
          metaInstagramUsername: data.instagramUsername || undefined,
          source: data.source || null,
          pendingPageSelection: data.pendingPageSelection || false,
        });
      } catch (error) {
        console.error('Error fetching credentials:', error);
      } finally {
        setLoading(false);
      }
    };
    fetchCredentials();
  }, [tenantActual?.id]);

  // Handle OAuth popup connection
  const handleConnectMeta = useCallback(async () => {
    if (!tenantActual?.id) return;
    setConnectLoading(true);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/auth-url?connectedBy=${tenantActual.id}`);
      const { authUrl } = await response.json();

      const width = 600, height = 700;
      const left = window.screenX + (window.outerWidth - width) / 2;
      const top = window.screenY + (window.outerHeight - height) / 2;
      const popup = window.open(authUrl, 'meta-oauth', `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes`);
      if (!popup) {
        alert('No se pudo abrir la ventana de autorizacion. Verifica que los popups esten permitidos.');
        setConnectLoading(false);
        return;
      }
      popupRef.current = popup;

      const pollTimer = setInterval(() => {
        if (popup.closed) {
          clearInterval(pollTimer);
          popupRef.current = null;
          setConnectLoading(false);
        }
      }, 500);
    } catch (error) {
      console.error('Error starting Meta OAuth:', error);
      setConnectLoading(false);
    }
  }, [tenantActual?.id]);

  // Listen for OAuth callback message
  useEffect(() => {
    const handleOAuthMessage = async (event: MessageEvent) => {
      if (event.data?.type !== 'META_SOCIAL_OAUTH_RESULT') return;

      popupRef.current = null;
      setConnectLoading(false);

      if (event.data.success && tenantActual?.id) {
        try {
          // Fetch available pages
          const pagesResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/pages`);
          const pages = await pagesResponse.json();

          if (pages.length === 1) {
            // Auto-select single page
            await handleSelectPage(pages[0].id);
          } else if (pages.length > 0) {
            setAvailablePages(pages);
            setShowPageSelector(true);
          } else {
            alert('No se encontraron paginas de Facebook. Asegurate de tener al menos una pagina creada.');
          }
        } catch (error) {
          console.error('Error fetching pages:', error);
          alert('OAuth exitoso, pero hubo un error al obtener las paginas.');
        }
      } else if (!event.data.success) {
        alert(event.data.message || 'Error en la autorizacion de Meta');
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, [tenantActual?.id]);

  // Select a Facebook page after OAuth
  const handleSelectPage = useCallback(async (pageId: string) => {
    if (!tenantActual?.id) return;
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/page`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pageId }),
      });

      // Refresh credentials
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/my-connection`);
      const data = await response.json();
      setCredentials({
        metaConnected: data.connected || false,
        metaPageId: data.pageId || undefined,
        metaPageName: data.pageName || undefined,
        metaInstagramBusinessAccountId: data.instagramAccountId || undefined,
        metaInstagramUsername: data.instagramUsername || undefined,
        source: data.source || null,
      });
      setShowPageSelector(false);
      setAvailablePages([]);
    } catch (error) {
      console.error('Error selecting page:', error);
      alert('Error al seleccionar la pagina');
    }
  }, [tenantActual?.id]);

  // Disconnect Meta
  const handleDisconnectMeta = useCallback(async () => {
    if (!tenantActual?.id) return;
    if (!confirm('¿Desconectar tu cuenta de Meta? Tus publicaciones programadas podrian fallar.')) return;
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/my-connection`, { method: 'DELETE' });
      setCredentials({ metaConnected: false, source: null });
    } catch (error) {
      console.error('Error disconnecting:', error);
    }
  }, [tenantActual?.id]);

  // Load FB posts when tab changes
  const loadFbPosts = useCallback(async () => {
    if (!tenantActual?.id || !isFullyConnected) return;
    setFbPostsLoading(true);
    setFbPostsError(false);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/posts?limit=20`);
      const data = await response.json();
      if (!response.ok) {
        setFbPostsError(true);
        setFbPosts([]);
      } else {
        setFbPosts(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error('Error loading FB posts:', error);
      setFbPostsError(true);
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

  // Load scheduled posts
  const loadScheduledPosts = useCallback(async () => {
    if (!tenantActual?.id) return;
    setScheduledPostsLoading(true);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/scheduled-posts`);
      const data = await response.json();
      setScheduledPosts(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading scheduled posts:', error);
    } finally {
      setScheduledPostsLoading(false);
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    if (activeTab === 'facebook' && fbPosts.length === 0) loadFbPosts();
    if (activeTab === 'instagram' && igMedia.length === 0) loadIgMedia();
    if (activeTab === 'scheduled' && scheduledPosts.length === 0) loadScheduledPosts();
  }, [activeTab, loadFbPosts, loadIgMedia, loadScheduledPosts, fbPosts.length, igMedia.length, scheduledPosts.length]);

  // Property search handler
  const searchProperties = useCallback(async (searchTerm: string) => {
    if (!tenantActual?.id || searchTerm.length < 2) {
      setPropertyResults([]);
      setHasSearchedProperties(false);
      return;
    }
    setPropertySearching(true);
    setPropertySearchError('');
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/propiedades?busqueda=${encodeURIComponent(searchTerm)}&limit=8`);
      const data = await response.json();
      const results = Array.isArray(data.data) ? data.data : Array.isArray(data) ? data : [];
      setPropertyResults(results);
      setHasSearchedProperties(true);
    } catch (error: any) {
      console.error('Error searching properties:', error);
      setPropertyResults([]);
      setPropertySearchError(error?.message || 'Error al buscar propiedades');
      setHasSearchedProperties(true);
    } finally {
      setPropertySearching(false);
    }
  }, [tenantActual?.id]);

  // Debounced property search
  useEffect(() => {
    if (!showPropertySearch || propertySearch.length < 2) return;
    const timeout = setTimeout(() => searchProperties(propertySearch), 300);
    return () => clearTimeout(timeout);
  }, [propertySearch, showPropertySearch, searchProperties]);

  const handleSelectProperty = (property: PropertyResult) => {
    setSelectedProperty(property);
    setShowPropertySearch(false);
    setPropertySearch('');
    setPropertyResults([]);
    setHasSearchedProperties(false);
    setPropertySearchError('');

    // Auto-fill description
    if (property.descripcion) {
      const plainText = property.descripcion.replace(/<[^>]*>/g, '').substring(0, 400);
      setMessage(plainText);
    }

    // Auto-select main image and populate imageUrls with it
    if (property.imagen_principal) {
      setSelectedPropertyImage(property.imagen_principal);
      setImageUrl(property.imagen_principal);
      setImageUrls([property.imagen_principal]);
    } else if (property.imagenes && property.imagenes.length > 0) {
      setSelectedPropertyImage(property.imagenes[0]);
      setImageUrl(property.imagenes[0]);
      setImageUrls([property.imagenes[0]]);
    }
  };

  const handleClearProperty = () => {
    setSelectedProperty(null);
    setSelectedPropertyImage('');
    setCopySuggestions([]);
  };

  const handleSelectPropertyImage = (url: string) => {
    // Toggle image in/out of imageUrls for carousel
    setImageUrls(prev => {
      const exists = prev.includes(url);
      if (exists) {
        const next = prev.filter(u => u !== url);
        // Update imageUrl to first remaining or empty
        setImageUrl(next.length > 0 ? next[0] : '');
        setSelectedPropertyImage(next.length > 0 ? next[0] : '');
        return next;
      } else {
        if (prev.length >= 10) return prev; // max 10
        const next = [...prev, url];
        if (!imageUrl) setImageUrl(url);
        setSelectedPropertyImage(url);
        return next;
      }
    });
    // Clear any file upload state
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // AI copy generation
  const handleGenerateCopy = async () => {
    if (!tenantActual?.id || !selectedProperty || generatingCopy || copyCooldown) return;
    setGeneratingCopy(true);
    setCopySuggestions([]);
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/generate-copy`, {
        method: 'POST',
        body: JSON.stringify({ propiedadId: selectedProperty.id }),
      });
      const data = await response.json();
      setCopySuggestions(data.suggestions || []);

      // Cooldown to prevent spam
      setCopyCooldown(true);
      setTimeout(() => setCopyCooldown(false), 5000);
    } catch (error) {
      console.error('Error generating copy:', error);
    } finally {
      setGeneratingCopy(false);
    }
  };

  // Cancel scheduled post
  const handleCancelScheduledPost = async (postId: string) => {
    if (!tenantActual?.id || cancellingPostId) return;
    setCancellingPostId(postId);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/scheduled-posts/${postId}`, {
        method: 'DELETE',
      });
      setScheduledPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'cancelled' } : p));
    } catch (error) {
      console.error('Error cancelling scheduled post:', error);
      alert('Error al cancelar la publicacion programada');
    } finally {
      setCancellingPostId(null);
    }
  };

  // Image upload handler
  const handleImageSelect = async (file: File) => {
    if (!file || !tenantActual?.id) return;

    if (!file.type.startsWith('image/')) {
      setImageUploadError('Solo se permiten imagenes');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setImageUploadError('La imagen no debe superar 10MB');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setImageUploadError('');
    setUploadingImage(true);

    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append('image', file);
      formData.append('folder', 'social-posts');

      const response = await fetch(
        `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/upload/image`,
        {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        }
      );

      if (!response.ok) throw new Error('Error al subir imagen');

      const data = await response.json();
      setImageUrl(data.url);
    } catch (err: any) {
      console.error('Error uploading image:', err);
      setImageUploadError(err.message || 'Error al subir imagen');
      setImageFile(null);
      setImagePreview('');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    setImageUrl('');
    setImageUploadError('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  // Multi-image upload handler
  const handleMultiImageSelect = async (files: FileList) => {
    if (!tenantActual?.id) return;
    const validFiles = Array.from(files).filter(f => f.type.startsWith('image/') && f.size <= 10 * 1024 * 1024).slice(0, 10 - imageUrls.length);
    if (validFiles.length === 0) return;

    setUploadingImage(true);
    try {
      const token = await getToken();
      const uploaded: string[] = [];
      for (const file of validFiles) {
        const formData = new FormData();
        formData.append('image', file);
        formData.append('folder', 'social-posts');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/tenants/${tenantActual.id}/upload/image`,
          { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: formData }
        );
        if (response.ok) {
          const data = await response.json();
          uploaded.push(data.url);
        }
      }
      setImageUrls(prev => [...prev, ...uploaded]);
      if (uploaded.length > 0 && !imageUrl) {
        setImageUrl(uploaded[0]);
      }
    } catch (err: any) {
      console.error('Error uploading images:', err);
      setImageUploadError(err.message || 'Error al subir imagenes');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveMultiImage = (idx: number) => {
    setImageUrls(prev => {
      const next = prev.filter((_, i) => i !== idx);
      if (next.length === 0) setImageUrl('');
      else if (imageUrl === prev[idx]) setImageUrl(next[0]);
      return next;
    });
  };

  // Hashtag functions
  const loadHashtagGroups = useCallback(async () => {
    if (!tenantActual?.id) return;
    try {
      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/hashtag-groups`);
      const data = await response.json();
      setHashtagGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error loading hashtag groups:', error);
    }
  }, [tenantActual?.id]);

  useEffect(() => {
    if (isFullyConnected) loadHashtagGroups();
  }, [isFullyConnected, loadHashtagGroups]);

  const handleSaveHashtagGroup = async () => {
    if (!tenantActual?.id || !newGroupName.trim() || !newGroupHashtags.trim()) return;
    setSavingHashtagGroup(true);
    try {
      const hashtags = newGroupHashtags.split(/[\s,]+/).filter(h => h.startsWith('#') || h.length > 0).map(h => h.startsWith('#') ? h : '#' + h);
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/hashtag-groups`, {
        method: 'POST',
        body: JSON.stringify({ name: newGroupName.trim(), hashtags }),
      });
      setNewGroupName('');
      setNewGroupHashtags('');
      loadHashtagGroups();
    } catch (error) {
      console.error('Error saving hashtag group:', error);
    } finally {
      setSavingHashtagGroup(false);
    }
  };

  const handleDeleteHashtagGroup = async (groupId: string) => {
    if (!tenantActual?.id) return;
    setDeletingGroupId(groupId);
    try {
      await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/hashtag-groups/${groupId}`, { method: 'DELETE' });
      loadHashtagGroups();
    } catch (error) {
      console.error('Error deleting hashtag group:', error);
    } finally {
      setDeletingGroupId(null);
    }
  };

  const handleInsertHashtags = (hashtags: string[]) => {
    const hashtagStr = hashtags.join(' ');
    setMessage(prev => prev + (prev.endsWith('\n') || prev === '' ? '' : '\n\n') + hashtagStr);
  };

  const handleSaveCurrentHashtags = () => {
    const currentHashtags = message.match(/#\w+/g);
    if (currentHashtags && currentHashtags.length > 0) {
      setNewGroupHashtags(currentHashtags.join(' '));
      setShowHashtagPanel(true);
    }
  };

  // Edit scheduled post functions
  const handleOpenEdit = (post: ScheduledPost) => {
    setEditingPost(post);
    setEditMessage(post.message || '');
    const d = new Date(post.scheduledFor);
    setEditDate(d.toLocaleDateString('en-CA')); // local date YYYY-MM-DD
    setEditTime(d.toTimeString().slice(0, 5));   // local time HH:MM
  };

  const handleSaveEdit = async () => {
    if (!tenantActual?.id || !editingPost) return;
    setSavingEdit(true);
    try {
      const scheduledDateTime = new Date(`${editDate}T${editTime}:00`);
      const scheduledFor = Math.floor(scheduledDateTime.getTime() / 1000);

      const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/scheduled-posts/${editingPost.id}`, {
        method: 'PUT',
        body: JSON.stringify({ message: editMessage, scheduledFor }),
      });
      if (response.ok) {
        setEditingPost(null);
        loadScheduledPosts();
      } else {
        const err = await response.json();
        alert(err.error || 'Error al editar');
      }
    } catch (error: any) {
      console.error('Error editing post:', error);
      alert('Error al editar la publicacion');
    } finally {
      setSavingEdit(false);
    }
  };

  // Publish handler
  const handlePublish = async () => {
    if (!tenantActual?.id) return;
    if (!message && !imageUrl && imageUrls.length === 0) return;
    if (!targetFacebook && !targetInstagram) return;

    setPublishing(true);
    setPublishResult(null);

    try {
      if (scheduleEnabled && scheduleDate && scheduleTime) {
        const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`);
        const scheduledFor = Math.floor(scheduledDateTime.getTime() / 1000);
        const results: Record<string, { success: boolean; error?: string }> = {};

        if (targetFacebook) {
          try {
            const fbResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/schedule`, {
              method: 'POST',
              body: JSON.stringify({
                message: message || undefined,
                imageUrl: imageUrl || undefined,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                linkUrl: linkUrl || undefined,
                scheduledFor,
                propiedadId: selectedProperty?.id || undefined,
                platform: 'facebook',
              }),
            });
            results.facebook = fbResponse.ok ? { success: true } : { success: false, error: (await fbResponse.json()).error || 'Error' };
          } catch (e: any) {
            results.facebook = { success: false, error: e.message };
          }
        }

        if (targetInstagram) {
          try {
            const igResponse = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/schedule`, {
              method: 'POST',
              body: JSON.stringify({
                message: message || undefined,
                imageUrl: imageUrl || undefined,
                imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
                scheduledFor,
                propiedadId: selectedProperty?.id || undefined,
                platform: 'instagram',
              }),
            });
            results.instagram = igResponse.ok ? { success: true } : { success: false, error: (await igResponse.json()).error || 'Error' };
          } catch (e: any) {
            results.instagram = { success: false, error: e.message };
          }
        }

        setPublishResult(results);
        if (Object.values(results).some(r => r.success)) {
          clearForm();
          loadScheduledPosts();
        }
      } else {
        // Normal immediate publish
        const response = await apiFetch(`/tenants/${tenantActual.id}/api-credentials/meta/publish`, {
          method: 'POST',
          body: JSON.stringify({
            message: message || undefined,
            imageUrl: imageUrl || undefined,
            imageUrls: imageUrls.length > 0 ? imageUrls : undefined,
            link: linkUrl || undefined,
            targets: { facebook: targetFacebook, instagram: targetInstagram },
          }),
        });
        const result = await response.json();
        setPublishResult(result);
        if (Object.values(result).some((r: any) => r.success)) {
          clearForm();
          if (targetFacebook) setTimeout(loadFbPosts, 2000);
          if (targetInstagram) setTimeout(loadIgMedia, 2000);
        }
      }
    } catch (error: any) {
      setPublishResult({ error: { success: false, error: error.message || 'Error al publicar' } });
    } finally {
      setPublishing(false);
    }
  };

  const clearForm = () => {
    setMessage('');
    setImageUrl('');
    setLinkUrl('');
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSelectedProperty(null);
    setSelectedPropertyImage('');
    setPropertySearchError('');
    setHasSearchedProperties(false);
    setCopySuggestions([]);
    setScheduleEnabled(false);
    setScheduleDate('');
    setScheduleTime('10:00');
    setImageUrls([]);
    setShowPreview(false);
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

  // Not connected - show inline connect flow
  if (!isFullyConnected) {
    return (
      <div style={{ padding: '24px' }}>
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
            Para publicar en Facebook e Instagram, conecta tu cuenta de Meta
            y selecciona la Pagina de Facebook de tu empresa.
          </p>
          <button
            onClick={handleConnectMeta}
            disabled={connectLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              padding: '14px 28px',
              background: connectLoading ? '#94a3b8' : 'linear-gradient(135deg, #1877f2 0%, #e11d48 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              fontSize: '15px',
              fontWeight: 600,
              cursor: connectLoading ? 'not-allowed' : 'pointer',
            }}
          >
            {connectLoading ? (
              <>
                <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                Conectando...
              </>
            ) : (
              <>
                <Facebook size={18} />
                Conectar Meta
                <ChevronRight size={18} />
              </>
            )}
          </button>

          {credentials?.pendingPageSelection && (
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
                Meta esta conectado pero no has seleccionado una pagina. Haz clic en "Conectar Meta" para continuar.
              </span>
            </div>
          )}
        </div>

        {/* Page Selector Modal */}
        {showPageSelector && availablePages.length > 0 && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' }}>
            <div style={{ background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '440px', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: '0 0 8px 0' }}>Selecciona una pagina</h3>
              <p style={{ fontSize: '13px', color: '#64748b', margin: '0 0 16px 0' }}>Elige la pagina de Facebook desde la que publicaras</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {availablePages.map((page) => (
                  <button
                    key={page.id}
                    onClick={() => handleSelectPage(page.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '12px', padding: '12px 16px',
                      background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '10px',
                      cursor: 'pointer', textAlign: 'left', width: '100%',
                    }}
                  >
                    <Facebook size={20} color="#1877f2" />
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b' }}>{page.name}</div>
                      {page.instagramBusinessAccount && (
                        <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                          <Instagram size={11} style={{ verticalAlign: 'middle', marginRight: '4px' }} />
                          @{page.instagramBusinessAccount.username}
                        </div>
                      )}
                    </div>
                    <ChevronRight size={16} color="#94a3b8" style={{ marginLeft: 'auto' }} />
                  </button>
                ))}
              </div>
              <button onClick={() => { setShowPageSelector(false); setAvailablePages([]); }} style={{ marginTop: '12px', padding: '8px 16px', background: 'none', border: 'none', color: '#64748b', fontSize: '13px', cursor: 'pointer', width: '100%' }}>
                Cancelar
              </button>
            </div>
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
  }

  // Connected - full UI
  return (
    <div style={{ padding: '24px' }}>
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
          { id: 'scheduled' as TabId, label: 'Programados', icon: <Clock size={16} /> },
          { id: 'analytics' as TabId, label: 'Analiticas', icon: <BarChart3 size={16} /> },
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
              {/* Property selector */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                  <Building2 size={14} />
                  Desde propiedad (opcional)
                </label>

                {selectedProperty ? (
                  <div style={{
                    border: '1px solid #e2e8f0', borderRadius: '12px', padding: '16px',
                    background: '#f8fafc', display: 'flex', gap: '16px', alignItems: 'flex-start',
                  }}>
                    {selectedPropertyImage && (
                      <img
                        src={selectedPropertyImage}
                        alt=""
                        style={{ width: '80px', height: '80px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                      />
                    )}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {selectedProperty.titulo}
                        </h4>
                        <button
                          onClick={handleClearProperty}
                          style={{ padding: '4px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}
                        >
                          <X size={16} />
                        </button>
                      </div>
                      <div style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px', color: '#64748b' }}>
                        <span style={{ textTransform: 'capitalize' }}>{selectedProperty.tipo}</span>
                        <span>·</span>
                        <span style={{ textTransform: 'capitalize' }}>{selectedProperty.operacion}</span>
                        {selectedProperty.precio && (
                          <>
                            <span>·</span>
                            <span style={{ fontWeight: 600, color: '#1e293b' }}>{selectedProperty.moneda || 'USD'} {selectedProperty.precio.toLocaleString()}</span>
                          </>
                        )}
                        {selectedProperty.ciudad && (
                          <>
                            <span>·</span>
                            <span>{selectedProperty.ciudad}</span>
                          </>
                        )}
                      </div>

                      {/* Property image thumbnails - multi-select for carousel */}
                      {selectedProperty.imagenes && selectedProperty.imagenes.length > 1 && (
                        <div style={{ marginTop: '10px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b' }}>
                              Selecciona imagenes ({imageUrls.filter(u => selectedProperty.imagenes?.includes(u)).length}/{selectedProperty.imagenes.length})
                            </span>
                            <button
                              onClick={() => {
                                const allImgs = selectedProperty.imagenes || [];
                                const allSelected = allImgs.every(img => imageUrls.includes(img));
                                if (allSelected) {
                                  // Deselect all property images
                                  setImageUrls(prev => prev.filter(u => !allImgs.includes(u)));
                                  setImageUrl('');
                                  setSelectedPropertyImage('');
                                } else {
                                  // Select all (up to 10 total)
                                  setImageUrls(prev => {
                                    const nonPropertyUrls = prev.filter(u => !allImgs.includes(u));
                                    const toAdd = allImgs.slice(0, 10 - nonPropertyUrls.length);
                                    const next = [...nonPropertyUrls, ...toAdd];
                                    setImageUrl(next[0] || '');
                                    setSelectedPropertyImage(toAdd[0] || '');
                                    return next;
                                  });
                                }
                              }}
                              style={{
                                fontSize: '11px', fontWeight: 500, color: '#3b82f6', background: 'none',
                                border: 'none', cursor: 'pointer', padding: '2px 4px', textDecoration: 'underline',
                              }}
                            >
                              {selectedProperty.imagenes.every(img => imageUrls.includes(img)) ? 'Deseleccionar todas' : 'Seleccionar todas'}
                            </button>
                          </div>
                          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            {selectedProperty.imagenes.slice(0, 20).map((imgUrl, idx) => {
                              const isSelected = imageUrls.includes(imgUrl);
                              return (
                                <div key={idx} style={{ position: 'relative', cursor: 'pointer' }} onClick={() => handleSelectPropertyImage(imgUrl)}>
                                  <img
                                    src={imgUrl}
                                    alt=""
                                    style={{
                                      width: '52px', height: '52px', borderRadius: '6px', objectFit: 'cover',
                                      border: isSelected ? '2px solid #3b82f6' : '2px solid transparent',
                                      opacity: isSelected ? 1 : 0.5,
                                      transition: 'all 0.15s',
                                    }}
                                  />
                                  {isSelected && (
                                    <div style={{
                                      position: 'absolute', top: '-4px', right: '-4px',
                                      width: '18px', height: '18px', borderRadius: '50%',
                                      background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                      fontSize: '10px', color: 'white', fontWeight: 700,
                                    }}>
                                      {imageUrls.indexOf(imgUrl) + 1}
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {/* Generate AI copy button */}
                      <button
                        onClick={handleGenerateCopy}
                        disabled={generatingCopy || copyCooldown}
                        style={{
                          marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px',
                          padding: '7px 14px', background: generatingCopy || copyCooldown ? '#e2e8f0' : 'linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)',
                          border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 600,
                          color: generatingCopy || copyCooldown ? '#94a3b8' : 'white', cursor: generatingCopy || copyCooldown ? 'not-allowed' : 'pointer',
                        }}
                      >
                        {generatingCopy ? (
                          <><Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> Generando...</>
                        ) : (
                          <><Sparkles size={13} /> Generar copy con IA</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div style={{ position: 'relative' }}>
                    <div
                      onClick={() => setShowPropertySearch(!showPropertySearch)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px',
                        border: '1px solid #e2e8f0', borderRadius: '10px', cursor: 'pointer',
                        background: showPropertySearch ? '#eff6ff' : 'white',
                        transition: 'all 0.15s',
                      }}
                    >
                      <Search size={15} color="#94a3b8" />
                      <span style={{ fontSize: '13px', color: '#94a3b8' }}>Buscar propiedad...</span>
                    </div>

                    {showPropertySearch && (
                      <div style={{
                        position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                        marginTop: '4px', background: 'white', borderRadius: '12px',
                        border: '1px solid #e2e8f0', boxShadow: '0 8px 25px rgba(0,0,0,0.12)',
                        overflow: 'hidden',
                      }}>
                        <div style={{ padding: '12px', borderBottom: '1px solid #f1f5f9' }}>
                          <input
                            type="text"
                            value={propertySearch}
                            onChange={(e) => setPropertySearch(e.target.value)}
                            placeholder="Escribe para buscar propiedades..."
                            autoFocus
                            style={{
                              width: '100%', padding: '8px 12px', border: '1px solid #e2e8f0',
                              borderRadius: '8px', fontSize: '13px', outline: 'none', boxSizing: 'border-box',
                            }}
                          />
                        </div>

                        <div style={{ maxHeight: '280px', overflowY: 'auto' }}>
                          {propertySearching ? (
                            <div style={{ padding: '20px', textAlign: 'center' }}>
                              <Loader2 size={18} style={{ animation: 'spin 1s linear infinite', color: '#94a3b8' }} />
                            </div>
                          ) : propertySearchError ? (
                            <div style={{ padding: '16px', textAlign: 'center', fontSize: '12px', color: '#ef4444' }}>
                              <AlertCircle size={16} style={{ marginBottom: '4px' }} />
                              <div>{propertySearchError}</div>
                            </div>
                          ) : propertySearch.length < 2 ? (
                            <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
                              Escribe al menos 2 caracteres para buscar
                            </div>
                          ) : propertyResults.length === 0 && hasSearchedProperties ? (
                            <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: '#94a3b8' }}>
                              No se encontraron propiedades
                            </div>
                          ) : (
                            propertyResults.map((prop) => (
                              <div
                                key={prop.id}
                                onClick={() => handleSelectProperty(prop)}
                                style={{
                                  display: 'flex', gap: '10px', padding: '10px 12px', cursor: 'pointer',
                                  borderBottom: '1px solid #f8fafc', transition: 'background 0.1s',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = '#f8fafc'; }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; }}
                              >
                                {prop.imagen_principal ? (
                                  <img src={prop.imagen_principal} alt="" style={{ width: '44px', height: '44px', borderRadius: '6px', objectFit: 'cover', flexShrink: 0 }} />
                                ) : (
                                  <div style={{ width: '44px', height: '44px', borderRadius: '6px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <Building2 size={18} color="#94a3b8" />
                                  </div>
                                )}
                                <div style={{ flex: 1, minWidth: 0 }}>
                                  <div style={{ fontSize: '13px', fontWeight: 500, color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {prop.titulo}
                                  </div>
                                  <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                                    {prop.tipo} · {prop.operacion} {prop.precio ? `· ${prop.moneda || 'USD'} ${prop.precio.toLocaleString()}` : ''}
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>

                        <div style={{ padding: '8px 12px', borderTop: '1px solid #f1f5f9' }}>
                          <button
                            onClick={() => { setShowPropertySearch(false); setPropertySearch(''); setPropertyResults([]); setHasSearchedProperties(false); setPropertySearchError(''); }}
                            style={{ fontSize: '12px', color: '#64748b', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
                          >
                            Cerrar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Copy suggestions */}
              {copySuggestions.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
                    <Sparkles size={14} />
                    Sugerencias de copy IA
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {copySuggestions.map((suggestion, idx) => {
                      const toneColors: Record<string, { bg: string; text: string; border: string }> = {
                        profesional: { bg: '#eff6ff', text: '#2563eb', border: '#bfdbfe' },
                        emocional: { bg: '#fdf2f8', text: '#db2777', border: '#fbcfe8' },
                        urgente: { bg: '#fef3c7', text: '#d97706', border: '#fde68a' },
                      };
                      const colors = toneColors[suggestion.tone] || toneColors.profesional;

                      return (
                        <div
                          key={idx}
                          style={{
                            border: `1px solid ${colors.border}`, borderRadius: '10px', padding: '14px',
                            background: colors.bg, cursor: 'pointer', transition: 'all 0.15s',
                          }}
                          onClick={() => {
                            const hashtagStr = suggestion.hashtags.join(' ');
                            setMessage(suggestion.text + (hashtagStr ? '\n\n' + hashtagStr : ''));
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                            <span style={{
                              fontSize: '11px', fontWeight: 700, color: colors.text, textTransform: 'uppercase',
                              padding: '2px 8px', background: 'white', borderRadius: '4px', letterSpacing: '0.5px',
                            }}>
                              {suggestion.tone}
                            </span>
                            <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                              Clic para usar
                            </span>
                          </div>
                          <p style={{ fontSize: '13px', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                            {suggestion.text}
                          </p>
                          {suggestion.hashtags.length > 0 && (
                            <div style={{ marginTop: '8px', display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              {suggestion.hashtags.map((tag, i) => (
                                <span key={i} style={{ fontSize: '11px', color: colors.text, fontWeight: 500 }}>
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

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

              {/* Hashtag quick-insert */}
              <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                <button
                  onClick={() => { setShowHashtagPanel(!showHashtagPanel); if (!showHashtagPanel && hashtagGroups.length === 0) loadHashtagGroups(); }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                    background: showHashtagPanel ? '#eff6ff' : '#f1f5f9', border: showHashtagPanel ? '1px solid #bfdbfe' : '1px solid transparent',
                    borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: showHashtagPanel ? '#2563eb' : '#64748b', cursor: 'pointer',
                  }}
                >
                  <Hash size={13} />
                  Hashtags
                </button>

                {message.match(/#\w+/g) && (
                  <button
                    onClick={handleSaveCurrentHashtags}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '4px', padding: '5px 10px',
                      background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px',
                      fontSize: '11px', fontWeight: 500, color: '#16a34a', cursor: 'pointer',
                    }}
                  >
                    <Save size={11} />
                    Guardar hashtags
                  </button>
                )}

                <button
                  onClick={() => setShowPreview(!showPreview)}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '5px', padding: '6px 12px',
                    background: showPreview ? '#fdf2f8' : '#f1f5f9', border: showPreview ? '1px solid #fbcfe8' : '1px solid transparent',
                    borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: showPreview ? '#db2777' : '#64748b', cursor: 'pointer',
                  }}
                >
                  <Eye size={13} />
                  Preview
                </button>
              </div>

              {/* Hashtag panel */}
              {showHashtagPanel && (
                <div style={{
                  marginTop: '10px', border: '1px solid #e2e8f0', borderRadius: '12px',
                  background: '#f8fafc', overflow: 'hidden',
                }}>
                  <div style={{ padding: '14px 16px', borderBottom: '1px solid #e2e8f0' }}>
                    <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b', margin: '0 0 10px 0' }}>Grupos de hashtags</h4>
                    {hashtagGroups.length === 0 ? (
                      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>No hay grupos guardados</p>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {hashtagGroups.map(group => (
                          <div key={group.id} style={{
                            display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px',
                            background: 'white', borderRadius: '8px', border: '1px solid #e2e8f0',
                          }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '12px', fontWeight: 600, color: '#1e293b' }}>{group.name}</div>
                              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {group.hashtags.join(' ')}
                              </div>
                            </div>
                            <button
                              onClick={() => handleInsertHashtags(group.hashtags)}
                              style={{ padding: '5px 10px', background: '#eff6ff', border: 'none', borderRadius: '6px', fontSize: '11px', fontWeight: 500, color: '#2563eb', cursor: 'pointer', flexShrink: 0 }}
                            >
                              Insertar
                            </button>
                            <button
                              onClick={() => handleDeleteHashtagGroup(group.id)}
                              disabled={deletingGroupId === group.id}
                              style={{ padding: '5px', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', flexShrink: 0 }}
                            >
                              {deletingGroupId === group.id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Trash2 size={12} />}
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '14px 16px' }}>
                    <h4 style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', margin: '0 0 8px 0' }}>Nuevo grupo</h4>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="Nombre del grupo"
                        style={{ flex: '1 1 120px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                      />
                      <input
                        type="text"
                        value={newGroupHashtags}
                        onChange={(e) => setNewGroupHashtags(e.target.value)}
                        placeholder="#hashtag1 #hashtag2 ..."
                        style={{ flex: '2 1 200px', padding: '7px 10px', border: '1px solid #d1d5db', borderRadius: '6px', fontSize: '12px', outline: 'none' }}
                      />
                      <button
                        onClick={handleSaveHashtagGroup}
                        disabled={savingHashtagGroup || !newGroupName.trim() || !newGroupHashtags.trim()}
                        style={{
                          padding: '7px 14px', background: savingHashtagGroup ? '#94a3b8' : '#2563eb', color: 'white',
                          border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                          cursor: savingHashtagGroup ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                        }}
                      >
                        {savingHashtagGroup ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={12} />}
                        Guardar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Post Preview */}
              {showPreview && (message || imageUrl) && (
                <div style={{ marginTop: '12px' }}>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '10px' }}>
                    <button
                      onClick={() => setPreviewPlatform('facebook')}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                        background: previewPlatform === 'facebook' ? '#1877f2' : '#f1f5f9',
                        color: previewPlatform === 'facebook' ? 'white' : '#64748b',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      Facebook
                    </button>
                    <button
                      onClick={() => setPreviewPlatform('instagram')}
                      style={{
                        padding: '5px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 500,
                        background: previewPlatform === 'instagram' ? '#e11d48' : '#f1f5f9',
                        color: previewPlatform === 'instagram' ? 'white' : '#64748b',
                        border: 'none', cursor: 'pointer',
                      }}
                    >
                      Instagram
                    </button>
                  </div>

                  {previewPlatform === 'facebook' ? (
                    <div style={{
                      border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden', maxWidth: '500px',
                    }}>
                      <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'linear-gradient(135deg, #1877f2, #4299e1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Facebook size={20} color="white" />
                        </div>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{credentials?.metaPageName || 'Tu Pagina'}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>Ahora</div>
                        </div>
                      </div>
                      {message && <div style={{ padding: '0 16px 12px', fontSize: '14px', color: '#1e293b', lineHeight: 1.5, whiteSpace: 'pre-wrap' }}>{message}</div>}
                      {(imageUrls.length > 1 ? imageUrls : imageUrl ? [imageUrl] : []).length > 0 && (
                        <div style={{ display: 'grid', gridTemplateColumns: (imageUrls.length > 1 ? imageUrls : [imageUrl]).length > 1 ? '1fr 1fr' : '1fr', gap: '2px' }}>
                          {(imageUrls.length > 1 ? imageUrls : imageUrl ? [imageUrl] : []).slice(0, 4).map((url, i) => (
                            <div key={i} style={{ position: 'relative' }}>
                              <img src={url} alt="" style={{ width: '100%', height: (imageUrls.length > 1 ? imageUrls : [imageUrl]).length > 1 ? '160px' : '280px', objectFit: 'cover', display: 'block' }} />
                              {i === 3 && (imageUrls.length > 1 ? imageUrls : [imageUrl]).length > 4 && (
                                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '24px', fontWeight: 700 }}>
                                  +{(imageUrls.length > 1 ? imageUrls : [imageUrl]).length - 4}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                      <div style={{ padding: '10px 16px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-around', fontSize: '13px', color: '#64748b' }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><ThumbsUp size={15} /> Me gusta</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><MessageSquare size={15} /> Comentar</span>
                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}><Share2 size={15} /> Compartir</span>
                      </div>
                    </div>
                  ) : (
                    <div style={{
                      border: '1px solid #e2e8f0', borderRadius: '12px', background: 'white', overflow: 'hidden', maxWidth: '400px',
                    }}>
                      <div style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg, #f58529, #dd2a7b, #8134af)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Instagram size={16} color="white" />
                        </div>
                        <div style={{ fontSize: '13px', fontWeight: 600, color: '#1e293b' }}>{credentials?.metaInstagramUsername || 'tu_cuenta'}</div>
                      </div>
                      {(imageUrls.length > 0 ? imageUrls[0] : imageUrl) && (
                        <div style={{ position: 'relative' }}>
                          <img src={imageUrls.length > 0 ? imageUrls[0] : imageUrl} alt="" style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', display: 'block' }} />
                          {(imageUrls.length > 1) && (
                            <div style={{ position: 'absolute', top: '10px', right: '10px', background: 'rgba(0,0,0,0.6)', borderRadius: '12px', padding: '3px 8px', fontSize: '11px', color: 'white', fontWeight: 600 }}>
                              1/{imageUrls.length}
                            </div>
                          )}
                        </div>
                      )}
                      <div style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '14px', marginBottom: '8px' }}>
                          <ThumbsUp size={20} color="#1e293b" />
                          <MessageSquare size={20} color="#1e293b" />
                          <Send size={20} color="#1e293b" />
                        </div>
                        {message && (
                          <div style={{ fontSize: '13px', color: '#1e293b', lineHeight: 1.5 }}>
                            <span style={{ fontWeight: 600 }}>{credentials?.metaInstagramUsername || 'tu_cuenta'}</span>{' '}
                            {message.length > 150 ? message.substring(0, 150) + '...' : message}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Image upload */}
              <div style={{ marginTop: '16px' }}>
                <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <Image size={14} />
                  Imagen {targetInstagram ? '(requerida para IG)' : '(opcional)'}
                </label>

                {imagePreview || imageUrl ? (
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <img
                      src={imagePreview || imageUrl}
                      alt="Preview"
                      style={{
                        maxWidth: '240px',
                        maxHeight: '240px',
                        borderRadius: '12px',
                        border: '1px solid #e2e8f0',
                        objectFit: 'cover',
                        display: 'block',
                      }}
                    />
                    {uploadingImage && (
                      <div style={{
                        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', borderRadius: '12px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '8px',
                      }}>
                        <Loader2 size={24} color="white" style={{ animation: 'spin 1s linear infinite' }} />
                        <span style={{ fontSize: '12px', color: 'white', fontWeight: 500 }}>Subiendo...</span>
                      </div>
                    )}
                    {!uploadingImage && (
                      <button
                        onClick={handleRemoveImage}
                        style={{
                          position: 'absolute', top: '8px', right: '8px',
                          width: '28px', height: '28px', borderRadius: '50%',
                          background: 'rgba(0,0,0,0.6)', border: 'none', color: 'white',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer', backdropFilter: 'blur(4px)',
                        }}
                      >
                        <X size={14} />
                      </button>
                    )}
                    {imageUrl && !uploadingImage && (
                      <div style={{
                        position: 'absolute', bottom: '8px', left: '8px',
                        padding: '4px 8px', background: 'rgba(22,163,106,0.9)', borderRadius: '6px',
                        display: 'flex', alignItems: 'center', gap: '4px',
                      }}>
                        <CheckCircle size={12} color="white" />
                        <span style={{ fontSize: '11px', color: 'white', fontWeight: 500 }}>Lista</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.background = '#eff6ff'; }}
                    onDragLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#f8fafc';
                      const file = e.dataTransfer.files[0];
                      if (file) handleImageSelect(file);
                    }}
                    style={{
                      border: '2px dashed #e2e8f0', borderRadius: '12px', background: '#f8fafc',
                      padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center',
                      gap: '8px', cursor: 'pointer', transition: 'all 0.15s',
                    }}
                  >
                    <Upload size={24} color="#94a3b8" />
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500 }}>
                      Arrastra una imagen o haz clic para seleccionar
                    </span>
                    <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                      JPG, PNG, WebP (max 10MB)
                    </span>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                  }}
                  style={{ display: 'none' }}
                />

                {imageUploadError && (
                  <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <AlertCircle size={13} color="#ef4444" />
                    <span style={{ fontSize: '12px', color: '#ef4444' }}>{imageUploadError}</span>
                  </div>
                )}

                {/* Multi-image carousel */}
                {imageUrls.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    <label style={{ fontSize: '12px', fontWeight: 600, color: '#64748b', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <Image size={14} />
                      Imagenes del carrusel ({imageUrls.length}/10)
                    </label>
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                      {imageUrls.map((url, idx) => (
                        <div key={idx} style={{ position: 'relative', width: '72px', height: '72px' }}>
                          <img src={url} alt="" style={{ width: '72px', height: '72px', borderRadius: '8px', objectFit: 'cover', border: '1px solid #e2e8f0' }} />
                          <button
                            onClick={() => handleRemoveMultiImage(idx)}
                            style={{
                              position: 'absolute', top: '-6px', right: '-6px',
                              width: '20px', height: '20px', borderRadius: '50%',
                              background: '#ef4444', border: 'none', color: 'white',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              cursor: 'pointer', fontSize: '10px',
                            }}
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}
                      {imageUrls.length < 10 && (
                        <div
                          onClick={() => multiFileInputRef.current?.click()}
                          style={{
                            width: '72px', height: '72px', borderRadius: '8px', border: '2px dashed #d1d5db',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                            background: '#f8fafc',
                          }}
                        >
                          <Plus size={20} color="#94a3b8" />
                        </div>
                      )}
                    </div>
                    <input
                      ref={multiFileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      onChange={(e) => { if (e.target.files) handleMultiImageSelect(e.target.files); e.target.value = ''; }}
                      style={{ display: 'none' }}
                    />
                  </div>
                )}

                {/* Add more images button (when no multi-images yet but has single image) */}
                {imageUrl && imageUrls.length === 0 && (
                  <div style={{ marginTop: '8px' }}>
                    <button
                      onClick={() => { setImageUrls([imageUrl]); }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                        background: '#f1f5f9', border: 'none', borderRadius: '8px',
                        fontSize: '12px', fontWeight: 500, color: '#64748b', cursor: 'pointer',
                      }}
                    >
                      <Plus size={13} />
                      Agregar mas imagenes (carrusel)
                    </button>
                  </div>
                )}
              </div>

              {/* Link URL (FB only) */}
              {!imageFile && !imageUrl && targetFacebook && (
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
              {targetInstagram && !imageUrl && !imageFile && (
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
                    Instagram requiere una imagen para publicar
                  </span>
                </div>
              )}

              {/* Scheduling controls */}
              <div style={{
                marginTop: '20px', padding: '16px', borderRadius: '10px',
                border: '1px solid #e2e8f0', background: scheduleEnabled ? '#f0fdf4' : '#f8fafc',
                transition: 'all 0.2s',
              }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={scheduleEnabled}
                    onChange={(e) => setScheduleEnabled(e.target.checked)}
                    style={{ width: '18px', height: '18px', accentColor: '#16a34a' }}
                  />
                  <Calendar size={16} color={scheduleEnabled ? '#16a34a' : '#94a3b8'} />
                  <span style={{ fontSize: '13px', fontWeight: 600, color: scheduleEnabled ? '#16a34a' : '#64748b' }}>
                    Programar publicacion
                  </span>
                </label>

                {scheduleEnabled && (
                  <div style={{ marginTop: '14px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        Fecha
                      </label>
                      <input
                        type="date"
                        value={scheduleDate}
                        onChange={(e) => setScheduleDate(e.target.value)}
                        min={new Date().toLocaleDateString('en-CA')}
                        max={new Date(Date.now() + 75 * 24 * 60 * 60 * 1000).toLocaleDateString('en-CA')}
                        style={{
                          padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                          fontSize: '13px', outline: 'none', color: '#1e293b',
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>
                        Hora
                      </label>
                      <input
                        type="time"
                        value={scheduleTime}
                        onChange={(e) => setScheduleTime(e.target.value)}
                        style={{
                          padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px',
                          fontSize: '13px', outline: 'none', color: '#1e293b',
                        }}
                      />
                    </div>

                  </div>
                )}
              </div>

              {/* Submit button */}
              <div style={{ marginTop: '20px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <button
                  onClick={handlePublish}
                  disabled={publishing || uploadingImage || (!message && !imageUrl && imageUrls.length === 0) || (!targetFacebook && !targetInstagram) || (scheduleEnabled && (!scheduleDate || !scheduleTime))}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '12px 24px',
                    background: publishing || uploadingImage || (!message && !imageUrl) || (!targetFacebook && !targetInstagram) || (scheduleEnabled && (!scheduleDate || !scheduleTime))
                      ? '#94a3b8'
                      : scheduleEnabled
                        ? 'linear-gradient(135deg, #16a34a 0%, #059669 100%)'
                        : 'linear-gradient(135deg, #1877f2 0%, #e11d48 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: publishing || uploadingImage || (!message && !imageUrl) || (!targetFacebook && !targetInstagram) || (scheduleEnabled && (!scheduleDate || !scheduleTime)) ? 'not-allowed' : 'pointer',
                  }}
                >
                  {publishing ? (
                    <>
                      <Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} />
                      {scheduleEnabled ? 'Programando...' : 'Publicando...'}
                    </>
                  ) : scheduleEnabled ? (
                    <>
                      <Calendar size={16} />
                      Programar
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

      {/* ==================== SCHEDULED POSTS TAB ==================== */}
      {activeTab === 'scheduled' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>
              Publicaciones programadas
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {(['all', 'facebook', 'instagram'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setScheduledPlatformFilter(p)}
                  style={{
                    padding: '6px 12px', border: 'none', borderRadius: '8px',
                    fontSize: '12px', fontWeight: 500, cursor: 'pointer',
                    background: scheduledPlatformFilter === p
                      ? (p === 'instagram' ? '#fdf2f8' : p === 'facebook' ? '#eff6ff' : '#f0fdf4')
                      : '#f1f5f9',
                    color: scheduledPlatformFilter === p
                      ? (p === 'instagram' ? '#e11d48' : p === 'facebook' ? '#3b82f6' : '#16a34a')
                      : '#94a3b8',
                  }}
                >
                  {p === 'all' ? 'Todos' : p === 'facebook' ? 'Facebook' : 'Instagram'}
                </button>
              ))}
              <button
                onClick={() => setScheduledSortAsc(!scheduledSortAsc)}
                style={{
                  display: 'flex', alignItems: 'center', gap: '4px', padding: '6px 10px',
                  background: '#f1f5f9', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 500, color: '#64748b', cursor: 'pointer',
                }}
                title={scheduledSortAsc ? 'Mas proximo primero' : 'Mas lejano primero'}
              >
                <Calendar size={12} />
                {scheduledSortAsc ? '\u2191' : '\u2193'}
              </button>
              <button
                onClick={loadScheduledPosts}
                disabled={scheduledPostsLoading}
                style={{
                  display: 'flex', alignItems: 'center', gap: '6px', padding: '6px 12px',
                  background: '#f1f5f9', border: 'none', borderRadius: '8px',
                  fontSize: '12px', fontWeight: 500, color: '#64748b', cursor: 'pointer',
                }}
              >
                <RefreshCw size={14} style={scheduledPostsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                Actualizar
              </button>
            </div>
          </div>

          {scheduledPostsLoading && scheduledPosts.length === 0 ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: '48px' }}>
              <Loader2 size={28} style={{ animation: 'spin 1s linear infinite', color: '#16a34a' }} />
            </div>
          ) : scheduledPosts.length === 0 ? (
            <div style={{
              background: 'white', borderRadius: '16px', padding: '48px',
              textAlign: 'center', border: '1px solid #e2e8f0',
            }}>
              <Clock size={36} color="#94a3b8" />
              <p style={{ fontSize: '15px', fontWeight: 500, color: '#64748b', margin: '16px 0 8px 0' }}>
                No hay publicaciones programadas
              </p>
              <p style={{ fontSize: '13px', color: '#94a3b8', margin: 0 }}>
                Programa publicaciones desde el tab "Publicar" activando la opcion de programar.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {scheduledPosts
                .filter((p) => scheduledPlatformFilter === 'all' || p.platform === scheduledPlatformFilter)
                .sort((a, b) => {
                  const da = new Date(a.scheduledFor).getTime();
                  const db = new Date(b.scheduledFor).getTime();
                  return scheduledSortAsc ? da - db : db - da;
                })
                .map((post) => {
                const statusConfig: Record<string, { bg: string; text: string; label: string }> = {
                  scheduled: { bg: '#f0fdf4', text: '#16a34a', label: 'Programado' },
                  published: { bg: '#eff6ff', text: '#2563eb', label: 'Publicado' },
                  cancelled: { bg: '#fef2f2', text: '#dc2626', label: 'Cancelado' },
                  failed: { bg: '#fef3c7', text: '#d97706', label: 'Fallido' },
                };
                const status = statusConfig[post.status] || statusConfig.scheduled;

                return (
                  <div
                    key={post.id}
                    style={{
                      background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0',
                      padding: '18px 22px', display: 'flex', gap: '16px', alignItems: 'center',
                    }}
                  >
                    {post.imageUrl ? (
                      <img
                        src={post.imageUrl}
                        alt=""
                        style={{ width: '64px', height: '64px', borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                      />
                    ) : (
                      <div style={{
                        width: '64px', height: '64px', borderRadius: '10px', background: '#f1f5f9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                      }}>
                        {post.platform === 'instagram' ? <Instagram size={24} color="#e11d48" /> : <Facebook size={24} color="#94a3b8" />}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{
                        fontSize: '13px', color: '#1e293b', margin: '0 0 6px 0', lineHeight: 1.4,
                        overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box',
                        WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as any,
                      }}>
                        {post.message || '(Solo imagen)'}
                      </p>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '2px 8px', borderRadius: '6px', fontSize: '11px',
                          fontWeight: 600, background: status.bg, color: status.text,
                        }}>
                          {post.status === 'scheduled' && <Clock size={11} />}
                          {post.status === 'published' && <CheckCircle size={11} />}
                          {post.status === 'cancelled' && <XCircle size={11} />}
                          {status.label}
                        </span>

                        <span style={{ fontSize: '12px', color: '#94a3b8', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <Calendar size={12} />
                          {formatDate(post.scheduledFor)}
                        </span>

                        {post.propiedadTitulo && (
                          <span style={{ fontSize: '11px', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Building2 size={11} />
                            {post.propiedadTitulo}
                          </span>
                        )}

                        <span style={{
                          fontSize: '11px', padding: '1px 6px', borderRadius: '4px',
                          background: post.platform === 'instagram' ? '#fdf2f8' : '#eff6ff',
                          color: post.platform === 'instagram' ? '#e11d48' : '#3b82f6',
                          fontWeight: 500, textTransform: 'capitalize',
                        }}>
                          {post.platform}
                        </span>

                        {post.status === 'failed' && post.errorMessage && (
                          <span style={{ fontSize: '11px', color: '#dc2626', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={11} />
                            {post.errorMessage.length > 60 ? post.errorMessage.substring(0, 60) + '...' : post.errorMessage}
                          </span>
                        )}
                      </div>
                    </div>

                    {post.status === 'scheduled' && (
                      <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                        <button
                          onClick={() => handleOpenEdit(post)}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            background: '#eff6ff', border: 'none', borderRadius: '8px',
                            fontSize: '12px', fontWeight: 500, color: '#2563eb',
                            cursor: 'pointer', flexShrink: 0,
                          }}
                        >
                          <Edit3 size={13} />
                          Editar
                        </button>
                        <button
                          onClick={() => handleCancelScheduledPost(post.id)}
                          disabled={cancellingPostId === post.id}
                          style={{
                            display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px',
                            background: '#fef2f2', border: 'none', borderRadius: '8px',
                            fontSize: '12px', fontWeight: 500, color: '#dc2626',
                            cursor: cancellingPostId === post.id ? 'not-allowed' : 'pointer',
                            opacity: cancellingPostId === post.id ? 0.5 : 1, flexShrink: 0,
                          }}
                        >
                          {cancellingPostId === post.id ? (
                            <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} />
                          ) : (
                            <Trash2 size={13} />
                          )}
                          Cancelar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {scheduledPosts.length > 0 && scheduledPosts.filter((p) => scheduledPlatformFilter === 'all' || p.platform === scheduledPlatformFilter).length === 0 && (
                <div style={{ textAlign: 'center', padding: '32px', color: '#94a3b8', fontSize: '13px' }}>
                  No hay publicaciones para {scheduledPlatformFilter === 'facebook' ? 'Facebook' : 'Instagram'}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ==================== ANALYTICS TAB ==================== */}
      {activeTab === 'analytics' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Analiticas de publicaciones</h3>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button onClick={loadFbPosts} disabled={fbPostsLoading} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 14px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '12px', fontWeight: 500, color: '#64748b', cursor: 'pointer' }}>
                <RefreshCw size={14} style={fbPostsLoading ? { animation: 'spin 1s linear infinite' } : {}} />
                Actualizar
              </button>
            </div>
          </div>

          {fbPostsError && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '10px', marginBottom: '12px', fontSize: '12px', color: '#92400e' }}>
              <AlertCircle size={14} style={{ flexShrink: 0 }} />
              <span>No se pudieron cargar las publicaciones de Facebook. Las analiticas muestran solo datos de Instagram. Verifica los permisos de tu aplicacion Meta.</span>
            </div>
          )}

          {/* KPI Cards */}
          {(() => {
            const totalFb = fbPosts.length;
            const totalIg = igMedia.length;
            const totalPosts = totalFb + totalIg;
            const avgLikes = totalPosts > 0 ? Math.round((fbPosts.reduce((s, p) => s + p.likes, 0) + igMedia.reduce((s, m) => s + m.likeCount, 0)) / totalPosts) : 0;
            const avgComments = totalPosts > 0 ? Math.round((fbPosts.reduce((s, p) => s + p.comments, 0) + igMedia.reduce((s, m) => s + m.commentsCount, 0)) / totalPosts) : 0;
            const totalShares = fbPosts.reduce((s, p) => s + p.shares, 0);

            const kpis = [
              { label: 'Total publicaciones', value: totalPosts, color: '#3b82f6' },
              { label: 'Promedio likes', value: avgLikes, color: '#e11d48' },
              { label: 'Promedio comentarios', value: avgComments, color: '#8b5cf6' },
              { label: 'Total compartidos', value: totalShares, color: '#16a34a' },
            ];

            return (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '24px' }}>
                  {kpis.map((kpi, idx) => (
                    <div key={idx} style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', padding: '18px 20px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{kpi.label}</div>
                      <div style={{ fontSize: '28px', fontWeight: 700, color: kpi.color, marginTop: '6px' }}>{kpi.value.toLocaleString()}</div>
                    </div>
                  ))}
                </div>

                {/* Top Posts by engagement */}
                <div style={{ background: 'white', borderRadius: '14px', border: '1px solid #e2e8f0', overflow: 'hidden' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: 600, color: '#1e293b', margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <TrendingUp size={16} color="#e11d48" />
                      Top 5 publicaciones por engagement
                    </h4>
                  </div>

                  <div style={{ padding: '16px 20px' }}>
                    {(() => {
                      const allPostsScored = [
                        ...fbPosts.map(p => ({
                          id: p.id, platform: 'facebook' as const, message: p.message || '', image: p.fullPicture,
                          score: p.likes + (p.comments * 2) + (p.shares * 3),
                          likes: p.likes, comments: p.comments, shares: p.shares,
                        })),
                        ...igMedia.map(m => ({
                          id: m.id, platform: 'instagram' as const, message: m.caption || '', image: m.mediaUrl || m.thumbnailUrl,
                          score: m.likeCount + (m.commentsCount * 2),
                          likes: m.likeCount, comments: m.commentsCount, shares: 0,
                        })),
                      ].sort((a, b) => b.score - a.score).slice(0, 5);

                      const maxScore = allPostsScored[0]?.score || 1;

                      if (allPostsScored.length === 0) {
                        return <p style={{ fontSize: '13px', color: '#94a3b8', textAlign: 'center', margin: '20px 0' }}>No hay datos disponibles. Carga las publicaciones en los tabs de Facebook e Instagram.</p>;
                      }

                      return (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                          {allPostsScored.map((post, idx) => (
                            <div key={post.id} style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                              <span style={{ fontSize: '14px', fontWeight: 700, color: '#94a3b8', width: '24px', textAlign: 'center' }}>#{idx + 1}</span>
                              {post.image ? (
                                <img src={post.image} alt="" style={{ width: '48px', height: '48px', borderRadius: '8px', objectFit: 'cover', flexShrink: 0 }} />
                              ) : (
                                <div style={{ width: '48px', height: '48px', borderRadius: '8px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                  {post.platform === 'instagram' ? <Instagram size={18} color="#e11d48" /> : <Facebook size={18} color="#1877f2" />}
                                </div>
                              )}
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '12px', color: '#1e293b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                  {post.message || '(Sin texto)'}
                                </div>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}><ThumbsUp size={10} /> {post.likes}</span>
                                  <span style={{ fontSize: '11px', color: '#94a3b8' }}><MessageSquare size={10} /> {post.comments}</span>
                                  {post.shares > 0 && <span style={{ fontSize: '11px', color: '#94a3b8' }}><Share2 size={10} /> {post.shares}</span>}
                                  <span style={{
                                    fontSize: '10px', padding: '1px 5px', borderRadius: '3px',
                                    background: post.platform === 'instagram' ? '#fdf2f8' : '#eff6ff',
                                    color: post.platform === 'instagram' ? '#e11d48' : '#3b82f6', fontWeight: 500,
                                  }}>
                                    {post.platform === 'instagram' ? 'IG' : 'FB'}
                                  </span>
                                </div>
                                {/* Engagement bar */}
                                <div style={{ marginTop: '6px', height: '4px', background: '#f1f5f9', borderRadius: '2px', overflow: 'hidden', maxWidth: '220px' }}>
                                  <div style={{
                                    height: '100%', borderRadius: '2px',
                                    width: `${(post.score / maxScore) * 100}%`,
                                    background: post.platform === 'instagram' ? 'linear-gradient(90deg, #f58529, #dd2a7b)' : 'linear-gradient(90deg, #1877f2, #4299e1)',
                                  }} />
                                </div>
                              </div>
                              <div style={{ fontSize: '14px', fontWeight: 700, color: '#1e293b', flexShrink: 0 }}>
                                {post.score}
                              </div>
                            </div>
                          ))}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </>
            );
          })()}
        </div>
      )}

      {/* Edit Modal */}
      {editingPost && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
        }} onClick={() => setEditingPost(null)}>
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: '16px', padding: '24px', width: '100%', maxWidth: '500px',
              boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#1e293b', margin: 0 }}>Editar publicacion programada</h3>
              <button onClick={() => setEditingPost(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              <span style={{
                padding: '3px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600, textTransform: 'capitalize',
                background: editingPost.platform === 'instagram' ? '#fdf2f8' : '#eff6ff',
                color: editingPost.platform === 'instagram' ? '#e11d48' : '#3b82f6',
              }}>
                {editingPost.platform}
              </span>
            </div>

            <textarea
              value={editMessage}
              onChange={(e) => setEditMessage(e.target.value)}
              style={{
                width: '100%', minHeight: '120px', padding: '12px', border: '1px solid #e2e8f0',
                borderRadius: '10px', fontSize: '14px', color: '#1e293b', resize: 'vertical',
                fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box',
              }}
              onFocus={(e) => { e.currentTarget.style.borderColor = '#3b82f6'; }}
              onBlur={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; }}
            />

            <div style={{ marginTop: '16px', display: 'flex', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Fecha</label>
                <input
                  type="date"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  min={new Date().toLocaleDateString('en-CA')}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#1e293b' }}
                />
              </div>
              <div>
                <label style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', display: 'block', marginBottom: '4px' }}>Hora</label>
                <input
                  type="time"
                  value={editTime}
                  onChange={(e) => setEditTime(e.target.value)}
                  style={{ padding: '8px 12px', border: '1px solid #d1d5db', borderRadius: '8px', fontSize: '13px', outline: 'none', color: '#1e293b' }}
                />
              </div>
            </div>

            <div style={{ marginTop: '24px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setEditingPost(null)}
                style={{ padding: '10px 20px', background: '#f1f5f9', border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 500, color: '#64748b', cursor: 'pointer' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleSaveEdit}
                disabled={savingEdit}
                style={{
                  padding: '10px 20px', background: savingEdit ? '#94a3b8' : '#2563eb', color: 'white',
                  border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: 600,
                  cursor: savingEdit ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                {savingEdit ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Save size={14} />}
                Guardar cambios
              </button>
            </div>
          </div>
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
