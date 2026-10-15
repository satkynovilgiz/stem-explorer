# STEM Explorer

An interactive science exploration workspace: **explore → interact → understand**.
Users rotate, zoom and select parts of 3D models and read concise, sourced explanations.

Five subjects are planned — Anatomy, Chemistry, Physics, Mathematics and Biology.
This first release fully implements **Chemistry Explorer**; the other four subjects show an
honest "Coming soon" page describing the planned experience.

## Requirements

- Node.js 20.19+ or 22.12+ (developed on Node 24 LTS) and npm
- A browser with WebGL for the 3D view (the rest of the app works without it)

## Setup and commands

```bash
npm install          # install dependencies (uses package-lock.json)
npm run dev          # start the dev server at http://localhost:5173/
npm run build        # type-check (tsc -b) and build to dist/
npm run preview      # serve the production build locally
npm run typecheck    # TypeScript only
npm run lint         # oxlint
```

## Stack

React 19 · TypeScript · Vite 8 · Three.js via React Three Fiber 9 and Drei 10 · Lucide icons ·
plain CSS with design tokens. No backend, accounts, API keys or third-party 3D assets.
The Three.js bundle is lazy-loaded when the 3D viewer mounts, so the interface and text render first.

## Chemistry Explorer features

- Molecule library with three molecules: water (H₂O), carbon dioxide (CO₂) and methane (CH₄)
- Search by name, alias or formula (`co2`, `CO₂`, `methane` all work)
- Procedurally generated atoms and bonds (double bonds drawn as parallel sticks)
- Rotate (drag) and zoom (scroll or pinch); panning is disabled to keep the model centered
- Click an atom to highlight it and show its element name, symbol, atomic number and bonded neighbors;
  click empty space to clear the selection
- Accessible alternative: atom buttons in the info panel select the same atoms
- Scene controls: reset view, toggle labels, toggle auto-rotation, and switch between
  ball-and-stick and space-filling display
- Info panel: name, formula with subscripts, element composition table, shape, bond angle, bond length,
  explanation of the shape, model-limitations note and links to sources
- Responsive: three columns on desktop; on screens under 900 px the viewport stays on top and the
  library and details move into tabs, with normal page scrolling outside the viewport
- Resilience: WebGL detection with a text fallback, an error boundary around the 3D view,
  recovery from a lost WebGL context, and a loading state while Three.js downloads
- Accessibility: keyboard-visible focus, skip link, labelled controls, `aria-pressed` toggles,
  ARIA tabs on mobile, and `prefers-reduced-motion` support (no damping and slower optional auto-rotation)

## Model limitations

- **Simplified, static models.** Atoms are shown at fixed equilibrium positions. Real molecules
  vibrate and rotate, and electrons form clouds rather than hard spheres. Lone pairs, partial charges
  and orbitals are not drawn.
- **Positions are to scale.** Bond lengths and angles use the experimental values listed below
  (in ångströms, 1 scene unit = 1 Å).
- **Ball-and-stick sphere sizes are schematic.** Each sphere is 28% of the element's van der Waals radius
  so that bonds remain visible. They are not physical atom sizes, and the app labels them that way.
- **Space-filling sizes are approximate.** They use Bondi van der Waals radii, which describe how closely
  non-bonded atoms pack. They are not a sharp boundary of the atom.
- Colors follow the CPK/Jmol convention and carry no physical meaning.

## Scientific data and sources

| Molecule | Geometry used | Source |
| --- | --- | --- |
| Water | O–H 0.958 Å, H–O–H 104.48° | [NIST CCCBDB, H₂O experimental geometry](https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185) (Hoy & Bunker, 1979) |
| Carbon dioxide | C=O 1.162 Å, O–C–O 180° | [NIST CCCBDB, CO₂ experimental geometry](https://cccbdb.nist.gov/expgeom2x.asp?casno=124389) (Herzberg, 1966) |
| Methane | C–H 1.087 Å, H–C–H 109.47° | [NIST CCCBDB, CH₄ experimental geometry](https://cccbdb.nist.gov/expgeom2x.asp?casno=74828) (Hirota, 1979) |

- Van der Waals radii (H 1.20 Å, C 1.70 Å, O 1.52 Å): A. Bondi, *van der Waals Volumes and Radii*,
  J. Phys. Chem. 1964, 68, 441–451. <https://doi.org/10.1021/j100785a001>
- Element colors: [Jmol CPK colors](https://jmol.sourceforge.net/jscolors/)
- Compound identity: PubChem [Water (CID 962)](https://pubchem.ncbi.nlm.nih.gov/compound/962),
  [Carbon dioxide (CID 280)](https://pubchem.ncbi.nlm.nih.gov/compound/280),
  [Methane (CID 297)](https://pubchem.ncbi.nlm.nih.gov/compound/297)

The shape explanations use standard VSEPR reasoning.

## Project structure

```
src/
  App.tsx                      hash routing between subjects (#/chemistry, #/physics, …)
  components/                  shell: TopNav, ComingSoon, ErrorBoundary, SubjectIcon
  data/
    subjects.ts                subject list and planned features
    chemistry/                 typed element and molecule data (types.ts, elements.ts, molecules.ts)
  lib/                         geometry helpers, chemistry helpers (search, composition), hooks, WebGL check
  features/chemistry/          Chemistry Explorer UI (library, info panel, atom picker, controls, tabs)
    scene/                     React Three Fiber scene (viewport, atoms, bonds, camera rig, labels)
  styles/                      tokens.css (design tokens) and app.css
```

To add a molecule, add an entry to `src/data/chemistry/molecules.ts`, using the helpers in
`src/lib/geometry.ts` or explicit coordinates in ångströms, and cite its sources. Any new element
also needs an entry in `elements.ts`.

## Known issues

- The browser console shows `THREE.Clock: This module has been deprecated`. It comes from inside
  React Three Fiber 9.8 running on Three.js 0.186, not from this project. It is harmless and should
  disappear in a future R3F release.
