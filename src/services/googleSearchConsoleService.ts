/**
 * Google Search Console Service
 *
 * Provides helpers for interacting with the Google Search Console API:
 * - Token refresh (exchange refresh_token for access_token)
 * - List verified sites
 * - Get search analytics (clicks, impressions, CTR, position)
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';

const GSC_API_BASE = 'https://www.googleapis.com/webmasters/v3';
const SEARCH_ANALYTICS_API = 'https://searchconsole.googleapis.com/webmasters/v3';

// ==================== TOKEN MANAGEMENT ====================

/**
 * Exchanges a refresh token for a fresh access token.
 */
async function getAccessToken(refreshToken: string): Promise<string> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      grant_type: 'refresh_token',
    }),
  });

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(`Token refresh failed: ${data.error_description || data.error || 'Unknown error'}`);
  }

  return data.access_token;
}

// ==================== SITES ====================

export interface SearchConsoleSite {
  siteUrl: string;
  permissionLevel: string;
}

/**
 * Lists all sites the user has access to in Search Console.
 */
export async function listSites(refreshToken: string): Promise<SearchConsoleSite[]> {
  const accessToken = await getAccessToken(refreshToken);

  const response = await fetch(`${GSC_API_BASE}/sites`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    const err: any = await response.json().catch(() => ({}));
    throw new Error(`Failed to list sites: ${err.error?.message || response.statusText}`);
  }

  const data: any = await response.json();
  const entries = data.siteEntry || [];

  return entries.map((entry: any) => ({
    siteUrl: entry.siteUrl,
    permissionLevel: entry.permissionLevel,
  }));
}

// ==================== SEARCH ANALYTICS ====================

export interface SearchAnalyticsRow {
  keys: string[];
  clicks: number;
  impressions: number;
  ctr: number;
  position: number;
}

export interface SearchAnalyticsResponse {
  rows: SearchAnalyticsRow[];
  totals: {
    clicks: number;
    impressions: number;
    ctr: number;
    position: number;
  };
}

export interface SearchAnalyticsQuery {
  startDate: string;   // YYYY-MM-DD
  endDate: string;     // YYYY-MM-DD
  dimensions?: ('query' | 'page' | 'country' | 'device' | 'date')[];
  rowLimit?: number;
  startRow?: number;
  dimensionFilterGroups?: any[];
}

/**
 * Queries search analytics data for a verified site.
 */
export async function getSearchAnalytics(
  refreshToken: string,
  siteUrl: string,
  query: SearchAnalyticsQuery
): Promise<SearchAnalyticsResponse> {
  const accessToken = await getAccessToken(refreshToken);

  const encodedSiteUrl = encodeURIComponent(siteUrl);
  const response = await fetch(
    `${SEARCH_ANALYTICS_API}/sites/${encodedSiteUrl}/searchAnalytics/query`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        startDate: query.startDate,
        endDate: query.endDate,
        dimensions: query.dimensions || ['query'],
        rowLimit: query.rowLimit || 25,
        startRow: query.startRow || 0,
        ...(query.dimensionFilterGroups ? { dimensionFilterGroups: query.dimensionFilterGroups } : {}),
      }),
    }
  );

  if (!response.ok) {
    const err: any = await response.json().catch(() => ({}));
    throw new Error(`Search analytics query failed: ${err.error?.message || response.statusText}`);
  }

  const data: any = await response.json();
  const rows: SearchAnalyticsRow[] = (data.rows || []).map((row: any) => ({
    keys: row.keys || [],
    clicks: row.clicks || 0,
    impressions: row.impressions || 0,
    ctr: row.ctr || 0,
    position: row.position || 0,
  }));

  // Calculate totals
  const totals = rows.reduce(
    (acc, row) => ({
      clicks: acc.clicks + row.clicks,
      impressions: acc.impressions + row.impressions,
      ctr: 0, // Will calculate below
      position: 0, // Will calculate below
    }),
    { clicks: 0, impressions: 0, ctr: 0, position: 0 }
  );

  if (totals.impressions > 0) {
    totals.ctr = totals.clicks / totals.impressions;
  }
  if (rows.length > 0) {
    totals.position = rows.reduce((sum, r) => sum + r.position, 0) / rows.length;
  }

  return { rows, totals };
}

/**
 * Gets daily search performance over a date range.
 * Returns rows grouped by date.
 */
export async function getDailyPerformance(
  refreshToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string
): Promise<SearchAnalyticsRow[]> {
  const result = await getSearchAnalytics(refreshToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ['date'],
    rowLimit: 500,
  });

  return result.rows;
}

/**
 * Gets top queries for a site.
 */
export async function getTopQueries(
  refreshToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 25
): Promise<SearchAnalyticsRow[]> {
  const result = await getSearchAnalytics(refreshToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ['query'],
    rowLimit: limit,
  });

  return result.rows;
}

/**
 * Gets top pages for a site.
 */
export async function getTopPages(
  refreshToken: string,
  siteUrl: string,
  startDate: string,
  endDate: string,
  limit: number = 25
): Promise<SearchAnalyticsRow[]> {
  const result = await getSearchAnalytics(refreshToken, siteUrl, {
    startDate,
    endDate,
    dimensions: ['page'],
    rowLimit: limit,
  });

  return result.rows;
}
