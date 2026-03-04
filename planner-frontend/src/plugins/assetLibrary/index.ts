import type { CatalogItem, CatalogItemType } from '../../api/catalog.js'

export type AssetCategory = 'base' | 'wall' | 'appliance' | 'decor' | 'custom'

export interface AssetLibraryItem {
  id: string
  tenant_id: string
  name: string
  category: AssetCategory
  source_format: 'obj' | 'dae'
  file_url: string
  preview_url: string | null
  bbox_json: {
    width_mm: number
    height_mm: number
    depth_mm: number
  }
  default_scale_json: {
    factor_to_mm: number
    axis_scale?: { x: number; y: number; z: number }
    source_unit?: 'm' | 'cm' | 'mm'
  }
  tags_json: string[]
  created_at: string
  updated_at: string
}

export const ASSET_CATEGORY_LABELS: Record<AssetCategory, string> = {
  base: 'Base',
  wall: 'Wall',
  appliance: 'Appliance',
  decor: 'Decor',
  custom: 'Custom',
}

function categoryToCatalogType(category: AssetCategory): CatalogItemType {
  if (category === 'base') return 'base_cabinet'
  if (category === 'wall') return 'wall_cabinet'
  if (category === 'appliance') return 'appliance'
  return 'accessory'
}

export function mapAssetToCatalogItem(asset: AssetLibraryItem): CatalogItem {
  return {
    id: asset.id,
    sku: `asset-${asset.source_format}-${asset.id.slice(0, 8)}`,
    name: asset.name,
    type: categoryToCatalogType(asset.category),
    width_mm: Math.max(1, Number(asset.bbox_json?.width_mm ?? 1)),
    height_mm: Math.max(1, Number(asset.bbox_json?.height_mm ?? 1)),
    depth_mm: Math.max(1, Number(asset.bbox_json?.depth_mm ?? 1)),
    list_price_net: 0,
    dealer_price_net: null,
    default_markup_pct: null,
    tax_group_id: null,
    pricing_group_id: null,
  }
}
