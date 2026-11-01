import type { SubjectId } from '../data/subjects'

/** A subject's overview address: a sub-route of the subject, so no subject's own URL keys are involved. */
export const overviewHref = (s: SubjectId) => (s === 'chemistry' ? '?csec=topics#/chemistry' : `#/${s}/overview`)
export const isOverviewHash = (hash: string) => /^#\/(anatomy|biology|physics|mathematics)\/overview\/?$/.test(hash)
