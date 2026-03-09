import { dxfProvider } from './dxfProvider.js'
import { dwgProvider } from './dwgProvider.js'
import { ifcProvider } from './ifcProvider.js'
import { skpProvider } from './skpProvider.js'
import type { InteropFormat, InteropProvider } from './types.js'

const providers = [dxfProvider, dwgProvider, skpProvider, ifcProvider] as const

const providerMap = new Map<InteropFormat, InteropProvider>(
  providers.map((provider) => [provider.format, provider]),
)

export function getInteropProvider(format: InteropFormat): InteropProvider {
  const provider = providerMap.get(format)
  if (!provider) {
    throw new Error(`Unsupported interop format: ${format}`)
  }
  return provider
}

export function listInteropCapabilities() {
  return providers.map((provider) => provider.getCapabilities())
}
