/**
 * Google Ads Service - REST API v18
 *
 * Provides helpers for interacting with the Google Ads API:
 * - Token refresh (exchange refresh_token for access_token)
 * - List accessible customer accounts
 * - Get campaigns with metrics
 * - Get campaign performance stats
 */

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET || '';
const DEVELOPER_TOKEN = process.env.GOOGLE_ADS_DEVELOPER_TOKEN || '';

const GOOGLE_ADS_API_VERSION = 'v20';
const GOOGLE_ADS_BASE_URL = `https://googleads.googleapis.com/${GOOGLE_ADS_API_VERSION}`;

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

// ==================== CUSTOMER DISCOVERY ====================

interface AccessibleCustomer {
  customerId: string;
  descriptiveName: string;
  currencyCode: string;
  timeZone: string;
  manager: boolean;
}

/**
 * Lists all Google Ads customer accounts accessible with the given refresh token.
 * This is called right after OAuth to let the user pick which account to connect.
 */
export async function listAccessibleCustomers(refreshToken: string): Promise<AccessibleCustomer[]> {
  const accessToken = await getAccessToken(refreshToken);

  // Step 1: Get list of accessible customer resource names
  const listResponse = await fetch(
    `${GOOGLE_ADS_BASE_URL}/customers:listAccessibleCustomers`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
      },
    }
  );

  const listData: any = await listResponse.json();

  if (!listResponse.ok) {
    throw new Error(`listAccessibleCustomers failed: ${JSON.stringify(listData)}`);
  }

  const resourceNames: string[] = listData.resourceNames || [];
  console.log(`[Google Ads] listAccessibleCustomers returned ${resourceNames.length} resource names:`, resourceNames);
  if (resourceNames.length === 0) return [];

  // Step 2: For each customer, query basic info
  const customers: AccessibleCustomer[] = [];

  for (const resourceName of resourceNames) {
    const customerId = resourceName.replace('customers/', '');
    try {
      const queryResponse = await fetch(
        `${GOOGLE_ADS_BASE_URL}/customers/${customerId}/googleAds:searchStream`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'developer-token': DEVELOPER_TOKEN,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            query: `
              SELECT
                customer.id,
                customer.descriptive_name,
                customer.currency_code,
                customer.time_zone,
                customer.manager
              FROM customer
              LIMIT 1
            `,
          }),
        }
      );

      const queryData: any = await queryResponse.json();

      if (queryResponse.ok && queryData[0]?.results?.[0]) {
        const c = queryData[0].results[0].customer;
        customers.push({
          customerId: c.id,
          descriptiveName: c.descriptiveName || `Account ${c.id}`,
          currencyCode: c.currencyCode || 'USD',
          timeZone: c.timeZone || 'America/Mexico_City',
          manager: c.manager || false,
        });
        console.log(`[Google Ads] Customer ${customerId}: OK - ${c.descriptiveName}`);
      } else {
        console.warn(`[Google Ads] Customer ${customerId}: query failed -`, JSON.stringify(queryData).substring(0, 300));
      }
    } catch (err: any) {
      console.warn(`[Google Ads] Customer ${customerId}: exception - ${err.message}`);
    }
  }

  console.log(`[Google Ads] Total accessible accounts: ${customers.length}`);

  return customers;
}

// ==================== CAMPAIGNS ====================

export interface GoogleAdsCampaign {
  id: string;
  name: string;
  status: string;
  type: string;
  biddingStrategy: string;
  budget: number;
  budgetCurrency: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
  avgCpc: number;
  startDate?: string;
  endDate?: string;
}

/**
 * Fetches campaigns with performance metrics for a given customer account.
 */
