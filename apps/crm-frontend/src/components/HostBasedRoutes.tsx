/**
 * Host-Based Route Components
 *
 * These components determine what to render based on the current hostname.
 * This allows custom tenant domains to show their branded content at root paths.
 */

import { getTenantFromHost } from '../utils/tenantFromHost';

// Landings
import DenllaLandingPage from '../pages/DenllaLandingPage';
import ClicLandingPage from '../pages/landings/ClicLandingPage';
import UbikalaLandingPage from '../pages/landings/UbikalaLandingPage';
import TenantLandingPage from '../pages/TenantLandingPage';

// Auth pages
import LoginPage from '../pages/auth/LoginPage';
import SignupPage from '../pages/auth/SignupPage';
import TenantLoginPage from '../pages/auth/TenantLoginPage';
import TenantSignupPage from '../pages/auth/TenantSignupPage';

/**
 * Premium tenant landing page mapping
 */
const PREMIUM_LANDING_PAGES: Record<string, React.ComponentType> = {
  'clic': ClicLandingPage,
  'ubikala': UbikalaLandingPage,
};

/**
 * HostBasedLanding
 *
 * Shows the appropriate landing page based on the current hostname:
 * - Custom tenant domains → Tenant's premium/generic landing
 * - Platform domain → Denlla landing page
 */
export function HostBasedLanding() {
  const tenantConfig = getTenantFromHost();

  // Platform domain (denlla.com, vercel app, localhost)
  if (!tenantConfig.isCustomDomain) {
    return <DenllaLandingPage />;
  }

  // Premium tenant with custom landing
  const PremiumLanding = PREMIUM_LANDING_PAGES[tenantConfig.slug];
  if (PremiumLanding) {
    return <PremiumLanding />;
  }

  // Custom domain but no premium landing - show generic tenant landing
  // Pass the slug via a wrapper that sets params
  return <TenantLandingPageWithSlug tenantSlug={tenantConfig.slug} />;
}

/**
 * HostBasedLogin
 *
 * Shows the appropriate login page based on hostname:
 * - Custom tenant domains → Tenant login with branding
 * - Platform domain → Platform login
 */
export function HostBasedLogin() {
  const tenantConfig = getTenantFromHost();

  // Platform domain - show platform login
  if (!tenantConfig.isCustomDomain) {
    return <LoginPage />;
  }

  // Custom tenant domain - show tenant login with their branding
  return <TenantLoginPageWithSlug tenantSlug={tenantConfig.slug} />;
}

/**
 * HostBasedSignup
 *
 * Shows the appropriate signup page based on hostname:
 * - Custom tenant domains → Tenant signup with branding
 * - Platform domain → Platform signup
 */
export function HostBasedSignup() {
  const tenantConfig = getTenantFromHost();

  // Platform domain - show platform signup
  if (!tenantConfig.isCustomDomain) {
    return <SignupPage />;
  }

  // Custom tenant domain - show tenant signup with their branding
  return <TenantSignupPageWithSlug tenantSlug={tenantConfig.slug} />;
}

/**
 * Wrapper components that inject the tenantSlug prop
 * These are needed because the pages expect tenantSlug from useParams()
 * but on custom domains we don't have it in the URL
 */

import { useParams } from 'react-router-dom';

// Context to provide tenantSlug when not in URL
import { createContext, useContext } from 'react';

export const TenantSlugContext = createContext<string | null>(null);

export function useTenantSlug(): string | undefined {
  const context = useContext(TenantSlugContext);
  const params = useParams<{ tenantSlug: string }>();

  // Priority: URL params > Context > host detection
  if (params.tenantSlug) {
    return params.tenantSlug;
  }

  if (context) {
    return context;
  }

  const tenantConfig = getTenantFromHost();
  if (tenantConfig.isCustomDomain) {
    return tenantConfig.slug;
  }

  return undefined;
}

/**
 * Wrapper for TenantLandingPage that provides slug from host
 */
function TenantLandingPageWithSlug({ tenantSlug }: { tenantSlug: string }) {
  return (
    <TenantSlugContext.Provider value={tenantSlug}>
      <TenantLandingPage />
    </TenantSlugContext.Provider>
  );
}

/**
 * Wrapper for TenantLoginPage that provides slug from host
 */
function TenantLoginPageWithSlug({ tenantSlug }: { tenantSlug: string }) {
  return (
    <TenantSlugContext.Provider value={tenantSlug}>
      <TenantLoginPage />
    </TenantSlugContext.Provider>
  );
}

/**
 * Wrapper for TenantSignupPage that provides slug from host
 */
function TenantSignupPageWithSlug({ tenantSlug }: { tenantSlug: string }) {
  return (
    <TenantSlugContext.Provider value={tenantSlug}>
      <TenantSignupPage />
    </TenantSlugContext.Provider>
  );
}

/**
 * Exported wrappers for use in App.tsx routing
 * These ensure the tenantSlug is available even when accessing via path on platform domain
 */
export function ClicLogin() {
  return <TenantLoginPageWithSlug tenantSlug="clic" />;
}

export function ClicSignup() {
  return <TenantSignupPageWithSlug tenantSlug="clic" />;
}

export function UbikalaLogin() {
  return <TenantLoginPageWithSlug tenantSlug="ubikala" />;
}

export function UbikalaSignup() {
  return <TenantSignupPageWithSlug tenantSlug="ubikala" />;
}
