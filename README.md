# STEM Explorer

An interactive science exploration workspace: **explore → interact → understand**.
Users rotate, zoom, select and measure parts of 3D models and read concise, sourced explanations.

Five subjects are planned — Anatomy, Chemistry, Physics, Mathematics and Biology.
**Chemistry Explorer** (molecules and measurements), **Biology Explorer** (an interactive animal
cell) and **Physics Explorer** (a projectile motion lab) are implemented. Anatomy and Mathematics
show an honest "Coming soon" page.

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

## Shareable links and URL state

Subjects are hash routes (`#/chemistry`, `#/biology`). Each explorer keeps its state in its **own**
query parameters, so neither subject can change the other:

| Subject | Parameters | Values |
| --- | --- | --- |
| Chemistry | `molecule`, `view` | `water`, `carbon-dioxide`, `methane`, `ammonia`, `ethanol`, `benzene` · `ball-and-stick`, `space-filling` |
| Biology | `structure`, `cell` | `plasma-membrane`, `cytoplasm`, `nucleus`, `nucleolus`, `mitochondrion`, `rough-er`, `smooth-er`, `golgi`, `ribosome`, `lysosome` · `whole`, `cutaway` |
| Physics | `speed`, `angle`, `height`, `gravity` | plain numbers inside the ranges above; each invalid value falls back to its default on its own |

Examples:

```
/?molecule=benzene&view=space-filling#/chemistry
/?structure=golgi&cell=cutaway#/biology
/?speed=15&angle=60&height=10&gravity=1.62#/physics
```

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
| `src/lib/urlState.test.ts` | Valid and invalid parameters for all three subjects. Also that no subject reads another's keys, round trips, that time is never stored, and share links built from the given origin. |
| `src/physics/projectile.test.ts` | Known analytical cases: straight up (4 s, 20 m), horizontal launch, a raised start, dropping from rest, and the level-ground range formula. Also: constant vₓ and vᵧ slope −g; impact clamping (never below ground); immediate impact and very short flights; NaN and negative time; non-positive gravity; playback speed and frame rate not changing results; the frame-step cap; input parsing, clamping and rounding. |
| `src/features/physics/state.test.ts` | No auto-launch, edits reset to t = 0, Reset vs Restore defaults, pause/resume/landed announcements, scrubbing pauses, immediate impact, playback speed, and Run A storing inputs only. |
| `src/features/physics/sceneMath.test.ts` | Equal axis scales, framing all compared runs, tick steps and labels, and separate vector scales. |

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
- `chemistry.e2e.ts`: a regression check:
  - share links still restore, and Biology parameters are ignored;
  - all six molecules, and distance and angle measurements;
  - Copy link, and the remaining Coming soon pages.
- `physics.e2e.ts`: covers
  - no auto-launch, and typed input validation and clamping;
  - launch, pause, resume, landing and reset; Restore defaults;
  - scrubbing, with readouts and both graph markers in sync;
  - edits resetting time, and playback speed checked with Playwright's fake clock;
  - immediate impact and the A/B comparison;
  - URL restore, invalid values, subject switching with Back/Forward and refresh;
  - no history entries from sliders, and Copy link.
- `mobile.e2e.ts` (390 × 844):
  - Biology, Chemistry and Physics with no horizontal overflow and a prominent viewport;
  - touch targets of at least 40 px, the tab workflow, and normal page scrolling.
- `no-webgl.e2e.ts` (Chrome with `--disable-3d-apis`):
  - Biology and Chemistry fall back to text;
  - Physics keeps inputs, playback, readouts and graphs working;
  - 3D-only controls are hidden.

The test fixture fails a test on any console error or warning except two known, harmless ones: the
`THREE.Clock` notice (see Known issues), and Chrome's "GPU stall due to ReadPixels" driver note,
which test screenshots trigger. **Only Chromium (Google Chrome) has been tested**; Safari and
Firefox have not.

## Project structure

```
src/
  App.tsx                       hash routing between subjects (#/chemistry, #/physics, …)
  components/                   shell: TopNav, ComingSoon, ErrorBoundary, Tabs, ViewportShell, CopyLinkButton
  data/
    subjects.ts                 subject list and planned features
    chemistry/                  typed element and molecule data (types.ts, elements.ts, molecules.ts)
    biology/                    typed organelle content and sources (types.ts, organelles.ts)
  lib/
    measurement.ts              distance/angle math, selection rules, formatting
    urlState.ts                 per-subject URL parameters and share links
    chemistry.ts                search, formulas, composition, neighbors
    hooks.ts, webgl.ts          media-query/hash hooks, WebGL detection
  features/chemistry/
    state.ts                    explorer reducer (molecule, view, mode, selections, announcements)
    ChemistryExplorer.tsx       layout, URL sync, live region
    InfoPanel.tsx, MeasurementPanel.tsx, SceneControls.tsx, MoleculeLibrary.tsx, …
    scene/                      R3F scene: viewport, atoms, bonds, measurement overlay, labels, camera
  physics/
    projectile.ts               pure projectile-motion model (SI units, analytical, validation)
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

## Known issues

- **`THREE.Clock` warning.** The console shows `THREE.Clock: This module has been deprecated. Please
  use THREE.Timer instead.` once per 3D view mount, in Chemistry, Biology and Physics.
  - React Three Fiber 9.8.2 creates `new THREE.Clock()` in its root store
    (`node_modules/@react-three/fiber/dist/events-*.esm.js`).
  - Three.js has warned in the `Clock` constructor since r183; this project uses 0.186.1.
  - 9.8.2 is the latest R3F release, so there is no fixed version to upgrade to yet.
  - The warning is harmless and is deliberately not suppressed.
- **Ending auto-rotate.** When a measurement mode pauses auto-rotate, the model glides to a stop over
  about half a second (camera damping). With `prefers-reduced-motion` it stops immediately.
