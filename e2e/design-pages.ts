/**
 * The pages and screen sizes the design pipeline looks at: every subject's home page plus one
 * typical page inside each subject. Used by the design rules (design-rules.e2e.ts) and by the
 * before/after screenshots on each pull request (design-shots.e2e.ts, .github/workflows/design.yml).
 */
export const DESIGN_PAGES = [
  { name: 'home', url: '/' },
  { name: 'chemistry', url: '/#/chemistry' },
  { name: 'chemistry-water', url: '/?molecule=water#/chemistry' },
  { name: 'chemistry-periodic', url: '/?csec=periodic#/chemistry' },
  { name: 'anatomy', url: '/#/anatomy' },
  { name: 'anatomy-bones', url: '/?asys=skeletal#/anatomy' },
  { name: 'biology', url: '/#/biology' },
  { name: 'biology-enzymes', url: '/?bsec=enzymes#/biology' },
  { name: 'physics', url: '/#/physics' },
  { name: 'physics-throwing', url: '/?experiment=projectile#/physics' },
  { name: 'mathematics', url: '/#/mathematics' },
  { name: 'mathematics-graphs', url: '/?msec=functions#/mathematics' },
] as const

export const DESIGN_SIZES = [
  { name: 'phone', width: 390, height: 844 },
  { name: 'tablet', width: 768, height: 1024 },
  { name: 'laptop', width: 1440, height: 900 },
] as const

/** The smallest phone the site supports; only checked for sideways scrolling. */
export const SMALLEST_PHONE = { name: 'small-phone', width: 320, height: 568 } as const
