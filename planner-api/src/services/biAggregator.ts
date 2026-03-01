export interface DateRange {
  from: Date;
  to: Date;
}

export interface QuoteSnapshot {
  id: string;
  created_at: string | Date;
  total_net: number;
  contribution_margin_net: number;
  status?: 'open' | 'won' | 'lost';
  owner?: string;
}

export interface QuoteSummary {
  total_net: number;
  quote_count: number;
  average_net: number;
  cm_ranking: Array<{
    owner: string;
    contribution_margin_net: number;
    quotes: number;
  }>;
}

export interface Lead {
  id: string;
  created_at?: string | Date;
  converted_quote_id?: string | null;
}

export interface WonQuote {
  id: string;
  lead_id?: string | null;
  won_at?: string | Date;
}

export interface QuoteItem {
  sku: string;
  quantity: number;
  revenue_net: number;
  contribution_margin_net: number;
}

export interface PerformanceStats {
  sku: string;
  quantity: number;
  revenue_net: number;
  contribution_margin_net: number;
  average_unit_price_net: number;
}

function toDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value);
}

function isWithinRange(value: string | Date, range: DateRange): boolean {
  const date = toDate(value).getTime();
  return date >= range.from.getTime() && date <= range.to.getTime();
}

export function aggregateQuoteKPIs(quotes: QuoteSnapshot[], range: DateRange): QuoteSummary {
  const filtered = quotes.filter((quote) => isWithinRange(quote.created_at, range));
  const totalNet = filtered.reduce((sum, quote) => sum + quote.total_net, 0);
  const cmByOwner = new Map<string, { contribution_margin_net: number; quotes: number }>();

  filtered.forEach((quote) => {
    const owner = quote.owner ?? 'unknown';
    const current = cmByOwner.get(owner) ?? { contribution_margin_net: 0, quotes: 0 };
    current.contribution_margin_net += quote.contribution_margin_net;
    current.quotes += 1;
    cmByOwner.set(owner, current);
  });

  return {
    total_net: totalNet,
    quote_count: filtered.length,
    average_net: filtered.length === 0 ? 0 : totalNet / filtered.length,
    cm_ranking: [...cmByOwner.entries()]
      .map(([owner, value]) => ({
        owner,
        contribution_margin_net: value.contribution_margin_net,
        quotes: value.quotes
      }))
      .sort((left, right) => right.contribution_margin_net - left.contribution_margin_net)
  };
}

export function calculateConversionRatio(leads: Lead[], wins: WonQuote[]): number {
  if (leads.length === 0) {
    return 0;
  }

  const leadIds = new Set(leads.map((lead) => lead.id));
  const convertedLeadIds = new Set(
    wins.map((quote) => quote.lead_id).filter((leadId): leadId is string => typeof leadId === 'string' && leadIds.has(leadId))
  );

  return convertedLeadIds.size / leadIds.size;
}

export function getProductPerformance(quoteItems: QuoteItem[]): Map<string, PerformanceStats> {
  const result = new Map<string, PerformanceStats>();

  quoteItems.forEach((item) => {
    const current =
      result.get(item.sku) ??
      ({
        sku: item.sku,
        quantity: 0,
        revenue_net: 0,
        contribution_margin_net: 0,
        average_unit_price_net: 0
      } satisfies PerformanceStats);

    current.quantity += item.quantity;
    current.revenue_net += item.revenue_net;
    current.contribution_margin_net += item.contribution_margin_net;
    current.average_unit_price_net = current.quantity === 0 ? 0 : current.revenue_net / current.quantity;
    result.set(item.sku, current);
  });

  return result;
}
