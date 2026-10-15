/** Colors used inside WebGL, mirroring the CSS tokens in styles/tokens.css. */
export const SCENE = {
  background: '#121518',
  accent: '#2fc4c0',
  /** Measurement overlays and measured atoms (mirrors --color-measure). */
  measure: '#f5c26b',
  hover: '#1d4a49',
  aromaticDash: '#c3ccd2',
  bondRadius: 0.075,
  /** Gap between parallel sticks of a double/triple bond, in Å. */
  multiBondSpacing: 0.2,
} as const
