/** Colors shared by the 3D scene, legend and graphs. Mirrors the CSS tokens. */
export const SCENE_COLORS = {
  background: '#121518',
  ground: '#171b1f',
  grid: '#262c31',
  axis: '#8a959e',
  path: '#2fc4c0',
  preview: '#6fe0dc',
  runA: '#c9a2f2',
  projectile: '#e8ecef',
  // Distinct from the teal path: the velocity arrow is tangent to it and would otherwise merge.
  velocity: '#7aa7ff',
  component: '#b3c9ff',
  acceleration: '#f5c26b',
} as const
