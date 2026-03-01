import { api } from './client.js'

const BASE_URL = '/api/v1'

type ApiError = { error: string; message: string }

export type LeadStatus = 'new' | 'qualified' | 'quoted' | 'won' | 'lost'

export interface CustomerPriceList {
  id: string
  project_id: string
  name: string
  price_adjustment_pct: number
  notes: string | null
  created_at: string
  updated_at: string
}

export interface CustomerDiscount {
  id: string
  project_id: string
  label: string
  discount_pct: number
  scope: string
  created_at: string
  updated_at: string
}

export interface ProjectLineItem {
  id: string
  project_id: string
  source_type: 'manual' | 'bom' | 'pricing' | 'quote'
  description: string
  qty: number
  unit: string
  unit_price_net: number
  tax_rate: number
  line_net: number
  created_at: string
  updated_at: string
}

export interface BusinessProjectSummary {
  id: string
  user_id: string
  name: string
  description: string | null
  status: 'active' | 'archived'
  lead_status: LeadStatus
  quote_value: number | null
  close_probability: number | null
  created_at: string
  updated_at: string
}

export interface BusinessSummary {
  project: BusinessProjectSummary
  customer_price_lists: CustomerPriceList[]
  customer_discounts: CustomerDiscount[]
  project_line_items: ProjectLineItem[]
  totals: {
    project_line_items_net: number
    customer_discount_count: number
    customer_price_list_count: number
  }
}

export interface UpdateBusinessSummaryPayload {
  lead_status: LeadStatus
  quote_value: number | null
  close_probability: number | null
  customer_price_lists: Array<{
    name: string
    price_adjustment_pct: number
    notes?: string | null
  }>
  customer_discounts: Array<{
    label: string
    discount_pct: number
    scope: string
  }>
  project_line_items: Array<{
    source_type: 'manual' | 'bom' | 'pricing' | 'quote'
    description: string
    qty: number
    unit: string
    unit_price_net: number
    tax_rate: number
  }>
}

export interface BusinessJsonExportResponse {
  exported_at: string
  format: 'json'
  data: BusinessSummary
}

export interface BusinessWebhookPayload {
  target_url: string
  event?: string
}

export interface BusinessWebhookResponse {
  delivered: boolean
  event: string
  target_url: string
  status: number
}

function parseFilename(contentDisposition: string | null, fallback: string): string {
  if (!contentDisposition) {
    return fallback
  }

  const match = contentDisposition.match(/filename\*?=(?:UTF-8''|\")?([^\";]+)/i)
  if (!match || !match[1]) {
    return fallback
  }

  try {
    return decodeURIComponent(match[1].replace(/\"/g, '').trim())
  } catch {
    return match[1].replace(/\"/g, '').trim() || fallback
  }
}

function triggerDownload(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = objectUrl
  anchor.download = filename
  anchor.style.display = 'none'

  document.body.appendChild(anchor)
  anchor.click()
  document.body.removeChild(anchor)
  URL.revokeObjectURL(objectUrl)
}

export function getBusinessSummary(projectId: string): Promise<BusinessSummary> {
  return api.get<BusinessSummary>(`/projects/${projectId}/business-summary`)
}

export function updateBusinessSummary(
  projectId: string,
  payload: UpdateBusinessSummaryPayload,
): Promise<BusinessSummary> {
  return api.put<BusinessSummary>(`/projects/${projectId}/business-summary`, payload)
}

export async function exportBusinessJson(projectId: string): Promise<BusinessJsonExportResponse> {
  return api.get<BusinessJsonExportResponse>(`/projects/${projectId}/export/json`)
}

export async function exportBusinessCsv(projectId: string): Promise<void> {
  const response = await fetch(`${BASE_URL}/projects/${projectId}/export/csv`)
  if (!response.ok) {
    const errorBody: ApiError = await response
      .json()
      .catch(() => ({ error: 'UNKNOWN', message: response.statusText }))
    throw new Error(errorBody.message)
  }

  const blob = await response.blob()
  const filename = parseFilename(response.headers.get('content-disposition'), `project-${projectId}-business.csv`)
  triggerDownload(blob, filename)
}

export function exportBusinessWebhook(
  projectId: string,
  payload: BusinessWebhookPayload,
): Promise<BusinessWebhookResponse> {
  return api.post<BusinessWebhookResponse>(`/projects/${projectId}/export/webhook`, payload)
}

export function downloadBusinessJsonFile(projectId: string, data: BusinessJsonExportResponse): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
  triggerDownload(blob, `project-${projectId}-business.json`)
}
