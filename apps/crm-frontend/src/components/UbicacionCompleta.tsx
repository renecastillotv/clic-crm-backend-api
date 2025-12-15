/**
 * UbicacionCompleta - Sistema híbrido de selección de ubicación
 * Combina: Mapa interactivo + Google Autocomplete + Dropdowns jerárquicos
 *
 * Sincronización bidireccional:
 * - Google Autocomplete → Actualiza mapa + dropdowns
 * - Mapa (click/drag) → Actualiza dirección + dropdowns (reverse geocode)
 * - Dropdowns → Actualiza mapa (centra en ubicación)
 *
 * Fuente de verdad: tabla ubicaciones (pais, provincia, ciudad, sector)
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { MapPin, Loader2, AlertCircle, Check, ChevronDown, Search } from 'lucide-react';
import GoogleMapPicker from './GoogleMapPicker';
import AddressAutocomplete from './AddressAutocomplete';

interface Ubicacion {
  id: string;
  nombre: string;
  slug: string;
  tipo: 'pais' | 'provincia' | 'ciudad' | 'sector' | 'zona';
  codigo?: string;
  latitud?: number;
  longitud?: number;
}

interface UbicacionCompletaValue {
  pais: string;
  provincia: string;
  ciudad: string;
  sector: string;
  direccion: string;
  latitud: string;
  longitud: string;
  ubicacion_id?: string;
}

interface UbicacionCompletaProps {
  value: UbicacionCompletaValue;
  onChange: (value: UbicacionCompletaValue) => void;
  disabled?: boolean;
  showMap?: boolean;
  mapHeight?: string;
}

interface UbicacionMatch {
  pais?: { id: string; nombre: string };
  provincia?: { id: string; nombre: string };
  ciudad?: { id: string; nombre: string };
  sector?: { id: string; nombre: string };
  matchLevel: 'sector' | 'ciudad' | 'provincia' | 'pais' | 'none';
  confidence: 'exact' | 'alias' | 'partial' | 'none';
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

export default function UbicacionCompleta({
  value,
  onChange,
  disabled = false,
  showMap = true,
  mapHeight = '250px',
}: UbicacionCompletaProps) {
  // Estados para las listas de ubicaciones
  const [paises, setPaises] = useState<Ubicacion[]>([]);
  const [provincias, setProvincias] = useState<Ubicacion[]>([]);
  const [ciudades, setCiudades] = useState<Ubicacion[]>([]);
  const [sectores, setSectores] = useState<Ubicacion[]>([]);

  // Estados para IDs seleccionados
  const [selectedPaisId, setSelectedPaisId] = useState<string>('');
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<string>('');
  const [selectedCiudadId, setSelectedCiudadId] = useState<string>('');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');

  // Estados de carga
  const [loadingPaises, setLoadingPaises] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [loadingSectores, setLoadingSectores] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Estado para mostrar feedback de sincronización
  const [syncStatus, setSyncStatus] = useState<{
    message: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  // Refs para evitar loops de sincronización
  const isUpdatingFromMap = useRef(false);
  const isUpdatingFromDropdown = useRef(false);
  const lastGoogleData = useRef<any>(null);
  const initialLoadDone = useRef(false);

  // Refs para IDs pendientes de selección (después de cargar listas)
  const pendingProvinciaId = useRef<string | null>(null);
  const pendingCiudadId = useRef<string | null>(null);
  const pendingSectorId = useRef<string | null>(null);

  // Ref para indicar que syncFromGoogle ya cargó las listas directamente
  // Esto evita que los useEffects sobrescriban los datos
  const listsLoadedBySyncRef = useRef<{
    provincias: boolean;
    ciudades: boolean;
    sectores: boolean;
  }>({ provincias: false, ciudades: false, sectores: false });

  // Cargar países al montar
  useEffect(() => {
    const fetchPaises = async () => {
      setLoadingPaises(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/paises`);
        const data = await response.json();
        const paisesList = data.paises || [];
        setPaises(paisesList);

        // Determinar qué país seleccionar
        let paisToSelect: Ubicacion | undefined;

        // 1. Si hay valor inicial de país, buscar el ID
        if (value?.pais) {
          paisToSelect = paisesList.find((p: Ubicacion) => p.nombre === value.pais);
        }

        // 2. Si no hay valor inicial pero solo hay un país, seleccionarlo automáticamente
        if (!paisToSelect && paisesList.length === 1) {
          paisToSelect = paisesList[0];
        }

        // 3. Si hay coordenadas y no hay país seleccionado, hacer reverse geocode
        if (!paisToSelect && value?.latitud && value?.longitud && !initialLoadDone.current) {
          initialLoadDone.current = true;
          // Intentar detectar país por coordenadas
          try {
            const lat = parseFloat(value.latitud);
            const lng = parseFloat(value.longitud);
            if (!isNaN(lat) && !isNaN(lng)) {
              const reverseResponse = await fetch(`${API_BASE}/api/geocoding/reverse-with-match`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ lat, lng }),
              });
              if (reverseResponse.ok) {
                const reverseData = await reverseResponse.json();
                if (reverseData.ubicacion?.pais) {
                  paisToSelect = paisesList.find((p: Ubicacion) => p.id === reverseData.ubicacion.pais.id);
                  // También actualizar los valores de ubicación
                  if (reverseData.google) {
                    onChange({
                      ...value,
                      pais: reverseData.ubicacion.pais?.nombre || reverseData.google.pais || value.pais,
                      provincia: reverseData.ubicacion.provincia?.nombre || reverseData.google.provincia || value.provincia,
                      ciudad: reverseData.ubicacion.ciudad?.nombre || reverseData.google.ciudad || value.ciudad,
                      sector: reverseData.ubicacion.sector?.nombre || reverseData.google.sector || value.sector,
                      direccion: reverseData.google.formatted_address || value.direccion,
                    });

                    // Programar selección de provincia, ciudad, sector después de cargar
                    if (reverseData.ubicacion.provincia) {
                      setTimeout(() => setSelectedProvinciaId(reverseData.ubicacion.provincia.id), 200);
                    }
                    if (reverseData.ubicacion.ciudad) {
                      setTimeout(() => setSelectedCiudadId(reverseData.ubicacion.ciudad.id), 400);
                    }
                    if (reverseData.ubicacion.sector) {
                      setTimeout(() => setSelectedSectorId(reverseData.ubicacion.sector.id), 600);
                    }
                  }
                }
              }
            }
          } catch (err) {
            console.error('Error en detección inicial de ubicación:', err);
          }
        }

        if (paisToSelect) {
          setSelectedPaisId(paisToSelect.id);
          // Si auto-seleccionamos, también actualizar el valor
          if (!value?.pais && paisToSelect) {
            onChange({
              ...value,
              pais: paisToSelect.nombre,
            });
          }
        }
      } catch (error) {
        console.error('Error al cargar países:', error);
      } finally {
        setLoadingPaises(false);
      }
    };
    fetchPaises();
  }, []);

  // Cargar provincias cuando cambia el país
  useEffect(() => {
    if (!selectedPaisId) {
      setProvincias([]);
      if (!isUpdatingFromMap.current) {
        setSelectedProvinciaId('');
      }
      return;
    }

    // Si syncFromGoogle ya cargó las provincias, no volver a cargarlas
    if (listsLoadedBySyncRef.current.provincias) {
      console.log('useEffect provincias - skipping, already loaded by syncFromGoogle');
      listsLoadedBySyncRef.current.provincias = false; // Reset para futuras cargas normales
      return;
    }

    const fetchProvincias = async () => {
      setLoadingProvincias(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/provincias/${selectedPaisId}`);
        const data = await response.json();
        const provinciasList = data.provincias || [];
        setProvincias(provinciasList);

        console.log('useEffect provincias - loaded:', provinciasList.length, 'pendingProvinciaId:', pendingProvinciaId.current);

        // Si hay un ID pendiente de Google, seleccionarlo
        if (pendingProvinciaId.current) {
          const existe = provinciasList.find((p: Ubicacion) => p.id === pendingProvinciaId.current);
          if (existe) {
            console.log('useEffect provincias - selecting pending provincia:', existe.nombre);
            setSelectedProvinciaId(pendingProvinciaId.current);
            pendingProvinciaId.current = null; // Solo limpiar si se encontró
          } else {
            console.log('useEffect provincias - pending provincia NOT found in list');
          }
        }
        // Si hay valor inicial por nombre, buscar
        else if (value?.provincia && !isUpdatingFromMap.current) {
          const provincia = provinciasList.find((p: Ubicacion) => p.nombre === value.provincia);
          if (provincia) {
            setSelectedProvinciaId(provincia.id);
          }
        }
      } catch (error) {
        console.error('Error al cargar provincias:', error);
      } finally {
        setLoadingProvincias(false);
      }
    };
    fetchProvincias();
  }, [selectedPaisId]);

  // Cargar ciudades cuando cambia la provincia
  useEffect(() => {
    if (!selectedProvinciaId) {
      setCiudades([]);
      if (!isUpdatingFromMap.current) {
        setSelectedCiudadId('');
      }
      return;
    }

    // Si syncFromGoogle ya cargó las ciudades, no volver a cargarlas
    if (listsLoadedBySyncRef.current.ciudades) {
      console.log('useEffect ciudades - skipping, already loaded by syncFromGoogle');
      listsLoadedBySyncRef.current.ciudades = false; // Reset para futuras cargas normales
      return;
    }

    const fetchCiudades = async () => {
      setLoadingCiudades(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/ciudades/${selectedProvinciaId}`);
        const data = await response.json();
        const ciudadesList = data.ciudades || [];
        setCiudades(ciudadesList);

        console.log('useEffect ciudades - loaded:', ciudadesList.length, 'pendingCiudadId:', pendingCiudadId.current);

        // Si hay un ID pendiente de Google, seleccionarlo
        if (pendingCiudadId.current) {
          const existe = ciudadesList.find((c: Ubicacion) => c.id === pendingCiudadId.current);
          if (existe) {
            console.log('useEffect ciudades - selecting pending ciudad:', existe.nombre);
            setSelectedCiudadId(pendingCiudadId.current);
            pendingCiudadId.current = null; // Solo limpiar si se encontró
          } else {
            console.log('useEffect ciudades - pending ciudad NOT found in list, keeping pending ID');
            // No limpiar el pendingId si no se encontró - podría ser timing issue
          }
        }
        // Si hay valor inicial por nombre, buscar
        else if (value?.ciudad && !isUpdatingFromMap.current) {
          const ciudad = ciudadesList.find((c: Ubicacion) => c.nombre === value.ciudad);
          if (ciudad) {
            setSelectedCiudadId(ciudad.id);
          }
        }
      } catch (error) {
        console.error('Error al cargar ciudades:', error);
      } finally {
        setLoadingCiudades(false);
      }
    };
    fetchCiudades();
  }, [selectedProvinciaId]);

  // Cargar sectores cuando cambia la ciudad
  useEffect(() => {
    if (!selectedCiudadId) {
      setSectores([]);
      if (!isUpdatingFromMap.current) {
        setSelectedSectorId('');
      }
      return;
    }

    // Si syncFromGoogle ya cargó los sectores, no volver a cargarlos
    if (listsLoadedBySyncRef.current.sectores) {
      console.log('useEffect sectores - skipping, already loaded by syncFromGoogle');
      listsLoadedBySyncRef.current.sectores = false; // Reset para futuras cargas normales
      return;
    }

    const fetchSectores = async () => {
      setLoadingSectores(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/sectores/${selectedCiudadId}`);
        const data = await response.json();
        const sectoresList = data.sectores || [];
        setSectores(sectoresList);

        console.log('useEffect sectores - loaded:', sectoresList.length, 'pendingSectorId:', pendingSectorId.current);

        // Si hay un ID pendiente de Google, seleccionarlo
        if (pendingSectorId.current) {
          const existe = sectoresList.find((s: Ubicacion) => s.id === pendingSectorId.current);
          if (existe) {
            console.log('useEffect sectores - selecting pending sector:', existe.nombre);
            setSelectedSectorId(pendingSectorId.current);
            pendingSectorId.current = null; // Solo limpiar si se encontró
          } else {
            console.log('useEffect sectores - pending sector NOT found in list');
          }
          // Liberar la bandera después de procesar el sector pendiente
          setTimeout(() => {
            isUpdatingFromMap.current = false;
          }, 100);
        }
        // Si hay valor inicial por nombre, buscar
        else if (value?.sector && !isUpdatingFromMap.current) {
          const sector = sectoresList.find((s: Ubicacion) => s.nombre === value.sector);
          if (sector) {
            setSelectedSectorId(sector.id);
          }
        }
      } catch (error) {
        console.error('Error al cargar sectores:', error);
      } finally {
        setLoadingSectores(false);
      }
    };
    fetchSectores();
  }, [selectedCiudadId]);

  // Fallback para resetear la bandera si hay pendientes que no se procesan
  useEffect(() => {
    if (isUpdatingFromMap.current) {
      // Si después de 2 segundos aún está activa, forzar reset
      const timeout = setTimeout(() => {
        if (isUpdatingFromMap.current) {
          console.log('Resetting isUpdatingFromMap flag (timeout fallback)');
          isUpdatingFromMap.current = false;
          pendingProvinciaId.current = null;
          pendingCiudadId.current = null;
          pendingSectorId.current = null;
        }
      }, 2000);
      return () => clearTimeout(timeout);
    }
  }, [selectedPaisId, selectedProvinciaId, selectedCiudadId, selectedSectorId]);

  // Sincronizar desde Google (Autocomplete o Reverse Geocode) a Dropdowns
  // ESTRATEGIA ROBUSTA:
  // 1. Carga TODAS las listas necesarias (provincias, ciudades, sectores)
  // 2. Si solo hay match parcial (ej: ciudad+provincia), carga las listas pero deja sector vacío
  // 3. Todos los dropdowns siempre tienen opciones para que el usuario pueda completar manualmente
  const syncFromGoogle = useCallback(async (googleData: {
    pais?: string;
    provincia?: string;
    ciudad?: string;
    sector?: string;
    formatted_address?: string;
    lat?: number;
    lng?: number;
  }) => {
    setSyncing(true);
    isUpdatingFromMap.current = true;

    try {
      // Llamar al endpoint que busca match en nuestra tabla
      const response = await fetch(`${API_BASE}/api/geocoding/match-ubicacion`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pais: googleData.pais,
          provincia: googleData.provincia,
          ciudad: googleData.ciudad,
          sector: googleData.sector,
        }),
      });

      const match: UbicacionMatch = await response.json();

      console.log('syncFromGoogle - match result:', {
        pais: match.pais?.nombre,
        provincia: match.provincia?.nombre,
        ciudad: match.ciudad?.nombre,
        sector: match.sector?.nombre,
        matchLevel: match.matchLevel,
        confidence: match.confidence
      });

      // ESTRATEGIA DE CARGA COMPLETA:
      // Cargar TODAS las listas necesarias para que los dropdowns funcionen correctamente
      // Incluso si no hay match en un nivel, cargar la lista para selección manual

      // Variables para almacenar las listas cargadas
      let provinciasList: Ubicacion[] = [];
      let ciudadesList: Ubicacion[] = [];
      let sectoresList: Ubicacion[] = [];

      // 1. PAÍS - Actualizar selección
      if (match.pais) {
        if (match.pais.id !== selectedPaisId) {
          setSelectedPaisId(match.pais.id);
        }

        // 2. PROVINCIAS - SIEMPRE cargar la lista de provincias del país
        try {
          const provinciasResponse = await fetch(`${API_BASE}/api/ubicaciones/provincias/${match.pais.id}`);
          const provinciasData = await provinciasResponse.json();
          provinciasList = provinciasData.provincias || [];
          setProvincias(provinciasList);
          listsLoadedBySyncRef.current.provincias = true;
          console.log('syncFromGoogle - loaded provincias:', provinciasList.length);
        } catch (err) {
          console.error('Error loading provincias:', err);
        }

        // 3. Si tenemos PROVINCIA en el match
        if (match.provincia) {
          setSelectedProvinciaId(match.provincia.id);

          // Cargar ciudades de esta provincia
          try {
            const ciudadesResponse = await fetch(`${API_BASE}/api/ubicaciones/ciudades/${match.provincia.id}`);
            const ciudadesData = await ciudadesResponse.json();
            ciudadesList = ciudadesData.ciudades || [];
            setCiudades(ciudadesList);
            listsLoadedBySyncRef.current.ciudades = true;
            console.log('syncFromGoogle - loaded ciudades:', ciudadesList.length);
          } catch (err) {
            console.error('Error loading ciudades:', err);
          }

          // 4. Si tenemos CIUDAD en el match
          if (match.ciudad) {
            setSelectedCiudadId(match.ciudad.id);

            // Cargar sectores de esta ciudad
            try {
              const sectoresResponse = await fetch(`${API_BASE}/api/ubicaciones/sectores/${match.ciudad.id}`);
              const sectoresData = await sectoresResponse.json();
              sectoresList = sectoresData.sectores || [];
              setSectores(sectoresList);
              listsLoadedBySyncRef.current.sectores = true;
              console.log('syncFromGoogle - loaded sectores:', sectoresList.length);
            } catch (err) {
              console.error('Error loading sectores:', err);
            }

            // 5. Si tenemos SECTOR en el match, seleccionarlo
            if (match.sector) {
              setSelectedSectorId(match.sector.id);
              console.log('syncFromGoogle - selected sector:', match.sector.nombre);
            } else {
              // No hay sector matcheado - dejar vacío para selección manual
              setSelectedSectorId('');
              console.log('syncFromGoogle - no sector match, lista cargada para selección manual');
            }
          } else {
            // No hay ciudad matcheada - limpiar ciudad y sector pero mantener provincias
            setSelectedCiudadId('');
            setSectores([]);
            setSelectedSectorId('');
            console.log('syncFromGoogle - no ciudad match, provincias disponibles');
          }
        } else {
          // No hay provincia matcheada - limpiar todo excepto país
          setSelectedProvinciaId('');
          setCiudades([]);
          setSelectedCiudadId('');
          setSectores([]);
          setSelectedSectorId('');
          console.log('syncFromGoogle - no provincia match, país seleccionado');
        }
      } else {
        // No hay match de país - limpiar todo
        // Pero NO limpiar el país si ya hay uno seleccionado
        if (!selectedPaisId) {
          setProvincias([]);
        }
        setSelectedProvinciaId('');
        setCiudades([]);
        setSelectedCiudadId('');
        setSectores([]);
        setSelectedSectorId('');
        console.log('syncFromGoogle - no pais match');
      }

      // Limpiar los pending IDs ya que cargamos todo directamente
      pendingProvinciaId.current = null;
      pendingCiudadId.current = null;
      pendingSectorId.current = null;

      // Actualizar el valor completo con nombres del match
      const newValue: UbicacionCompletaValue = {
        pais: match.pais?.nombre || googleData.pais || '',
        provincia: match.provincia?.nombre || googleData.provincia || '',
        ciudad: match.ciudad?.nombre || googleData.ciudad || '',
        sector: match.sector?.nombre || googleData.sector || '',
        direccion: googleData.formatted_address || value.direccion,
        latitud: googleData.lat?.toString() || value.latitud,
        longitud: googleData.lng?.toString() || value.longitud,
        ubicacion_id: match.sector?.id || match.ciudad?.id || match.provincia?.id || match.pais?.id,
      };

      onChange(newValue);

      // Mostrar feedback basado en el nivel de match y confianza
      if (match.matchLevel === 'sector') {
        if (match.confidence === 'exact') {
          setSyncStatus({ message: `Ubicacion completa: ${match.ciudad?.nombre} → ${match.sector?.nombre}`, type: 'success' });
        } else if (match.confidence === 'alias') {
          setSyncStatus({ message: `Ubicacion completa: "${googleData.sector}" es "${match.sector?.nombre}"`, type: 'success' });
        } else {
          setSyncStatus({ message: `Ubicacion completa: ${match.sector?.nombre} (coincidencia parcial)`, type: 'success' });
        }
      } else if (match.matchLevel === 'ciudad') {
        setSyncStatus({
          message: `Pais, provincia y ciudad detectados. Sector no encontrado${googleData.sector ? ` ("${googleData.sector}")` : ''} - seleccionalo del catalogo`,
          type: 'info'
        });
      } else if (match.matchLevel === 'provincia') {
        setSyncStatus({
          message: `Pais y provincia detectados. Selecciona ciudad y sector del catalogo`,
          type: 'warning'
        });
      } else if (match.matchLevel === 'pais') {
        setSyncStatus({
          message: `Solo se detecto el pais. Selecciona provincia, ciudad y sector del catalogo`,
          type: 'warning'
        });
      } else {
        setSyncStatus({ message: 'Ubicacion no encontrada en el catalogo. Selecciona manualmente', type: 'warning' });
      }

      // Mantener mensaje visible más tiempo para que el usuario lo lea
      setTimeout(() => setSyncStatus(null), 8000);

    } catch (error) {
      console.error('Error sincronizando ubicación:', error);
      setSyncStatus({ message: 'Error al sincronizar ubicacion', type: 'warning' });
      isUpdatingFromMap.current = false;
    } finally {
      setSyncing(false);
      // Resetear bandera después de un breve delay para evitar race conditions con useEffects
      setTimeout(() => {
        isUpdatingFromMap.current = false;
      }, 300);
    }
  }, [value, onChange, selectedPaisId]);

  // Handler cuando se selecciona una dirección de Google Autocomplete
  const handleAddressSelect = useCallback((address: {
    formatted_address: string;
    place_id: string;
    lat: number;
    lng: number;
    pais?: string;
    provincia?: string;
    ciudad?: string;
    sector?: string;
  }) => {
    lastGoogleData.current = address;
    syncFromGoogle(address);
  }, [syncFromGoogle]);

  // Handler cuando cambia la posición en el mapa
  const handleMapLocationChange = useCallback(async (lat: number, lng: number) => {
    if (isUpdatingFromDropdown.current) return;

    setSyncing(true);
    isUpdatingFromMap.current = true;

    try {
      // Hacer reverse geocode
      const response = await fetch(`${API_BASE}/api/geocoding/reverse-with-match`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lat, lng }),
      });

      if (!response.ok) {
        throw new Error('Error en reverse geocode');
      }

      const data = await response.json();
      const { google: googleData } = data;

      // Actualizar con los datos obtenidos
      syncFromGoogle({
        ...googleData,
        lat,
        lng,
      });

    } catch (error) {
      console.error('Error en reverse geocode:', error);
      // Al menos actualizar las coordenadas
      onChange({
        ...value,
        latitud: lat.toString(),
        longitud: lng.toString(),
      });
    } finally {
      setSyncing(false);
      setTimeout(() => {
        isUpdatingFromMap.current = false;
      }, 500);
    }
  }, [value, onChange, syncFromGoogle]);

  // Handlers para cambios en dropdowns
  const handlePaisChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const paisId = e.target.value;
    isUpdatingFromDropdown.current = true;

    setSelectedPaisId(paisId);
    setSelectedProvinciaId('');
    setSelectedCiudadId('');
    setSelectedSectorId('');
    setProvincias([]);
    setCiudades([]);
    setSectores([]);

    const pais = paises.find(p => p.id === paisId);
    onChange({
      ...value,
      pais: pais?.nombre || '',
      provincia: '',
      ciudad: '',
      sector: '',
      ubicacion_id: undefined,
    });

    setTimeout(() => {
      isUpdatingFromDropdown.current = false;
    }, 100);
  }, [paises, value, onChange]);

  const handleProvinciaChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinciaId = e.target.value;
    isUpdatingFromDropdown.current = true;

    setSelectedProvinciaId(provinciaId);
    setSelectedCiudadId('');
    setSelectedSectorId('');
    setCiudades([]);
    setSectores([]);

    const pais = paises.find(p => p.id === selectedPaisId);
    const provincia = provincias.find(p => p.id === provinciaId);
    onChange({
      ...value,
      pais: pais?.nombre || value.pais,
      provincia: provincia?.nombre || '',
      ciudad: '',
      sector: '',
      ubicacion_id: undefined,
    });

    setTimeout(() => {
      isUpdatingFromDropdown.current = false;
    }, 100);
  }, [paises, provincias, selectedPaisId, value, onChange]);

  const handleCiudadChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const ciudadId = e.target.value;
    isUpdatingFromDropdown.current = true;

    setSelectedCiudadId(ciudadId);
    setSelectedSectorId('');
    setSectores([]);

    const pais = paises.find(p => p.id === selectedPaisId);
    const provincia = provincias.find(p => p.id === selectedProvinciaId);
    const ciudad = ciudades.find(c => c.id === ciudadId);
    onChange({
      ...value,
      pais: pais?.nombre || value.pais,
      provincia: provincia?.nombre || value.provincia,
      ciudad: ciudad?.nombre || '',
      sector: '',
      ubicacion_id: undefined,
    });

    setTimeout(() => {
      isUpdatingFromDropdown.current = false;
    }, 100);
  }, [paises, provincias, ciudades, selectedPaisId, selectedProvinciaId, value, onChange]);

  const handleSectorChange = useCallback(async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const sectorId = e.target.value;
    isUpdatingFromDropdown.current = true;

    setSelectedSectorId(sectorId);

    const pais = paises.find(p => p.id === selectedPaisId);
    const provincia = provincias.find(p => p.id === selectedProvinciaId);
    const ciudad = ciudades.find(c => c.id === selectedCiudadId);
    const sector = sectores.find(s => s.id === sectorId);

    // Si el sector tiene coordenadas, usarlas para centrar el mapa
    let newLat = value.latitud;
    let newLng = value.longitud;

    if (sector) {
      // Si el sector tiene coordenadas guardadas, usarlas
      if (sector.latitud && sector.longitud) {
        newLat = sector.latitud.toString();
        newLng = sector.longitud.toString();
      } else {
        // Si no, intentar obtener coordenadas por geocoding del nombre del sector
        try {
          const searchQuery = `${sector.nombre}, ${ciudad?.nombre || ''}, ${provincia?.nombre || ''}, República Dominicana`;
          const response = await fetch(`${API_BASE}/api/geocoding/geocode`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ address: searchQuery }),
          });

          if (response.ok) {
            const data = await response.json();
            if (data.lat && data.lng) {
              newLat = data.lat.toString();
              newLng = data.lng.toString();
            }
          }
        } catch (err) {
          console.error('Error geocoding sector:', err);
        }
      }
    }

    onChange({
      ...value,
      pais: pais?.nombre || value.pais,
      provincia: provincia?.nombre || value.provincia,
      ciudad: ciudad?.nombre || value.ciudad,
      sector: sector?.nombre || '',
      ubicacion_id: sectorId || undefined,
      latitud: newLat,
      longitud: newLng,
    });

    setTimeout(() => {
      isUpdatingFromDropdown.current = false;
    }, 100);
  }, [paises, provincias, ciudades, sectores, selectedPaisId, selectedProvinciaId, selectedCiudadId, value, onChange]);

  // Handler para cambio manual de dirección
  const handleDireccionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onChange({
      ...value,
      direccion: e.target.value,
    });
  }, [value, onChange]);

  const currentLat = value.latitud ? parseFloat(value.latitud) : undefined;
  const currentLng = value.longitud ? parseFloat(value.longitud) : undefined;

  return (
    <div className="ubicacion-completa">
      <style>{`
        .ubicacion-completa {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .ubicacion-section {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .ubicacion-section-title {
          font-size: 0.75rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .ubicacion-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        @media (max-width: 640px) {
          .ubicacion-grid {
            grid-template-columns: 1fr;
          }
        }

        .ubicacion-field {
          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .ubicacion-field label {
          font-size: 0.8rem;
          color: #374151;
          font-weight: 500;
        }

        .ubicacion-field select,
        .ubicacion-field input {
          width: 100%;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          font-size: 0.875rem;
          color: #1f2937;
          background: white;
          transition: border-color 0.15s;
        }

        .ubicacion-field select:focus,
        .ubicacion-field input:focus {
          outline: none;
          border-color: #059669;
          box-shadow: 0 0 0 3px rgba(5, 150, 105, 0.1);
        }

        .ubicacion-field select:disabled,
        .ubicacion-field input:disabled {
          background: #f8fafc;
          cursor: not-allowed;
          opacity: 0.7;
        }

        .ubicacion-sync-status {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 12px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          animation: slideIn 0.2s ease;
          line-height: 1.4;
        }

        .ubicacion-sync-status svg {
          flex-shrink: 0;
          margin-top: 2px;
        }

        .ubicacion-sync-status.success {
          background: #ecfdf5;
          color: #047857;
          border: 1px solid #6ee7b7;
        }

        .ubicacion-sync-status.warning {
          background: #fef3c7;
          color: #b45309;
          border: 1px solid #fbbf24;
        }

        .ubicacion-sync-status.info {
          background: #dbeafe;
          color: #1d4ed8;
          border: 1px solid #60a5fa;
        }

        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .ubicacion-map-container {
          border-radius: 8px;
          overflow: hidden;
        }

        .ubicacion-syncing {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #64748b;
          font-size: 0.75rem;
        }

        .ubicacion-syncing svg {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        .ubicacion-coords {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
          padding: 12px;
          background: #f8fafc;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
        }

        .ubicacion-coords-label {
          font-size: 0.7rem;
          color: #94a3b8;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin-bottom: 2px;
        }

        .ubicacion-coords-value {
          font-family: ui-monospace, monospace;
          font-size: 0.8rem;
          color: #1f2937;
        }

        .ubicacion-helper {
          font-size: 0.75rem;
          color: #94a3b8;
          display: flex;
          align-items: center;
          gap: 4px;
        }
      `}</style>

      {/* Buscador de Google */}
      <div className="ubicacion-section">
        <div className="ubicacion-section-title">
          <Search size={14} />
          Buscar direccion
        </div>
        <AddressAutocomplete
          onSelect={handleAddressSelect}
          placeholder="Escribe para buscar una direccion..."
          disabled={disabled}
          initialValue={value.direccion}
        />
        {syncing && (
          <div className="ubicacion-syncing">
            <Loader2 size={14} />
            Sincronizando ubicacion...
          </div>
        )}
      </div>

      {/* Status de sincronización */}
      {syncStatus && (
        <div className={`ubicacion-sync-status ${syncStatus.type}`}>
          {syncStatus.type === 'success' ? (
            <Check size={16} />
          ) : (
            <AlertCircle size={16} />
          )}
          {syncStatus.message}
        </div>
      )}

      {/* Mapa */}
      {showMap && (
        <div className="ubicacion-section">
          <div className="ubicacion-section-title">
            <MapPin size={14} />
            Ubicacion en el mapa
          </div>
          <div className="ubicacion-map-container">
            <GoogleMapPicker
              lat={currentLat}
              lng={currentLng}
              onLocationChange={handleMapLocationChange}
              disabled={disabled}
              height={mapHeight}
              showCrosshair={false}
            />
          </div>
          <div className="ubicacion-helper">
            Haz clic en el mapa o arrastra el marcador para ajustar la ubicacion
          </div>
        </div>
      )}

      {/* Dropdowns jerárquicos */}
      <div className="ubicacion-section">
        <div className="ubicacion-section-title">
          <ChevronDown size={14} />
          Ubicacion oficial (catalogo)
        </div>
        <div className="ubicacion-grid">
          <div className="ubicacion-field">
            <label htmlFor="ubicacion-pais">Pais</label>
            <select
              id="ubicacion-pais"
              value={selectedPaisId}
              onChange={handlePaisChange}
              disabled={disabled || loadingPaises}
            >
              <option value="">
                {loadingPaises ? 'Cargando...' : 'Seleccionar pais'}
              </option>
              {paises.map(pais => (
                <option key={pais.id} value={pais.id}>
                  {pais.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="ubicacion-field">
            <label htmlFor="ubicacion-provincia">Provincia</label>
            <select
              id="ubicacion-provincia"
              value={selectedProvinciaId}
              onChange={handleProvinciaChange}
              disabled={disabled || !selectedPaisId || loadingProvincias}
            >
              <option value="">
                {loadingProvincias ? 'Cargando...' : !selectedPaisId ? 'Selecciona un pais' : 'Seleccionar provincia'}
              </option>
              {provincias.map(provincia => (
                <option key={provincia.id} value={provincia.id}>
                  {provincia.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="ubicacion-field">
            <label htmlFor="ubicacion-ciudad">Ciudad</label>
            <select
              id="ubicacion-ciudad"
              value={selectedCiudadId}
              onChange={handleCiudadChange}
              disabled={disabled || !selectedProvinciaId || loadingCiudades}
            >
              <option value="">
                {loadingCiudades ? 'Cargando...' : !selectedProvinciaId ? 'Selecciona una provincia' : 'Seleccionar ciudad'}
              </option>
              {ciudades.map(ciudad => (
                <option key={ciudad.id} value={ciudad.id}>
                  {ciudad.nombre}
                </option>
              ))}
            </select>
          </div>

          <div className="ubicacion-field">
            <label htmlFor="ubicacion-sector">Sector</label>
            <select
              id="ubicacion-sector"
              value={selectedSectorId}
              onChange={handleSectorChange}
              disabled={disabled || !selectedCiudadId || loadingSectores}
            >
              <option value="">
                {loadingSectores ? 'Cargando...' : !selectedCiudadId ? 'Selecciona una ciudad' : 'Seleccionar sector'}
              </option>
              {sectores.map(sector => (
                <option key={sector.id} value={sector.id}>
                  {sector.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Dirección libre */}
      <div className="ubicacion-section">
        <div className="ubicacion-field">
          <label htmlFor="ubicacion-direccion">Direccion (calle, numero, referencia)</label>
          <input
            id="ubicacion-direccion"
            type="text"
            value={value.direccion}
            onChange={handleDireccionChange}
            placeholder="Ej: Calle Principal #123, frente al parque"
            disabled={disabled}
          />
        </div>
      </div>

      {/* Coordenadas (solo lectura visual) */}
      {(currentLat || currentLng) && (
        <div className="ubicacion-coords">
          <div>
            <div className="ubicacion-coords-label">Latitud</div>
            <div className="ubicacion-coords-value">{currentLat?.toFixed(6) || '-'}</div>
          </div>
          <div>
            <div className="ubicacion-coords-label">Longitud</div>
            <div className="ubicacion-coords-value">{currentLng?.toFixed(6) || '-'}</div>
          </div>
        </div>
      )}
    </div>
  );
}
