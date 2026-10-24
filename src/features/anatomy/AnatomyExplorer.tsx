import { lazy, Suspense, useEffect, useState } from 'react'
import { anatomyModule, withAtlasParams, withoutAtlasParams } from '../../lib/urlState'

/*
 * Anatomy has two modules: the whole-body atlas (the default) and the detailed heart explorer.
 * Links with heart keys (`part`, `heart`) open the heart, so every link made before the atlas
 * existed still opens exactly as before. Switching modules adds a history entry, so Back returns
 * to the previous module.
 */

const AtlasExplorer = lazy(() => import('./atlas/AtlasExplorer').then((m) => ({ default: m.AtlasExplorer })))
const HeartExplorer = lazy(() => import('./HeartExplorer').then((m) => ({ default: m.HeartExplorer })))

type Module = 'atlas' | 'heart'

export function AnatomyExplorer() {
  const [module, setModule] = useState<Module>(() => anatomyModule(window.location.search))
  // Remount a module when history brings back a different URL, so it re-reads its state.
  const [generation, setGeneration] = useState(0)

  useEffect(() => {
    const onPop = () => {
      setModule(anatomyModule(window.location.search))
      setGeneration((g) => g + 1)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const open = (next: Module, extra: Record<string, string> = {}) => {
    if (next === module) return
    const search =
      next === 'heart'
        ? (() => {
            const q = new URLSearchParams(withoutAtlasParams(window.location.search))
            q.set('heart', 'whole')
            for (const [k, v] of Object.entries(extra)) q.set(k, v)
            return `?${q.toString()}`
          })()
        : withAtlasParams(window.location.search, { bview: 'front' })
    window.history.pushState(window.history.state, '', `${window.location.pathname}${search}${window.location.hash}`)
    setModule(next)
    setGeneration((g) => g + 1)
  }

  const moduleSwitch = (
    <div className="module-switch">
      <span className="module-switch-label" aria-hidden="true">
        Module
      </span>
      <div className="segmented section-switch" role="group" aria-label="Anatomy module">
        <button type="button" className="segmented-option" aria-pressed={module === 'atlas'} onClick={() => open('atlas')}>
          Body atlas
        </button>
        <button type="button" className="segmented-option" aria-pressed={module === 'heart'} onClick={() => open('heart')}>
          Heart (detailed)
        </button>
      </div>
    </div>
  )

  return (
    <Suspense fallback={<p className="muted small panel">Loading {module === 'heart' ? 'the heart explorer' : 'the body atlas'}…</p>}>
      {module === 'heart' ? (
        <HeartExplorer key={generation} moduleSwitch={moduleSwitch} />
      ) : (
        <AtlasExplorer key={generation} moduleSwitch={moduleSwitch} onOpenHeart={() => open('heart')} />
      )}
    </Suspense>
  )
}
