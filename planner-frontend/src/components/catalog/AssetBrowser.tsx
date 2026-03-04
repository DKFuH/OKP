import {
  ASSET_CATEGORY_LABELS,
  type AssetLibraryItem,
} from '../../plugins/assetLibrary/index.js'
import styles from './AssetBrowser.module.css'

interface Props {
  assets: AssetLibraryItem[]
  selectedAssetId: string | null
  loading: boolean
  error: string | null
  onOpenImport: () => void
  onSelectAsset: (asset: AssetLibraryItem) => void
  onDeleteAsset: (asset: AssetLibraryItem) => void
}

export function AssetBrowser({
  assets,
  selectedAssetId,
  loading,
  error,
  onOpenImport,
  onSelectAsset,
  onDeleteAsset,
}: Props) {
  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <button type="button" className={styles.importBtn} onClick={onOpenImport}>
          + Import
        </button>
      </div>

      {loading ? (
        <p className={styles.state}>Lade Assets…</p>
      ) : error ? (
        <p className={styles.error}>{error}</p>
      ) : assets.length === 0 ? (
        <p className={styles.state}>Keine Assets gefunden</p>
      ) : (
        <ul className={styles.grid}>
          {assets.map((asset) => {
            const bbox = asset.bbox_json
            const active = selectedAssetId === asset.id
            return (
              <li key={asset.id} className={`${styles.card} ${active ? styles.cardActive : ''}`}>
                <button type="button" className={styles.cardMain} onClick={() => onSelectAsset(asset)}>
                  <span className={styles.preview}>{asset.source_format.toUpperCase()}</span>
                  <span className={styles.name}>{asset.name}</span>
                  <span className={styles.meta}>
                    {bbox.width_mm}×{bbox.depth_mm}×{bbox.height_mm} mm
                  </span>
                  <span className={styles.badges}>
                    <span className={styles.badge}>{ASSET_CATEGORY_LABELS[asset.category]}</span>
                  </span>
                </button>
                <button type="button" className={styles.deleteBtn} onClick={() => onDeleteAsset(asset)} title="Asset löschen">
                  Löschen
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
