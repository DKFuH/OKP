import { useCallback, useMemo, useState } from 'react'
import type { EditorMode } from './editorModeStore.js'

export type WorkflowStep = 'walls' | 'openings' | 'furniture'

export const WORKFLOW_STEPS: WorkflowStep[] = ['walls', 'openings', 'furniture']

export function getNextWorkflowStep(step: WorkflowStep): WorkflowStep {
  const index = WORKFLOW_STEPS.indexOf(step)
  if (index < 0 || index >= WORKFLOW_STEPS.length - 1) {
    return WORKFLOW_STEPS[WORKFLOW_STEPS.length - 1]
  }
  return WORKFLOW_STEPS[index + 1]
}

export function getPreviousWorkflowStep(step: WorkflowStep): WorkflowStep {
  const index = WORKFLOW_STEPS.indexOf(step)
  if (index <= 0) {
    return WORKFLOW_STEPS[0]
  }
  return WORKFLOW_STEPS[index - 1]
}

export function getEditorModeForWorkflowStep(step: WorkflowStep): EditorMode {
  if (step === 'walls') {
    return 'wallCreate'
  }

  return 'selection'
}

interface UseWorkflowStateStoreOptions {
  initialStep?: WorkflowStep
}

export function useWorkflowStateStore({ initialStep = 'walls' }: UseWorkflowStateStoreOptions = {}) {
  const [step, setStep] = useState<WorkflowStep>(initialStep)

  const canGoNext = step !== WORKFLOW_STEPS[WORKFLOW_STEPS.length - 1]
  const canGoPrevious = step !== WORKFLOW_STEPS[0]

  const goToNextStep = useCallback(() => {
    setStep((current) => getNextWorkflowStep(current))
  }, [])

  const goToPreviousStep = useCallback(() => {
    setStep((current) => getPreviousWorkflowStep(current))
  }, [])

  const resetStep = useCallback(() => {
    setStep(initialStep)
  }, [initialStep])

  return useMemo(() => ({
    step,
    setStep,
    canGoNext,
    canGoPrevious,
    goToNextStep,
    goToPreviousStep,
    resetStep,
  }), [canGoNext, canGoPrevious, goToNextStep, goToPreviousStep, resetStep, step])
}
