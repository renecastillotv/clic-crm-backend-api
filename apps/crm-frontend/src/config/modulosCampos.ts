/**
 * Configuración de campos por módulo para permisos a nivel de campo
 *
 * Cada módulo tiene una lista de campos con:
 * - id: nombre técnico del campo en la base de datos
 * - label: nombre legible para mostrar al usuario
 * - grupo: agrupación visual (básico, financiero, contacto, etc.)
 * - descripcion: explicación de qué contiene el campo
 */

export interface CampoConfig {
  id: string;
  label: string;
  grupo: string;
  descripcion?: string;
}

export interface AutoFilterOption {
  id: string;
  label: string;
  descripcion: string;
  valor: Record<string, any>;
}

export interface OverrideOption {
  campo: string;
  label: string;
  tipo: 'text' | 'select';
  opciones?: { value: string; label: string }[];
  placeholder?: string;
}

export interface ModuloCamposConfig {
  campos: CampoConfig[];
  autoFilters?: AutoFilterOption[];
  overrides?: OverrideOption[];
}

// Campos del módulo de Propiedades
const propiedadesCampos: ModuloCamposConfig = {
  campos: [
    // Información básica
    { id: 'titulo', label: 'Título', grupo: 'Información Básica', descripcion: 'Nombre/título de la propiedad' },
    { id: 'descripcion', label: 'Descripción', grupo: 'Información Básica', descripcion: 'Descripción detallada' },
    { id: 'tipo', label: 'Tipo de Propiedad', grupo: 'Información Básica', descripcion: 'Casa, Apartamento, Local, etc.' },
    { id: 'operacion', label: 'Tipo de Operación', grupo: 'Información Básica', descripcion: 'Venta, Renta, etc.' },
    { id: 'estado_propiedad', label: 'Estado', grupo: 'Información Básica', descripcion: 'Estado actual de la propiedad' },
    { id: 'referencia', label: 'Referencia', grupo: 'Información Básica', descripcion: 'Código de referencia interno' },

    // Ubicación
    { id: 'direccion', label: 'Dirección', grupo: 'Ubicación', descripcion: 'Dirección completa' },
    { id: 'ciudad', label: 'Ciudad', grupo: 'Ubicación', descripcion: 'Ciudad donde se ubica' },
    { id: 'sector', label: 'Sector/Colonia', grupo: 'Ubicación', descripcion: 'Sector o colonia' },
    { id: 'latitud', label: 'Latitud', grupo: 'Ubicación', descripcion: 'Coordenada GPS' },
    { id: 'longitud', label: 'Longitud', grupo: 'Ubicación', descripcion: 'Coordenada GPS' },

    // Características
    { id: 'recamaras', label: 'Recámaras', grupo: 'Características', descripcion: 'Número de recámaras' },
    { id: 'banos', label: 'Baños', grupo: 'Características', descripcion: 'Número de baños' },
    { id: 'medios_banos', label: 'Medios Baños', grupo: 'Características', descripcion: 'Número de medios baños' },
    { id: 'estacionamientos', label: 'Estacionamientos', grupo: 'Características', descripcion: 'Número de estacionamientos' },
    { id: 'm2_construccion', label: 'M² Construcción', grupo: 'Características', descripcion: 'Metros cuadrados de construcción' },
    { id: 'm2_terreno', label: 'M² Terreno', grupo: 'Características', descripcion: 'Metros cuadrados de terreno' },
    { id: 'antiguedad', label: 'Antigüedad', grupo: 'Características', descripcion: 'Años de antigüedad' },
    { id: 'niveles', label: 'Niveles', grupo: 'Características', descripcion: 'Número de niveles/pisos' },

    // Precios y Finanzas
    { id: 'precio', label: 'Precio de Venta/Renta', grupo: 'Finanzas', descripcion: 'Precio público de la propiedad' },
    { id: 'precio_compra', label: 'Precio de Compra', grupo: 'Finanzas', descripcion: 'Precio al que se adquirió (interno)' },
    { id: 'comision', label: 'Comisión', grupo: 'Finanzas', descripcion: 'Porcentaje o monto de comisión' },
    { id: 'connect_comision', label: 'Comisión CONNECT', grupo: 'Finanzas', descripcion: 'Comisión para asesores externos' },
    { id: 'mantenimiento', label: 'Mantenimiento', grupo: 'Finanzas', descripcion: 'Cuota de mantenimiento' },

    // Propietario/Desarrollador
    { id: 'propietario_nombre', label: 'Nombre del Propietario', grupo: 'Propietario', descripcion: 'Nombre completo del propietario' },
    { id: 'propietario_telefono', label: 'Teléfono del Propietario', grupo: 'Propietario', descripcion: 'Teléfono de contacto' },
    { id: 'propietario_email', label: 'Email del Propietario', grupo: 'Propietario', descripcion: 'Correo electrónico' },
    { id: 'desarrollador_nombre', label: 'Nombre del Desarrollador', grupo: 'Propietario', descripcion: 'Nombre del desarrollador' },
    { id: 'desarrollador_telefono', label: 'Teléfono del Desarrollador', grupo: 'Propietario', descripcion: 'Teléfono del desarrollador' },

    // Asignación
    { id: 'agente_id', label: 'ID del Agente', grupo: 'Asignación', descripcion: 'Agente asignado a la propiedad' },
    { id: 'agente_nombre', label: 'Nombre del Agente', grupo: 'Asignación', descripcion: 'Nombre del agente asignado' },
    { id: 'captador_id', label: 'ID del Captador', grupo: 'Asignación', descripcion: 'Usuario que captó la propiedad' },
    { id: 'captador_nombre', label: 'Nombre del Captador', grupo: 'Asignación', descripcion: 'Nombre del captador' },

    // CLIC Connect
    { id: 'connect', label: 'Disponible en CONNECT', grupo: 'CLIC Connect', descripcion: 'Si está disponible para asesores externos' },
    { id: 'connect_exclusiva', label: 'Exclusiva CONNECT', grupo: 'CLIC Connect', descripcion: 'Si es exclusiva de la red' },

    // Media
    { id: 'imagenes', label: 'Imágenes', grupo: 'Media', descripcion: 'Galería de imágenes' },
    { id: 'video_url', label: 'URL de Video', grupo: 'Media', descripcion: 'Link al video de la propiedad' },
    { id: 'tour_virtual_url', label: 'Tour Virtual', grupo: 'Media', descripcion: 'Link al tour virtual' },
  ],

  autoFilters: [
    {
      id: 'connect_only',
      label: 'Solo propiedades CONNECT',
      descripcion: 'Mostrar únicamente propiedades habilitadas para CLIC Connect',
      valor: { connect: true }
    },
    {
      id: 'activas_only',
      label: 'Solo propiedades activas',
      descripcion: 'Mostrar únicamente propiedades con estado activo',
      valor: { estado_propiedad: 'activa' }
    },
    {
      id: 'destacadas_only',
      label: 'Solo propiedades destacadas',
      descripcion: 'Mostrar únicamente propiedades marcadas como destacadas',
      valor: { destacada: true }
    },
  ],

  overrides: [
    {
      campo: 'captador_nombre',
      label: 'Nombre del captador',
      tipo: 'text',
      placeholder: 'Ej: Contacto CLIC',
    },
    {
      campo: 'captador_telefono',
      label: 'Teléfono del captador',
      tipo: 'text',
      placeholder: 'Ej: 809-000-0000',
    },
    {
      campo: 'captador_email',
      label: 'Email del captador',
      tipo: 'text',
      placeholder: 'Ej: contacto@clic.do',
    },
  ],
};

