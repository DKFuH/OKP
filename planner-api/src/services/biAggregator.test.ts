import { describe, expect, it } from 'vitest';
import { aggregateQuoteKPIs, calculateConversionRatio, getProductPerformance } from './biAggregator.js';

describe('biAggregator', () => {
  it('aggregates quote KPIs for a date range', () => {
    const summary = aggregateQuoteKPIs(
      [
        {
          id: 'q1',
          created_at: '2026-02-01T10:00:00.000Z',
          total_net: 1000,
          contribution_margin_net: 300,
          owner: 'Alice'
        },
        {
          id: 'q2',
          created_at: '2026-02-15T10:00:00.000Z',
          total_net: 2500,
          contribution_margin_net: 900,
          owner: 'Bob'
        },
        {
          id: 'q3',
          created_at: '2026-01-10T10:00:00.000Z',
          total_net: 800,
          contribution_margin_net: 200,
          owner: 'Alice'
        }
      ],
      {
        from: new Date('2026-02-01T00:00:00.000Z'),
        to: new Date('2026-02-28T23:59:59.999Z')
      }
    );

    expect(summary).toEqual({
      total_net: 3500,
      quote_count: 2,
      average_net: 1750,
      cm_ranking: [
        { owner: 'Bob', contribution_margin_net: 900, quotes: 1 },
        { owner: 'Alice', contribution_margin_net: 300, quotes: 1 }
      ]
    });
  });

  it('calculates conversion ratio from leads to won quotes', () => {
    const ratio = calculateConversionRatio(
      [{ id: 'l1' }, { id: 'l2' }, { id: 'l3' }, { id: 'l4' }],
      [
        { id: 'q1', lead_id: 'l1' },
        { id: 'q2', lead_id: 'l3' },
        { id: 'q3', lead_id: 'missing' }
      ]
    );

    expect(ratio).toBe(0.5);
  });

  it('aggregates product performance by SKU', () => {
    const performance = getProductPerformance([
      { sku: 'CAB-60', quantity: 2, revenue_net: 800, contribution_margin_net: 240 },
      { sku: 'CAB-60', quantity: 1, revenue_net: 450, contribution_margin_net: 150 },
      { sku: 'TOP-200', quantity: 1, revenue_net: 300, contribution_margin_net: 90 }
    ]);

    expect(performance.get('CAB-60')).toEqual({
      sku: 'CAB-60',
      quantity: 3,
      revenue_net: 1250,
      contribution_margin_net: 390,
      average_unit_price_net: 1250 / 3
    });
    expect(performance.get('TOP-200')).toEqual({
      sku: 'TOP-200',
      quantity: 1,
      revenue_net: 300,
      contribution_margin_net: 90,
      average_unit_price_net: 300
    });
  });
});
