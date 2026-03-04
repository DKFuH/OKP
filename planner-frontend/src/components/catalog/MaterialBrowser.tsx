import { useEffect, useMemo, useState } from 'react'
import {
  materialLibraryApi,
  type MaterialCreatePayload,
  type MaterialPatchPayload,
} from '../../api/materialLibrary.js'
import {
  MATERIAL_CATEGORY_LABELS,
  type MaterialCategory,
  type MaterialLibraryItem,
} from '../../plugins/materials/index.js'
import styles from './MaterialBrowser.module.css'

type CategoryFilter = '' | MaterialCategory

interface MaterialFormState {
  name: string
  category: MaterialCategory
  texture_url: string
  preview_url: string
  scale_x_mm: string
  scale_y_mm: string
  rotation_deg: string
  roughness: string
  metallic: string
}

const CATEGORY_OPTIONS: Array<{ value: CategoryFilter; label: string }> = [
  { value: '', label: 'Alle Kategorien' },
  { value: 'floor', label: MATERIAL_CATEGORY_LABELS.floor },
  { value: 'wall', label: MATERIAL_CATEGORY_LABELS.wall },
  { value: 'front', label: MATERIAL_CATEGORY_LABELS.front },
  { value: 'worktop', label: MATERIAL_CATEGORY_LABELS.worktop },
  { value: 'custom', label: MATERIAL_CATEGORY_LABELS.custom },
]

function toFormState(item?: MaterialLibraryItem): MaterialFormState {
  return {
    name: item?.name ?? '',
    category: item?.category ?? 'custom',
    texture_url: item?.texture_url ?? '',
    preview_url: item?.preview_url ?? '',
    scale_x_mm: item?.scale_x_mm != null ? String(item.scale_x_mm) : '',
    scale_y_mm: item?.scale_y_mm != null ? String(item.scale_y_mm) : '',
    rotation_deg: item?.rotation_deg != null ? String(item.rotation_deg) : '0',
    roughness: item?.roughness != null ? String(item.roughness) : '',
    metallic: item?.metallic != null ? String(item.metallic) : '',
  }
}

function parseOptionalPositive(value: string): number | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed) || parsed <= 0) return undefined
  return parsed
}

function parseOptionalRange(value: string, min: number, max: number): number | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return undefined
  if (parsed < min || parsed > max) return undefined
  return parsed
}

function parseOptionalRotation(value: string): number | undefined {
  const normalized = value.trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  if (!Number.isFinite(parsed)) return undefined
  const normalizedDegrees = ((parsed % 360) + 360) % 360
  return normalizedDegrees
}

