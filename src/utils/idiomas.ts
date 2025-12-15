/**
 * Configuración de idiomas del sistema
 *
 * Este archivo centraliza la definición de idiomas disponibles
 * para evitar duplicación y mantener consistencia.
 */

export interface IdiomaConfig {
  code: string;
  label: string;
  labelNativo: string;
  flag: string;
  flagEmoji: string;
  activo: boolean;
}

/**
 * Lista de todos los idiomas soportados por el sistema
 * Los tenants pueden habilitar un subconjunto de estos
 */
export const IDIOMAS_SISTEMA: IdiomaConfig[] = [
  {
    code: 'es',
    label: 'Spanish',
    labelNativo: 'Español',
    flag: 'ES',
    flagEmoji: '🇪🇸',
    activo: true,
  },
  {
    code: 'en',
    label: 'English',
    labelNativo: 'English',
    flag: 'US',
    flagEmoji: '🇺🇸',
    activo: true,
  },
  {
    code: 'fr',
    label: 'French',
    labelNativo: 'Français',
    flag: 'FR',
    flagEmoji: '🇫🇷',
    activo: true,
  },
  {
    code: 'pt',
    label: 'Portuguese',
    labelNativo: 'Português',
    flag: 'BR',
    flagEmoji: '🇧🇷',
    activo: true,
  },
];

/**
 * Idioma por defecto del sistema
 */
export const IDIOMA_DEFAULT = 'es';

/**
 * Obtiene la configuración de un idioma por código
 */
export function getIdiomaConfig(code: string): IdiomaConfig | undefined {
  return IDIOMAS_SISTEMA.find(i => i.code === code);
}

/**
 * Obtiene todos los idiomas activos
 */
export function getIdiomasActivos(): IdiomaConfig[] {
  return IDIOMAS_SISTEMA.filter(i => i.activo);
}

/**
 * Verifica si un código de idioma es válido
 */
export function isIdiomaValido(code: string): boolean {
  return IDIOMAS_SISTEMA.some(i => i.code === code);
}

/**
 * Filtra la lista de idiomas del sistema según los habilitados para un tenant
 * @param idiomasHabilitados Array de códigos de idiomas habilitados (ej: ['es', 'en', 'fr'])
 */
export function getIdiomasTenant(idiomasHabilitados: string[]): IdiomaConfig[] {
  if (!idiomasHabilitados || idiomasHabilitados.length === 0) {
    // Si no hay configuración, devolver solo español
    return IDIOMAS_SISTEMA.filter(i => i.code === 'es');
  }

  return IDIOMAS_SISTEMA.filter(i => idiomasHabilitados.includes(i.code));
}
