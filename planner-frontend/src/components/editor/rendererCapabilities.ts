/**
 * Renderer capabilities detection and factory utilities.
 *
 * Provides detection for WebGPU and OffscreenCanvas support and exports a
 * renderer factory that selects the best available backend:
 *   – WebGPU  (Chromium stable, Firefox Nightly, …)
 *   – WebGL 2 (THREE.WebGLRenderer, no three/webgpu chunk loaded)
 *
 * Usage in components:
 *   const { renderer, backend } = await createSceneRenderer({ antialias: true })
 *   renderer.setSize(width, height)
 */

/** The rendering backend that is actually in use. */
export type RendererBackend = 'webgpu' | 'webgl'

/** Summary of what the current browser/environment supports. */
export interface RendererCapabilities {
  /** True when the browser exposes a `navigator.gpu` adapter (WebGPU API). */
  webgpu: boolean
  /** True when `OffscreenCanvas` is available for worker-based rendering. */
  offscreenCanvas: boolean
}

/**
 * Returns a snapshot of the current browser's renderer capabilities.
 * Safe to call in any environment; returns `false` for every capability when
 * the relevant browser APIs are absent (e.g. Node / jsdom test environments).
 */
export function detectRendererCapabilities(): RendererCapabilities {
  return {
    webgpu: isWebGPUSupported(),
    offscreenCanvas: isOffscreenCanvasSupported(),
  }
}

/**
 * Returns `true` when `navigator.gpu` is present.
 * This is a synchronous, allocation-free check that does **not** request a
 * GPU adapter – it only tests for API availability.
 */
export function isWebGPUSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'gpu' in navigator &&
    (navigator as unknown as Record<string, unknown>).gpu !== null
  )
}

/**
 * Returns `true` when `OffscreenCanvas` is available.
 * OffscreenCanvas enables transferring a canvas to a Web Worker so that the
 * Three.js render loop runs off the main thread.
 */
export function isOffscreenCanvasSupported(): boolean {
  return typeof OffscreenCanvas !== 'undefined'
}

/**
 * Options for `createSceneRenderer`.
 */
export interface CreateRendererOptions {
  /** Enable hardware anti-aliasing. Defaults to `true`. */
  antialias?: boolean
  /**
   * Force the WebGL 2 fallback backend even when WebGPU is available.
   * Useful for debugging or when the application requires specific WebGL
   * behaviour.
   */
  forceWebGL?: boolean
}

/**
 * Result of `createSceneRenderer`.
 */
export interface SceneRenderer {
  /**
   * The initialised renderer — either `THREE.WebGLRenderer` (WebGL path) or
   * `three/webgpu`'s `WebGPURenderer` (WebGPU path). Ready to use immediately;
   * no further `init()` call is required by callers.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: any
  /**
   * The backend that is active: `'webgpu'` when the browser supports the
   * WebGPU API, `'webgl'` otherwise.
   */
  backend: RendererBackend
}

/**
 * Creates the best available Three.js renderer for the current environment
 * and fully initialises it before returning.
 *
 * When WebGPU is supported the returned renderer is a `WebGPURenderer` from
 * the `three/webgpu` chunk (dynamically imported). For all other browsers a
 * plain `THREE.WebGLRenderer` is returned from the base `three` bundle, so
 * the 153 kB `three/webgpu` chunk is **never loaded** for WebGL-only browsers.
 *
 * The returned renderer is ready to use immediately — no further `init()` call
 * is required by callers.
 *
 * @example
 * ```ts
 * const { renderer, backend } = await createSceneRenderer({ antialias: true })
 * renderer.setSize(width, height)
 * renderer.setPixelRatio(window.devicePixelRatio)
 * ```
 */
export async function createSceneRenderer(
  options: CreateRendererOptions = {},
): Promise<SceneRenderer> {
  const { antialias = true, forceWebGL = false } = options

  const gpuAvailable = !forceWebGL && isWebGPUSupported()

  if (!gpuAvailable) {
    // WebGL path: dynamically import WebGLRenderer from the base three bundle.
    // The three/webgpu chunk is not loaded at all.
    const { WebGLRenderer } = await import('three')
    const renderer = new WebGLRenderer({ antialias })
    return { renderer, backend: 'webgl' }
  }

  // WebGPU path: dynamically import three/webgpu so the chunk is only
  // loaded in browsers that actually support WebGPU.
  const { WebGPURenderer } = await import('three/webgpu')
  const renderer = new WebGPURenderer({ antialias })
  await renderer.init()
  return { renderer, backend: 'webgpu' }
}
