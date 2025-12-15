/**
 * Servicio de Inicialización de Tenant
 *
 * Crea todas las páginas y componentes por defecto cuando se crea un nuevo tenant.
 * Todo el contenido se inicializa desde el catálogo de campos.
 */

import { query } from '../database/connection.js';
import { inicializarContenidoComponente } from './contenidoService.js';

// ============================================================
// TIPOS
// ============================================================

interface ComponenteConfig {
  tipo: string;
  variante: string;
  orden: number;
  scope: 'tenant' | 'page';
  toggles?: Record<string, boolean>;
}

interface PaginaConfig {
  tipoPagina: string;
  titulo: string;
  slug: string;
  descripcion: string;
  componentes: ComponenteConfig[];
}

// ============================================================
// CONFIGURACIÓN POR DEFECTO
// ============================================================

/**
 * Páginas que se crean por defecto para un nuevo tenant
 */
const PAGINAS_DEFAULT: PaginaConfig[] = [
  {
    tipoPagina: 'homepage',
    titulo: 'Inicio',
    slug: '/',
    descripcion: 'Página principal',
    componentes: [
      { tipo: 'hero', variante: 'default', orden: 1, scope: 'page', toggles: { mostrarBuscador: true, mostrarStats: true } },
      { tipo: 'features', variante: 'default', orden: 2, scope: 'page' },
      { tipo: 'property_list', variante: 'default', orden: 3, scope: 'page' },
      { tipo: 'testimonials', variante: 'default', orden: 4, scope: 'page' },
      { tipo: 'cta', variante: 'default', orden: 5, scope: 'page' }
    ]
  },
  {
    tipoPagina: 'contacto',
    titulo: 'Contacto',
    slug: '/contacto',
    descripcion: 'Página de contacto',
    componentes: [
      { tipo: 'hero', variante: 'default', orden: 1, scope: 'page', toggles: { mostrarBuscador: false, mostrarStats: false } },
      { tipo: 'contact_form', variante: 'default', orden: 2, scope: 'page' }
    ]
  },
  {
    tipoPagina: 'nosotros',
    titulo: 'Nosotros',
    slug: '/nosotros',
    descripcion: 'Sobre nosotros',
    componentes: [
      { tipo: 'hero', variante: 'default', orden: 1, scope: 'page', toggles: { mostrarBuscador: false, mostrarStats: false } },
      { tipo: 'features', variante: 'default', orden: 2, scope: 'page' }
    ]
  }
];

/**
 * Componentes globales (header/footer) que aplican a todas las páginas
 */
const COMPONENTES_GLOBALES: ComponenteConfig[] = [
  { tipo: 'header', variante: 'default', orden: 0, scope: 'tenant' },
  { tipo: 'footer', variante: 'default', orden: 100, scope: 'tenant' }
];

// ============================================================
// FUNCIONES DE INICIALIZACIÓN
// ============================================================

/**
 * Crea un componente y su contenido inicial
 */
async function crearComponenteConContenido(
  tenantId: string,
  config: ComponenteConfig,
  paginaId: string | null = null,
  idioma: string = 'es'
): Promise<string> {
  // Crear el componente
  const result = await query(
    `INSERT INTO componentes_web (
      tenant_id, tipo, variante, orden, scope, pagina_id, activo, predeterminado,
      datos
    ) VALUES ($1, $2, $3, $4, $5, $6, true, true, $7)
    RETURNING id`,
    [
      tenantId,
      config.tipo,
      config.variante,
      config.orden,
      config.scope,
      paginaId,
      JSON.stringify({
        toggles: config.toggles || {}
      })
    ]
  );

  const componenteId = result.rows[0].id;

  // Inicializar contenido desde el catálogo
  await inicializarContenidoComponente(componenteId, config.tipo, config.variante, idioma);

  console.log(`  ✓ Componente creado: ${config.tipo}/${config.variante} (${componenteId})`);

  return componenteId;
}

/**
 * Crea una página con sus componentes
 */
async function crearPaginaConComponentes(
  tenantId: string,
  config: PaginaConfig,
  idioma: string = 'es'
): Promise<string> {
  // Crear la página
  const paginaResult = await query(
    `INSERT INTO paginas_web (
      tenant_id, tipo_pagina, titulo, slug, descripcion, publica, activa, orden
    ) VALUES ($1, $2, $3, $4, $5, true, true, 0)
    RETURNING id`,
    [tenantId, config.tipoPagina, config.titulo, config.slug, config.descripcion]
  );

  const paginaId = paginaResult.rows[0].id;
  console.log(`✓ Página creada: ${config.titulo} (${config.slug})`);

  // Crear componentes de la página
  for (const compConfig of config.componentes) {
    await crearComponenteConContenido(tenantId, compConfig, paginaId, idioma);
  }

  return paginaId;
}

/**
 * Inicializa completamente un nuevo tenant con páginas y componentes por defecto
 */