export function MaterialBrowser() {
  const [query, setQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('')

  const [items, setItems] = useState<MaterialLibraryItem[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshToken, setRefreshToken] = useState(0)

  const [createForm, setCreateForm] = useState<MaterialFormState>(toFormState())
  const [creating, setCreating] = useState(false)

  const [editForms, setEditForms] = useState<Record<string, MaterialFormState>>({})
  const [savingId, setSavingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const normalizedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    let active = true
    const timeout = window.setTimeout(() => {
      setLoading(true)
      setError(null)

      void materialLibraryApi
        .list({
          q: normalizedQuery || undefined,
          category: categoryFilter || undefined,
        })
        .then((result) => {
          if (!active) return
          setItems(result)
          setEditForms((previous) => {
            const next: Record<string, MaterialFormState> = {}
            for (const item of result) {
              next[item.id] = previous[item.id] ?? toFormState(item)
            }
            return next
          })
        })
        .catch((requestError: unknown) => {
          if (!active) return
          setItems([])
          setError(requestError instanceof Error ? requestError.message : 'Materialliste konnte nicht geladen werden.')
        })
        .finally(() => {
          if (!active) return
          setLoading(false)
        })
    }, 250)

    return () => {
      active = false
      window.clearTimeout(timeout)
    }
  }, [normalizedQuery, categoryFilter, refreshToken])

  function updateCreateForm<K extends keyof MaterialFormState>(key: K, value: MaterialFormState[K]) {
    setCreateForm((previous) => ({ ...previous, [key]: value }))
  }

  function updateEditForm<K extends keyof MaterialFormState>(id: string, key: K, value: MaterialFormState[K]) {
    setEditForms((previous) => ({
      ...previous,
      [id]: {
        ...(previous[id] ?? toFormState(items.find((item) => item.id === id))),
        [key]: value,
      },
    }))
  }

  async function handleCreate(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const name = createForm.name.trim()
    if (!name) {
      setError('Bitte einen Materialnamen eingeben.')
      return
    }

    const payload: MaterialCreatePayload = {
      name,
      category: createForm.category,
    }

    const textureUrl = createForm.texture_url.trim()
    const previewUrl = createForm.preview_url.trim()
    if (textureUrl) payload.texture_url = textureUrl
    if (previewUrl) payload.preview_url = previewUrl

    const scaleX = parseOptionalPositive(createForm.scale_x_mm)
    const scaleY = parseOptionalPositive(createForm.scale_y_mm)
    const rotation = parseOptionalRotation(createForm.rotation_deg)
    const roughness = parseOptionalRange(createForm.roughness, 0, 1)
    const metallic = parseOptionalRange(createForm.metallic, 0, 1)

    if (scaleX !== undefined) payload.scale_x_mm = scaleX
    if (scaleY !== undefined) payload.scale_y_mm = scaleY
    if (rotation !== undefined) payload.rotation_deg = rotation
    if (roughness !== undefined) payload.roughness = roughness
    if (metallic !== undefined) payload.metallic = metallic

    setCreating(true)
    setError(null)

    try {
      await materialLibraryApi.create(payload)
      setCreateForm(toFormState())
      setRefreshToken((value) => value + 1)
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Material konnte nicht erstellt werden.')
    } finally {
      setCreating(false)
    }
  }

  async function handleSave(id: string) {
    const form = editForms[id]
    if (!form) return

    const name = form.name.trim()
    if (!name) {
      setError('Materialname darf nicht leer sein.')
      return
    }

    const payload: MaterialPatchPayload = {
      name,
      category: form.category,
      texture_url: form.texture_url.trim() || null,
      preview_url: form.preview_url.trim() || null,
    }

    const scaleX = parseOptionalPositive(form.scale_x_mm)
    const scaleY = parseOptionalPositive(form.scale_y_mm)
    const rotation = parseOptionalRotation(form.rotation_deg)
    const roughness = parseOptionalRange(form.roughness, 0, 1)
    const metallic = parseOptionalRange(form.metallic, 0, 1)

    payload.scale_x_mm = scaleX ?? null
    payload.scale_y_mm = scaleY ?? null
    if (rotation !== undefined) payload.rotation_deg = rotation
    payload.roughness = roughness ?? null
    payload.metallic = metallic ?? null

    setSavingId(id)
    setError(null)

    try {
      const updated = await materialLibraryApi.patch(id, payload)
      setItems((previous) => previous.map((item) => (item.id === id ? updated : item)))
      setEditForms((previous) => ({ ...previous, [id]: toFormState(updated) }))
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Material konnte nicht gespeichert werden.')
    } finally {
      setSavingId(null)
    }
  }

  async function handleDelete(id: string) {
    setDeletingId(id)
    setError(null)

    try {
      await materialLibraryApi.remove(id)
      setItems((previous) => previous.filter((item) => item.id !== id))
      setEditForms((previous) => {
        const next = { ...previous }
        delete next[id]
        return next
      })
    } catch (requestError: unknown) {
      setError(requestError instanceof Error ? requestError.message : 'Material konnte nicht gelöscht werden.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <section className={styles.panel}>
      <header className={styles.header}>
        <h3 className={styles.title}>Material-Browser</h3>
      </header>

      <div className={styles.filters}>
        <input
          type="search"
          className={styles.input}
          placeholder="Material suchen"
          aria-label="Material suchen"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <select
          className={styles.select}
          aria-label="Kategorie filtern"
          value={categoryFilter}
          onChange={(event) => setCategoryFilter(event.target.value as CategoryFilter)}
        >
          {CATEGORY_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>

      <form className={styles.createForm} onSubmit={(event) => { void handleCreate(event) }}>
        <h4 className={styles.subTitle}>Neues Material</h4>
        <div className={styles.grid}>
          <label className={styles.field}>
            <span>Name</span>
            <input
              className={styles.input}
              value={createForm.name}
              onChange={(event) => updateCreateForm('name', event.target.value)}
              placeholder="z. B. Eiche hell"
            />
          </label>
          <label className={styles.field}>
            <span>Kategorie</span>
            <select
              className={styles.select}
              value={createForm.category}
              onChange={(event) => updateCreateForm('category', event.target.value as MaterialCategory)}
            >
              {CATEGORY_OPTIONS.filter((option) => option.value).map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <label className={styles.field}>
            <span>Textur-URL</span>
            <input
              className={styles.input}
              value={createForm.texture_url}
              onChange={(event) => updateCreateForm('texture_url', event.target.value)}
              placeholder="https://…"
            />
          </label>
          <label className={styles.field}>
            <span>Preview-URL</span>
            <input
              className={styles.input}
              value={createForm.preview_url}
              onChange={(event) => updateCreateForm('preview_url', event.target.value)}
              placeholder="https://…"
            />
          </label>
        </div>
        <div className={styles.actions}>
          <button type="submit" className={styles.primaryBtn} disabled={creating}>
            {creating ? 'Erstelle…' : 'Material erstellen'}
          </button>
        </div>
      </form>

      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.listWrap}>
        {loading ? (
          <p className={styles.muted}>Lade Materialliste…</p>
        ) : items.length === 0 ? (
          <p className={styles.muted}>Keine Materialien gefunden.</p>
        ) : (
          <ul className={styles.list}>
            {items.map((item) => {
              const form = editForms[item.id] ?? toFormState(item)
              const isSaving = savingId === item.id
              const isDeleting = deletingId === item.id

              return (
                <li key={item.id} className={styles.item}>
                  <div className={styles.grid}>
                    <label className={styles.field}>
                      <span>Name</span>
                      <input
                        className={styles.input}
                        value={form.name}
                        onChange={(event) => updateEditForm(item.id, 'name', event.target.value)}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Kategorie</span>
                      <select
                        className={styles.select}
                        value={form.category}
                        onChange={(event) => updateEditForm(item.id, 'category', event.target.value as MaterialCategory)}
                      >
                        {CATEGORY_OPTIONS.filter((option) => option.value).map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className={styles.field}>
                      <span>Textur-URL</span>
                      <input
                        className={styles.input}
                        value={form.texture_url}
                        onChange={(event) => updateEditForm(item.id, 'texture_url', event.target.value)}
                      />
                    </label>
                    <label className={styles.field}>
                      <span>Preview-URL</span>
                      <input
                        className={styles.input}
                        value={form.preview_url}
                        onChange={(event) => updateEditForm(item.id, 'preview_url', event.target.value)}
                      />
                    </label>
                  </div>
                  <div className={styles.actions}>
                    <button
                      type="button"
                      className={styles.primaryBtn}
                      disabled={isSaving || isDeleting}
                      onClick={() => { void handleSave(item.id) }}
                    >
                      {isSaving ? 'Speichere…' : 'Speichern'}
                    </button>
                    <button
                      type="button"
                      className={styles.dangerBtn}
                      disabled={isSaving || isDeleting}
                      onClick={() => { void handleDelete(item.id) }}
                    >
                      {isDeleting ? 'Lösche…' : 'Löschen'}
                    </button>
                  </div>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}