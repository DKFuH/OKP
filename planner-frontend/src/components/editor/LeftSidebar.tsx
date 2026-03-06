import { useEffect, useRef, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import type { Room } from '../../api/projects.js'
import {
  catalogApi,
  type CatalogItem,
  type CatalogItemType,
  CATALOG_TYPE_LABELS,
  type Manufacturer,
  type CatalogArticle,
  type UnifiedCatalogItem
} from '../../api/catalog.js'
import { getTenantPlugins } from '../../api/tenantSettings.js'
import {
  assetLibraryApi,
  type LibraryFolder as AssetLibraryFolder,
  type LibrarySavedFilter as AssetSavedFilter,
  type LibrarySort as AssetLibrarySort,
} from '../../api/assetLibrary.js'
import {
  ASSET_CATEGORY_LABELS,
  mapAssetToCatalogItem,
  type AssetCategory,
  type AssetLibraryItem,
} from '../../plugins/assetLibrary/index.js'
import type { PluginSlotEntry } from '../../plugins/pluginUiContract.js'
import { AssetBrowser } from '../catalog/AssetBrowser.js'
import { AssetImportDialog } from '../catalog/AssetImportDialog.js'
import { McpQuickActions } from '../mcp/McpQuickActions.js'
import { makeStyles, tokens } from '@fluentui/react-components'

interface Props {
  levelsPanel?: ReactNode
  stairsPanel?: ReactNode
  sectionsPanel?: ReactNode
  projectId: string | null
  rooms: Room[]
  selectedRoomId: string | null
  onSelectRoom: (id: string) => void
  onAddRoom: (name: string) => void
  selectedCatalogItem: UnifiedCatalogItem | null
  onSelectCatalogItem: (item: UnifiedCatalogItem | null) => void
  workflowStep: 'walls' | 'openings' | 'furniture'
  pluginSlotEntries?: PluginSlotEntry[]
  onNavigateToPath?: (path: string) => void
}

const TYPE_OPTIONS: Array<{ value: '' | CatalogItemType; label: string }> = [
  { value: '', label: 'Alle' },
  { value: 'base_cabinet', label: 'Unterschrank' },
  { value: 'wall_cabinet', label: 'Hängeschrank' },
  { value: 'tall_cabinet', label: 'Hochschrank' },
  { value: 'worktop', label: 'Arbeitsplatte' },
  { value: 'appliance', label: 'Gerät' },
  { value: 'accessory', label: 'Zubehör' },
]

const ASSET_SORT_OPTIONS: Array<{ value: AssetLibrarySort; label: string }> = [
  { value: 'updated', label: 'Zuletzt aktualisiert' },
  { value: 'name', label: 'Name A-Z' },
  { value: 'favorites', label: 'Favoriten zuerst' },
]

const ASSET_CATEGORY_VALUES: AssetCategory[] = ['base', 'wall', 'appliance', 'decor', 'custom']

const ASSET_SORT_VALUES: AssetLibrarySort[] = ['updated', 'name', 'favorites']


const useStyles = makeStyles({
sidebar: {
    width: '220px',
    flexShrink: 0,
    backgroundColor: tokens.colorNeutralBackground1,
    borderRight: '1px solid ' + tokens.colorNeutralStroke1,
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  section: {
    padding: tokens.spacingVerticalS,
    borderBottom: '1px solid ' + tokens.colorNeutralStroke2,
  },
  sectionTitle: {
    margin: '0',
    fontSize: '0.75rem',
    fontWeight: '600',
    textTransform: 'uppercase',
    color: tokens.colorNeutralForeground3,
    letterSpacing: '0.05em',
  },
  list: {
    listStyle: 'none',
    margin: '0 0 4px',
    padding: '0',
  },
item: {
    padding: '4px 8px',
    borderRadius: tokens.borderRadiusSmall,
    cursor: 'pointer',
    fontSize: '0.9rem',
    color: tokens.colorNeutralForeground1,
  },
  active: {
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
    fontWeight: '600',
  },
  pluginSlotList: {
    listStyle: 'none',
    margin: '0',
    padding: '0',
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
  },
  pluginSlotButton: {
    width: '100%',
    textAlign: 'left',
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    fontSize: '0.76rem',
    padding: '4px 6px',
    cursor: 'pointer',
  },
  mcpPanel: {
    marginTop: tokens.spacingVerticalS,
    display: 'grid',
    gap: tokens.spacingVerticalXS,
  },
  empty: {
    fontSize: '0.8rem',
    color: tokens.colorNeutralForeground3,
    margin: '0 0 4px',
  },
  error: {
    fontSize: '0.8rem',
    color: tokens.colorPaletteRedForeground1,
    margin: '0 0 4px',
  },
  addBtn: {
    width: '100%',
    background: 'none',
    border: '1px dashed ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    padding: tokens.spacingVerticalXS,
    fontSize: '0.8rem',
    color: tokens.colorNeutralForeground3,
    cursor: 'pointer',
  },
  addRoomForm: {
    display: 'flex',
    flexDirection: 'column',
    gap: tokens.spacingVerticalXS,
    marginTop: tokens.spacingVerticalXXS,
  },
  addRoomInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '2px 8px',
    border: '1px solid ' + tokens.colorBrandStroke1,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: '0.85rem',
    backgroundColor: tokens.colorNeutralBackground1,
    outline: 'none',
  },
  addRoomActions: {
    display: 'flex',
    gap: tokens.spacingHorizontalXS,
  },
  cancelBtn: {
    background: 'none',
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    padding: '2px 8px',
    fontSize: '0.8rem',
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
  },
catalogSection: {
    padding: tokens.spacingVerticalS,
    display: 'flex',
    flexDirection: 'column',
    flex: '1',
    minHeight: '0',
    borderTop: '1px solid ' + tokens.colorNeutralStroke2,
  },
  catalogHeader: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: tokens.spacingVerticalXS,
  },
  modeToggle: {
    display: 'flex',
    backgroundColor: tokens.colorNeutralBackground3,
    borderRadius: tokens.borderRadiusSmall,
    padding: '2px',
  },
  modeBtn: {
    background: 'none',
    border: 'none',
    fontSize: '0.65rem',
    padding: '2px 6px',
    borderRadius: tokens.borderRadiusSmall,
    cursor: 'pointer',
    color: tokens.colorNeutralForeground3,
  },
  modeBtnActive: {
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground1,
    boxShadow: tokens.shadow2,
  },
  mfrSelect: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '2px 4px',
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: '0.8rem',
    marginBottom: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  searchInput: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '2px 8px',
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: '0.8rem',
    marginBottom: tokens.spacingVerticalXS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  typeSelect: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '2px 4px',
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: '0.8rem',
    marginBottom: tokens.spacingVerticalS,
    backgroundColor: tokens.colorNeutralBackground1,
  },
  inlineControls: {
    display: 'flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    marginBottom: tokens.spacingVerticalXS,
  },
  checkboxLabel: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: tokens.spacingHorizontalXS,
    fontSize: '0.72rem',
    color: tokens.colorNeutralForeground3,
    whiteSpace: 'nowrap',
  },
  typeSelectInline: {
    width: '100%',
    boxSizing: 'border-box',
    padding: '2px 4px',
    border: '1px solid ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    fontSize: '0.76rem',
    backgroundColor: tokens.colorNeutralBackground1,
  },
  smallBtn: {
    border: '1px dashed ' + tokens.colorNeutralStroke1,
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground1,
    color: tokens.colorNeutralForeground3,
    fontSize: '0.7rem',
    padding: '2px 4px',
    cursor: 'pointer',
    whiteSpace: 'nowrap',
  },
  catalogList: {
    listStyle: 'none',
    margin: '0',
    padding: '0',
    overflowY: 'auto',
    flex: '1',
  },
  catalogItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: tokens.spacingHorizontalXS,
    padding: '2px 4px',
    borderRadius: tokens.borderRadiusSmall,
    cursor: 'default',
    fontSize: '0.8rem',
  },
  catalogItemActive: {
    backgroundColor: tokens.colorBrandBackground2,
    cursor: 'pointer',
  },
  catalogName: {
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    color: tokens.colorNeutralForeground1,
  },
  catalogBadge: {
    flexShrink: 0,
    fontSize: '0.65rem',
    padding: '1px 4px',
    borderRadius: tokens.borderRadiusCircular,
    backgroundColor: tokens.colorBrandBackground2,
    color: tokens.colorBrandForeground1,
  },
  stepHint: {
    fontSize: '0.8rem',
    color: tokens.colorNeutralForeground3,
    margin: '4px 0',
    padding: '4px 8px',
    borderRadius: tokens.borderRadiusSmall,
    backgroundColor: tokens.colorNeutralBackground3,
    lineHeight: '1.4',
  },
})

