import { ExternalLink } from 'lucide-react'
import { SOURCES } from '../../data/sources'
import { formatSig, type Trajectory } from '../../physics/projectile'
import { markerRadius, sceneBounds, vectorScales } from './sceneMath'

// Labels and links come from the shared registry; usedFor notes are specific to this panel.
const PHYSICS_SOURCES = [
  { ...SOURCES['up-4-3'], usedFor: 'Equations of motion, independence of horizontal and vertical motion, maximum height' },
  { ...SOURCES['up-3-5'], usedFor: 'Value and variation of g; sign convention with upward positive' },
]

export function AboutPanel({ trajectory, runA }: { trajectory: Trajectory; runA: Trajectory | null }) {
  const bounds = sceneBounds(runA ? [trajectory, runA] : [trajectory])
  const scales = vectorScales(trajectory, bounds.extent)
  return (
    <div className="info-body">
      <section className="info-section">
        <h3 className="section-title">Model assumptions</h3>
        <ul className="bullets">
          <li>No air resistance.</li>
          <li>Uniform, constant downward gravitational acceleration of magnitude g.</li>
          <li>A point-like projectile (the sphere is an enlarged, schematic marker).</li>
          <li>Flat ground at y = 0.</li>
          <li>No bounce: the motion stops at the analytical landing point.</li>
        </ul>
        <p className="prose">
          The motion happens in one vertical plane. The 3D view only lets you look at that plane from different angles;
          it does not make the motion three-dimensional.
        </p>
      </section>

      <section className="info-section">
        <h3 className="section-title">Coordinates and equations</h3>
        <p className="prose">
          The origin is on the ground directly below the launch point. x is horizontal (positive in the launch
          direction) and y is height (positive up), both in metres. Gravity therefore points in −y: a = (0, −g).
        </p>
        <dl className="equations">
          <div>
            <dt>Launch velocity</dt>
            <dd>
              v<sub>0x</sub> = v<sub>0</sub> cos θ, v<sub>0y</sub> = v<sub>0</sub> sin θ
            </dd>
          </div>
          <div>
            <dt>Position</dt>
            <dd>
              x = v<sub>0x</sub> t, y = y<sub>0</sub> + v<sub>0y</sub> t − ½ g t²
            </dd>
          </div>
          <div>
            <dt>Velocity</dt>
            <dd>
              v<sub>x</sub> = v<sub>0x</sub> (constant), v<sub>y</sub> = v<sub>0y</sub> − g t
            </dd>
          </div>
          <div>
            <dt>Landing time (y = 0)</dt>
            <dd>
              t = (v<sub>0y</sub> + √(v<sub>0y</sub>² + 2 g y<sub>0</sub>)) / g
            </dd>
          </div>
          <div>
            <dt>Maximum height (if v<sub>0y</sub> &gt; 0)</dt>
            <dd>
              y<sub>max</sub> = y<sub>0</sub> + v<sub>0y</sub>² / (2g), reached at t = v<sub>0y</sub> / g
            </dd>
          </div>
        </dl>
        <p className="prose">
          The app evaluates these formulas at the current time on every frame, so the marker, arrows, readouts and
          graphs always agree. The textbook range formula R = v<sub>0</sub>² sin 2θ / g is a special case that only
          applies when the launch height is zero.
        </p>
      </section>

      <section className="info-section">
        <h3 className="section-title">Reading the scene</h3>
        <ul className="bullets">
          <li>
            Axes use the same scale in x and y. The side view uses an orthographic camera, so the path is not distorted.
          </li>
          <li>
            Velocity arrow: 1 m/s is drawn as {formatSig(scales.velocity)} m. Acceleration arrow: 1 m/s² is drawn as{' '}
            {formatSig(scales.acceleration)} m. These are separate display scales: lengths of velocity and acceleration
            arrows cannot be compared with each other.
          </li>
          <li>Projectile marker radius: {formatSig(markerRadius(bounds.extent))} m on screen — schematic, not its size.</li>
          <li>g = 9.81 m/s² is an approximate near-Earth value; it varies from about 9.78 to 9.83 m/s².</li>
        </ul>
      </section>

      <section className="info-section">
        <h3 className="section-title">Sources</h3>
        <ul className="sources">
          {PHYSICS_SOURCES.map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noreferrer">
                {s.label}
                <ExternalLink size={12} aria-hidden="true" className="external-icon" />
                <span className="visually-hidden"> (opens in a new tab)</span>
              </a>
              <span className="source-use">{s.usedFor}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}
