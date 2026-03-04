export const SUPPORTED_LOCALE_CODES = ['de', 'en'] as const

export type SupportedLocaleCode = (typeof SUPPORTED_LOCALE_CODES)[number]

export function normalizeLocaleCode(value: string | null | undefined): SupportedLocaleCode | null {
  if (!value) {
    return null
  }

  const normalized = value.trim().toLowerCase()
  if (!normalized) {
    return null
  }

  const base = normalized.includes('-') ? normalized.split('-')[0] : normalized
  if (base === 'de' || base === 'en') {
    return base
  }

  return null
}

export function resolveLocaleCode(input: {
  requested?: string | null
  persisted?: string | null
  tenantPreferred?: string | null
  fallback?: SupportedLocaleCode
}): SupportedLocaleCode {
  return (
    normalizeLocaleCode(input.requested)
    ?? normalizeLocaleCode(input.persisted)
    ?? normalizeLocaleCode(input.tenantPreferred)
    ?? input.fallback
    ?? 'de'
  )
}
