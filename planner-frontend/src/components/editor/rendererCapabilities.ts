/**
 * Renderer capabilities detection and factory utilities.
 *
 * Provides detection for WebGPU and OffscreenCanvas support and exports a
 * renderer factory that selects the best available backend:
 *   – WebGPU  (Chromium stable, Firefox Nightly, …)
 *   – WebGL 2 (automatic fallback inside WebGPURenderer)
 *
 * Usage in components:
 *   const { renderer, backend } = await createSceneRenderer({ antialias: true })
 *   await renderer.init()
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
   * The Three.js `WebGPURenderer` instance.
   * Call `await renderer.init()` before the first `renderer.render()`.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  renderer: any
  /**
   * The backend that will be used after `renderer.init()` resolves:
   * `'webgpu'` when the browser supports the WebGPU API, `'webgl'` otherwise.
   */
  backend: RendererBackend
}

/**
 * Creates the best available Three.js renderer for the current environment.
 *
 * When WebGPU is supported the returned renderer uses a `WebGPUBackend`
 * internally. If WebGPU is unavailable (or `forceWebGL` is set) it falls back
 * to a `WebGLBackend` automatically – no code change is required by callers.
 *
 * The `three/webgpu` module is imported dynamically so that the WebGPU bundle
 * is only loaded when this function is actually called.
 *
 * @example
 * ```ts
 * const { renderer, backend } = await createSceneRenderer({ antialias: true })
 * await renderer.init()
 * renderer.setSize(width, height)
 * renderer.setPixelRatio(window.devicePixelRatio)
 * ```
 */
export async function createSceneRenderer(
  options: CreateRendererOptions = {},
): Promise<SceneRenderer> {
  const { antialias = true, forceWebGL = false } = options

  const { WebGPURenderer } = await import('three/webgpu')

  const gpuAvailable = !forceWebGL && isWebGPUSupported()
  const renderer = new WebGPURenderer({
    antialias,
    forceWebGL: !gpuAvailable,
  })

  return {
    renderer,
    backend: gpuAvailable ? 'webgpu' : 'webgl',
  }
}
