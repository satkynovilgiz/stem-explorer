/** Colors used inside WebGL, mirroring the CSS tokens in styles/tokens.css. */
export const SCENE = {
  /* Light and neutral, as in the design mockup, so the atom colours read clearly. */
  background: '#eef1ec',
  accent: '#0b5f5b',
  /** Measurement overlays and measured atoms (mirrors --color-measure). */
  measure: '#b07400',
  hover: '#bfe0db',
  aromaticDash: '#5b6663',
  bondRadius: 0.075,
  /** Gap between parallel sticks of a double/triple bond, in Å. */
  multiBondSpacing: 0.2,
} as const
