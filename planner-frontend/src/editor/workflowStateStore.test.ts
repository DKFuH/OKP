import { describe, expect, it } from 'vitest'
import {
  getEditorModeForWorkflowStep,
  getNextWorkflowStep,
  getPreviousWorkflowStep,
  WORKFLOW_STEPS,
} from './workflowStateStore.js'

describe('workflowStateStore helpers', () => {
  it('exposes expected workflow step order', () => {
    expect(WORKFLOW_STEPS).toEqual(['walls', 'openings', 'furniture'])
  })

  it('moves to next step and clamps at the end', () => {
    expect(getNextWorkflowStep('walls')).toBe('openings')
    expect(getNextWorkflowStep('openings')).toBe('furniture')
    expect(getNextWorkflowStep('furniture')).toBe('furniture')
  })

  it('moves to previous step and clamps at the start', () => {
    expect(getPreviousWorkflowStep('furniture')).toBe('openings')
    expect(getPreviousWorkflowStep('openings')).toBe('walls')
    expect(getPreviousWorkflowStep('walls')).toBe('walls')
  })

  it('maps workflow step to editor mode', () => {
    expect(getEditorModeForWorkflowStep('walls')).toBe('wallCreate')
    expect(getEditorModeForWorkflowStep('openings')).toBe('selection')
    expect(getEditorModeForWorkflowStep('furniture')).toBe('selection')
  })
})
