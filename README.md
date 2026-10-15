# STEM Explorer

An interactive science exploration workspace: **explore → interact → understand**.
Users rotate, zoom, select and measure parts of 3D models and read concise, sourced explanations.

Five subjects are planned — Anatomy, Chemistry, Physics, Mathematics and Biology.
**Chemistry Explorer** is implemented; the other four subjects show an honest "Coming soon" page
describing the planned experience.

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
```

## Stack

React 19 · TypeScript · Vite 8 · Three.js via React Three Fiber 9 and Drei 10 · Lucide icons ·
plain CSS with design tokens · Vitest for unit tests. No backend, accounts, API keys or third-party
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

### Shareable URLs

The address keeps the molecule and display mode, for example:

```
http://localhost:5173/?molecule=benzene&view=space-filling#/chemistry
```

- `molecule`: one of `water`, `carbon-dioxide`, `methane`, `ammonia`, `ethanol`, `benzene`.
- `view`: `ball-and-stick` or `space-filling`.
- Unknown or missing values fall back to water and ball & stick, and the address is corrected.
- **Copy link** copies the current address and reports success or failure. A `localhost` link only
  works on the computer running the dev server; nothing is deployed.

## Coordinates, units and scientific limitations

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

## Sources

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

`npm test` runs focused unit tests:

| File | What it checks |
| --- | --- |
| `src/lib/measurement.test.ts` | Distances and angles against known geometry (3-4-5 triangle, 90°, 60°, 180°). It also covers the cosine clamp, zero-length arms, duplicate and restarting selections, and bond-length vs. interatomic-distance and bond-angle labels. |
| `src/data/chemistry/molecules.test.ts` | Atom counts match formulas, unique IDs, and valid, non-duplicate bond references. It also checks connectivity, plausible bonded distances, cited coordinate sources, and that coordinates reproduce every reported bond length and angle. |
| `src/features/chemistry/state.test.ts` | Switching molecules mid-measurement clears it but keeps the mode. Also unknown atoms, duplicate picks, announcements, and clearing. |
| `src/lib/urlState.test.ts` | Restoring valid parameters, falling back on invalid, missing or partial ones, and round-tripping. |
| `src/features/chemistry/scene/measurementGeometry.test.ts` | Angle arc and label placement, including straight and degenerate angles. |

Browser behavior was checked with a headless-Chrome script during development (not part of the
repository): all six molecules, search, measurement workflows, URL restore, copy link, reset, mobile
layout, keyboard tabs and the WebGL fallback.

## Project structure

```
src/
  App.tsx                       hash routing between subjects (#/chemistry, #/physics, …)
  components/                   shell: TopNav, ComingSoon, ErrorBoundary, Tabs, SubjectIcon
  data/
    subjects.ts                 subject list and planned features
    chemistry/                  typed element and molecule data (types.ts, elements.ts, molecules.ts)
  lib/
    measurement.ts              distance/angle math, selection rules, formatting
    urlState.ts                 ?molecule=…&view=… parsing and writing
    chemistry.ts                search, formulas, composition, neighbors
    hooks.ts, webgl.ts          media-query/hash hooks, WebGL detection
  features/chemistry/
    state.ts                    explorer reducer (molecule, view, mode, selections, announcements)
    ChemistryExplorer.tsx       layout, URL sync, live region
    InfoPanel.tsx, MeasurementPanel.tsx, SceneControls.tsx, MoleculeLibrary.tsx, …
    scene/                      R3F scene: viewport, atoms, bonds, measurement overlay, labels, camera
  styles/                       tokens.css (design tokens) and app.css
```

**Adding a molecule:**
1. Add an entry to `src/data/chemistry/molecules.ts` with source coordinates in Å, explicit bonds, a
   geometry kind, and sources.
2. Add any new element to `elements.ts`.
3. Add its reported values to the geometry table in `molecules.test.ts`.

## Known issues

- **`THREE.Clock` warning.** The console shows `THREE.Clock: This module has been deprecated. Please
  use THREE.Timer instead.` once per 3D view mount.
  - React Three Fiber 9.8.2 creates `new THREE.Clock()` in its root store
    (`node_modules/@react-three/fiber/dist/events-*.esm.js`).
  - Three.js has warned in the `Clock` constructor since r183; this project uses 0.186.1.
  - 9.8.2 is the latest R3F release, so there is no fixed version to upgrade to yet.
  - The warning is harmless and is deliberately not suppressed.
- **Ending auto-rotate.** When a measurement mode pauses auto-rotate, the model glides to a stop over
  about half a second (camera damping). With `prefers-reduced-motion` it stops immediately.
