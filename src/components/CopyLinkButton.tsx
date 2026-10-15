import { Check, Link2, TriangleAlert } from 'lucide-react'
import { useEffect, useState } from 'react'

type Status = 'idle' | 'copied' | 'error'

const LOCAL_HOSTS = ['localhost', '127.0.0.1', '[::1]']

interface Props {
  /** Builds the link at click time, from the current browser origin. */
  getUrl: () => string
  /** What the link restores, e.g. "this molecule and display mode". */
  restores: string
}

/** Copies a share link to the clipboard and reports success or failure. */
export function CopyLinkButton({ getUrl, restores }: Props) {
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (status === 'idle') return
    const t = window.setTimeout(() => setStatus('idle'), 4000)
    return () => window.clearTimeout(t)
  }, [status])

  const copy = async () => {
    try {
      if (!navigator.clipboard) throw new Error('Clipboard API unavailable')
      await navigator.clipboard.writeText(getUrl())
      setStatus('copied')
    } catch {
      setStatus('error')
    }
  }

  const isLocal = LOCAL_HOSTS.includes(window.location.hostname)

  return (
    <div className="copy-link">
      <button type="button" className="tool-button copy-link-button" onClick={copy}>
        {status === 'copied' ? <Check size={16} aria-hidden="true" /> : <Link2 size={16} aria-hidden="true" />}
        <span>{status === 'copied' ? 'Link copied' : 'Copy link'}</span>
      </button>
      <p className="copy-link-status" role="status">
        {status === 'copied' &&
          (isLocal
            ? 'Copied. This local link only opens on this computer while the dev server runs.'
            : `Copied. The link restores ${restores}.`)}
        {status === 'error' && (
          <>
            <TriangleAlert size={14} aria-hidden="true" /> Could not access the clipboard. Copy the address
            from the browser bar instead.
          </>
        )}
      </p>
    </div>
  )
}
