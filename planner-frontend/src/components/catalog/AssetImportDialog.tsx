import { useMemo, useState } from 'react'
import { assetLibraryApi } from '../../api/assetLibrary.js'
import {
  ASSET_CATEGORY_LABELS,
  type AssetCategory,
  type AssetLibraryItem,
} from '../../plugins/assetLibrary/index.js'
import styles from './AssetImportDialog.module.css'

interface Props {
  isOpen: boolean
  onClose: () => void
  onImported: (item: AssetLibraryItem) => void
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result
      if (typeof result !== 'string') {
        reject(new Error('Datei konnte nicht gelesen werden'))
        return
      }
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.onerror = () => reject(new Error('Datei konnte nicht gelesen werden'))
    reader.readAsDataURL(file)
  })
}

export function AssetImportDialog({ isOpen, onClose, onImported }: Props) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState<AssetCategory>('custom')
  const [tagsInput, setTagsInput] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const acceptedExtensions = useMemo(() => '.obj,.dae', [])

  if (!isOpen) return null

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file) {
      setError('Bitte eine OBJ- oder DAE-Datei auswählen')
      return
    }

    const lower = file.name.toLowerCase()
    if (!lower.endsWith('.obj') && !lower.endsWith('.dae')) {
      setError('Nur OBJ- und DAE-Dateien sind erlaubt')
      return
    }

    setBusy(true)
    setError(null)

    try {
      const fileBase64 = await fileToBase64(file)
      const tags = tagsInput
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)

      const imported = await assetLibraryApi.importAsset({
        name: name.trim() || undefined,
        category,
        tags,
        file_name: file.name,
        file_base64: fileBase64,
      })

      onImported(imported)
      setName('')
      setCategory('custom')
      setTagsInput('')
      setFile(null)
      onClose()
    } catch (importError) {
      setError(importError instanceof Error ? importError.message : 'Import fehlgeschlagen')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={styles.overlay} role="dialog" aria-modal="true" aria-label="Asset importieren">
      <form className={styles.dialog} onSubmit={handleSubmit}>
        <header className={styles.header}>
          <h3 className={styles.title}>Asset importieren</h3>
        </header>

        <label className={styles.field}>
          Datei
          <input
            type="file"
            accept={acceptedExtensions}
            onChange={(event) => setFile(event.target.files?.[0] ?? null)}
          />
        </label>

        <label className={styles.field}>
          Name (optional)
          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Name aus Datei übernehmen"
          />
        </label>

        <label className={styles.field}>
          Kategorie
          <select value={category} onChange={(event) => setCategory(event.target.value as AssetCategory)}>
            {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        </label>

        <label className={styles.field}>
          Tags (Komma-getrennt)
          <input
            type="text"
            value={tagsInput}
            onChange={(event) => setTagsInput(event.target.value)}
            placeholder="z. B. unterschrank, mdf"
          />
        </label>

        {error && <p className={styles.error}>{error}</p>}

        <footer className={styles.actions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose} disabled={busy}>Abbrechen</button>
          <button type="submit" className={styles.submitBtn} disabled={busy}>{busy ? 'Importiere…' : 'Importieren'}</button>
        </footer>
      </form>
    </div>
  )
}
