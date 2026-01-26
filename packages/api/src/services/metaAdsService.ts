/**
 * Meta Ads Service
 *
 * Provides helpers for interacting with the Meta Marketing API:
 * - Token exchange (short-lived → long-lived)
 * - List ad accounts
 * - Get campaigns with insights
 * - Get campaign detail insights
 */

const META_APP_ID = process.env.META_APP_ID || '';
const META_APP_SECRET = process.env.META_APP_SECRET || '';

const GRAPH_API_VERSION = 'v21.0';
const GRAPH_API_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// ==================== TOKEN MANAGEMENT ====================

/**
 * Exchanges a short-lived token for a long-lived token (~60 days).
 */
export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{
  accessToken: string;
  expiresIn: number;
}> {
  const params = new URLSearchParams({
    grant_type: 'fb_exchange_token',
    client_id: META_APP_ID,
    client_secret: META_APP_SECRET,
    fb_exchange_token: shortLivedToken,
  });

  const response = await fetch(`${GRAPH_API_BASE}/oauth/access_token?${params.toString()}`);
  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Token exchange failed: ${data.error?.message || 'Unknown error'}`);
  }

  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in || 5184000, // default 60 days
  };
}

// ==================== AD ACCOUNTS ====================

export interface MetaAdAccount {
  id: string;           // act_XXXXXXXXX
  accountId: string;    // XXXXXXXXX (numeric)
  name: string;
  accountStatus: number;
  currency: string;
  businessName?: string;
}

/**
 * Lists all ad accounts accessible to the authenticated user.
 */
export async function listAdAccounts(accessToken: string): Promise<MetaAdAccount[]> {
  const fields = 'name,account_id,account_status,currency,business{name}';
  const response = await fetch(
    `${GRAPH_API_BASE}/me/adaccounts?fields=${encodeURIComponent(fields)}&limit=100`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to list ad accounts: ${data.error?.message || response.statusText}`);
  }

  return (data.data || []).map((account: any) => ({
    id: account.id,
    accountId: account.account_id,
    name: account.name || `Account ${account.account_id}`,
    accountStatus: account.account_status,
    currency: account.currency,
    businessName: account.business?.name || undefined,
  }));
}

// ==================== CAMPAIGNS ====================

export interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  dailyBudget?: number;
  lifetimeBudget?: number;
  startTime?: string;
  stopTime?: string;
  // Insights (if available)
  spend?: number;
  impressions?: number;
  clicks?: number;
  ctr?: number;
  cpc?: number;
  reach?: number;
  conversions?: number;
}

/**
 * Gets campaigns with performance metrics for an ad account.
 * Uses nested insights edge to fetch campaigns + metrics in a single request.
 */
