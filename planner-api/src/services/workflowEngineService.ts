import { z } from 'zod'

export const workflowEntityTypeValues = ['project', 'quote', 'production_order'] as const
export type WorkflowEntityType = (typeof workflowEntityTypeValues)[number]

const projectWorkflowStatusValues = [
  'lead',
  'planning',
  'quoted',
  'contract',
  'production',
  'installed',
  'archived',
] as const

export const WorkflowNodeSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().min(1).max(200),
  is_start: z.boolean().optional(),
  is_terminal: z.boolean().optional(),
})

export const WorkflowGuardSchema = z.object({
  type: z.literal('project_status_equals'),
  equals: z.enum(projectWorkflowStatusValues),
})

export const WorkflowTransitionSchema = z.object({
  from: z.string().min(1).max(120),
  to: z.string().min(1).max(120),
  label: z.string().min(1).max(200).optional(),
  guard: WorkflowGuardSchema.optional(),
})

export const WorkflowGraphSchema = z.object({
  nodes: z.array(WorkflowNodeSchema).min(1).max(100),
  transitions: z.array(WorkflowTransitionSchema).max(400),
})

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>
export type WorkflowTransition = z.infer<typeof WorkflowTransitionSchema>

export class WorkflowDefinitionValidationError extends Error {}
export class WorkflowTransitionError extends Error {}
export class WorkflowGuardFailedError extends Error {}

export function validateWorkflowGraph(graph: WorkflowGraph): void {
  const nodeIds = new Set<string>()
  for (const node of graph.nodes) {
    if (nodeIds.has(node.id)) {
      throw new WorkflowDefinitionValidationError(`Duplicate node id: ${node.id}`)
    }
    nodeIds.add(node.id)
  }

  const startNodes = graph.nodes.filter((node) => node.is_start)
  if (startNodes.length !== 1) {
    throw new WorkflowDefinitionValidationError('Workflow graph must define exactly one start node')
  }

  const transitionKeys = new Set<string>()
  for (const transition of graph.transitions) {
    if (!nodeIds.has(transition.from)) {
      throw new WorkflowDefinitionValidationError(`Transition source node does not exist: ${transition.from}`)
    }
    if (!nodeIds.has(transition.to)) {
      throw new WorkflowDefinitionValidationError(`Transition target node does not exist: ${transition.to}`)
    }

    const key = `${transition.from}->${transition.to}`
    if (transitionKeys.has(key)) {
      throw new WorkflowDefinitionValidationError(`Duplicate transition: ${key}`)
    }
    transitionKeys.add(key)
  }
}

export function getStartNodeId(graph: WorkflowGraph): string {
  const startNode = graph.nodes.find((node) => node.is_start)
  if (!startNode) {
    throw new WorkflowDefinitionValidationError('Workflow graph must define exactly one start node')
  }
  return startNode.id
}

export function getNodeById(graph: WorkflowGraph, nodeId: string) {
  const node = graph.nodes.find((entry) => entry.id === nodeId)
  if (!node) {
    throw new WorkflowTransitionError(`Unknown workflow node: ${nodeId}`)
  }
  return node
}

export function findTransition(
  graph: WorkflowGraph,
  fromNodeId: string,
  toNodeId: string,
): WorkflowTransition {
  const transition = graph.transitions.find((entry) => entry.from === fromNodeId && entry.to === toNodeId)
  if (!transition) {
    throw new WorkflowTransitionError(`No transition from ${fromNodeId} to ${toNodeId}`)
  }
  return transition
}

export function assertProjectStatusGuard(transition: WorkflowTransition, actualProjectStatus: string | null | undefined): void {
  if (!transition.guard) {
    return
  }

  if (transition.guard.type === 'project_status_equals' && actualProjectStatus !== transition.guard.equals) {
    throw new WorkflowGuardFailedError(
      `Guard failed: project_status must be ${transition.guard.equals}, actual is ${actualProjectStatus ?? 'undefined'}`,
    )
  }
}