export function LeftSidebar({
  levelsPanel,
  stairsPanel,
  sectionsPanel,
  projectId,
  rooms,
  selectedRoomId,
  onSelectRoom,
  onAddRoom,
  selectedCatalogItem,
  onSelectCatalogItem,
  workflowStep,
  pluginSlotEntries = [],
  onNavigateToPath,
}: Props) {
  const styles = useStyles()
  const { t } = useTranslation()
  const [addingRoom, setAddingRoom] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [catalogMode, setCatalogMode] = useState<'standard' | 'manufacturer' | 'assets'>('standard')
  const [assetPluginEnabled, setAssetPluginEnabled] = useState(false)
  const [assetImportOpen, setAssetImportOpen] = useState(false)
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([])
  const [selectedManufacturerId, setSelectedManufacturerId] = useState<string>('')

  const [query, setQuery] = useState('')
  const [typeFilter, setTypeFilter] = useState<'' | CatalogItemType>('')
  const [items, setItems] = useState<CatalogItem[]>([])
  const [articles, setArticles] = useState<CatalogArticle[]>([])
  const [assetItems, setAssetItems] = useState<AssetLibraryItem[]>([])
  const [assetCategoryFilter, setAssetCategoryFilter] = useState<'' | AssetCategory>('')
  const [assetFavoriteOnly, setAssetFavoriteOnly] = useState(false)
  const [assetFolderFilter, setAssetFolderFilter] = useState('')
  const [assetCollectionFilter, setAssetCollectionFilter] = useState('')
  const [assetSort, setAssetSort] = useState<AssetLibrarySort>('updated')
  const [assetFolders, setAssetFolders] = useState<AssetLibraryFolder[]>([])
  const [assetSavedFilters, setAssetSavedFilters] = useState<AssetSavedFilter[]>([])
  const [selectedAssetSavedFilterId, setSelectedAssetSavedFilterId] = useState('')
  const [assetUpdatingId, setAssetUpdatingId] = useState<string | null>(null)

  const [catalogLoading, setCatalogLoading] = useState(false)
  const [catalogError, setCatalogError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const requestTokenRef = useRef(0)

  // Load manufacturers once
  useEffect(() => {
    getTenantPlugins()
      .then((plugins) => {
        setAssetPluginEnabled(plugins.enabled.includes('asset-library'))
      })
      .catch(() => {
        setAssetPluginEnabled(false)
      })

    catalogApi.listManufacturers()
      .then(setManufacturers)
      .catch(() => setCatalogError('Hersteller konnten nicht geladen werden'))
  }, [])

  useEffect(() => {
    if (!assetPluginEnabled && catalogMode === 'assets') {
      setCatalogMode('standard')
    }
  }, [assetPluginEnabled, catalogMode])

  useEffect(() => {
    if (!assetPluginEnabled) return

    void Promise.all([
      assetLibraryApi.listFolders().then(setAssetFolders),
      assetLibraryApi.listSavedFilters().then(setAssetSavedFilters),
    ]).catch(() => {
      setCatalogError('Asset-Metadaten konnten nicht geladen werden')
    })
  }, [assetPluginEnabled])

  // Load legacy items
  useEffect(() => {
    if (catalogMode !== 'standard') return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const requestToken = ++requestTokenRef.current
      setCatalogLoading(true)
      setCatalogError(null)
      catalogApi
        .list({
          q: query.trim() || undefined,
          type: typeFilter || undefined,
          limit: 50,
        })
        .then((nextItems) => {
          if (requestToken !== requestTokenRef.current) return
          setItems(nextItems)
        })
        .catch((e: unknown) => {
          if (requestToken !== requestTokenRef.current) return
          setItems([])
          setCatalogError(e instanceof Error ? e.message : 'Katalog konnte nicht geladen werden')
        })
        .finally(() => {
          if (requestToken !== requestTokenRef.current) return
          setCatalogLoading(false)
        })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      requestTokenRef.current += 1
    }
  }, [query, typeFilter, catalogMode])

  // Load manufacturer articles
  useEffect(() => {
    if (catalogMode !== 'manufacturer' || !selectedManufacturerId) {
      setArticles([])
      return
    }

    setCatalogLoading(true)
    setCatalogError(null)
    catalogApi.getManufacturerArticles(selectedManufacturerId)
      .then(res => {
        setArticles(res)
      })
      .catch(e => {
        setArticles([])
        setCatalogError(e instanceof Error ? e.message : 'Artikel konnten nicht geladen werden')
      })
      .finally(() => setCatalogLoading(false))
  }, [catalogMode, selectedManufacturerId])

  // Load asset library items
  useEffect(() => {
    if (catalogMode !== 'assets' || !assetPluginEnabled) {
      return
    }

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      const requestToken = ++requestTokenRef.current
      setCatalogLoading(true)
      setCatalogError(null)
      assetLibraryApi
        .list({
          q: query.trim() || undefined,
          category: assetCategoryFilter || undefined,
          favorite_only: assetFavoriteOnly || undefined,
          folder_id: assetFolderFilter || undefined,
          collection: assetCollectionFilter.trim() || undefined,
          sort: assetSort,
        })
        .then((nextItems) => {
          if (requestToken !== requestTokenRef.current) return
          setAssetItems(nextItems)
        })
        .catch((e: unknown) => {
          if (requestToken !== requestTokenRef.current) return
          setAssetItems([])
          setCatalogError(e instanceof Error ? e.message : 'Asset-Library konnte nicht geladen werden')
        })
        .finally(() => {
          if (requestToken !== requestTokenRef.current) return
          setCatalogLoading(false)
        })
    }, 300)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
      requestTokenRef.current += 1
    }
  }, [catalogMode, query, assetCategoryFilter, assetFavoriteOnly, assetFolderFilter, assetCollectionFilter, assetSort, assetPluginEnabled])

  const filteredArticles = articles.filter(a => {
    if (query && !a.name.toLowerCase().includes(query.toLowerCase()) && !a.sku.toLowerCase().includes(query.toLowerCase())) return false
    if (typeFilter && a.article_type !== typeFilter) return false
    return true
  })

  const selectedAssetId = catalogMode === 'assets' ? selectedCatalogItem?.id ?? null : null

  async function handleDeleteAsset(asset: AssetLibraryItem) {
    try {
      await assetLibraryApi.remove(asset.id)
      setAssetItems((prev) => prev.filter((entry) => entry.id !== asset.id))
      if (selectedCatalogItem?.id === asset.id) {
        onSelectCatalogItem(null)
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Asset konnte nicht gelöscht werden')
    }
  }

  async function handlePatchAsset(asset: AssetLibraryItem, payload: Parameters<typeof assetLibraryApi.patch>[1]) {
    setAssetUpdatingId(asset.id)
    try {
      const updated = await assetLibraryApi.patch(asset.id, payload)
      setAssetItems((prev) => prev.map((entry) => (entry.id === asset.id ? updated : entry)))
      if (selectedCatalogItem?.id === asset.id) {
        onSelectCatalogItem(mapAssetToCatalogItem(updated))
      }
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Asset konnte nicht aktualisiert werden')
    } finally {
      setAssetUpdatingId(null)
    }
  }

  function applyAssetSavedFilter(filter: AssetSavedFilter) {
    const data = filter.saved_filter_json
    const nextQuery = typeof data.q === 'string' ? data.q : ''
    const nextCategory = typeof data.category === 'string' && ASSET_CATEGORY_VALUES.includes(data.category as AssetCategory)
      ? (data.category as AssetCategory)
      : ''
    const nextFavoriteOnly = Boolean(data.favorite_only)
    const nextFolder = typeof data.folder_id === 'string' ? data.folder_id : ''
    const nextCollection = typeof data.collection === 'string' ? data.collection : ''
    const nextSort = typeof data.sort === 'string' && ASSET_SORT_VALUES.includes(data.sort as AssetLibrarySort)
      ? (data.sort as AssetLibrarySort)
      : 'updated'

    setQuery(nextQuery)
    setAssetCategoryFilter(nextCategory)
    setAssetFavoriteOnly(nextFavoriteOnly)
    setAssetFolderFilter(nextFolder)
    setAssetCollectionFilter(nextCollection)
    setAssetSort(nextSort)
  }

  async function handleCreateAssetFolder() {
    const name = window.prompt('Ordnername')?.trim()
    if (!name) return
    try {
      await assetLibraryApi.createFolder({
        name,
        parent_id: assetFolderFilter || null,
      })
      const folders = await assetLibraryApi.listFolders()
      setAssetFolders(folders)
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Ordner konnte nicht erstellt werden')
    }
  }

  async function handleSaveAssetFilter() {
    const name = window.prompt('Name für den Filter')?.trim()
    if (!name) return
    const saved_filter_json: Record<string, unknown> = {
      favorite_only: assetFavoriteOnly,
      sort: assetSort,
    }
    if (query.trim()) saved_filter_json.q = query.trim()
    if (assetCategoryFilter) saved_filter_json.category = assetCategoryFilter
    if (assetFolderFilter) saved_filter_json.folder_id = assetFolderFilter
    if (assetCollectionFilter.trim()) saved_filter_json.collection = assetCollectionFilter.trim()

    try {
      const created = await assetLibraryApi.createSavedFilter({
        name,
        saved_filter_json,
      })
      setAssetSavedFilters((prev) => [created, ...prev])
      setSelectedAssetSavedFilterId(created.id)
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Filter konnte nicht gespeichert werden')
    }
  }

  async function handleDeleteAssetFilter() {
    if (!selectedAssetSavedFilterId) return
    try {
      await assetLibraryApi.removeSavedFilter(selectedAssetSavedFilterId)
      setAssetSavedFilters((prev) => prev.filter((entry) => entry.id !== selectedAssetSavedFilterId))
      setSelectedAssetSavedFilterId('')
    } catch (error) {
      setCatalogError(error instanceof Error ? error.message : 'Filter konnte nicht gelöscht werden')
    }
  }

  function handleImportedAsset(asset: AssetLibraryItem) {
    setAssetItems((prev) => [asset, ...prev])
    onSelectCatalogItem(mapAssetToCatalogItem(asset))
  }

  return (
    <aside className={styles.sidebar}>
      {levelsPanel}
      {stairsPanel}
      {sectionsPanel}

      {(pluginSlotEntries.length > 0 || onNavigateToPath) && (
        <div className={styles.section}>
          {pluginSlotEntries.length > 0 && (
            <>
              <h3 className={styles.sectionTitle}>Plugin-Slots</h3>
              <ul className={styles.pluginSlotList}>
                {pluginSlotEntries.map((entry) => (
                  <li key={entry.id}>
                    <button
                      type="button"
                      className={styles.pluginSlotButton}
                      data-testid={`sidebar-plugin-slot-${entry.pluginId ?? entry.id}`}
                      disabled={!entry.enabled}
                      title={entry.reasonIfDisabled ? t(entry.reasonIfDisabled) : undefined}
                      onClick={() => {
                        if (!entry.enabled || !onNavigateToPath) {
                          return
                        }

                        onNavigateToPath(entry.path)
                      }}
                    >
                      {entry.label}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}

          {onNavigateToPath && (
            <div className={styles.mcpPanel}>
              <h3 className={styles.sectionTitle}>MCP</h3>
              <McpQuickActions
                projectId={projectId}
                onNavigate={onNavigateToPath}
                variant='panel'
                testIdPrefix='sidebar'
              />
            </div>
          )}
        </div>
      )}

      <div className={styles.section}>
        <h3 className={styles.sectionTitle}>Räume</h3>
        {rooms.length === 0 ? (
          <p className={styles.empty}>Noch kein Raum</p>
        ) : (
          <ul className={styles.list}>
            {rooms.map(r => (
              <li
                key={r.id}
                className={`${styles.item} ${r.id === selectedRoomId ? styles.active : ''}`}
                onClick={() => onSelectRoom(r.id)}
              >
                {r.name}
              </li>
            ))}
          </ul>
        )}

        {addingRoom ? (
          <form
            className={styles.addRoomForm}
            onSubmit={(e: FormEvent) => {
              e.preventDefault()
              const name = newRoomName.trim()
              if (!name) return
              onAddRoom(name)
              setNewRoomName('')
              setAddingRoom(false)
            }}
          >
            <input
              autoFocus
              type="text"
              className={styles.addRoomInput}
              placeholder="Raumname"
              value={newRoomName}
              onChange={e => setNewRoomName(e.target.value)}
            />
            <div className={styles.addRoomActions}>
              <button type="submit" className={styles.addBtn}>Anlegen</button>
              <button type="button" className={styles.cancelBtn} onClick={() => { setAddingRoom(false); setNewRoomName('') }}>✕</button>
            </div>
          </form>
        ) : (
          <button type="button" className={styles.addBtn} onClick={() => setAddingRoom(true)}>+ Raum hinzufügen</button>
        )}
      </div>

      <div className={styles.catalogSection}>
        {workflowStep !== 'furniture' ? (
          <p className={styles.stepHint}>
            {workflowStep === 'walls'
              ? '💡 Wände zeichnen, dann weiter zu Öffnungen'
              : '💡 Türen & Fenster platzieren, dann weiter zu Möbelierung'}
          </p>
        ) : (
          <>
            <div className={styles.catalogHeader}>
          <h3 className={styles.sectionTitle}>Katalog</h3>
          <div className={styles.modeToggle}>
            <button
              className={`${styles.modeBtn} ${catalogMode === 'standard' ? styles.modeBtnActive : ''}`}
              onClick={() => setCatalogMode('standard')}
            >
              Standard
            </button>
            <button
              className={`${styles.modeBtn} ${catalogMode === 'manufacturer' ? styles.modeBtnActive : ''}`}
              onClick={() => setCatalogMode('manufacturer')}
            >
              Hersteller
            </button>
            {assetPluginEnabled && (
              <button
                className={`${styles.modeBtn} ${catalogMode === 'assets' ? styles.modeBtnActive : ''}`}
                onClick={() => setCatalogMode('assets')}
              >
                Assets
              </button>
            )}
          </div>
        </div>

        {catalogMode === 'manufacturer' && (
          <select
            aria-label="Hersteller wählen"
            className={styles.mfrSelect}
            value={selectedManufacturerId}
            onChange={e => setSelectedManufacturerId(e.target.value)}
          >
            <option value="">-- Hersteller wählen --</option>
            {manufacturers.map(m => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
        )}

        <input
          type="search"
          aria-label="Katalog durchsuchen"
          className={styles.searchInput}
          placeholder="Suchen…"
          value={query}
          onChange={e => setQuery(e.target.value)}
        />

        {catalogMode !== 'assets' ? (
          <select
            aria-label="Kategorie filtern"
            className={styles.typeSelect}
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value as '' | CatalogItemType)}
          >
            {TYPE_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <select
            aria-label="Asset-Kategorie filtern"
            className={styles.typeSelect}
            value={assetCategoryFilter}
            onChange={e => setAssetCategoryFilter(e.target.value as '' | AssetCategory)}
          >
            <option value="">Alle</option>
            {Object.entries(ASSET_CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>
        )}

        {catalogMode === 'assets' && (
          <>
            <div className={styles.inlineControls}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={assetFavoriteOnly}
                  onChange={(event) => setAssetFavoriteOnly(event.target.checked)}
                />
                Nur Favoriten
              </label>
              <select
                aria-label="Asset-Sortierung"
                className={styles.typeSelectInline}
                value={assetSort}
                onChange={(event) => setAssetSort(event.target.value as AssetLibrarySort)}
              >
                {ASSET_SORT_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <select
              aria-label="Asset-Ordner filtern"
              className={styles.typeSelect}
              value={assetFolderFilter}
              onChange={(event) => setAssetFolderFilter(event.target.value)}
            >
              <option value="">Alle Ordner</option>
              {assetFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>{folder.name}</option>
              ))}
            </select>

            <input
              type="search"
              aria-label="Asset-Kollektion filtern"
              className={styles.searchInput}
              placeholder="Kollektion"
              value={assetCollectionFilter}
              onChange={(event) => setAssetCollectionFilter(event.target.value)}
            />

            <div className={styles.inlineControls}>
              <select
                aria-label="Gespeicherter Asset-Filter"
                className={styles.typeSelectInline}
                value={selectedAssetSavedFilterId}
                onChange={(event) => {
                  const nextId = event.target.value
                  setSelectedAssetSavedFilterId(nextId)
                  const selected = assetSavedFilters.find((filter) => filter.id === nextId)
                  if (selected) {
                    applyAssetSavedFilter(selected)
                  }
                }}
              >
                <option value="">Filter laden…</option>
                {assetSavedFilters.map((filter) => (
                  <option key={filter.id} value={filter.id}>{filter.name}</option>
                ))}
              </select>
              <button type="button" className={styles.smallBtn} onClick={() => { void handleSaveAssetFilter() }}>
                Speichern
              </button>
              <button type="button" className={styles.smallBtn} onClick={() => { void handleDeleteAssetFilter() }}>
                Löschen
              </button>
              <button type="button" className={styles.smallBtn} onClick={() => { void handleCreateAssetFolder() }}>
                Ordner +
              </button>
            </div>
          </>
        )}

        {catalogMode === 'assets' ? (
          <AssetBrowser
            assets={assetItems}
            folders={assetFolders}
            selectedAssetId={selectedAssetId}
            updatingAssetId={assetUpdatingId}
            loading={catalogLoading}
            error={catalogError}
            onOpenImport={() => setAssetImportOpen(true)}
            onSelectAsset={(asset) => onSelectCatalogItem(mapAssetToCatalogItem(asset))}
            onDeleteAsset={(asset) => { void handleDeleteAsset(asset) }}
            onToggleFavorite={(asset) => { void handlePatchAsset(asset, { favorite: !asset.favorite }) }}
            onMoveAssetFolder={(asset, folderId) => { void handlePatchAsset(asset, { folder_id: folderId }) }}
            onSetAssetCollection={(asset, collection) => { void handlePatchAsset(asset, { collection }) }}
          />
        ) : catalogLoading ? (
          <p className={styles.empty}>Lade…</p>
        ) : catalogError ? (
          <p className={styles.error}>{catalogError}</p>
        ) : (catalogMode === 'standard' ? items : filteredArticles).length === 0 ? (
          <p className={styles.empty}>Keine Artikel gefunden</p>
        ) : (
          <ul className={styles.catalogList}>
            {catalogMode === 'standard' ? (
              items.map(item => (
                <li
                  key={item.id}
                  className={`${styles.catalogItem} ${selectedCatalogItem?.id === item.id ? styles.catalogItemActive : ''}`}
                  title={`${item.sku} · ${item.width_mm}×${item.depth_mm}×${item.height_mm} mm`}
                  onClick={() => onSelectCatalogItem(selectedCatalogItem?.id === item.id ? null : item)}
                >
                  <span className={styles.catalogName}>{item.name}</span>
                  <span className={styles.catalogBadge}>{CATALOG_TYPE_LABELS[item.type]}</span>
                </li>
              ))
            ) : (
              filteredArticles.map(art => (
                <li
                  key={art.id}
                  className={`${styles.catalogItem} ${selectedCatalogItem?.id === art.id ? styles.catalogItemActive : ''}`}
                  title={`${art.sku} · ${art.base_dims_json.width_mm}×${art.base_dims_json.depth_mm}×${art.base_dims_json.height_mm} mm`}
                  onClick={() => onSelectCatalogItem(selectedCatalogItem?.id === art.id ? null : art)}
                >
                  <span className={styles.catalogName}>{art.name}</span>
                  <span className={styles.catalogBadge}>
                    {(art.article_type as any) === 'plinth' ? 'Sockel' : CATALOG_TYPE_LABELS[art.article_type as CatalogItemType]}
                  </span>
                </li>
              ))
            )}
          </ul>
        )}

        {assetPluginEnabled && (
          <AssetImportDialog
            isOpen={assetImportOpen}
            onClose={() => setAssetImportOpen(false)}
            onImported={handleImportedAsset}
          />
        )}
          </>
        )}
      </div>
    </aside>
  )
}
