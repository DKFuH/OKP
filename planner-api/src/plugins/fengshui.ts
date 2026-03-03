import type { OkpPlugin } from './pluginRegistry.js'
import { fengshuiRoutes } from '../routes/fengshui.js'

/** FengShui-Plugin – Ost/West-Analyse mit Bagua-Raster und Küchendreieck. */
export const fengshuiPlugin: OkpPlugin = {
  id: 'fengshui',
  name: 'FengShui',
  register: fengshuiRoutes,
}
