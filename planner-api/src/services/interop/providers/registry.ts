import { dxfProvider } from './dxfProvider.js'
import { dwgProvider } from './dwgProvider.js'
import { ifcProvider } from './ifcProvider.js'
import { objProvider } from './objProvider.js'
import { skpProvider } from './skpProvider.js'
import { stepProvider } from './stepProvider.js'
import { stlProvider } from './stlProvider.js'
import { threeMfProvider } from './threeMfProvider.js'
import type { InteropFormat, InteropProvider } from './types.js'

const defaultProviders = [dxfProvider, dwgProvider, skpProvider, ifcProvider, stlProvider, stepProvider, objProvider, threeMfProvider] as const

const providerMap = new Map<InteropFormat, InteropProvider>()
const providerList: InteropProvider[] = []

function registerProviderInternal(provider: InteropProvider): void {
  if (providerMap.has(provider.format)) {
    throw new Error(`Interop provider for format '${provider.format}' is already registered.`)
  }
  providerMap.set(provider.format, provider)
  providerList.push(provider)
}

function ensureDefaultProvidersRegistered(): void {
  if (providerList.length > 0) {
    return
  }
  for (const provider of defaultProviders) {
    registerProviderInternal(provider)
  }
}

export function registerInteropProvider(provider: InteropProvider): void {
  ensureDefaultProvidersRegistered()
  registerProviderInternal(provider)
}

export function getInteropProvider(format: InteropFormat): InteropProvider {
  ensureDefaultProvidersRegistered()
  const provider = providerMap.get(format)
  if (!provider) {
    throw new Error(`Unsupported interop format: ${format}`)
  }
  return provider
}

export function listInteropCapabilities() {
  ensureDefaultProvidersRegistered()
  return providerList.map((provider) => provider.getCapabilities())
}

export function getInteropProviders(): readonly InteropProvider[] {
  ensureDefaultProvidersRegistered()
  return [...providerList]
}

export function clearInteropProviders(): void {
  providerMap.clear()
  providerList.length = 0
}