export async function getCampaigns(
  accessToken: string,
  adAccountId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<MetaCampaign[]> {
  // Ensure adAccountId starts with act_
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;

  // Build the insights subfield with time_range
  const insightsFields = 'spend,impressions,clicks,ctr,cpc,reach,actions';
  let insightsEdge = `insights.fields(${insightsFields})`;
  if (dateRange) {
    const timeRange = JSON.stringify({ since: dateRange.startDate, until: dateRange.endDate });
    insightsEdge = `insights.fields(${insightsFields}).time_range(${timeRange})`;
  }

  // Single request: campaigns with nested insights
  const campaignFields = `id,name,status,objective,daily_budget,lifetime_budget,start_time,stop_time,${insightsEdge}`;

  const url = `${GRAPH_API_BASE}/${actId}/campaigns?fields=${encodeURIComponent(campaignFields)}&limit=100`;
  console.log('[Meta Ads] Fetching campaigns:', url.replace(/access_token=[^&]+/, 'access_token=***'));

  const campaignsResponse = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  const campaignsData: any = await campaignsResponse.json();

  if (!campaignsResponse.ok || campaignsData.error) {
    console.error('[Meta Ads] Campaigns API error:', JSON.stringify(campaignsData.error || campaignsData));
    throw new Error(`Failed to get campaigns: ${campaignsData.error?.message || campaignsResponse.statusText}`);
  }

  return (campaignsData.data || []).map((c: any) => {
    const campaign: MetaCampaign = {
      id: c.id,
      name: c.name,
      status: c.status,
      objective: c.objective || 'UNKNOWN',
      dailyBudget: c.daily_budget ? parseInt(c.daily_budget) / 100 : undefined,
      lifetimeBudget: c.lifetime_budget ? parseInt(c.lifetime_budget) / 100 : undefined,
      startTime: c.start_time,
      stopTime: c.stop_time,
    };

    // Extract nested insights (comes as { data: [{ ... }] })
    const insight = c.insights?.data?.[0];
    if (insight) {
      campaign.spend = parseFloat(insight.spend) || 0;
      campaign.impressions = parseInt(insight.impressions) || 0;
      campaign.clicks = parseInt(insight.clicks) || 0;
      campaign.ctr = parseFloat(insight.ctr) || 0;
      campaign.cpc = parseFloat(insight.cpc) || 0;
      campaign.reach = parseInt(insight.reach) || 0;
      // Extract lead or purchase conversions
      if (insight.actions) {
        const leadAction = insight.actions.find((a: any) =>
          a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
        );
        const purchaseAction = insight.actions.find((a: any) =>
          a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
        );
        campaign.conversions = parseInt(leadAction?.value || purchaseAction?.value || '0');
      }
    }

    return campaign;
  });
}

// ==================== CAMPAIGN INSIGHTS ====================

export interface MetaCampaignDailyStats {
  date: string;
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  conversions: number;
}

/**
 * Gets daily performance stats for a specific campaign.
 */
export async function getCampaignStats(
  accessToken: string,
  campaignId: string,
  dateRange?: { startDate: string; endDate: string }
): Promise<MetaCampaignDailyStats[]> {
  const fields = 'spend,impressions,clicks,ctr,cpc,reach,actions';

  let timeRange = '';
  if (dateRange) {
    timeRange = `&time_range=${encodeURIComponent(JSON.stringify({
      since: dateRange.startDate,
      until: dateRange.endDate,
    }))}`;
  }

  const response = await fetch(
    `${GRAPH_API_BASE}/${campaignId}/insights?fields=${encodeURIComponent(fields)}&time_increment=1${timeRange}&limit=500`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data: any = await response.json();

  if (!response.ok || data.error) {
    throw new Error(`Failed to get campaign stats: ${data.error?.message || response.statusText}`);
  }

  return (data.data || []).map((d: any) => {
    const leadAction = d.actions?.find((a: any) =>
      a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
    );
    const purchaseAction = d.actions?.find((a: any) =>
      a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
    );

    return {
      date: d.date_start,
      spend: parseFloat(d.spend) || 0,
      impressions: parseInt(d.impressions) || 0,
      clicks: parseInt(d.clicks) || 0,
      ctr: parseFloat(d.ctr) || 0,
      cpc: parseFloat(d.cpc) || 0,
      reach: parseInt(d.reach) || 0,
      conversions: parseInt(leadAction?.value || purchaseAction?.value || '0'),
    };
  });
}

// ==================== ACCOUNT SUMMARY ====================

/**
 * Gets a summary of account-level insights (totals).
 */
export async function getAccountSummary(
  accessToken: string,
  adAccountId: string,
  dateRange: { startDate: string; endDate: string }
): Promise<{
  spend: number;
  impressions: number;
  clicks: number;
  ctr: number;
  cpc: number;
  reach: number;
  conversions: number;
} | null> {
  const actId = adAccountId.startsWith('act_') ? adAccountId : `act_${adAccountId}`;
  const fields = 'spend,impressions,clicks,ctr,cpc,reach,actions';
  const timeRange = encodeURIComponent(JSON.stringify({
    since: dateRange.startDate,
    until: dateRange.endDate,
  }));

  const response = await fetch(
    `${GRAPH_API_BASE}/${actId}/insights?fields=${encodeURIComponent(fields)}&time_range=${timeRange}`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  const data: any = await response.json();

  if (!response.ok || data.error || !data.data?.length) {
    return null;
  }

  const d = data.data[0];
  const leadAction = d.actions?.find((a: any) =>
    a.action_type === 'lead' || a.action_type === 'onsite_conversion.lead_grouped'
  );
  const purchaseAction = d.actions?.find((a: any) =>
    a.action_type === 'purchase' || a.action_type === 'offsite_conversion.fb_pixel_purchase'
  );

  return {
    spend: parseFloat(d.spend) || 0,
    impressions: parseInt(d.impressions) || 0,
    clicks: parseInt(d.clicks) || 0,
    ctr: parseFloat(d.ctr) || 0,
    cpc: parseFloat(d.cpc) || 0,
    reach: parseInt(d.reach) || 0,
    conversions: parseInt(leadAction?.value || purchaseAction?.value || '0'),
  };
}
