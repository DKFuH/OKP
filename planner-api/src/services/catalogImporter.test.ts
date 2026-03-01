import { describe, expect, it } from 'vitest';
import { mapToInternalSchema, parseCatalogFile, validateCatalogSet } from './catalogImporter.js';

describe('catalogImporter', () => {
  it('parses CSV catalogs into raw articles', () => {
    const csv = Buffer.from(
      [
        'manufacturer,sku,name,list_price,width_mm,depth_mm,color,griff',
        'Nobilia,SKU-1,Base 60,199.90,600,560,White,Steel'
      ].join('\n')
    );

    const parsed = parseCatalogFile(csv, 'csv');

    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      manufacturerCode: 'Nobilia',
      sku: 'SKU-1',
      name: 'Base 60',
      listPrice: 199.9,
      widthMm: 600,
      depthMm: 560,
      color: 'White',
      handle: 'Steel'
    });
  });

  it('parses JSON catalogs from articles payloads', () => {
    const json = Buffer.from(
      JSON.stringify({
        articles: [
          {
            manufacturer_code: 'pronorm',
            manufacturer_name: 'Pronorm',
            sku: 'SKU-2',
            name: 'Tall 60',
            list_net: 599,
            width_mm: 600,
            depth_mm: 600,
            height_mm: 2100
          }
        ]
      })
    );

    const parsed = parseCatalogFile(json, 'json');

    expect(parsed[0]).toMatchObject({
      manufacturerCode: 'pronorm',
      manufacturerName: 'Pronorm',
      sku: 'SKU-2',
      listPrice: 599
    });
  });

  it('maps raw articles to internal schema with manufacturers, options, variants and prices', () => {
    const mapped = mapToInternalSchema([
      {
        manufacturerCode: 'nobilia',
        manufacturerName: 'Nobilia',
        sku: 'SKU-1',
        name: 'Base 60',
        listPrice: 199.9,
        dealerPrice: 150,
        widthMm: 600,
        depthMm: 560,
        heightMm: 720,
        color: 'White',
        handle: 'Steel'
      }
    ]);

    expect(mapped.manufacturers).toHaveLength(1);
    expect(mapped.articles[0]).toMatchObject({
      sku: 'SKU-1',
      manufacturer_id: mapped.manufacturers[0].id
    });
    expect(mapped.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ option_key: 'color', constraints_json: { values: ['White'] } }),
        expect.objectContaining({ option_key: 'handle', constraints_json: { values: ['Steel'] } })
      ])
    );
    expect(mapped.variants[0]).toMatchObject({
      variant_key: 'dimensions',
      dims_override_json: { width_mm: 600, depth_mm: 560, height_mm: 720 }
    });
    expect(mapped.prices[0]).toMatchObject({ list_net: 199.9, dealer_net: 150 });
  });

  it('rejects duplicate SKUs and missing required fields', () => {
    const mapped = mapToInternalSchema([
      {
        manufacturerCode: 'nobilia',
        manufacturerName: 'Nobilia',
        sku: 'SKU-1',
        name: 'Base 60',
        listPrice: 100
      },
      {
        manufacturerCode: 'nobilia',
        manufacturerName: 'Nobilia',
        sku: 'SKU-1',
        name: '',
        listPrice: Number.NaN
      }
    ]);

    const result = validateCatalogSet(mapped);

    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Duplicate SKU detected: SKU-1.',
        expect.stringContaining('missing name'),
        expect.stringContaining('missing list price')
      ])
    );
  });
});
