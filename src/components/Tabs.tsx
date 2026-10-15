import { useId, useRef, type KeyboardEvent, type ReactNode } from 'react'

interface Tab<T extends string> {
  id: T
  label: string
  content: ReactNode
}

interface Props<T extends string> {
  /** Accessible name for the tab list. */
  label: string
  tabs: Tab<T>[]
  active: T
  onChange: (id: T) => void
  className?: string
}

/** WAI-ARIA tabs pattern with arrow-key navigation. */
export function Tabs<T extends string>({ label, tabs, active, onChange, className }: Props<T>) {
  const baseId = useId()
  const refs = useRef<(HTMLButtonElement | null)[]>([])

  const onKeyDown = (e: KeyboardEvent, index: number) => {
    const last = tabs.length - 1
    const targets: Record<string, number> = {
      ArrowRight: (index + 1) % tabs.length,
      ArrowLeft: (index + last) % tabs.length,
      Home: 0,
      End: last,
    }
    const next = targets[e.key] ?? -1
    if (next < 0) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[next]?.focus()
  }

  return (
    <div className={`tabs ${className ?? ''}`}>
      <div
        role="tablist"
        aria-label={label}
        className="tablist"
        style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
      >
        {tabs.map((tab, i) => {
          const selected = tab.id === active
          return (
            <button
              key={tab.id}
              ref={(el) => {
                refs.current[i] = el
              }}
              type="button"
              role="tab"
              id={`${baseId}-tab-${tab.id}`}
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${tab.id}`}
              tabIndex={selected ? 0 : -1}
              className="tab"
              onClick={() => onChange(tab.id)}
              onKeyDown={(e) => onKeyDown(e, i)}
            >
              {tab.label}
            </button>
          )
        })}
      </div>
      {tabs
        .filter((tab) => tab.id === active)
        .map((tab) => (
          <div
            key={tab.id}
            role="tabpanel"
            id={`${baseId}-panel-${tab.id}`}
            aria-labelledby={`${baseId}-tab-${tab.id}`}
            className="tabpanel"
          >
            {tab.content}
          </div>
        ))}
    </div>
  )
}