export async function getCampaigns(
  refreshToken: string,
  customerId: string,
  dateRange: { startDate: string; endDate: string } = getDefaultDateRange()
): Promise<GoogleAdsCampaign[]> {
  const accessToken = await getAccessToken(refreshToken);
  const cleanCustomerId = customerId.replace(/-/g, '');

  const gaqlQuery = `
    SELECT
      campaign.id,
      campaign.name,
      campaign.status,
      campaign.advertising_channel_type,
      campaign.bidding_strategy_type,
      campaign.campaign_budget,
      campaign.start_date,
      campaign.end_date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr,
      metrics.average_cpc
    FROM campaign
    WHERE campaign.status != 'REMOVED'
      AND segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
    ORDER BY metrics.impressions DESC
  `;

  const response = await fetch(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanCustomerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gaqlQuery }),
    }
  );

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(`getCampaigns failed: ${JSON.stringify(data)}`);
  }

  const results = data[0]?.results || [];

  // Aggregate by campaign (since date segmentation creates multiple rows)
  const campaignMap = new Map<string, GoogleAdsCampaign>();

  for (const row of results) {
    const c = row.campaign;
    const m = row.metrics;
    const id = c.id;

    if (!campaignMap.has(id)) {
      campaignMap.set(id, {
        id,
        name: c.name,
        status: c.status,
        type: c.advertisingChannelType || 'UNKNOWN',
        biddingStrategy: c.biddingStrategyType || 'UNKNOWN',
        budget: 0,
        budgetCurrency: 'MXN',
        impressions: 0,
        clicks: 0,
        cost: 0,
        conversions: 0,
        ctr: 0,
        avgCpc: 0,
        startDate: c.startDate,
        endDate: c.endDate,
      });
    }

    const existing = campaignMap.get(id)!;
    existing.impressions += parseInt(m.impressions || '0');
    existing.clicks += parseInt(m.clicks || '0');
    existing.cost += parseInt(m.costMicros || '0') / 1_000_000;
    existing.conversions += parseFloat(m.conversions || '0');
  }

  // Calculate derived metrics
  for (const campaign of campaignMap.values()) {
    campaign.ctr = campaign.impressions > 0 ? campaign.clicks / campaign.impressions : 0;
    campaign.avgCpc = campaign.clicks > 0 ? campaign.cost / campaign.clicks : 0;
  }

  return Array.from(campaignMap.values());
}

// ==================== CAMPAIGN STATS ====================

export interface CampaignDailyStat {
  date: string;
  impressions: number;
  clicks: number;
  cost: number;
  conversions: number;
  ctr: number;
}

/**
 * Gets daily performance stats for a specific campaign.
 */
export async function getCampaignStats(
  refreshToken: string,
  customerId: string,
  campaignId: string,
  dateRange: { startDate: string; endDate: string } = getDefaultDateRange()
): Promise<CampaignDailyStat[]> {
  const accessToken = await getAccessToken(refreshToken);
  const cleanCustomerId = customerId.replace(/-/g, '');

  const gaqlQuery = `
    SELECT
      segments.date,
      metrics.impressions,
      metrics.clicks,
      metrics.cost_micros,
      metrics.conversions,
      metrics.ctr
    FROM campaign
    WHERE campaign.id = ${campaignId}
      AND segments.date BETWEEN '${dateRange.startDate}' AND '${dateRange.endDate}'
    ORDER BY segments.date
  `;

  const response = await fetch(
    `${GOOGLE_ADS_BASE_URL}/customers/${cleanCustomerId}/googleAds:searchStream`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'developer-token': DEVELOPER_TOKEN,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ query: gaqlQuery }),
    }
  );

  const data: any = await response.json();

  if (!response.ok) {
    throw new Error(`getCampaignStats failed: ${JSON.stringify(data)}`);
  }

  const results = data[0]?.results || [];

  return results.map((row: any) => ({
    date: row.segments.date,
    impressions: parseInt(row.metrics.impressions || '0'),
    clicks: parseInt(row.metrics.clicks || '0'),
    cost: parseInt(row.metrics.costMicros || '0') / 1_000_000,
    conversions: parseFloat(row.metrics.conversions || '0'),
    ctr: parseFloat(row.metrics.ctr || '0'),
  }));
}

// ==================== HELPERS ====================

function getDefaultDateRange(): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);

  return {
    startDate: formatDate(start),
    endDate: formatDate(end),
  };
}

function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
