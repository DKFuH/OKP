/**
 * Maps ribbon command IDs to Fluent icon components.
 * Add new entries here when adding commands to ribbonStateResolver.ts.
 */
import type { FluentIcon } from '@fluentui/react-icons'
import {
  AddRegular,
  AppsRegular,
  ArchiveRegular,
  ArrowMaximizeRegular,
  ArrowRedoRegular,
  ArrowUndoRegular,
  CameraRegular,
  ChartMultipleRegular,
  ClipboardPasteRegular,
  CopyRegular,
  CubeRegular,
  CursorHoverRegular,
  CutRegular,
  DeleteRegular,
  DocumentRegular,
  EraserRegular,
  FolderOpenRegular,
  GridRegular,
  HomeRegular,
  InfoRegular,
  LayoutColumnFourRegular,
  LayoutColumnThreeRegular,
  MaximizeRegular,
  OpenRegular,
  PentagonRegular,
  PeopleRegular,
  PlugConnectedRegular,
  PuzzlePieceRegular,
  QuestionCircleRegular,
  RulerRegular,
  SaveRegular,
  SelectAllOnRegular,
  SettingsRegular,
  ViewDesktopRegular,
  ZoomInRegular,
} from '@fluentui/react-icons'

export const RIBBON_ICONS: Record<string, FluentIcon> = {
  // Datei tab
  'cmd-new': AddRegular,
  'cmd-open': FolderOpenRegular,
  'cmd-save': SaveRegular,
  'cmd-duplicate': CopyRegular,
  'cmd-gltf-export': ArrowMaximizeRegular,
  'cmd-exports': OpenRegular,

  // Start tab – clipboard
  'cmd-undo': ArrowUndoRegular,
  'cmd-redo': ArrowRedoRegular,
  'cmd-cut': CutRegular,
  'cmd-copy': CopyRegular,
  'cmd-paste': ClipboardPasteRegular,

  // Start tab – selection
  'cmd-select-all': SelectAllOnRegular,
  'cmd-deselect': EraserRegular,

  // Start tab – workflow
  'cmd-prev-step': ArrowUndoRegular,
  'cmd-next-step': ArrowRedoRegular,
  'cmd-autocomplete': AppsRegular,

  // Einfügen tab
  'cmd-insert-window': MaximizeRegular,
  'cmd-insert-door': OpenRegular,
  'cmd-insert-furniture': HomeRegular,
  'cmd-insert-label': DocumentRegular,
  'cmd-insert-dim': RulerRegular,
  'cmd-asset-library': GridRegular,

  // CAD tab
  'cmd-wall': PentagonRegular,
  'cmd-room': HomeRegular,
  'cmd-polyline': RulerRegular,
  'cmd-select': CursorHoverRegular,
  'cmd-pan': ArrowMaximizeRegular,
  'cmd-calibrate': ZoomInRegular,
  'cmd-snap-align': GridRegular,
  'cmd-topology': AppsRegular,

  // Ansicht tab
  'cmd-view-2d': ViewDesktopRegular,
  'cmd-view-split': LayoutColumnThreeRegular,
  'cmd-view-split3': LayoutColumnFourRegular,
  'cmd-view-3d': CubeRegular,
  'cmd-view-elevation': ViewDesktopRegular,
  'cmd-view-section': ViewDesktopRegular,
  'cmd-panel-navigation': GridRegular,
  'cmd-panel-camera': CameraRegular,
  'cmd-panel-left': LayoutColumnThreeRegular,
  'cmd-panel-right': LayoutColumnThreeRegular,

  // Render tab
  'cmd-screenshot': CameraRegular,
  'cmd-360': ArrowMaximizeRegular,
  'cmd-panel-capture': CameraRegular,
  'cmd-panel-render-env': CubeRegular,
  'cmd-panel-daylight': ZoomInRegular,
  'cmd-panel-material': AppsRegular,
  'cmd-presentation': ViewDesktopRegular,
  'cmd-panorama': ArrowMaximizeRegular,

  // Daten tab
  'cmd-reports': ChartMultipleRegular,
  'cmd-quote-lines': DocumentRegular,
  'cmd-spec-packages': DocumentRegular,
  'cmd-documents': FolderOpenRegular,
  'cmd-contacts': PeopleRegular,

  // Plugins tab
  'cmd-plugin-settings': PuzzlePieceRegular,
  'mcp-menu': PlugConnectedRegular,

  // Kanban – Projekt tab
  'cmd-kb-new-project': AddRegular,
  'cmd-kb-open-editor': OpenRegular,
  'cmd-kb-documents': FolderOpenRegular,
  'cmd-kb-archive': ArchiveRegular,
  'cmd-kb-delete': DeleteRegular,

  // Kanban – Ändern tab
  'cmd-kb-status-lead': InfoRegular,
  'cmd-kb-status-planning': AppsRegular,
  'cmd-kb-status-quoted': DocumentRegular,
  'cmd-kb-status-contract': ChartMultipleRegular,
  'cmd-kb-status-production': GridRegular,
  'cmd-kb-status-installed': HomeRegular,
  'cmd-kb-duplicate': CopyRegular,
  'cmd-kb-customer-data': PeopleRegular,

  // Kanban – Einstellungen tab
  'cmd-kb-settings': SettingsRegular,
  'cmd-kb-plugins': PuzzlePieceRegular,
  'cmd-kb-company': SettingsRegular,

  // Kanban – Hilfe tab
  'cmd-kb-help': QuestionCircleRegular,
  'cmd-kb-about': InfoRegular,

  // Quick Access Bar
  'qa-undo': ArrowUndoRegular,
  'qa-redo': ArrowRedoRegular,
  'qa-save': SaveRegular,
  'qa-next-step': ArrowRedoRegular,
  'qa-screenshot': CameraRegular,
  'qa-kb-new-project': AddRegular,

  // Context tabs
  'cmd-ct-wall': PentagonRegular,
  'cmd-ct-room': HomeRegular,
  'cmd-ct-select': CursorHoverRegular,
  'cmd-ct-snap': GridRegular,
  'cmd-ct-door': OpenRegular,
  'cmd-ct-window': MaximizeRegular,
  'cmd-ct-furniture': HomeRegular,
  'cmd-ct-asset-library': GridRegular,
  'cmd-ct-material': AppsRegular,
  'cmd-ct-autocomplete': AppsRegular,
  'cmd-ct-presentation': ViewDesktopRegular,
  'cmd-ct-screenshot': CameraRegular,
  'cmd-ct-360': ArrowMaximizeRegular,
}
