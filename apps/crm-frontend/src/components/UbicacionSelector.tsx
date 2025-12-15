/**
 * UbicacionSelector - Selector jerárquico de ubicaciones
 * Permite seleccionar País > Provincia > Ciudad > Sector
 */

import { useState, useEffect, useCallback } from 'react';

interface Ubicacion {
  id: string;
  nombre: string;
  slug: string;
  tipo: 'pais' | 'provincia' | 'ciudad' | 'sector' | 'zona';
  codigo?: string;
}

interface UbicacionSelectorProps {
  value?: {
    pais?: string;
    provincia?: string;
    ciudad?: string;
    sector?: string;
    ubicacion_id?: string;
  };
  onChange: (value: {
    pais: string;
    provincia: string;
    ciudad: string;
    sector: string;
    ubicacion_id?: string;
  }) => void;
  disabled?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:3001';

export default function UbicacionSelector({ value, onChange, disabled }: UbicacionSelectorProps) {
  // Estados para las listas
  const [paises, setPaises] = useState<Ubicacion[]>([]);
  const [provincias, setProvincias] = useState<Ubicacion[]>([]);
  const [ciudades, setCiudades] = useState<Ubicacion[]>([]);
  const [sectores, setSectores] = useState<Ubicacion[]>([]);

  // Estados para IDs seleccionados (para las llamadas a la API)
  const [selectedPaisId, setSelectedPaisId] = useState<string>('');
  const [selectedProvinciaId, setSelectedProvinciaId] = useState<string>('');
  const [selectedCiudadId, setSelectedCiudadId] = useState<string>('');
  const [selectedSectorId, setSelectedSectorId] = useState<string>('');

  // Loading states
  const [loadingPaises, setLoadingPaises] = useState(false);
  const [loadingProvincias, setLoadingProvincias] = useState(false);
  const [loadingCiudades, setLoadingCiudades] = useState(false);
  const [loadingSectores, setLoadingSectores] = useState(false);

  // Cargar países al montar
  useEffect(() => {
    const fetchPaises = async () => {
      setLoadingPaises(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/paises`);
        const data = await response.json();
        setPaises(data.paises || []);

        // Si hay valor inicial, buscar el país correspondiente
        if (value?.pais) {
          const pais = (data.paises || []).find((p: Ubicacion) => p.nombre === value.pais);
          if (pais) {
            setSelectedPaisId(pais.id);
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
      setSelectedProvinciaId('');
      return;
    }

    const fetchProvincias = async () => {
      setLoadingProvincias(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/provincias/${selectedPaisId}`);
        const data = await response.json();
        setProvincias(data.provincias || []);

        // Si hay valor inicial, buscar la provincia correspondiente
        if (value?.provincia) {
          const provincia = (data.provincias || []).find((p: Ubicacion) => p.nombre === value.provincia);
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
      setSelectedCiudadId('');
      return;
    }

    const fetchCiudades = async () => {
      setLoadingCiudades(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/ciudades/${selectedProvinciaId}`);
        const data = await response.json();
        setCiudades(data.ciudades || []);

        // Si hay valor inicial, buscar la ciudad correspondiente
        if (value?.ciudad) {
          const ciudad = (data.ciudades || []).find((c: Ubicacion) => c.nombre === value.ciudad);
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
      setSelectedSectorId('');
      return;
    }

    const fetchSectores = async () => {
      setLoadingSectores(true);
      try {
        const response = await fetch(`${API_BASE}/api/ubicaciones/sectores/${selectedCiudadId}`);
        const data = await response.json();
        setSectores(data.sectores || []);

        // Si hay valor inicial, buscar el sector correspondiente
        if (value?.sector) {
          const sector = (data.sectores || []).find((s: Ubicacion) => s.nombre === value.sector);
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

  // Handler para cambio de país
  const handlePaisChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const paisId = e.target.value;
    setSelectedPaisId(paisId);
    setSelectedProvinciaId('');
    setSelectedCiudadId('');
    setSelectedSectorId('');
    setProvincias([]);
    setCiudades([]);
    setSectores([]);

    const pais = paises.find(p => p.id === paisId);
    onChange({
      pais: pais?.nombre || '',
      provincia: '',
      ciudad: '',
      sector: '',
      ubicacion_id: undefined,
    });
  }, [paises, onChange]);

  // Handler para cambio de provincia
  const handleProvinciaChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const provinciaId = e.target.value;
    setSelectedProvinciaId(provinciaId);
    setSelectedCiudadId('');
    setSelectedSectorId('');
    setCiudades([]);
    setSectores([]);

    const pais = paises.find(p => p.id === selectedPaisId);
    const provincia = provincias.find(p => p.id === provinciaId);
    onChange({
      pais: pais?.nombre || '',
      provincia: provincia?.nombre || '',
      ciudad: '',
      sector: '',
      ubicacion_id: undefined,
    });
  }, [paises, provincias, selectedPaisId, onChange]);

  // Handler para cambio de ciudad
  const handleCiudadChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const ciudadId = e.target.value;
    setSelectedCiudadId(ciudadId);
    setSelectedSectorId('');
    setSectores([]);

    const pais = paises.find(p => p.id === selectedPaisId);
    const provincia = provincias.find(p => p.id === selectedProvinciaId);
    const ciudad = ciudades.find(c => c.id === ciudadId);
    onChange({
      pais: pais?.nombre || '',
      provincia: provincia?.nombre || '',
      ciudad: ciudad?.nombre || '',
      sector: '',
      ubicacion_id: undefined,
    });
  }, [paises, provincias, ciudades, selectedPaisId, selectedProvinciaId, onChange]);

  // Handler para cambio de sector
  const handleSectorChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    const sectorId = e.target.value;
    setSelectedSectorId(sectorId);

    const pais = paises.find(p => p.id === selectedPaisId);
    const provincia = provincias.find(p => p.id === selectedProvinciaId);
    const ciudad = ciudades.find(c => c.id === selectedCiudadId);
    const sector = sectores.find(s => s.id === sectorId);
    onChange({
      pais: pais?.nombre || '',
      provincia: provincia?.nombre || '',
      ciudad: ciudad?.nombre || '',
      sector: sector?.nombre || '',
      ubicacion_id: sectorId || undefined,
    });
  }, [paises, provincias, ciudades, sectores, selectedPaisId, selectedProvinciaId, selectedCiudadId, onChange]);

  return (
    <div className="ubicacion-selector" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '12px' }}>
      {/* País */}
      <div className="form-group">
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

      {/* Provincia */}
      <div className="form-group">
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

      {/* Ciudad */}
      <div className="form-group">
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

      {/* Sector */}
      <div className="form-group">
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
  );
}
