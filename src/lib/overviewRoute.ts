import type { SubjectId } from '../data/subjects'

/** A subject's overview address: a sub-route of the subject, so no subject's own URL keys are involved. */
export const overviewHref = (s: SubjectId) => (s === 'chemistry' ? '?csec=topics#/chemistry' : `#/${s}/overview`)
export const isOverviewHash = (hash: string) => /^#\/(anatomy|biology|physics|mathematics)\/overview\/?$/.test(hash)

/** A subject's calculators; Chemistry's are on its Tools page. `calc` opens one of them. */
export const calculatorsHref = (s: SubjectId, calc?: string) => {
  const q = calc ? `calc=${encodeURIComponent(calc)}` : ''
  return s === 'chemistry' ? `?csec=tools${q ? `&${q}` : ''}#/chemistry` : `${q ? `?${q}` : ''}#/${s}/calculators`
}
export const isCalculatorsHash = (hash: string) => /^#\/(anatomy|biology|physics|mathematics)\/calculators\/?$/.test(hash)
