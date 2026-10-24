import { getRegion, type RegionId } from '../../../data/anatomy/atlas'

/*
 * Whole-body overview beside the focused 3D view: a flat silhouette (front view) with the chosen
 * region outlined, so the regional close-up never loses its place in the body. Decorative for
 * assistive technology: the region buttons in the panel do the same thing and say it in words.
 */

/** Region outlines in the overview's 60 × 140 coordinate space (y down, front view). */
const REGION_BOXES: Partial<Record<RegionId, { x: number; y: number; w: number; h: number }[]>> = {
  'head-neck': [{ x: 22, y: 2, w: 16, h: 24 }],
  thorax: [{ x: 16, y: 26, w: 28, h: 22 }],
  abdomen: [{ x: 17, y: 48, w: 26, h: 16 }],
  pelvis: [{ x: 17, y: 64, w: 26, h: 12 }],
  'upper-limb': [
    { x: 4, y: 26, w: 12, h: 50 },
    { x: 44, y: 26, w: 12, h: 50 },
  ],
  'lower-limb': [{ x: 17, y: 76, w: 26, h: 62 }],
}

export function BodyOverview({ region, onRegion, disabled }: { region: RegionId; onRegion: (r: RegionId) => void; disabled?: boolean }) {
  const boxes = REGION_BOXES[region] ?? []
  return (
    <div className="body-overview" aria-hidden="true">
      <svg viewBox="0 0 60 140" width="60" height="140">
        <g className="body-overview-figure">
          <circle cx="30" cy="12" r="8" />
          <rect x="26" y="20" width="8" height="6" rx="2" />
          <rect x="17" y="26" width="26" height="50" rx="7" />
          <rect x="7" y="28" width="7" height="46" rx="3.5" />
          <rect x="46" y="28" width="7" height="46" rx="3.5" />
          <rect x="18" y="74" width="10" height="62" rx="4" />
          <rect x="32" y="74" width="10" height="62" rx="4" />
        </g>
        {boxes.map((b, i) => (
          <rect key={i} className="body-overview-region" x={b.x} y={b.y} width={b.w} height={b.h} rx="3" />
        ))}
        {!disabled &&
          (Object.keys(REGION_BOXES) as RegionId[]).map((r) =>
          REGION_BOXES[r]!.map((b, i) => (
            <rect key={`${r}-${i}`} className="body-overview-hit" x={b.x} y={b.y} width={b.w} height={b.h} onClick={() => onRegion(r === region ? 'whole-body' : r)}>
              <title>{getRegion(r).name}</title>
            </rect>
          )),
        )}
      </svg>
      <span className="body-overview-caption">{region === 'whole-body' ? 'Whole body' : 'Overview · front'}</span>
    </div>
  )
}
