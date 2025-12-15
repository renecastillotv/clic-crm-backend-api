/**
 * Geocoding Routes
 * Endpoints para autocompletar direcciones y obtener coordenadas
 */

import { Router } from 'express';
import {
  getPlaceAutocomplete,
  getPlaceDetails,
  geocodeAddress,
  reverseGeocode,
  generateSessionToken,
} from '../services/geocodingService.js';
import { matchUbicacionFromGoogle } from '../services/ubicacionesService.js';

const router = Router();

/**
 * GET /api/geocoding/maps-config
 * Retorna la API key de Google Maps para el frontend
 */
router.get('/maps-config', (req, res) => {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Google Maps API key not configured' });
  }
  res.json({ apiKey });
});

/**
 * POST /api/geocoding/autocomplete
 * Obtiene sugerencias de direcciones mientras el usuario escribe
 */
router.post('/autocomplete', async (req, res) => {
  try {
    const { input, sessionToken, countryRestriction } = req.body;

    if (!input || typeof input !== 'string') {
      return res.status(400).json({ error: 'Input es requerido' });
    }

    const predictions = await getPlaceAutocomplete(
      input,
      sessionToken,
      countryRestriction || 'do' // Default a República Dominicana
    );

    res.json({ predictions });
  } catch (error: any) {
    console.error('Error en /api/geocoding/autocomplete:', error);
    res.status(500).json({ error: 'Error al obtener sugerencias', message: error.message });
  }
});

/**
 * POST /api/geocoding/place-details
 * Obtiene los detalles completos de un lugar por su place_id
 */
router.post('/place-details', async (req, res) => {
  try {
    const { placeId, sessionToken } = req.body;

    if (!placeId || typeof placeId !== 'string') {
      return res.status(400).json({ error: 'placeId es requerido' });
    }

    const details = await getPlaceDetails(placeId, sessionToken);

    if (!details) {
      return res.status(404).json({ error: 'Lugar no encontrado' });
    }

    res.json(details);
  } catch (error: any) {
    console.error('Error en /api/geocoding/place-details:', error);
    res.status(500).json({ error: 'Error al obtener detalles', message: error.message });
  }
});

/**
 * POST /api/geocoding/geocode
 * Convierte una dirección de texto a coordenadas
 */
router.post('/geocode', async (req, res) => {
  try {
    const { address } = req.body;

    if (!address || typeof address !== 'string') {
      return res.status(400).json({ error: 'address es requerido' });
    }

    const result = await geocodeAddress(address);

    if (!result) {
      return res.status(404).json({ error: 'No se encontraron resultados para esta dirección' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error en /api/geocoding/geocode:', error);
    res.status(500).json({ error: 'Error al geocodificar', message: error.message });
  }
});

/**
 * POST /api/geocoding/reverse
 * Convierte coordenadas a una dirección
 */
router.post('/reverse', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat y lng son requeridos y deben ser números' });
    }

    const result = await reverseGeocode(lat, lng);

    if (!result) {
      return res.status(404).json({ error: 'No se encontraron resultados para estas coordenadas' });
    }

    res.json(result);
  } catch (error: any) {
    console.error('Error en /api/geocoding/reverse:', error);
    res.status(500).json({ error: 'Error al geocodificar inverso', message: error.message });
  }
});

/**
 * GET /api/geocoding/session-token
 * Genera un token de sesión para agrupar requests de autocomplete
 */
router.get('/session-token', (req, res) => {
  const token = generateSessionToken();
  res.json({ sessionToken: token });
});

/**
 * POST /api/geocoding/reverse-with-match
 * Hace reverse geocode y busca la ubicación más cercana en nuestra tabla
 * Retorna tanto los datos de Google como el match de nuestra tabla
 */
router.post('/reverse-with-match', async (req, res) => {
  try {
    const { lat, lng } = req.body;

    if (typeof lat !== 'number' || typeof lng !== 'number') {
      return res.status(400).json({ error: 'lat y lng son requeridos y deben ser números' });
    }

    // Obtener datos de Google
    const googleResult = await reverseGeocode(lat, lng);

    if (!googleResult) {
      return res.status(404).json({ error: 'No se encontraron resultados para estas coordenadas' });
    }

    // Buscar match en nuestra tabla de ubicaciones
    const ubicacionMatch = await matchUbicacionFromGoogle({
      pais: googleResult.pais,
      provincia: googleResult.provincia,
      ciudad: googleResult.ciudad,
      sector: googleResult.sector,
    });

    res.json({
      google: googleResult,
      ubicacion: ubicacionMatch,
    });
  } catch (error: any) {
    console.error('Error en /api/geocoding/reverse-with-match:', error);
    res.status(500).json({ error: 'Error al geocodificar', message: error.message });
  }
});

/**
 * POST /api/geocoding/match-ubicacion
 * Busca la ubicación más cercana en nuestra tabla basado en datos de Google
 */
router.post('/match-ubicacion', async (req, res) => {
  try {
    const { pais, provincia, ciudad, sector } = req.body;

    const ubicacionMatch = await matchUbicacionFromGoogle({
      pais,
      provincia,
      ciudad,
      sector,
    });

    res.json(ubicacionMatch);
  } catch (error: any) {
    console.error('Error en /api/geocoding/match-ubicacion:', error);
    res.status(500).json({ error: 'Error al buscar ubicación', message: error.message });
  }
});

export default router;
