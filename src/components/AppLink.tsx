import type { AnchorHTMLAttributes, MouseEvent } from 'react'
import { navigateTo } from '../lib/hooks'

/**
 * Link to an in-app route such as "?molecule=water#/chemistry". It is a real anchor (open in new
 * tab, copy address all work), but a plain click navigates without reloading the page.
 */
export function AppLink({ href, onClick, ...rest }: AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const handle = (e: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(e)
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
    if (!/^[?#]/.test(href)) return
    e.preventDefault()
    navigateTo(href)
  }
  return <a href={href} onClick={handle} {...rest} />
}
