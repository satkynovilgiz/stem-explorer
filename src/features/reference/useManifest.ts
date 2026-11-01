import { useEffect, useState } from 'react'
import type { ManifestRow } from '../../reference/types'

export type Manifest = { state: 'loading' } | { state: 'error' } | { state: 'ready'; rows: readonly ManifestRow[]; byId: ReadonlyMap<string, ManifestRow> }

let manifestPromise: Promise<readonly ManifestRow[]> | null = null
export const loadManifest = () => {
  manifestPromise ??= import('../../reference/generated/manifest.json').then((m) => m.default as ManifestRow[])
  manifestPromise.catch(() => (manifestPromise = null))
  return manifestPromise
}

export function useManifest(): [Manifest, () => void] {
  const [m, setM] = useState<Manifest>({ state: 'loading' })
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    let live = true
    loadManifest().then(
      (rows) => live && setM({ state: 'ready', rows, byId: new Map(rows.map((r) => [r.id, r])) }),
      () => live && setM({ state: 'error' }),
    )
    return () => {
      live = false
    }
  }, [attempt])
  return [m, () => (setM({ state: 'loading' }), setAttempt((a) => a + 1))]
}