// Campos del módulo de Contactos
const contactosCampos: ModuloCamposConfig = {
  campos: [
    { id: 'nombre', label: 'Nombre', grupo: 'Información Personal', descripcion: 'Nombre del contacto' },
    { id: 'apellido', label: 'Apellido', grupo: 'Información Personal', descripcion: 'Apellido del contacto' },
    { id: 'email', label: 'Email', grupo: 'Información Personal', descripcion: 'Correo electrónico' },
    { id: 'telefono', label: 'Teléfono', grupo: 'Información Personal', descripcion: 'Número de teléfono' },
    { id: 'telefono_secundario', label: 'Teléfono Secundario', grupo: 'Información Personal' },
    { id: 'tipo', label: 'Tipo de Contacto', grupo: 'Clasificación', descripcion: 'Comprador, Vendedor, etc.' },
    { id: 'etapa', label: 'Etapa', grupo: 'Clasificación', descripcion: 'Etapa en el pipeline' },
    { id: 'fuente', label: 'Fuente', grupo: 'Clasificación', descripcion: 'De dónde vino el contacto' },
    { id: 'presupuesto_min', label: 'Presupuesto Mínimo', grupo: 'Preferencias', descripcion: 'Presupuesto mínimo' },
    { id: 'presupuesto_max', label: 'Presupuesto Máximo', grupo: 'Preferencias', descripcion: 'Presupuesto máximo' },
    { id: 'notas', label: 'Notas', grupo: 'Información Adicional', descripcion: 'Notas internas' },
    { id: 'agente_id', label: 'ID del Agente', grupo: 'Asignación', descripcion: 'Agente asignado' },
    { id: 'agente_nombre', label: 'Nombre del Agente', grupo: 'Asignación' },
  ],
  autoFilters: [],
  overrides: [],
};

// Campos del módulo de Pipeline
const pipelineCampos: ModuloCamposConfig = {
  campos: [
    { id: 'contacto_nombre', label: 'Nombre del Contacto', grupo: 'Contacto' },
    { id: 'propiedad_titulo', label: 'Propiedad', grupo: 'Propiedad' },
    { id: 'etapa', label: 'Etapa', grupo: 'Estado', descripcion: 'Etapa actual en el pipeline' },
    { id: 'valor_estimado', label: 'Valor Estimado', grupo: 'Finanzas' },
    { id: 'comision_estimada', label: 'Comisión Estimada', grupo: 'Finanzas' },
    { id: 'probabilidad', label: 'Probabilidad', grupo: 'Estado' },
    { id: 'fecha_cierre_estimada', label: 'Fecha de Cierre Estimada', grupo: 'Fechas' },
    { id: 'agente_id', label: 'ID del Agente', grupo: 'Asignación' },
    { id: 'notas', label: 'Notas', grupo: 'Información Adicional' },
  ],
  autoFilters: [],
  overrides: [],
};

// Exportar configuración de todos los módulos
export const modulosCamposConfig: Record<string, ModuloCamposConfig> = {
  propiedades: propiedadesCampos,
  contactos: contactosCampos,
  pipeline: pipelineCampos,
  // Agregar más módulos según sea necesario
};

// Función helper para obtener los grupos de campos de un módulo
export function getGruposCampos(moduloId: string): Map<string, CampoConfig[]> {
  const config = modulosCamposConfig[moduloId];
  if (!config) return new Map();

  const grupos = new Map<string, CampoConfig[]>();
  for (const campo of config.campos) {
    const grupo = grupos.get(campo.grupo) || [];
    grupo.push(campo);
    grupos.set(campo.grupo, grupo);
  }
  return grupos;
}

// Obtener configuración de un módulo
export function getModuloCamposConfig(moduloId: string): ModuloCamposConfig | undefined {
  return modulosCamposConfig[moduloId];
}
