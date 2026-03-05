import { describe, expect, it } from 'vitest'
import {
  deriveModeFromTool,
  formatEditorModeLabel,
  isDrawCreationMode,
  mapModeToTool,
} from './editorModeStore.js'

describe('editorModeStore mappings', () => {
  it('maps draw-oriented modes to draw tool', () => {
    expect(mapModeToTool('wallCreate')).toBe('draw')
    expect(mapModeToTool('roomCreate')).toBe('draw')
    expect(mapModeToTool('polylineCreate')).toBe('draw')
    expect(mapModeToTool('dimCreate')).toBe('draw')
    expect(mapModeToTool('labelCreate')).toBe('draw')
  })

  it('maps selection and calibrate modes to expected tools', () => {
    expect(mapModeToTool('selection')).toBe('select')
    expect(mapModeToTool('pan')).toBe('move')
    expect(mapModeToTool('calibrate')).toBe('calibrate')
  })

  it('derives mode from active tool and draw submode memory', () => {
    expect(deriveModeFromTool('select', 'roomCreate')).toBe('selection')
    expect(deriveModeFromTool('draw', 'roomCreate')).toBe('roomCreate')
    expect(deriveModeFromTool('move', 'wallCreate')).toBe('pan')
    expect(deriveModeFromTool('calibrate', 'wallCreate')).toBe('calibrate')
  })

  it('identifies draw creation modes', () => {
    expect(isDrawCreationMode('wallCreate')).toBe(true)
    expect(isDrawCreationMode('selection')).toBe(false)
  })

  it('formats human-readable mode labels', () => {
    expect(formatEditorModeLabel('selection')).toBe('Auswahl')
    expect(formatEditorModeLabel('wallCreate')).toBe('Waende zeichnen')
    expect(formatEditorModeLabel('dimCreate')).toBe('Bemaessung')
  })
})
