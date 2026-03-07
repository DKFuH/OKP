import { createContext, useContext, type Dispatch, type ReactNode, type SetStateAction } from 'react'

export interface AppShellKanbanBridgeState {
  selectedProjectId: string | null
  onArchive: (id: string) => void
  onDelete: (id: string) => void
  onDuplicate: (id: string) => void
  onStatusChange: (id: string, status: string) => void
}

interface AppShellKanbanBridgeContextValue {
  kanbanBridgeState: AppShellKanbanBridgeState | null
  setKanbanBridgeState: Dispatch<SetStateAction<AppShellKanbanBridgeState | null>>
}

const AppShellKanbanBridgeContext = createContext<AppShellKanbanBridgeContextValue | null>(null)

interface AppShellKanbanBridgeProviderProps {
  kanbanBridgeState: AppShellKanbanBridgeState | null
  setKanbanBridgeState: Dispatch<SetStateAction<AppShellKanbanBridgeState | null>>
  children: ReactNode
}

export function AppShellKanbanBridgeProvider({
  kanbanBridgeState,
  setKanbanBridgeState,
  children,
}: AppShellKanbanBridgeProviderProps) {
  return (
    <AppShellKanbanBridgeContext.Provider value={{ kanbanBridgeState, setKanbanBridgeState }}>
      {children}
    </AppShellKanbanBridgeContext.Provider>
  )
}

export function useAppShellKanbanBridge() {
  const context = useContext(AppShellKanbanBridgeContext)
  if (!context) return null
  return context
}
