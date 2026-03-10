import { describe, expect, it, vi, afterEach } from 'vitest'
import {
  detectRendererCapabilities,
  isOffscreenCanvasSupported,
  isWebGPUSupported,
} from './rendererCapabilities.js'

// Helper to temporarily install a property on an object and restore it afterwards.
function withProperty<T extends object>(
  target: T,
  key: keyof T,
  value: unknown,
  fn: () => void,
): void {
  const descriptor = Object.getOwnPropertyDescriptor(target, key)
  Object.defineProperty(target, key, { value, configurable: true, writable: true })
  try {
    fn()
  } finally {
    if (descriptor) {
      Object.defineProperty(target, key, descriptor)
    } else {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
      delete (target as Record<string, unknown>)[key as string]
    }
  }
}

describe('rendererCapabilities', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('isWebGPUSupported', () => {
    it('returns false when navigator.gpu is undefined', () => {
      // In jsdom / Node the gpu property is absent → must return false
      expect(isWebGPUSupported()).toBe(false)
    })

    it('returns true when navigator.gpu is a non-null object', () => {
      withProperty(navigator as unknown as Record<string, unknown>, 'gpu' as never, {}, () => {
        expect(isWebGPUSupported()).toBe(true)
      })
    })

    it('returns false when navigator.gpu is explicitly null', () => {
      withProperty(navigator as unknown as Record<string, unknown>, 'gpu' as never, null, () => {
        expect(isWebGPUSupported()).toBe(false)
      })
    })
  })

  describe('isOffscreenCanvasSupported', () => {
    it('returns false in jsdom which lacks OffscreenCanvas', () => {
      // jsdom does not implement OffscreenCanvas
      expect(isOffscreenCanvasSupported()).toBe(false)
    })

    it('returns true when OffscreenCanvas is defined in global scope', () => {
      const globalRef = global as Record<string, unknown>
      const prev = globalRef['OffscreenCanvas']
      globalRef['OffscreenCanvas'] = class {}
      try {
        expect(isOffscreenCanvasSupported()).toBe(true)
      } finally {
        if (prev === undefined) {
          delete globalRef['OffscreenCanvas']
        } else {
          globalRef['OffscreenCanvas'] = prev
        }
      }
    })
  })

  describe('detectRendererCapabilities', () => {
    it('returns an object with webgpu and offscreenCanvas boolean fields', () => {
      const caps = detectRendererCapabilities()
      expect(typeof caps.webgpu).toBe('boolean')
      expect(typeof caps.offscreenCanvas).toBe('boolean')
    })

    it('webgpu field matches isWebGPUSupported()', () => {
      const caps = detectRendererCapabilities()
      expect(caps.webgpu).toBe(isWebGPUSupported())
    })

    it('offscreenCanvas field matches isOffscreenCanvasSupported()', () => {
      const caps = detectRendererCapabilities()
      expect(caps.offscreenCanvas).toBe(isOffscreenCanvasSupported())
    })

    it('reflects WebGPU when navigator.gpu is present', () => {
      withProperty(navigator as unknown as Record<string, unknown>, 'gpu' as never, {}, () => {
        const caps = detectRendererCapabilities()
        expect(caps.webgpu).toBe(true)
      })
    })
  })
})
