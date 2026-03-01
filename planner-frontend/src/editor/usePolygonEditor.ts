import { useCallback, useReducer } from 'react'
import type { Point2D, Vertex } from '@shared/types'
import { validatePolygon } from '@shared/geometry/validatePolygon'
import { snapPoint } from './snapUtils.js'

// ─── Typen ───────────────────────────────────────────────────────────────────

export type EditorTool = 'draw' | 'select' | 'move'

export interface EditorSettings {
  gridSizeMm: number   // 0 = kein Raster
  angleSnap: boolean
  minEdgeLengthMm: number
}

export interface EditorState {
  tool: EditorTool
  vertices: Vertex[]
  closed: boolean
  selectedIndex: number | null
  hoverIndex: number | null
  settings: EditorSettings
  validationErrors: string[]
  isDirty: boolean
}

type Action =
  | { type: 'SET_TOOL'; tool: EditorTool }
  | { type: 'ADD_VERTEX'; point: Point2D }
  | { type: 'CLOSE_POLYGON' }
  | { type: 'MOVE_VERTEX'; index: number; point: Point2D }
  | { type: 'SELECT_VERTEX'; index: number | null }
  | { type: 'HOVER_VERTEX'; index: number | null }
  | { type: 'DELETE_VERTEX'; index: number }
  | { type: 'LOAD_VERTICES'; vertices: Vertex[] }
  | { type: 'RESET' }
  | { type: 'UPDATE_SETTINGS'; settings: Partial<EditorSettings> }

// ─── Hilfsfunktionen ─────────────────────────────────────────────────────────

function buildVertex(point: Point2D, index: number): Vertex {
  return { id: crypto.randomUUID(), x_mm: point.x_mm, y_mm: point.y_mm, index }
}

function reindex(vertices: Vertex[]): Vertex[] {
  return vertices.map((v, i) => ({ ...v, index: i }))
}

function runValidation(vertices: Vertex[], minEdgeLengthMm: number, closed: boolean): string[] {
  if (!closed || vertices.length < 3) return []
  return validatePolygon(vertices, minEdgeLengthMm).errors
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

const DEFAULT_SETTINGS: EditorSettings = {
  gridSizeMm: 100,
  angleSnap: true,
  minEdgeLengthMm: 100,
}

function initialState(): EditorState {
  return {
    tool: 'draw',
    vertices: [],
    closed: false,
    selectedIndex: null,
    hoverIndex: null,
    settings: DEFAULT_SETTINGS,
    validationErrors: [],
    isDirty: false,
  }
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'SET_TOOL':
      return { ...state, tool: action.tool, selectedIndex: null }

    case 'ADD_VERTEX': {
      if (state.closed || state.tool !== 'draw') return state
      const origin = state.vertices.at(-1) ?? null
      const snapped = snapPoint(action.point, origin, state.settings.gridSizeMm, state.settings.angleSnap)
      const newVertex = buildVertex(snapped, state.vertices.length)
      const vertices = [...state.vertices, newVertex]
      return {
        ...state,
        vertices,
        isDirty: true,
        validationErrors: runValidation(vertices, state.settings.minEdgeLengthMm, false),
      }
    }

    case 'CLOSE_POLYGON': {
      if (state.vertices.length < 3 || state.closed) return state
      const errors = runValidation(state.vertices, state.settings.minEdgeLengthMm, true)
      return { ...state, closed: true, tool: 'select', validationErrors: errors }
    }

    case 'MOVE_VERTEX': {
      if (action.index < 0 || action.index >= state.vertices.length) return state
      const snapped = snapPoint(action.point, null, state.settings.gridSizeMm, false)
      const vertices = state.vertices.map((v, i) =>
        i === action.index ? { ...v, x_mm: snapped.x_mm, y_mm: snapped.y_mm } : v,
      )
      return {
        ...state,
        vertices,
        isDirty: true,
        validationErrors: runValidation(vertices, state.settings.minEdgeLengthMm, state.closed),
      }
    }

    case 'SELECT_VERTEX':
      return { ...state, selectedIndex: action.index }

    case 'HOVER_VERTEX':
      return { ...state, hoverIndex: action.index }

    case 'DELETE_VERTEX': {
      if (state.vertices.length <= 3) return state
      const vertices = reindex(state.vertices.filter((_, i) => i !== action.index))
      return {
        ...state,
        vertices,
        selectedIndex: null,
        closed: state.closed && vertices.length >= 3,
        isDirty: true,
        validationErrors: runValidation(vertices, state.settings.minEdgeLengthMm, state.closed),
      }
    }

    case 'LOAD_VERTICES': {
      const vertices = reindex(action.vertices)
      return {
        ...initialState(),
        vertices,
        closed: vertices.length >= 3,
        tool: 'select',
        validationErrors: runValidation(vertices, DEFAULT_SETTINGS.minEdgeLengthMm, true),
      }
    }

    case 'RESET':
      return initialState()

    case 'UPDATE_SETTINGS': {
      const settings = { ...state.settings, ...action.settings }
      return {
        ...state,
        settings,
        validationErrors: runValidation(state.vertices, settings.minEdgeLengthMm, state.closed),
      }
    }

    default:
      return state
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePolygonEditor(initialVertices?: Vertex[]) {
  const [state, dispatch] = useReducer(
    reducer,
    undefined,
    () => {
      const s = initialState()
      if (initialVertices && initialVertices.length >= 3) {
        return reducer(s, { type: 'LOAD_VERTICES', vertices: initialVertices })
      }
      return s
    },
  )

  const addVertex = useCallback((point: Point2D) =>
    dispatch({ type: 'ADD_VERTEX', point }), [])

  const closePolygon = useCallback(() =>
    dispatch({ type: 'CLOSE_POLYGON' }), [])

  const moveVertex = useCallback((index: number, point: Point2D) =>
    dispatch({ type: 'MOVE_VERTEX', index, point }), [])

  const selectVertex = useCallback((index: number | null) =>
    dispatch({ type: 'SELECT_VERTEX', index }), [])

  const hoverVertex = useCallback((index: number | null) =>
    dispatch({ type: 'HOVER_VERTEX', index }), [])

  const deleteVertex = useCallback((index: number) =>
    dispatch({ type: 'DELETE_VERTEX', index }), [])

  const setTool = useCallback((tool: EditorTool) =>
    dispatch({ type: 'SET_TOOL', tool }), [])

  const loadVertices = useCallback((vertices: Vertex[]) =>
    dispatch({ type: 'LOAD_VERTICES', vertices }), [])

  const reset = useCallback(() =>
    dispatch({ type: 'RESET' }), [])

  const updateSettings = useCallback((settings: Partial<EditorSettings>) =>
    dispatch({ type: 'UPDATE_SETTINGS', settings }), [])

  const isValid = state.closed && state.validationErrors.length === 0

  return {
    state,
    isValid,
    addVertex,
    closePolygon,
    moveVertex,
    selectVertex,
    hoverVertex,
    deleteVertex,
    setTool,
    loadVertices,
    reset,
    updateSettings,
  }
}
