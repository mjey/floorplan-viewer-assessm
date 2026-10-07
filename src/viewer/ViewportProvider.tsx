import { useMemo, type ReactNode } from 'react'

import { ViewportContext, type ViewportContextValue } from './ViewportContext'

interface ViewportProviderProps extends ViewportContextValue {
  readonly children: ReactNode
}

export function ViewportProvider({ viewport, size, controls, children }: ViewportProviderProps) {
  const value = useMemo(() => ({ viewport, size, controls }), [viewport, size, controls])
  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>
}
