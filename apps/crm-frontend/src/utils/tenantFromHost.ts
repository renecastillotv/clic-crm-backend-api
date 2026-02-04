/**
 * Tenant Detection from Hostname
 *
 * Maps custom domains to tenant slugs for white-label support.
 * When a user visits a custom domain, we detect which tenant they belong to.
 */

export interface TenantHostConfig {
  slug: string;
  isPremium: boolean;  // Has custom landing page
  isCustomDomain: boolean;
}

/**
 * Domain to tenant mapping
 * Add new custom domains here
 */
const DOMAIN_TENANT_MAP: Record<string, string> = {
  // CLIC Inmobiliaria
  'crm.clicinmobiliaria.com': 'clic',
  'clicinmobiliaria.com': 'clic',
  'www.clicinmobiliaria.com': 'clic',

  // Ubikala
  'ubikala.com': 'ubikala',
  'www.ubikala.com': 'ubikala',
  'crm.ubikala.com': 'ubikala',

  // Platform (Denlla)
  'denlla.com': 'denlla',
  'www.denlla.com': 'denlla',
  'clic-crm-frontend.vercel.app': 'denlla',

  // Development
  'localhost': 'denlla',
};

/**
 * Tenants with premium/custom landing pages
 */
const PREMIUM_TENANTS = new Set(['clic', 'ubikala']);

/**
 * Get tenant configuration from the current hostname
 */
export function getTenantFromHost(hostname?: string): TenantHostConfig {
  const host = hostname || (typeof window !== 'undefined' ? window.location.hostname : 'localhost');

  // Remove port if present (for localhost:3000, etc.)
  const cleanHost = host.split(':')[0];

  // Check direct domain mapping
  const slug = DOMAIN_TENANT_MAP[cleanHost];

  if (slug) {
    return {
      slug,
      isPremium: PREMIUM_TENANTS.has(slug),
      isCustomDomain: slug !== 'denlla',
    };
  }

  // Default to platform (Denlla)
  return {
    slug: 'denlla',
    isPremium: false,
    isCustomDomain: false,
  };
}

/**
 * Check if the current host is a custom tenant domain
 */
export function isCustomTenantDomain(hostname?: string): boolean {
  const config = getTenantFromHost(hostname);
  return config.isCustomDomain;
}

/**
 * Check if the current host is a premium tenant with custom landing
 */
export function isPremiumTenantDomain(hostname?: string): boolean {
  const config = getTenantFromHost(hostname);
  return config.isPremium;
}

/**
 * Get the base path for tenant-specific routes
 * For custom domains: returns '' (routes are at root)
 * For platform domain: returns '/{slug}' (routes are prefixed)
 */
export function getTenantBasePath(hostname?: string): string {
  const config = getTenantFromHost(hostname);

  if (config.isCustomDomain) {
    return ''; // Custom domains use root paths
  }

  return ''; // Platform domain also uses root for landing
}

/**
 * Get the CRM path for a tenant
 * Custom domains: /crm
 * Platform domain: /crm/{slug}
 */
export function getTenantCrmPath(hostname?: string): string {
  const config = getTenantFromHost(hostname);

  if (config.isCustomDomain) {
    return `/crm/${config.slug}`;
  }

  return '/crm'; // Will need tenant selection
}
