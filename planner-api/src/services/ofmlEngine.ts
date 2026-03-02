export interface PropertyDefinition {
  key: string
  type: string
  options: { value: string; label: string }[]
  depends_on: Record<string, string[]>
}

export interface PropertyValues {
  [key: string]: string | number | boolean | null
}

export interface ValidationResult {
  valid: boolean
  errors: { property: string; message: string }[]
  available: Record<string, string[]>
}

export function validatePropertyCombination(
  properties: PropertyDefinition[],
  values: PropertyValues,
): ValidationResult {
  const errors: ValidationResult['errors'] = []
  const available: Record<string, string[]> = {}

  for (const property of properties) {
    const selectedValue = values[property.key]

    let isAvailable = true
    for (const [dependencyKey, allowedValues] of Object.entries(property.depends_on)) {
      const dependencyValue = values[dependencyKey]
      if (dependencyValue !== undefined && dependencyValue !== null && !allowedValues.includes(String(dependencyValue))) {
        isAvailable = false
        break
      }
    }

    available[property.key] = isAvailable
      ? property.options.map((option) => option.value)
      : []

    if (selectedValue !== undefined && selectedValue !== null) {
      if (!isAvailable) {
        errors.push({
          property: property.key,
          message: `Property '${property.key}' ist nicht verfügbar mit aktuellen Abhängigkeiten`,
        })
      } else if (property.type === 'enum' && !available[property.key].includes(String(selectedValue))) {
        errors.push({
          property: property.key,
          message: `Wert '${selectedValue}' nicht erlaubt für '${property.key}'. Erlaubt: ${available[property.key].join(', ')}`,
        })
      }
    }
  }

  return { valid: errors.length === 0, errors, available }
}

export function lookupPrice(
  priceTables: { property_combination: PropertyValues; price_net: number }[],
  values: PropertyValues,
): number | null {
  for (const entry of priceTables) {
    const matches = Object.entries(entry.property_combination).every(
      ([key, value]) => String(values[key]) === String(value),
    )
    if (matches) {
      return entry.price_net
    }
  }

  return null
}
