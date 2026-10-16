import { useId, useState } from 'react'
import { AppLink } from '../../components/AppLink'
import { findTerm } from '../../data/glossary'

/** A key term that expands its shared glossary definition in place (works by click, tap and keyboard). */
export function TermButton({ id }: { id: string }) {
  const entry = findTerm(id)
  const domId = useId()
  const [open, setOpen] = useState(false)
  if (!entry) return null
  return (
    <li className="term">
      <button type="button" className="term-button" aria-expanded={open} aria-controls={domId} onClick={() => setOpen((v) => !v)}>
        {entry.term}
      </button>
      {open && (
        <span id={domId} className="term-definition">
          {entry.definition}{' '}
          <AppLink href={`?term=${entry.id}#/glossary`} className="term-more">
            In the glossary
          </AppLink>
        </span>
      )}
    </li>
  )
}
