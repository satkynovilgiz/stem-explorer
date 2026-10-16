# STEM Explorer

An interactive science exploration workspace: **explore → interact → understand**.
Users rotate, zoom, select and measure parts of 3D models and read concise, sourced explanations.

The app opens on a **Home page** (`#/home`) with search, the five subjects, featured explorations
and the explorations you saved or visited recently. All five subjects are implemented:
- **Anatomy Explorer:** the human heart, with a blood-flow tour.
- **Chemistry Explorer:** molecules and measurements.
- **Biology Explorer:** an interactive animal cell.
- **Physics Explorer:** a projectile motion lab.
- **Mathematics Explorer:** interactive 3D surfaces.

## Requirements

- Node.js 20.19+ or 22.12+ (developed on Node 24 LTS) and npm
- A browser with WebGL for the 3D view (molecule information works without it)

## Setup and commands

```bash
npm install          # install dependencies (uses package-lock.json)
npm run dev          # start the dev server at http://localhost:5173/
npm run build        # type-check (tsc -b) and build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # TypeScript only
npm run lint         # oxlint
npm test             # unit tests (Vitest, single run)
npm run test:watch   # unit tests in watch mode
npm run test:e2e     # browser tests (Playwright + your installed Google Chrome)
```

Browser tests build the app and serve it with `vite preview` on port 4173, then run in the
locally installed Google Chrome (`channel: 'chrome'`), so no browser download is needed.

## Stack

React 19 · TypeScript · Vite 8 · Three.js via React Three Fiber 9 and Drei 10 · Lucide icons ·
plain CSS with design tokens · Vitest for unit tests · Playwright for browser tests. No backend, accounts, API keys or third-party
3D assets. The Three.js bundle is lazy-loaded when the 3D viewer mounts, so text renders first.

## Anatomy Explorer — the human heart

> This is a simplified educational diagram in 3D. Shapes, proportions, vessel positions, and
> movement are schematic.

### Structures

**Chambers:**
- right atrium
- right ventricle
- left atrium
- left ventricle

**Valves:**
- tricuspid
- pulmonary
- mitral
- aortic

**Vessels and wall:**
- aorta
- pulmonary trunk with its left and right pulmonary arteries (simplified)
- pulmonary veins (four, simplified)
- superior and inferior venae cavae
- interventricular septum

Each entry in `src/data/anatomy/heart.ts` stores:
- a stable ID, a summary and details;
- connections to other structures, shown as links that select them;
- its oxygen-pathway colour, what the model simplifies, and its source pages.

### Orientation and colours

- **Anterior view:** the model is shown as if you face a person's chest. Left and right always mean
  the **body's** left and right, so the heart's right side appears on your left.
- **Orientation labels:** "Body's right", "Body's left", "Superior" and "Inferior" labels move with
  the model and stay visible even with labels turned off.
- **Colours:** blue marks the relatively oxygen-poor pathway (venae cavae, right heart, pulmonary
  trunk) and red the oxygen-rich pathway (pulmonary veins, left heart, aorta).
  - The legend says these are diagram colours.
  - Blood is never blue: oxygen-rich blood is bright red and oxygen-poor blood darker red (OpenStax
    §18.3).
- **Layout:** the layout follows the textbook arrangement in simplified form.
  - The pulmonary trunk leaves the right ventricle and rises in front of, and to the body's left
    of, the ascending aorta.
  - The aorta arches over toward the body's left.
  - The right pulmonary artery passes behind the aorta and the superior vena cava.
  - Vessel clearances were checked numerically so that unconnected vessels do not touch.

### Controls

| Control | Behavior |
| --- | --- |
| **Whole / Cutaway** | Whole shows the closed chambers and vessels. Cutaway opens the front of each chamber and shows the valves and the septum. Choosing an internal structure switches to Cutaway. |
| **Click / list** | Selects a structure (searchable list of 14). Clicking empty space clears the selection; releasing after a rotation drag is not a click. |
| **Focus** | Moves the camera to the selected structure, only when pressed. |
| **Isolate / Show all** | Shows only the selected structure; Show all restores the full heart and keeps the selection. |
| **Reset camera** | Returns to the default anterior view. |
| **Labels** | Turns structure labels on or off. Selected and tour structures, and orientation labels, stay labelled. |

- **Labels:** major structures are labelled by default. A label is hidden when other geometry is in
  front of it or when it would overlap a higher-priority label.
- **Details tabs:** Overview, Connections and Sources.
- **Camera moves:** they ease over about 0.6 s, or jump instantly with `prefers-reduced-motion`.

### Blood-flow tour

Start it with **Start blood-flow tour**; it never starts on its own. It has 14 steps, checked against
OpenStax A&P 2e §19.1:

1. Venae cavae (from the body)
2. Right atrium
3. Tricuspid valve
4. Right ventricle
5. Pulmonary valve
6. Pulmonary trunk and arteries
7. Lungs
8. Pulmonary veins
9. Left atrium
10. Mitral valve
11. Left ventricle
12. Aortic valve
13. Aorta
14. Body

- **Destinations:** the lungs and the body are labelled markers outside the heart, never heart
  structures.
- **Each step:**
  - highlights its structures and labels them "Step n";
  - shows a short explanation;
  - offers Previous, Next and step-dot buttons, all in HTML.
- **The marker:** a dashed path and a moving marker show direction only. They are labelled a
  conceptual pathway, and imply no real speed, timing, pressure or valve motion. With reduced motion
  the marker stays still.
- **Entering and exiting:**
  - Entering the tour switches to the cutaway view, and pauses selection and isolation.
  - Exit tour (or Finish) restores the previous view, selection and isolation.
  - Tour progress is never stored in the URL.

### Model simplifications

- Chambers are rounded shells and vessels are tubes. Sizes, wall thicknesses (including the thicker
  left ventricle) and valve geometry are not quantitatively accurate.
- Valves are rings with flat flaps in the source's cusp counts (tricuspid 3, mitral 2, semilunar 3).
  - They do not move.
  - The semilunar valves appear as collars at the vessel roots; their flaps are inside the vessel.
- Not drawn:
  - chordae tendineae and papillary muscles;
  - the coronary vessels;
  - the interatrial septum;
  - the aortic branches.
- The model shows no heartbeat or cardiac cycle.
- The content is paraphrased from OpenStax and has **not been reviewed by a medical expert**.
  Passing software tests does not establish anatomical accuracy.

### Without WebGL

The structure list, descriptions, sources and the full step-by-step tour (as HTML) keep working.
Only the 3D view and its toolbar are replaced by a message.

### Anatomy sources

