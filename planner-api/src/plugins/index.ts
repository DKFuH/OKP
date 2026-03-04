import { registerPlugin } from './pluginRegistry.js'
import { raumakustikPlugin } from './raumakustik.js'
import { fengshuiPlugin } from './fengshui.js'
import { tischlerPlugin } from './tischler.js'
import { assetLibraryPlugin } from './assetLibrary.js'
import { presentationPlugin } from './presentation.js'
import { daylightPlugin } from './daylight.js'

/**
 * Bootstraps alle Branche-Plugins.
 * Wird einmalig beim Anwendungsstart aufgerufen, bevor die Plugins in
 * Fastify eingehaengt werden.
 */
export function bootstrapPlugins(): void {
  registerPlugin(raumakustikPlugin)
  registerPlugin(fengshuiPlugin)
  registerPlugin(assetLibraryPlugin)
  registerPlugin(presentationPlugin)
  registerPlugin(daylightPlugin)

  const tischlerEnabled = (process.env.ENABLE_TISCHLER_PLUGIN ?? 'true').toLowerCase() !== 'false'
  if (tischlerEnabled) {
    registerPlugin(tischlerPlugin)
  }
}
