import { randomUUID } from 'node:crypto'
import { parseDxf } from '@okp/dxf-import'
import { parseSkp } from '@okp/skp-import'
import type { InteropProtocolEntry } from './types.js'

export type LayerMappingEntry = {
  action: 'imported' | 'ignored' | 'needs_review'
  reason?: string
}

export type ComponentMappingEntry = {
  target_type: 'cabinet' | 'appliance' | 'reference_object' | 'ignored'
  catalog_item_id?: string | null
  label?: string | null
}

function nowIsoString(): string {
  return new Date().toISOString()
}

export function emptyCadImportAsset(
  importJobId: string,
  sourceFilename: string,
  sourceFormat: 'dxf' | 'dwg',
  protocol: InteropProtocolEntry[],
  rawUploadBase64?: string,
) {
  return {
    id: randomUUID(),
    import_job_id: importJobId,
    source_format: sourceFormat,
    source_filename: sourceFilename,
    layers: [],
    entities: [],
    bounding_box: {
      min: { x_mm: 0, y_mm: 0 },
      max: { x_mm: 0, y_mm: 0 },
    },
    units: 'mm',
    created_at: nowIsoString(),
    protocol,
    ...(rawUploadBase64 ? { raw_upload_base64: rawUploadBase64 } : {}),
  }
}

export function applyCadLayerMapping(
  asset: ReturnType<typeof parseDxf>,
  layerMapping?: Record<string, LayerMappingEntry>,
) {
  if (!layerMapping) {
    return asset
  }

  const ignoredLayerIds = new Set(
    asset.layers
      .filter((layer) => layerMapping[layer.name]?.action === 'ignored')
      .map((layer) => layer.id),
  )

  const entities = asset.entities.filter((entity) => !ignoredLayerIds.has(entity.layer_id))
  const layers = asset.layers.map((layer) => {
    const isIgnored = layerMapping[layer.name]?.action === 'ignored'
    return {
      ...layer,
      visible: isIgnored ? false : layer.visible,
      entity_count: entities.filter((entity) => entity.layer_id === layer.id).length,
    }
  })

  const protocol = [
    ...asset.protocol,
    ...Object.entries(layerMapping).map(([layerName, entry]) => ({
      entity_id: null,
      status: entry.action,
      reason: entry.reason ?? `Layer ${layerName} marked as ${entry.action}.`,
    })),
  ]

  return {
    ...asset,
    layers,
    entities,
    protocol,
    mapping_state: {
      layers: layerMapping,
    },
  }
}

export function createCadProtocol(
  asset: ReturnType<typeof applyCadLayerMapping>,
  sourceFilename: string,
): InteropProtocolEntry[] {
  if (asset.protocol.length > 0) {
    return asset.protocol
  }

  return [
    {
      entity_id: null,
      status: 'imported',
      reason: `Parsed ${asset.entities.length} CAD entities from ${sourceFilename}.`,
    },
  ]
}

export function applySkpComponentMapping(
  referenceModel: ReturnType<typeof parseSkp>,
  componentMapping?: Record<string, ComponentMappingEntry>,
) {
  if (!componentMapping) {
    return referenceModel
  }

  const components = referenceModel.components.map((component) => {
    const override =
      componentMapping[component.skp_instance_guid] ?? componentMapping[component.skp_component_name]

    if (!override) {
      return component
    }

    return {
      ...component,
      mapping: {
        component_id: component.id,
        target_type: override.target_type,
        catalog_item_id: override.catalog_item_id ?? null,
        label: override.label ?? component.skp_component_name,
      },
    }
  })

  return {
    ...referenceModel,
    components,
    mapping_state: {
      components: componentMapping,
    },
  }
}

export function createSkpProtocol(referenceModel: ReturnType<typeof applySkpComponentMapping>): InteropProtocolEntry[] {
  if (referenceModel.components.length === 0) {
    return [
      {
        entity_id: null,
        status: 'needs_review',
        reason: 'No components were parsed from the SKP payload.',
      },
    ]
  }

  return referenceModel.components.map((component) => {
    const targetType = component.mapping?.target_type ?? 'reference_object'

    if (targetType === 'ignored') {
      return {
        entity_id: component.id,
        status: 'ignored',
        reason: `Component ${component.skp_component_name} was ignored.`,
      }
    }

    if (targetType === 'reference_object') {
      return {
        entity_id: component.id,
        status: 'needs_review',
        reason: `Component ${component.skp_component_name} requires manual mapping review.`,
      }
    }

    return {
      entity_id: component.id,
      status: 'imported',
      reason: `Component ${component.skp_component_name} mapped as ${targetType}.`,
    }
  })
}