- [OpenStax Anatomy and Physiology 2e — 19.1 Heart Anatomy](https://openstax.org/books/anatomy-and-physiology-2e/pages/19-1-heart-anatomy)
  covers:
  - chambers, valves and cusp counts, and the septa;
  - the vessels entering and leaving the heart;
  - the pulmonary and systemic circuits, and the thicker left ventricle.
- [OpenStax Anatomy and Physiology 2e — 18.3 Erythrocytes](https://openstax.org/books/anatomy-and-physiology-2e/pages/18-3-erythrocytes)
  covers bright red oxygenated versus darker red deoxygenated blood.

## Chemistry Explorer

### Molecules

| Molecule | Formula | Geometry shown |
| --- | --- | --- |
| Water | H₂O | Bent around O1 |
| Carbon dioxide | CO₂ | Linear; two C=O double bonds |
| Methane | CH₄ | Tetrahedral around C1 |
| Ammonia | NH₃ | Trigonal pyramidal around N1 (lone pair not drawn) |
| Ethanol | C₂H₆O | Approximately tetrahedral around C1 and C2, bent around O1; **one conformation** (anti) |
| Benzene | C₆H₆ | Planar ring, trigonal planar around every carbon; **aromatic** ring bonds |

Ethanol's groups rotate around its single bonds. The model shows only the anti (trans)
conformation listed by the source. Benzene's six equal C–C bonds are drawn as a solid stick plus a
dashed inner stick, a drawing convention for delocalized π bonding. They are not alternating single
and double bonds.

### Exploring

- **Library:** search by name, synonym or formula. Plain digits and Unicode subscripts both work:
  `co2`, `CO₂`, `c₂h₆o`, `C2H5OH`, `H3N`. There's a clear-search button and an empty state that
  lists the available molecules.
- **3D view:** drag to rotate, scroll or pinch to zoom. Use **Ball & stick** or **Space-filling**
  display, atom labels, auto-rotate and reset view.
- **Info panel:** the name, formula and summary are always visible. Below them are three tabs:
  - **Overview:** composition with a color legend, atom selection, and local shapes.
  - **Structure:** reported geometry tagged *Experimental*, why the shape forms, model versus
    measurement, and limitations.
  - **Sources:** reference links.
- **Atoms** have stable IDs (O1, H2, C3…). Selection is shown by a halo, a label, and a check
  mark or order number, never by color alone.

### Measuring distances and angles

The **Tool** group in the toolbar has three modes:

1. **Inspect** (default): click an atom, or use its button in *Overview → Atoms*, to see its element,
   symbol, atomic number and bonded neighbors. Clicking empty space clears the selection.
2. **Distance:** pick two different atoms. The result is a **bond length** when the atoms are bonded,
   otherwise an **interatomic distance** (marked *not bonded*). Shown in ångströms (Å).
3. **Angle:** pick three atoms in order, **end atom → vertex → end atom**; the angle is measured at the
   second atom. It is called a **bond angle** only when both arms are chemical bonds; otherwise it is a
   geometric angle. Shown in degrees.

You can pick atoms in the 3D view or with the atom buttons in the measurement panel under the view.
The panel lists the chosen atoms in order and has **Clear** and **Back to Inspect** buttons.

How the tools behave:

- The 3D view draws a dashed line for each pair, an arc at the vertex, and a value label. Overlays
  never intercept clicks or drags.
- Picking an atom that's already selected is ignored, with a short explanation. Picking after a
  complete measurement starts a new one.
- Switching molecules or tools clears the measurement. Clicking empty space does not.
- **Auto-rotate pauses while measuring.** The toolbar shows *Paused*, and rotation resumes when you
  return to Inspect.
- Results are announced once to screen readers through a polite live region, never per frame.

**Precision:** values are calculated from the model's source coordinates (never from screen
positions). Distances are rounded to 0.001 Å and angles to 0.1°. Cosines are clamped to [−1, 1]
before `acos`. They describe this static model, not a vibrating molecule.

## Biology Explorer — animal cell

> This is a simplified educational model of a generalized animal cell. Shapes, sizes, quantities,
> and positions are schematic; actual cells vary.

### Structures

Plasma membrane · Cytoplasm (with the cytoplasm/cytosol distinction) · Nucleus · Nucleolus ·
Mitochondria (4 in the model) · Rough ER · Smooth ER · Golgi apparatus · Ribosomes · Lysosomes (3).

Each entry in `src/data/biology/organelles.ts` stores:
- a stable ID, a name, and a short introduction;
- its main functions, a structural description, and key terms with definitions;
- relationships to other structures (shown as links that select them);
- what the model simplifies, and its source pages.

### Controls

| Control | Behavior |
| --- | --- |
| **Whole cell / Cutaway** | Whole cell shows only the closed membrane. Cutaway opens a wedge at the front of the membrane (and nucleus) so you can see inside. Choosing an internal structure from the list switches to Cutaway. |
| **Click the model / Structures list** | Selects a structure. Copies of mitochondria and lysosomes can be picked one at a time (in the scene, or with the 1–4 buttons in the details panel). They share one description. Clicking empty space clears the selection. |
| **Focus** | Moves the camera to the selection, only when pressed; selecting alone never moves the camera. |
| **Isolate / Show all** | Shows only the selected structure type (the rough ER keeps its attached ribosomes). Show all brings back the whole cell and keeps the selection. Changing view also exits isolation. |
| **Reset view** | Returns the camera to the starting view. |
| **Labels** | Turns the default labels on or off. The selected structure is always labelled. |

Details tabs: **Overview** (functions, key terms), **Structure & relationships**, and **Sources**.
Before anything is selected, the panel shows how to explore the cell.

Selection is shown in several ways, not by color alone:
- the structure glows brighter in its own color;
- its scene label gains a **Selected** badge;
- the list item shows a check mark and is marked pressed;
- the details panel names it.

Camera moves ease over about 0.6 s, or jump instantly with `prefers-reduced-motion`.

### Readable labels

- Only major structures are labelled by default, one label per type (not one per mitochondrion).
- Labels hidden behind other geometry are dropped: each frame, a ray is cast from the camera to the
  label's anchor point.
- Labels are placed in priority order, with the selected structure first. A label that would overlap
  one already placed is hidden.
- The HTML structures list is always available as a reliable alternative.

### Model simplifications

- Everything is drawn procedurally, with fixed (deterministic) placements and no downloaded assets.
  Shapes, sizes, counts and positions are schematic, not to scale.
- The cutaway is a removed wedge, not a true clipping plane. Organelles are drawn whole, and
  mitochondria are shown cut lengthwise so their cristae are visible.
- Ribosomes are greatly enlarged dots, selected as one group. The ER is a few sheets and tubes, not
  a full network. Chromatin and the cytoskeleton are not drawn.
- Colors are illustrative labels. Real organelles are mostly colorless and are seen with stains or
  other imaging techniques.

### Biology sources

All content is paraphrased from OpenStax textbooks (CC BY 4.0). Each structure lists the pages it uses:

- [Biology 2e — 4.3 Eukaryotic Cells](https://openstax.org/books/biology-2e/pages/4-3-eukaryotic-cells)
- [Biology 2e — 4.4 The Endomembrane System and Proteins](https://openstax.org/books/biology-2e/pages/4-4-the-endomembrane-system-and-proteins)
- [Biology 2e — 5.1 Components and Structure](https://openstax.org/books/biology-2e/pages/5-1-components-and-structure)
- [Biology 2e — 15.5 Ribosomes and Protein Synthesis](https://openstax.org/books/biology-2e/pages/15-5-ribosomes-and-protein-synthesis)
  — signal sequences; supports the note that not every protein passes through the Golgi
- [Anatomy and Physiology 2e — 3.2 The Cytoplasm and Cellular Organelles](https://openstax.org/books/anatomy-and-physiology-2e/pages/3-2-the-cytoplasm-and-cellular-organelles)
- [Anatomy and Physiology 2e — 3.3 The Nucleus and DNA Replication](https://openstax.org/books/anatomy-and-physiology-2e/pages/3-3-the-nucleus-and-dna-replication)

NCBI Bookshelf was considered but not cited: its pages returned a reCAPTCHA to automated checks, and
only pages that were actually read are referenced.

## Physics Explorer — projectile motion lab

Set the launch, predict the path, launch, pause, scrub through time, read synchronized values and
graphs, and compare two launches.

### Model assumptions

- No air resistance.
- Uniform, constant downward gravitational acceleration.
- A point-like projectile. The sphere is an enlarged, schematic marker.
- Flat ground at y = 0.
- No bounce: the motion stops at the analytical landing point and never goes below ground.

The motion happens in **one vertical plane**. The 3D view only lets you look at that plane from
different angles; it does not make the motion three-dimensional.

### Coordinates, units and equations

- Origin on the ground directly below the launch point. **x** is horizontal (positive in the launch
  direction) and **y** is height (positive up). Gravity therefore acts along −y: **a = (0, −g)**.
- SI units throughout: m, s, m/s, m/s². Angles are entered in degrees and converted to radians
  explicitly (`degToRad`).
- Formulas (OpenStax University Physics Vol. 1, §4.3 and §3.5):

| Quantity | Formula |
| --- | --- |
| Launch velocity | v₀ₓ = v₀ cos θ, v₀ᵧ = v₀ sin θ |
| Position | x = v₀ₓ t, y = y₀ + v₀ᵧ t − ½ g t² |
| Velocity | vₓ = v₀ₓ (constant), vᵧ = v₀ᵧ − g t |
| Landing time (y = 0) | t = (v₀ᵧ + √(v₀ᵧ² + 2 g y₀)) / g |
| Maximum height (if v₀ᵧ > 0) | y_max = y₀ + v₀ᵧ² / (2g), at t = v₀ᵧ / g |
| Landing distance | R = v₀ₓ · t_landing |

- **Landing time:** this is the non-negative root of y(t) = 0. Its discriminant is never negative
  because y₀ ≥ 0 and g > 0. The textbook R = v₀² sin 2θ / g is only the special case y₀ = 0; the
  tests check that the app agrees with it there.
- **Evaluation:** every visual and number is evaluated **analytically from the simulation time**
  (`stateAt` in `src/physics/projectile.ts`). Positions are never accumulated frame by frame.
- **Edge cases:**
  - zero speed and vertical or horizontal launches;
  - zero height and immediate impact (flight time 0);
  - very short flights, and non-finite input;
  - gravity ≤ 0 is rejected.
- **Display precision:** values are shown to about three significant figures (`formatSig`).

### Parameter ranges

| Input | Range | Step | Default |
| --- | --- | --- | --- |
| Launch speed v₀ | 0–50 m/s | 0.5 | 20 m/s |
| Launch angle θ | 0–90° | 1° | 45° |
| Initial height y₀ | 0–50 m | 0.5 | 0 m |
| Gravity g | 1–25 m/s² | 0.01 | 9.81 m/s² (approximate near-Earth value; real g varies ≈ 9.78–9.83) |

Each input has a slider and a typed field:
- The slider commits as it moves.
- Typed text commits on Enter or when the field loses focus, and only if it is a complete number.
  Empty or partial input ("", "-", "1.") is discarded.
- Out-of-range numbers are clamped and rounded to the input step.

### Playback and reset behavior

| Action | Behavior |
| --- | --- |
| Page load / shared link | Ready at t = 0; nothing launches automatically. |
| **Launch** | Plays from t = 0. Shows "Launch again" after landing. An immediate-impact setup lands without animating. |
| **Pause / Resume** | Freezes and continues time; Pause stops time immediately (no extra frame). |
| **Reset experiment** | Back to t = 0, keeping the current inputs. |
| **Restore defaults** | Restores the default inputs and returns to t = 0. |
| Editing any input | Returns to t = 0 and updates the preview. |
| **Time scrubber** | Pauses and moves the scene, readouts and graphs to the chosen time (0.01 s steps). |
| **Speed 0.25× – 2×** | Changes how fast simulated time passes, not the results. |
| Background tab | Each frame advances at most 0.1 s of real time, and the interval restarts when the tab becomes visible, so nothing jumps. On very slow devices playback runs slower than real time rather than skipping. |

Scene toolbar (shown only when 3D works): **Side view** (orthographic, equal scale on both axes) or
**Perspective**, **Reset camera**, and toggles for the dashed **Preview**, **Vectors** (velocity and
acceleration) and velocity **Components**.

The camera frames the whole flight (and Run A) once the inputs stop changing for 250 ms, so dragging
a slider never fights the user's camera.

### Vectors, values and graphs

- **Arrows:**
  - velocity is blue; its dashed components are light blue;
  - acceleration is amber;
  - velocity and acceleration have different units, so each has its own display scale, shown in the
    legend (for example "v: 1 m/s = 0.563 m"). Arrow lengths of different quantities cannot be
    compared.
- **Right now:** the values at the current time: t, x, y, vₓ, vᵧ, speed and a.
- **Predicted full flight:** flight time, maximum height, landing distance and impact speed, computed
  from the inputs.
- **Graphs:** two SVG graphs, height vs time and vertical velocity vs time. Each has:
  - axis titles with units and readable ticks;
  - a dashed current-time marker with a point on the curve;
  - a text readout at the current time and a short text summary;
  - Run A as a dotted line, with a text legend.

  The scene, readouts and graph markers all read one shared simulation clock.

### Comparing two launches

1. **Save as Run A** stores the current *inputs*. Results are always recomputed from them, never
   stored.
2. Change the inputs: the active run becomes **Run B (active)**, the only one that animates.
3. Run A is drawn as a static dotted path labelled "Run A (saved)", in the scene and in both graphs.
4. A table compares inputs, flight time, maximum height, landing distance and impact speed.
5. **Clear comparison** removes Run A.

### Physics sources

- [OpenStax University Physics Volume 1 — 4.3 Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion)
- [OpenStax University Physics Volume 1 — 3.5 Free Fall](https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall)

## Mathematics Explorer — interactive 3D surfaces

Choose a surface z = f(x, y), reshape it with parameters, read exact values at points, and cut it
with vertical cross-sections. The formulas are a fixed preset library: there is no formula entry,
no `eval`, and no computer algebra.

### Surface presets and parameter ranges

| Surface | Formula | Parameters (range, step, default) | Drawn domain | Mesh |
| --- | --- | --- | --- | --- |
| Plane | z = a·x + b·y + c | a: −2 to 2 (0.05, 0.5) · b: −2 to 2 (0.05, −0.25) · c: −3 to 3 (0.1, 1) | −3 ≤ x, y ≤ 3 | 24 × 24 |
| Elliptic paraboloid | z = a·x² + b·y² | a, b: 0.1 to 1.5 (0.05, 0.5), kept positive | −2 ≤ x, y ≤ 2 | 64 × 64 |
| Saddle (hyperbolic paraboloid) | z = a·x² − b·y² | a, b: 0.1 to 1.5 (0.05, 0.5), kept positive | −2 ≤ x, y ≤ 2 | 64 × 64 |
| Sinusoidal surface | z = A·sin(k·x)·cos(k·y) | A: −2 to 2 (0.05, 1) · k: 0 to 3 (0.05, 1) | −π ≤ x, y ≤ π | 120 × 120 |

- **Default:** the elliptic paraboloid opens by default. Choosing a preset restores that preset's
  default parameters, unless a valid shared link supplies them.
- **Sine and cosine:** they take radians. k is a spatial angular frequency (radians per unit of x or
  y; one wave spans 2π/k units), not a frequency in time.
- **Input fields:** each parameter has a slider and a typed field.
  - Typed text commits on Enter or blur, and only if it is a complete number.
  - Out-of-range values are clamped to the range and rounded to the step.
  - **Reset parameters** restores the preset defaults.
- **Formula display:** the current formula is shown with the parameter values substituted, for
  example z = 0.50·x² + 0.50·y².

### Coordinates

- x and y are the independent variables and z = f(x, y) is the height. They are abstract
  coordinates without units.
- Three.js uses Y as its up axis, so a single utility (`src/math/coordinates.ts`) maps
  (x, y, z) → (x, z, −y).
  - The mapping is a rotation, so nothing is mirrored and all axes keep a 1:1 scale.
  - The surface, axes, tick labels, point marker, slice plane, curve and camera presets all go
    through it.
- **Equal scale:** x, y and z share one world scale, so the vertical axis is never stretched. Only
  the tick spacing differs per axis.

### 3D view

- **Shading and grid lines:** the surface is shaded with height colors, and a **Grid lines**
  overlay (on by default) shows the shape without relying on color.
- **Height legend:** gives the numeric minimum, middle and maximum. A constant surface (for example
  A = 0) shows "constant z = …" instead of a color range.
- **Axes:** x runs along the front edge, y along the right edge and z up the front-left corner, with
  a reference grid on the floor of the axis box.
- **Views:**
  - **Perspective** can be rotated.
  - **Top**, **Front** (xz) and **Side** (yz) are orthographic and pan/zoom only.
  - **Fit surface** frames the whole surface and keeps the current viewing direction.
  - **Reset camera** returns to the default direction for the current view.
- **When the camera moves:** opening a preset, changing view, or pressing Fit or Reset. Parameter
  edits never move it.

### Point inspection

- **Choosing a point:** click the surface, or type x and y in the Explore tab. Releasing the mouse
  after a rotation drag does not pick a point.
- **Exact values:** the click hits a flat mesh triangle, so only its x and y are kept. z is always
  evaluated from the formula.
  - The readout shows x, y, z ≈ value and the substitution, for example
    z = 0.50·(1.00)² + 0.50·(−1.00)² ≈ 1.000.
  - Displayed numbers are rounded; the formula is exact.
- **Outside the domain:** coordinates outside the drawn domain are clamped, with a "Limited to the
  drawn domain" note.
- **The marker P:** it has a drop line to the floor and stays on the surface when parameters change.
  Switching preset clears the point.

### Cross-sections

- **Controls:** **Show cross-section** adds a vertical plane at x = constant or y = constant, with a
  slider and typed field for its position (0.05 steps).
- **The plane:** it is translucent and does not take clicks, so point picking still works through
  it.
- **The curve:** the highlighted curve and the one-variable formula are calculated directly from the
  surface function, not from triangle intersections.
- **The 2D graph:**
  - For x = constant the horizontal axis is **y**; for y = constant it is **x**. The vertical axis
    is always **z**.
  - Its z axis is scaled to fit, not to the same scale as the horizontal axis.
  - It includes a value table at five positions and a text summary.
- **Slice shapes:** the summary describes each slice as one of:
  - a straight line (plane);
  - a constant (for example a plane with zero slope in that direction, or a flat sine slice);
  - an upward parabola (paraboloid, and the saddle at y = constant);
  - a downward parabola (saddle at x = constant);
  - a sinusoidal wave whose amplitude depends on the slice position.

### Mesh approximation

- The 3D surface is a triangle mesh (segment counts in the table above) that approximates the
  continuous surface.
- The sinusoidal mesh keeps at least 40 samples per wave at the highest k.
- Point readouts, slice curves and slice graphs come from the formula, so they are not affected by
  the mesh. Only the drawn shape between grid points is approximate.

### Without WebGL

Only the 3D view is replaced by a message. Parameters, formulas, point evaluation and the
cross-section graph keep working, and the 3D-only toolbar is hidden.

### Mathematics sources

- [OpenStax Calculus Volume 3 — 4.1 Functions of Several Variables](https://openstax.org/books/calculus-volume-3/pages/4-1-functions-of-several-variables)
  covers:
  - graphs of z = f(x, y) as surfaces, and vertical traces;
  - examples with a plane, a paraboloid and sin x cos y.
- [OpenStax Calculus Volume 3 — 2.6 Quadric Surfaces](https://openstax.org/books/calculus-volume-3/pages/2-6-quadric-surfaces)
  covers:
  - traces;
  - elliptic and hyperbolic paraboloids.

## Home page, search and the exploration library

**Home** is `#/home`. It is also what you see with no hash or with any hash that is not a subject
(`#/`, `#/nowhere`). The brand logo and the **Home** tab in the top bar lead back to it. Home does
not mount a WebGL canvas and does not load the Three.js chunk.

Home is laid out as a dashboard, top to bottom:
- A short introduction with the global search as the main action, plus **Browse subjects**.
- A first-visit **welcome panel**, shown only while there is no history and nothing saved. It has
  two concrete starting points (a guided activity and the heart) and how exploring works. For
  returning visitors it is replaced by a compact **Continue exploring** strip of recent visits,
  and the guide moves behind **How it works**.
- **Subject cards** in each subject's accent colour (tokens `--subject-*`), with a small SVG
  illustration labelled as a simplified preview and the capabilities that exist today
  (`src/features/home/content.ts`, kept in step with the explorers).
- **Guided activities** with their learning goals, **Featured explorations**, and **Saved
  explorations** with backup.
- Library messages (saved, renamed, removed, cleared, imported, errors) appear in one dismissible
  status region at the bottom of the screen, so a message stays visible even when its section
  disappears (for example after Clear history).

Featured explorations are ordinary deep links that use only supported URL parameters. When a step
can't be stored in a URL (picking atoms for an angle, starting the blood-flow tour, saving a physics
Run A), the card says what to do next.

**Search** runs locally over a fixed index built from the app's own data (no network):
the five subjects, the six molecules (names, aliases and formulas, where `H2O` and `H₂O` both
match), the ten cell structures, the 14 heart structures, the four surface presets and the
projectile experiment. Each result shows its name, subject, a short description and a deep link.
Ranking: exact name or formula, then name prefix, then name or formula contains, then other terms.
The search box is a plain input followed by a list of links, so Tab moves into the results and
Enter opens one.

**Saved explorations.** Every explorer has **Save exploration** next to Copy link. It suggests a
name (for example *Water · ball and stick* or *Aorta · whole heart*) that you can change. Saved
entries appear on Home, where you can open, rename or remove them.

**Continue exploring** lists up to six recently visited explorations. A visit is recorded after
about 1.5 seconds on a state, so quickly clicking through presets does not fill the list. Revisiting
the same state moves it to the top instead of adding a copy. **Clear history** empties the recent
list only; saved explorations are separate. The section is hidden until there is at least one
visit, and nothing is pre-filled.

**What is stored.** Both lists live in `localStorage` under `stem-explorer:saved` and
`stem-explorer:recent`, each as a JSON array. An entry has a schema version (`1`), a random ID, the
subject, the subject's canonical parameters, a title (up to 80 characters) and creation/update
times. Origins, camera positions, animation time, measurement picks and other transient state are
never stored. Links are rebuilt from the subject and parameters as a relative `?…#/subject`
address, so a stored entry can never navigate to another site.

**Canonical share state.** Copy link, Save exploration and recent history all use the same
parameters, produced by each subject's URL parser. Two states are the same exploration when their
validated parameters match (parameter order does not matter), so saving the same view twice reports
*Already saved as …* and offers to rename that entry instead of creating a duplicate. During the
Anatomy blood-flow tour, Copy link and Save exploration use the selection and view from before the
tour, which is what Exit tour restores.

**Limits and failures.**
- Saved explorations are kept **on this browser only**. They don't sync across devices or browsers,
  and clearing site data, private windows or browser storage policies remove them.
- At most 30 saved entries; saving more shows a message asking you to remove one.
- **Reading and writing are separate.** Reading never writes (there is no probe key). If writes fail,
  for example with `QuotaExceededError` when storage is full, saved entries stay listed and
  openable. The message names the cause and says that nothing changed. Removing the last saved
  entry deletes the key, which needs no space, so it works even when storage is full.
- **Damaged data is never overwritten.** If the saved list can't be parsed, Home says so and
  saving, renaming and removing are refused until site data is cleared; the stored text is left
  as it is. A damaged *recent* list is simply replaced, because history is disposable.
- Entries written by a newer schema version are kept untouched when this version rewrites the
  list. Entries of the current version whose parameters no longer validate are dropped.
- If storage is blocked entirely, Home says so and every explorer keeps working; Copy link still
  works.
- **Clear history** reports success only after the browser has really removed the list; if it
  refuses, the entries stay listed with an explanation.

**Backup and restore.** The Saved explorations panel has **Export** and **Import**.

Export downloads `stem-explorer-saved-YYYY-MM-DD.json` containing saved entries only (no recent
history, no local IDs, no origins):

```json
{
  "format": "stem-explorer.saved-explorations",
  "version": 1,
  "exportedAt": "2026-10-15T12:00:00.000Z",
  "entries": [
    {
      "title": "Bent water",
      "subject": "chemistry",
      "params": { "molecule": "water", "view": "ball-and-stick" },
      "createdAt": "2026-10-15T10:00:00.000Z",
      "updatedAt": "2026-10-15T10:00:00.000Z"
    }
  ]
}
```

Import is **merge-only**:
- Files over 1 MB are rejected before they are read. Text that isn't JSON, files without the format
  identifier, and other format versions are rejected with a message.
- Each entry is validated with the same canonical rules as URLs and stored entries. Titles are
  plain text (control characters removed, 80-character cap). Any other fields, such as a URL, are
  ignored, so an imported entry can only open its own subject state on this site.
- Nothing is written until a preview lists exactly which entries will be added, plus the duplicates
  (with the existing title that is kept), invalid entries with the reason, and entries beyond the
  30-item limit. The user then presses **Import N explorations**.
- On confirm, the saved list is read again immediately before writing and the import re-planned.
  The new plan must match the confirmed one entry by entry (canonical state, title and creation
  time), not just in count. If it differs (for example, another tab removed one entry and saved
  another), nothing is written. The refreshed preview is shown and needs its own confirmation. Otherwise the complete
  merged list (existing entries first, unchanged; imported entries after them with fresh local IDs)
  is written in a single `setItem`. If that write fails (for example because storage is full),
  existing data is unchanged and the failure is reported. Success is announced only after the write.
- Other open tabs pick up the imported entries through the `storage` event.

**Multiple tabs.** Open tabs stay in sync through the browser's `storage` event. A tab re-reads the
library only for events about `stem-explorer:saved`, `stem-explorer:recent`, or `localStorage.clear()`
(key `null`) on `localStorage`. Other keys and `sessionStorage` are ignored. Re-reading never
writes, so tabs cannot set each other off. The only automatic write is the recent-visit record,
made once per distinct view shown in that tab.

## Subject guides and glossary

**About this explorer.** Every explorer has the same collapsible panel, under the activity panel
(on phones, between the 3D view and the tabs). It contains:
- a plain-language summary, with a deeper explanation behind **Go deeper**;
- **key terms**: buttons that expand the shared glossary definition in place (click, tap or
  keyboard, never hover) and link to the glossary entry;
- equations or structural relationships, with a table of symbols and units;
- common misconceptions;
- what the visualization simplifies;
- what is **measured** data, what is **computed** from it, and what is only **illustrative**.

Each claim names the source that supports it, beside the claim.

**Glossary** (`#/glossary`, also in the top bar). It has search over terms and definitions, a subject
filter, and `?term=<id>` deep links that scroll to and highlight one entry. Each entry links to
places in the explorers where the term can be seen. Definitions are stored once
(`src/data/glossary.ts`):
- Biology structure terms are generated from the organelle content, not copied. A unit test fails
  if two copies of a term disagree; this caught a duplicate "Endomembrane system" definition
  during development.
- Entries without a citation are labelled as an app convention (e.g. *anterior view*) or a unit
  definition (*ångström*).
- Home search includes glossary entries, ranked after explorer content.

**Sources.** Guides and glossary cite sources by id from one registry (`src/data/sources.ts`), which
reuses the existing anatomy, biology and mathematics registries. Material new in this milestone
was checked against pages that could be read:
- OpenStax Chemistry 2e §7.2 (covalent bond, bond length) and §7.6 (VSEPR, lone pairs, bond angle);
- OpenStax University Physics Vol. 1 §3.5 (equal free-fall acceleration; 9.81 m/s² as an average) and §4.3;
- OpenStax A&P 2e §20.1 (arteries and veins named by flow direction; pulmonary vessels);
- OpenStax Biology 2e §4.3 (mitochondria in both plant and animal cells);
- OpenStax Calculus Vol. 3 §4.7.

No cell-size range is given, because the cited Biology page doesn't state one.

## Design conventions

Shared rules live in `src/styles/tokens.css` (colours, type scale, spacing, radii, motion) and
`src/styles/app.css`:
- **Buttons.** `.button` is the primary action. `.tool-button` is secondary and always has a visible
  outline. `.is-danger` marks destructive actions (red outline or hover). Every button type has a
  disabled style (dimmed, `not-allowed` cursor).
- **Toggles and segmented choices** use `aria-pressed`. "On" adds a bottom bar and heavier text as
  well as the accent fill, so the state never depends on colour alone.
- **Icon-only buttons** are named with `aria-label` and keep a native `title` for mouse users.
  Keyboard focus shows the same short name as a tooltip, with no hover needed.
- **Subject accents** (`--subject-*`) are used for chips, card edges and the recent strip.
- **Focus** is a 2 px ring on every focusable control (`:focus-visible`).
- **Status text** uses `.status-success` and `.status-error`. Home's library messages share one
  dismissible status region.
- **Reduced motion.** With `prefers-reduced-motion`, transitions and animations are effectively
  disabled, and scroll-into-view jumps instead of gliding. Camera damping already stops
  immediately.
- **3D labels** are kept inside the view (Anatomy and Physics clamp horizontally), so axis titles
  aren't clipped on narrow phones.

## Guided activities

Each explorer has one optional **Try this** activity, shown as a compact, collapsible panel at the top
of the right-hand column (on phones, between the 3D view and the tabs, never over the model). Home's
**Try a guided activity** section opens a subject with its activity introduction showing; the link
itself is the plain subject route, and nothing is put in the URL.

| Subject | Activity | Detected from app state | Marked by the user |
| --- | --- | --- | --- |
| Chemistry | Measure the H–O–H angle in water | Angle tool chosen; an angle with O as the vertex and both H as ends | Comparing with 109.5° |
| Biology | Find the Golgi apparatus and trace its cargo | Golgi selected; Golgi isolated; rough ER selected (via its relationship link) | Where products go |
| Physics | Compare 30° and 60° launches (20 m/s, h = 0, g = 9.81 m/s²) | 30° launch landed; Run A = 30°; angle 60° with everything else unchanged; 60° launch landed | — |
| Mathematics | Slice a saddle two ways | y = constant section on the saddle; a point within 0.1 of (0, 0) | Reading the x = 1 section; comparing shapes |
| Anatomy | Trace blood from the right ventricle to the lungs | Right ventricle selected; pulmonary valve selected; tour started; tour at “Lungs” | — |

**How it behaves**
- The introduction states the learning goal, the setup, and every parameter or selection that
  Start will change, compared with the current state. Nothing changes until **Start activity**.
- Each activity has 3–5 steps with optional hints, plus Previous, Next and Exit. Next is always
  available because the activities are optional. The last page explains what the observation
  shows, with source links.
- Detected steps tick when the explorer's real state matches. Reading and reflection steps have an
  **I’ve explored this** button. Nothing is ever ticked because time passed, and the summary says
  that ticks record actions, not understanding.
- Activity state lives outside the explorers' reducers. Progress is never written to the URL,
  saved explorations or history. The address bar shows the setup's ordinary parameters while the
  activity runs, so Copy link shares the view, not the activity.
- **Exit** restores the exploration configuration from before Start. In Physics, a flight that is
  playing is paused before the setup; Exit restores the earlier inputs, Run A and time, paused, and
  never resumes playback. In Anatomy, a running blood-flow tour is ended by Start (the introduction
  says so), and Exit returns to the view from before that tour. The activity's last steps use the
  tour itself.
- Going to another subject mid-activity ends it: the subject's own URL keys are put back to the
  pre-activity values, and the destination's state is untouched.
- **Without WebGL**, the steps that need the 3D view (the chemistry Angle tool and the biology
  Isolate control) switch to reading the same facts from the panels and become self-marked; every
  other step works as usual.

**Sources for the explanations.** The activities reuse the explorers' content and calculations
(the physics summary quotes `solveTrajectory`: both land 35.3 m away; 60° rises to 15.3 m in
3.53 s of flight, 30° to 5.10 m in 2.04 s). New explanations were checked against:
- OpenStax Chemistry 2e §7.6: lone pairs repel more strongly than bonding pairs, and water's
  angle is 104.5° rather than 109.5°.
- OpenStax University Physics Vol. 1 §4.3: R = v₀²·sin 2θ/g, and equal ranges for angles that add
  up to 90°.
- OpenStax Calculus Vol. 3 §4.7: saddle points, and the opposite-opening traces of z = x² − y².
- OpenStax Biology 2e §4.4 and OpenStax A&P 2e §§3.2 and 19.1, the explorers' existing sources.

## Shareable links and URL state

Subjects are hash routes (`#/chemistry`, `#/biology`); `#/home` and unknown routes show Home.
Each explorer keeps its state in its **own**
query parameters, so neither subject can change the other:

| Subject | Parameters | Values |
| --- | --- | --- |
| Chemistry | `molecule`, `view` | `water`, `carbon-dioxide`, `methane`, `ammonia`, `ethanol`, `benzene` · `ball-and-stick`, `space-filling` |
| Biology | `structure`, `cell` | `plasma-membrane`, `cytoplasm`, `nucleus`, `nucleolus`, `mitochondrion`, `rough-er`, `smooth-er`, `golgi`, `ribosome`, `lysosome` · `whole`, `cutaway` |
| Physics | `speed`, `angle`, `height`, `gravity` | plain numbers inside the ranges above; each invalid value falls back to its default on its own |
| Anatomy | `part`, `heart` | one of the 14 structure IDs (e.g. `mitral-valve`) · `whole`, `cutaway` |
| Mathematics | `surface`, the preset's parameters (`a`, `b`, `c` or `amp`, `k`), `slice`, `at` | `plane`, `paraboloid`, `saddle`, `sine` · numbers inside the preset's ranges · `x` or `y` · a position inside the domain |

Examples:

```
/?molecule=benzene&view=space-filling#/chemistry
/?structure=golgi&cell=cutaway#/biology
/?speed=15&angle=60&height=10&gravity=1.62#/physics
/?surface=saddle&a=1.2&b=0.3&slice=y&at=0.5#/mathematics
/?part=mitral-valve&heart=cutaway#/anatomy
```

Mathematics links store the preset, its parameters and the slice. They never store the camera or the
inspected point. Parameters belonging to a different preset are ignored, and when the preset
changes the previous preset's keys are removed from the address.

Physics links never contain animation time; they always open paused at t = 0. Slider movement
updates the address with `replaceState`, so it never adds history entries.

How the URL is kept up to date:

- **Invalid or missing values** fall back to defaults: water and ball & stick; no selection and
  cutaway. The address is then corrected. A Biology link to an internal structure opens in
  cutaway.
- **Selections** update the address with `replaceState`, so they don't add history entries.
- **Switching subjects** adds a history entry, so Back and Forward move between subjects. Each
  subject restores its own state from that entry. The router listens to both `hashchange` and
  `popstate`, because Back/Forward between entries with different query strings fires only
  `popstate`.
- **The address bar** keeps both subjects' parameters, so returning to a subject restores where you
  were.
- **Off-grid values** in a shared link (for example `gravity=9.806` on a 0.01 step) are snapped to
  the control's step when the page opens, and the address is rewritten to match what is shown.
- **Copy link** builds a link from the current browser origin (`window.location.origin`) containing
  only the current subject's parameters. It reports success or failure. A `localhost` link only
  works on the computer running the dev server.

## Chemistry: coordinates, units and scientific limitations

- **Units:** all coordinates are Cartesian positions in **ångströms (Å)**, stored exactly as listed by
  the source in `src/data/chemistry/molecules.ts`. The scene centers and rotates them **for display
  only**, and measurements use the stored values. Rotation and translation do not change distances or
  angles.
- **Geometry kind:** every molecule's coordinates are tagged `experimental`, `computed` or
  `illustrative`. All six current molecules use *experimental* equilibrium geometries compiled by
  NIST CCCBDB.
- **Explicit connectivity:** bonds are listed in the data with their order (1, 2, 3 or `aromatic`).
  They are never inferred from atom distances.
- **Ethanol data caveat:** CCCBDB cites ethanol's internal coordinates to Coussan et al. (1998), which
  reports only some bond lengths and angles. The remaining hydrogen positions come from the CCCBDB
  coordinate set. CCCBDB's internal coordinates and its Cartesian table also assign the two methyl
  C–H lengths (1.088 Å and 1.098 Å) to different hydrogens. The model follows the Cartesian table,
  so treat methyl C–H distances as approximate.
- **Static, simplified models:** atoms sit at fixed equilibrium positions. Real molecules vibrate,
  and electrons form clouds rather than hard spheres. Lone pairs, partial charges and orbitals are
  not drawn.
- **Sphere sizes:**
  - Ball-and-stick spheres are schematic: 28% of the van der Waals radius, so bonds stay visible.
  - Space-filling spheres use approximate Bondi van der Waals radii: how closely molecules pack, not
    a sharp atomic edge.
- **Colors:** colors are a CPK/Jmol-based labelling aid with no physical meaning. N and C match
  Jmol; H and O are slightly adjusted for the dark background.

## Chemistry sources

| Molecule | Coordinates and reported geometry | Identity |
| --- | --- | --- |
| Water | [CCCBDB H₂O](https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185) — O–H 0.958 Å, H–O–H 104.4776° (Hoy & Bunker, 1979) | [PubChem CID 962](https://pubchem.ncbi.nlm.nih.gov/compound/962) |
| Carbon dioxide | [CCCBDB CO₂](https://cccbdb.nist.gov/expgeom2x.asp?casno=124389) — C=O 1.162 Å, 180° (Herzberg, 1966) | [PubChem CID 280](https://pubchem.ncbi.nlm.nih.gov/compound/280) |
| Methane | [CCCBDB CH₄](https://cccbdb.nist.gov/expgeom2x.asp?casno=74828) — C–H 1.087 Å, H–C–H 109.471° | [PubChem CID 297](https://pubchem.ncbi.nlm.nih.gov/compound/297) |
| Ammonia | [CCCBDB NH₃](https://cccbdb.nist.gov/expgeom2x.asp?casno=7664417) — N–H 1.012 Å, H–N–H 106.67° (Herzberg, 1966) | [PubChem CID 222](https://pubchem.ncbi.nlm.nih.gov/compound/222) |
| Ethanol | [CCCBDB ethanol](https://cccbdb.nist.gov/expgeom2x.asp?casno=64175) — C–C 1.512, C–O 1.431, O–H 0.971 Å; C–C–O 107.8°, C–O–H 105.4° ([Coussan et al., J. Phys. Chem. A 1998, 102, 5789](https://doi.org/10.1021/jp9805961)) | [PubChem CID 702](https://pubchem.ncbi.nlm.nih.gov/compound/702) |
| Benzene | [CCCBDB C₆H₆](https://cccbdb.nist.gov/expgeom2x.asp?casno=71432) — C:C aromatic 1.397 Å, C–H 1.084 Å, 120° (Herzberg, 1966) | [PubChem CID 241](https://pubchem.ncbi.nlm.nih.gov/compound/241) |

- Van der Waals radii (H 1.20, C 1.70, N 1.55, O 1.52 Å): A. Bondi, *van der Waals Volumes and Radii*,
  J. Phys. Chem. 1964, 68, 441–451. <https://doi.org/10.1021/j100785a001>
- Element colors: [Jmol CPK colors](https://jmol.sourceforge.net/jscolors/)
- Shape explanations use standard VSEPR reasoning.

## Tests

**Unit tests** (`npm test`, Vitest):

| File | What it checks |
| --- | --- |
| `src/lib/measurement.test.ts` | Distance and angle maths against known geometry. Also the cosine clamp, zero-length arms, duplicate and restarting selections, and how results are labelled. |
| `src/data/chemistry/molecules.test.ts` | Atom counts against formulas, IDs, bonds and connectivity. Also cited sources, and that coordinates reproduce every reported bond length and angle. |
| `src/features/chemistry/state.test.ts` | Switching molecules mid-measurement, duplicate picks, announcements and clearing. |
| `src/features/chemistry/scene/measurementGeometry.test.ts` | Angle arc and label placement, including straight and degenerate angles. |
| `src/data/biology/organelles.test.ts` | Required structures with stable, URL-safe IDs; every content field present; known sources and related structures. Also that cytoplasm and cytosol are distinguished, and that the text never claims all proteins pass through the Golgi. |
| `src/features/biology/state.test.ts` | Selecting types and single copies, and rejecting invalid copies and IDs. Also auto-cutaway, isolation and Show all, clearing, and changing view. |
| `src/lib/urlState.test.ts` | Valid and invalid parameters for all five subjects. Also that no subject reads another's keys, round trips, that time is never stored, and share links built from the given origin. |
| `src/physics/projectile.test.ts` | Known analytical cases: straight up (4 s, 20 m), horizontal launch, a raised start, dropping from rest, and the level-ground range formula. Also: constant vₓ and vᵧ slope −g; impact clamping (never below ground); immediate impact and very short flights; NaN and negative time; non-positive gravity; playback speed and frame rate not changing results; the frame-step cap; input parsing, clamping and rounding. |
| `src/features/physics/state.test.ts` | No auto-launch, edits reset to t = 0, Reset vs Restore defaults, pause/resume/landed announcements, scrubbing pauses, immediate impact, playback speed, and Run A storing inputs only. |
| `src/features/physics/sceneMath.test.ts` | Equal axis scales, framing all compared runs, tick steps and labels, and separate vector scales. |
| `src/data/anatomy/heart.test.ts` | All 14 structures, with URL-safe IDs, known sources and valid, reciprocal connections. Also oxygen-pathway colours by side, cusp counts, the exact 14-step blood-flow order with external lungs and body, and valve-after-chamber ordering. |
| `src/features/anatomy/state.test.ts` | Auto-cutaway for internal structures and unknown IDs. Isolation, Show all and clearing. View changes. Tour bounds and navigation, selection locked during the tour, and exit restoring the previous state. The share state during the tour is the pre-tour state (review finding B). |
| `src/math/surfaces.test.ts` | Known values for every surface, and the coordinate mapping (round trip, right-handed). Slices: lines, constants, upward and downward parabolas, sinusoids, and zero amplitude, including very small non-zero amplitudes (review finding A). Parameter validation, domain clamping, sine sampling density, constant-height colors and formula formatting. |
| `src/features/mathematics/state.test.ts` | Preset switching resets to defaults; foreign or invalid parameters are ignored; clamping and reset; point clamping with feedback; the point following parameter changes; slice enable, axis and position. |
| `src/lib/backup.test.ts` | Export contents (saved only, no IDs, origins or history); round trip with fresh IDs; oversized, malformed, foreign and unsupported files; mixed new, duplicate and invalid entries, with existing titles kept and URL fields ignored; plain-text titles; the saved-item limit; a single write that leaves data unchanged on quota failure; refusing when the library changed since the preview, including when the count is unchanged but the entries differ; never overwriting a damaged list. |
| `src/features/activities/activities.test.ts` | One activity per subject with goal, setup, 3–5 steps, conclusion and https sources; no setup completes a step; the change lists; detection rules for every detected step (including the wrong vertex, changed speed and other surfaces); the Anatomy tour snapshot; Physics replace never resuming; the Physics summary matching `solveTrajectory`. |
| `src/data/glossary.test.ts` | Unique glossary ids and terms; biology terms shared by several structures have one definition and all reach the glossary; every entry cites known sources or is marked as a convention or unit; links are valid relative routes; every subject guide has every section, references existing terms and sources, and cites each deeper explanation. |
| `src/lib/searchIndex.test.ts` | Every subject, molecule, cell structure, heart structure and surface is indexed with a deep link that its subject's parser accepts; formula and subscript normalization; ranking; empty and unmatched queries. |
| `src/lib/explorationStore.test.ts` | Saving with schema version and relative route only; dedupe by canonical state; rename and remove; titles trimmed and capped; the saved limit; recent visits deduped and capped at six; Clear history leaving saved entries; malformed JSON, unknown versions and invalid parameters ignored. Storage reliability: failed reads vs empty lists, damaged lists never overwritten, quota and other write failures leaving data readable and unchanged, removing the last entry under quota, newer-version entries preserved, failed history clears, and the storage-event filter. |
| `src/features/mathematics/sceneGeometry.test.ts` | Mesh vertices lie on the surface; vertex and triangle counts; uniform color for a constant surface; the wireframe lies on the surface; the axis frame. |

**Browser tests** (`npm run test:e2e`, Playwright, `e2e/`), run in the local Google Chrome against
the production build:

- `biology.e2e.ts`: covers
  - opening Biology, the orientation and the disclaimer;
  - non-overlapping default labels;
  - selecting from the list and by clicking the 3D model, including a single mitochondrion;
  - whole-cell and cutaway views, Isolate / Show all, Labels, search and keyboard selection;
  - Focus and pixel-exact Reset view;
  - Copy link;
  - URL restore, invalid values, and switching subjects with Back/Forward and reload.
- `chemistry.e2e.ts`: a regression check (it also confirms no subject is a Coming soon page):
  - share links still restore, and Biology parameters are ignored;
  - all six molecules, and distance and angle measurements;
  - Copy link.
- `physics.e2e.ts`: covers
  - no auto-launch, and typed input validation and clamping;
  - launch, pause, resume, landing and reset; Restore defaults;
  - scrubbing, with readouts and both graph markers in sync;
  - edits resetting time, and playback speed checked with Playwright's fake clock;
  - immediate impact and the A/B comparison;
  - URL restore, invalid values, subject switching with Back/Forward and refresh;
  - no history entries from sliders, and Copy link.
- `anatomy.e2e.ts`: covers
  - orientation (the body's right drawn on the viewer's left), the disclaimer, legend and
    non-overlapping labels;
  - selecting from the list and the 3D model, connection links and sources;
  - whole and cutaway views; Isolate, Show all, Focus and Reset camera (checked by comparing
    frames);
  - the Labels toggle;
  - the full tour order, Previous/Next, step dots, the external destinations, and exit restoring
    state;
  - no autostart;
  - URL restore and invalid values, subject switching with Back/Forward and refresh, and Copy link.
- `mathematics.e2e.ts`: covers
  - all four presets, editing and resetting parameters, and partial typed input;
  - point entry with clamping, and clicking the surface (z checked against the formula);
  - slice direction and position kept in sync across formula, graph, table and URL;
  - slice shape descriptions;
  - camera presets, Fit surface and Reset camera, checked by comparing frames, and the camera
    staying put on parameter edits;
  - grid lines and the legend; URL restore and invalid values;
  - subject switching with Back/Forward and refresh;
  - no history entries from sliders, and Copy link.
- `home.e2e.ts`: covers
  - no hash and unknown hashes opening Home, with no canvas;
  - opening every subject from its card and returning with the logo and the Home tab;
  - Choose a subject, How it works, featured deep links and footer links;
  - search by formula (with subscripts), keyboard selection of a heart structure, cell structures,
    surfaces, the projectile lab, empty results and Clear;
  - save, duplicate detection, refresh, restore, rename and remove; Anatomy saved during the tour;
  - malformed stored data; recent history (only after visits, deduped, Clear history);
  - Back/Forward between Home and explorers, and direct deep links.
- `storage.e2e.ts`: two pages in one browser context (shared storage, real `storage` events):
  save, rename and remove propagating between tabs; idle tabs making no writes or events; unrelated
  keys not re-reading the library; full storage keeping entries readable and openable with accurate
  messages; a failed Clear history keeping the entries.
- `backup.e2e.ts`: export contents and the download name; export → import round trip; duplicates
  and invalid entries in the preview; malformed, foreign, unsupported-version and oversized files;
  the saved-item limit; quota failure without data loss; another tab refreshing after an import; a stale preview confirmed after another tab swapped entries (regression).
- `activities.e2e.ts`: each subject's activity end to end with the ordinary controls. Covers the
  Home entry, the change list, nothing changing before Start, the wrong-vertex angle not counting,
  reflection steps never ticking by time, Exit restoring the previous view and URL, Physics pausing
  first and exiting paused, Anatomy ending a running tour, leaving for another subject mid-activity,
  and keyboard collapse. `mobile.e2e.ts` and `no-webgl.e2e.ts` add the phone layout and the
  no-WebGL fallbacks.
- `glossary.e2e.ts`: the About this explorer panel in all five subjects (sections, Go deeper with
  sources, key terms expanding by keyboard); a term linking to its glossary entry and back to an
  explorer; glossary search, subject filter, convention labels and biology terms; Home search
  ranking definitions after explorations.
- `review.e2e.ts`: numeric fields that must not change values on focus and blur, off-grid shared
  values snapped and rewritten, and a sweep of boundary URLs for `NaN`, `Infinity` or `undefined`.
- `mobile.e2e.ts` (390 × 844):
  - all five subjects with no horizontal overflow and a prominent viewport;
  - touch targets of at least 40 px, the tab workflow, and normal page scrolling;
  - Home without horizontal overflow, search and opening subjects by tap;
  - Physics scene labels kept inside the 3D view.
- `no-webgl.e2e.ts` (Chrome with `--disable-3d-apis`):
  - Biology and Chemistry fall back to text;
  - Physics keeps inputs, playback, readouts and graphs working;
  - Mathematics keeps parameters, point evaluation and the slice graph working;
  - Anatomy keeps the list, sources and the HTML tour working;
  - 3D-only controls are hidden;
  - Home works and opens explorers.

The test fixture fails a test on any console error or warning except two known, harmless ones: the
`THREE.Clock` notice (see Known issues), and Chrome's "GPU stall due to ReadPixels" driver note,
which test screenshots trigger. **Only Chromium (Google Chrome) has been tested**; Safari and
Firefox have not.

## Project structure

```
src/
  App.tsx                       hash routing: Home (#/home, default) and subjects (#/chemistry, …)
  components/                   shell: TopNav, AppLink, ErrorBoundary, Tabs, ViewportShell, CopyLinkButton, ShareActions, RangeField
  features/home/                Home page, search, saved/recent sections, backup, activity entries, SVG subject illustrations
  features/activities/          guided-activity types, hook (state, detection, snapshot/restore) and panel
  features/guide/, features/glossary/   About this explorer panel, term buttons, source links; glossary page
  data/guides.ts, data/glossary.ts, data/sources.ts   subject guide content, shared definitions, source registry
  features/*/activity.ts        each subject's activity definition and setup
  data/
    subjects.ts                 subject list and planned features
    chemistry/                  typed element and molecule data (types.ts, elements.ts, molecules.ts)
    biology/                    typed organelle content and sources (types.ts, organelles.ts)
  lib/
    measurement.ts              distance/angle math, selection rules, formatting
    urlState.ts                 per-subject URL parameters and share links
    chemistry.ts                search, formulas, composition, neighbors
    hooks.ts, webgl.ts          routing and media-query hooks, WebGL detection
    explorations.ts             canonical share state, relative links and default titles
    explorationStore.ts         saved and recent explorations in localStorage (versioned, validated)
    useExplorationLibrary.ts    React hooks for the library, cross-tab sync and recording visits
    backup.ts                   backup export, import validation/preview planning and merge
    storeMessages.ts            user-facing messages for failed library operations
    searchIndex.ts              local search index and ranking
  features/chemistry/
    state.ts                    explorer reducer (molecule, view, mode, selections, announcements)
    ChemistryExplorer.tsx       layout, URL sync, live region
    InfoPanel.tsx, MeasurementPanel.tsx, SceneControls.tsx, MoleculeLibrary.tsx, …
    scene/                      R3F scene: viewport, atoms, bonds, measurement overlay, labels, camera
  physics/
    projectile.ts               pure projectile-motion model (SI units, analytical, validation)
  math/
    surfaces.ts                 surface presets: formulas, parameters, domains, slices, sources
    coordinates.ts, heightColor.ts   math ↔ Three.js mapping; height colour ramp
  data/anatomy/heart.ts         heart structures, connections, blood-flow steps and sources
  features/anatomy/
    state.ts                    selection, view, isolation and tour reducer
    HeartExplorer.tsx, HeartPanels.tsx
    scene/                      R3F heart: chambers, valves, septum, vessels, labels, camera, tour marker
  features/mathematics/
    state.ts, sceneGeometry.ts  explorer reducer; mesh, wireframe and axis-frame builders
    MathematicsExplorer.tsx, MathPanels.tsx, SliceGraph.tsx
    scene/                      R3F scene: surface, grid lines, axes, slice, point marker, camera
  features/physics/
    state.ts, clock.ts          experiment reducer and the shared simulation clock
    PhysicsExplorer.tsx         layout, playback loop, URL sync, live region
    ParamControl.tsx, PlaybackBar.tsx, TimeGraph.tsx, ResultsPanel.tsx, AboutPanel.tsx
    scene/                      R3F scene: ground, axes, paths, vectors, labels, camera
  features/biology/
    state.ts                    selection, instance, view and isolation reducer
    BiologyExplorer.tsx         layout, URL sync, live region
    StructureList.tsx, StructureDetails.tsx, CellToolbar.tsx
    scene/                      procedural cell (layout.ts, CellParts.tsx), labels, camera rig
e2e/                            Playwright browser tests
  styles/                       tokens.css (design tokens) and app.css
```

**Adding a molecule:**
1. Add an entry to `src/data/chemistry/molecules.ts` with source coordinates in Å, explicit bonds, a
   geometry kind, and sources.
2. Add any new element to `elements.ts`.
3. Add its reported values to the geometry table in `molecules.test.ts`.

## Fixed review findings

- **A. Small sine amplitudes shown as zero.** In Mathematics, a sine slice whose amplitude was tiny
  but not zero (for example `amp=0.05`, `k=0.05`, slice `x = 0.05`, amplitude ≈ 1.25 × 10⁻⁴) was
  described as the constant `z = 0`. A slice is now constant only when the amplitude is exactly
  zero or within floating-point residue (10⁻¹² of `A`) of it. Very small values are shown in
  scientific notation in the formula, table, readouts and graph ticks, and the formula uses `≈`
  when the coefficient is rounded.
- **B. Anatomy Copy link during the tour.** Copying a link during the blood-flow tour produced a
  link without the selected structure. Copy link (and Save exploration) now use the state from
  before the tour, the same state that Exit tour restores.

Also fixed during the review:
- Focusing and leaving a numeric field without typing could commit the rounded display value and
  silently change the value (Physics, Mathematics parameters, slice position and point
  coordinates). Fields now commit only when the text was edited.
- Shared values off a control's step are snapped on load, and the address is rewritten to match.
- The Physics time scrubber could stop just short of impact; its last position is now exactly the
  impact time.
- On phones, the Anatomy colour legend could cover the *Inferior* orientation label. Labels under
  the legend are moved above it or hidden.

## Known issues

- **`THREE.Clock` warning.** The console shows `THREE.Clock: This module has been deprecated. Please
  use THREE.Timer instead.` once per 3D view mount, in every 3D subject.
  - React Three Fiber 9.8.2 creates `new THREE.Clock()` in its root store
    (`node_modules/@react-three/fiber/dist/events-*.esm.js`).
  - Three.js has warned in the `Clock` constructor since r183; this project uses 0.186.1.
  - 9.8.2 is the latest R3F release, so there is no fixed version to upgrade to yet.
  - The warning is harmless and is deliberately not suppressed.
- **Ending auto-rotate.** When a measurement mode pauses auto-rotate, the model glides to a stop over
  about half a second (camera damping). With `prefers-reduced-motion` it stops immediately.
- **Saved explorations are per browser.** They are stored in `localStorage` and are not synced; see
  *Home page, search and the exploration library* for limits.
