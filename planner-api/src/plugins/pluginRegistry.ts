import type { FastifyInstance } from 'fastify'

/**
 * OkpPlugin – Schnittstelle für erweiterbare Branche-Plugins.
 * Jedes Plugin registriert seine Fastify-Routen über die `register`-Methode.
 */
export interface OkpPlugin {
  /** Eindeutiger technischer Bezeichner des Plugins (z. B. 'raumakustik') */
  id: string
  /** Anzeigename des Plugins */
  name: string
  /** Fastify-Routen-Registrierungsfunktion */
  register: (app: FastifyInstance) => Promise<void>
}

// Node.js läuft single-threaded, daher sind keine Mutex-Guards nötig.
// Die Liste wird einmalig beim Start über bootstrapPlugins() befüllt und
// danach nur noch lesend genutzt.
const plugins: OkpPlugin[] = []

/** Registriert ein Plugin im globalen Plugin-Register. */
export function registerPlugin(plugin: OkpPlugin): void {
  if (plugins.some((p) => p.id === plugin.id)) {
    throw new Error(`Plugin '${plugin.id}' ist bereits registriert.`)
  }
  plugins.push(plugin)
}

/** Gibt alle registrierten Plugins zurück. */
export function getPlugins(): readonly OkpPlugin[] {
  return [...plugins]
}

/** Entfernt alle Plugins (nur für Tests). */
export function clearPlugins(): void {
  plugins.length = 0
}
