import { useMemo, type ReactNode } from 'react'

import { ViewportContext, type ViewportContextValue } from './ViewportContext'

interface ViewportProviderProps extends ViewportContextValue {
  readonly children: ReactNode
}

export function ViewportProvider({ viewport, size, children }: ViewportProviderProps) {
  const value = useMemo(() => ({ viewport, size }), [viewport, size])
  return <ViewportContext.Provider value={value}>{children}</ViewportContext.Provider>
}
