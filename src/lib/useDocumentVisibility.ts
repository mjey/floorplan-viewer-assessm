import { useEffect, useState } from 'react'

/** True while the document is visible. Used to pause polling in background tabs. */
export function useDocumentVisibility(): boolean {
  const [visible, setVisible] = useState(() => document.visibilityState !== 'hidden')

  useEffect(() => {
    const onChange = () => setVisible(document.visibilityState !== 'hidden')
    document.addEventListener('visibilitychange', onChange)
    return () => document.removeEventListener('visibilitychange', onChange)
  }, [])

  return visible
}
