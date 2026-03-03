import type { OkpPlugin } from './pluginRegistry.js'
import { acousticsRoutes } from '../routes/acoustics.js'

/** Raumakustik-Plugin – CNIVG-Import, akustische Raster und Schichtdaten. */
export const raumakustikPlugin: OkpPlugin = {
  id: 'raumakustik',
  name: 'Raumakustik',
  register: acousticsRoutes,
}