export async function inicializarTenantCompleto(
  tenantId: string,
  opciones: {
    idioma?: string;
    nombreEmpresa?: string;
  } = {}
): Promise<{
  paginas: string[];
  componentesGlobales: string[];
}> {
  const idioma = opciones.idioma || 'es';

  console.log(`\n🏗️  Inicializando tenant ${tenantId}...`);

  // Verificar si ya tiene páginas
  const existentes = await query(
    `SELECT COUNT(*) as count FROM paginas_web WHERE tenant_id = $1`,
    [tenantId]
  );

  if (parseInt(existentes.rows[0].count) > 0) {
    console.log(`⚠️  El tenant ya tiene ${existentes.rows[0].count} páginas, saltando inicialización`);
    return { paginas: [], componentesGlobales: [] };
  }

  const paginasCreadas: string[] = [];
  const componentesGlobales: string[] = [];

  // 1. Crear componentes globales (header, footer)
  console.log('\n📦 Creando componentes globales...');
  for (const config of COMPONENTES_GLOBALES) {
    const id = await crearComponenteConContenido(tenantId, config, null, idioma);
    componentesGlobales.push(id);
  }

  // 2. Crear páginas con sus componentes
  console.log('\n📄 Creando páginas...');
  for (const paginaConfig of PAGINAS_DEFAULT) {
    const id = await crearPaginaConComponentes(tenantId, paginaConfig, idioma);
    paginasCreadas.push(id);
  }

  // 3. Si se proporcionó nombre de empresa, actualizar contenido personalizado
  if (opciones.nombreEmpresa) {
    await personalizarContenidoInicial(tenantId, opciones.nombreEmpresa, idioma);
  }

  console.log(`\n✅ Tenant inicializado exitosamente:`);
  console.log(`   - ${componentesGlobales.length} componentes globales`);
  console.log(`   - ${paginasCreadas.length} páginas`);

  return { paginas: paginasCreadas, componentesGlobales };
}

/**
 * Personaliza el contenido inicial con el nombre de la empresa
 */
async function personalizarContenidoInicial(
  tenantId: string,
  nombreEmpresa: string,
  idioma: string = 'es'
): Promise<void> {
  // Actualizar el badge del hero con el nombre de la empresa
  await query(
    `UPDATE contenido_campos cc
     SET valor = $3
     FROM componentes_web cw
     WHERE cc.componente_id = cw.id
       AND cw.tenant_id = $1
       AND cw.tipo = 'hero'
       AND cc.campo = 'badge'
       AND cc.idioma = $4`,
    [tenantId, null, `${nombreEmpresa} - Tu inmobiliaria de confianza`, idioma]
  );

  // Actualizar el logo alt text del header
  await query(
    `UPDATE contenido_campos cc
     SET valor = $2
     FROM componentes_web cw
     WHERE cc.componente_id = cw.id
       AND cw.tenant_id = $1
       AND cw.tipo = 'header'
       AND cc.campo = 'logoAlt'
       AND cc.idioma = $3`,
    [tenantId, nombreEmpresa, idioma]
  );

  // Actualizar copyright del footer
  const year = new Date().getFullYear();
  await query(
    `UPDATE contenido_campos cc
     SET valor = $2
     FROM componentes_web cw
     WHERE cc.componente_id = cw.id
       AND cw.tenant_id = $1
       AND cw.tipo = 'footer'
       AND cc.campo = 'textoCopyright'
       AND cc.idioma = $3`,
    [tenantId, `© ${year} ${nombreEmpresa}. Todos los derechos reservados.`, idioma]
  );

  console.log(`  ✓ Contenido personalizado para: ${nombreEmpresa}`);
}

/**
 * Reinicializa un tenant (borra todo y vuelve a crear)
 * PRECAUCIÓN: Esta función borra todos los datos existentes
 */
export async function reinicializarTenant(
  tenantId: string,
  opciones: {
    idioma?: string;
    nombreEmpresa?: string;
  } = {}
): Promise<{
  paginas: string[];
  componentesGlobales: string[];
}> {
  console.log(`\n⚠️  Reinicializando tenant ${tenantId}...`);

  // Borrar componentes existentes (el contenido se borra en cascada)
  await query(`DELETE FROM componentes_web WHERE tenant_id = $1`, [tenantId]);

  // Borrar páginas existentes
  await query(`DELETE FROM paginas_web WHERE tenant_id = $1`, [tenantId]);

  console.log('  ✓ Datos anteriores eliminados');

  // Reinicializar
  return inicializarTenantCompleto(tenantId, opciones);
}

/**
 * Agrega una nueva página a un tenant existente
 */
export async function agregarPaginaATenant(
  tenantId: string,
  config: PaginaConfig,
  idioma: string = 'es'
): Promise<string> {
  return crearPaginaConComponentes(tenantId, config, idioma);
}

/**
 * Agrega un componente a una página existente
 */
export async function agregarComponenteAPagina(
  tenantId: string,
  paginaId: string,
  config: ComponenteConfig,
  idioma: string = 'es'
): Promise<string> {
  return crearComponenteConContenido(tenantId, config, paginaId, idioma);
}

export default {
  inicializarTenantCompleto,
  reinicializarTenant,
  agregarPaginaATenant,
  agregarComponenteAPagina,
  PAGINAS_DEFAULT,
  COMPONENTES_GLOBALES
};
