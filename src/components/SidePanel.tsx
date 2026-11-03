import { useEffect, useRef, type KeyboardEvent, type PointerEvent, type ReactNode, type Ref } from 'react'
import { PANEL_WIDTH_KEY, MAX_PANEL_WIDTH, MIN_PANEL_WIDTH, MIN_STAGE_WIDTH, clampPanelWidth, setPanelWidthVar, setWorkspace, type Side } from '../lib/workspace'

const KEY_STEP = 24

/** A side panel of an explorer workspace, with a divider the user can drag to change its width. */
export function SidePanel({ side, children, ref }: { side: Side; children: ReactNode; ref?: Ref<HTMLElement> }) {
  return (
    <>
      <aside ref={ref} className={`chem-side chem-side--${side}`}>
        {children}
      </aside>
      <PanelResizer side={side} />
    </>
  )
}

function PanelResizer({ side }: { side: Side }) {
  const handle = useRef<HTMLDivElement>(null)
  const drag = useRef<{ startX: number; startWidth: number; max: number; width: number | null } | null>(null)

  const panel = () => handle.current?.previousElementSibling as HTMLElement | null

  /** The widest this panel can be now: it may only take room the stage can give up. */
  const maxWidth = () => {
    const current = panel()?.getBoundingClientRect().width ?? 0
    const stage = handle.current?.parentElement?.querySelector(':scope > .chem-stage')?.getBoundingClientRect().width
    if (stage === undefined) return MAX_PANEL_WIDTH
    return Math.max(MIN_PANEL_WIDTH, Math.min(MAX_PANEL_WIDTH, Math.floor(current + stage - MIN_STAGE_WIDTH)))
  }

  const save = (width: number | null) => setWorkspace({ [PANEL_WIDTH_KEY[side]]: width })

  // aria-valuenow follows the real width, which also changes with the window and the other panel.
  useEffect(() => {
    const el = panel()
    if (!el) return
    const observer = new ResizeObserver(() => {
      const width = Math.round(el.getBoundingClientRect().width)
      if (width > 0) handle.current?.setAttribute('aria-valuenow', String(width))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { startX: e.clientX, startWidth: panel()?.getBoundingClientRect().width ?? 0, max: maxWidth(), width: null }
    document.documentElement.classList.add('is-resizing-panels')
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d) return
    const moved = (e.clientX - d.startX) * (side === 'left' ? 1 : -1)
    d.width = clampPanelWidth(d.startWidth + moved, d.max)
    // Only the CSS variable changes while dragging, so the explorer does not re-render on every move.
    setPanelWidthVar(side, d.width)
  }

  const endDrag = () => {
    const d = drag.current
    drag.current = null
    document.documentElement.classList.remove('is-resizing-panels')
    if (d?.width != null) save(d.width)
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const current = panel()?.getBoundingClientRect().width ?? 0
    const grow = side === 'left' ? 'ArrowRight' : 'ArrowLeft'
    const shrink = side === 'left' ? 'ArrowLeft' : 'ArrowRight'
    const max = maxWidth()
    let next: number
    if (e.key === grow) next = current + KEY_STEP
    else if (e.key === shrink) next = current - KEY_STEP
    else if (e.key === 'Home') next = MIN_PANEL_WIDTH
    else if (e.key === 'End') next = max
    else return
    e.preventDefault()
    save(clampPanelWidth(next, max))
  }

  return (
    <div
      ref={handle}
      className={`panel-resizer panel-resizer--${side}`}
      role="separator"
      aria-orientation="vertical"
      aria-label={`Resize ${side} panel`}
      aria-valuemin={MIN_PANEL_WIDTH}
      aria-valuemax={MAX_PANEL_WIDTH}
      tabIndex={0}
      title="Drag to resize. Double-click to reset."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => save(null)}
      onKeyDown={onKeyDown}
    />
  )
}
