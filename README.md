# STEM Explorer

An interactive science exploration workspace: **explore → interact → understand**.
Users rotate, zoom, select and measure parts of 3D models and read concise, sourced explanations.

The app opens on a **Home page** (`#/home`) with search, questions to explore, the five subjects
and their modules, featured explorations and the explorations you saved or visited recently.
Every explorer has breadcrumbs and a searchable **Topics** drawer. All five subjects are implemented:
- **Anatomy Explorer:** a schematic whole-body atlas with eleven organ-system layers, skeletal and
  muscular detail with elbow and knee demonstrations, organ-system tours and close-ups, and a
  detailed heart module with a blood-flow tour.
- **Chemistry Explorer:** molecules and measurements, the periodic table, atomic structure with
  isotopes, bonding and geometry, and a reaction and stoichiometry lab.
- **Biology Explorer:** animal, plant and bacterial cells, DNA and RNA, mitosis, meiosis,
  one-gene inheritance and energy processes.
- **Physics Explorer:** projectile, spring–mass, DC circuit, wave and geometric-optics labs.
- **Mathematics Explorer:** 2D functions with calculus tools, 3D surfaces, vectors with 2×2
  transformations, and descriptive statistics with binomial probability.

Across subjects there is a global **Search** page (`#/search`), curated **related topics** that
say whether a link is the same mathematics, a real connection or only an analogy, and a
**presentation mode** with PNG export. See *Search, related topics and presentation* and
*Content inventory, attribution and limitations*.

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

## Anatomy Explorer — whole-body atlas

`#/anatomy` opens the **body atlas**. The detailed heart explorer is a second module (**Body atlas
| Heart (detailed)** switch, or **Open the detailed heart explorer**). Links that contain a heart key
(`part`, `heart`) open the heart module, so every link, saved exploration and note made before the
atlas existed opens exactly as before. Switching modules adds a history entry, so Back returns to
the previous module.

> Every shape in the atlas is schematic: simple ellipsoids, rods, tubes and plates placed to show
> position and relationships. Shapes and sizes are not anatomically precise.

**Model provenance.** No third-party anatomical asset is used. The figure is generated from
primitives in `src/data/anatomy/atlas` (landmarks in `figure.ts`, eight-head drawing proportions,
not measurements). Licensed anatomical models such as BodyParts3D/Z-Anatomy (CC BY-SA) were
considered but not used: their accuracy, file size and share-alike terms could not be verified
for this app in this release. The inventory in the app repeats this ("Assets: none").

**Schema** (`src/data/anatomy/atlas/types.ts`). Each structure has:
- a stable `id` (never renamed; used in links, saved explorations and notes) and `name`;
- `system` (plus `alsoIn` for shared organs such as the pancreas) and `region`;
- `parent` and `related` structures (each relation is worded, e.g. "Drains urine into");
- `side` and `pairId` for left/right pairs, and `variant` for reproductive structures;
- `description` and `function`;
- `representation` (`individual`, `group` with a `grouping` explanation, or `container` for list
  categories), the drawn `shapes`, and `limitations` (or the system's limitation);
- `sources` (ids in `src/data/sources.ts`) and optional `aliases` for search.

Coordinates: feet at y = 0, top of the head at y = 10, +x is the body's **left**, +y superior,
+z anterior.

**Systems** (the eleven named in OpenStax A&P 2e §1.2): integumentary, skeletal, muscular,
nervous, cardiovascular, respiratory, digestive, urinary, endocrine, lymphatic and immune, and
reproductive. Each has a colour (identification only), default visibility and opacity, a summary,
a general limitation, explicit omissions and sources.

**Controls**
- **Front / Back / Side** (left lateral) views, drag to rotate, scroll or pinch to zoom, **Reset**,
  **Focus** (frames the selection), **Isolate** / **Show all**, **Labels**.
- **Region**: whole body, head and neck, thorax, abdomen, pelvis, back, upper limbs, lower limbs.
  The camera frames the region, the list shows only its structures, and everything else is drawn
  faintly (8% opacity) and can't be clicked.
- **Layers**: a checkbox and an opacity slider (10–100%) per system, plus presets (default,
  skeleton + muscles, hide all). Opacity is a view preference and is not stored in links.
- **Search** over names, well-established aliases (spine, windpipe, rib cage, fallopian tube, vas
  deferens) and system names.
- A hierarchical **HTML list** (system → category → structure) that does everything a click in
  the model does, and works without WebGL.
- **Orientation**: the panel states it in words for the current view ("Front (anterior) view: the
  body's right is on your left"). The view labels *Superior*, *Inferior*, *Body's right*, *Body's
  left*, *Anterior* and *Posterior* sit at fixed body positions, so they stay correct as you rotate;
  an axis seen end-on is hidden. A unit test checks the text against the camera geometry.
- Selecting a structure whose layer is hidden turns that layer on; one outside the region clears
  the region. The live region announces each change.
- **What is included**: per system, the individual and grouped structures, what else belongs to it,
  what is not included, and its limitation, with sources.

**Skeleton** (`structures/skeleton.ts`, OpenStax §7.1–7.4, 8.1–8.4, 9.1, 9.6). Divisions (axial,
appendicular) and categories (skull, vertebral column, thoracic cage, pelvic girdle, each limb,
each hand and foot) are list containers; the bones under them are drawn:
- skull: frontal, parietal (L/R), temporal (L/R), occipital, sphenoid, ethmoid, zygomatic (L/R),
  maxillae (grouped pair), nasal bones (grouped pair), mandible; the smaller facial bones
  (lacrimal, palatine, vomer, inferior conchae) are named as not drawn;
- vertebral regions: cervical (7 blocks), thoracic (12), lumbar (5), sacrum, coccyx;
- ribs 1–12 per side (true 1–7, false 8–12, floating 11–12) and the sternum (manubrium, body,
  xiphoid);
- clavicle and scapula (pectoral girdle), hip bone (ilium, ischium and pubis fused);
- humerus, ulna (medial), radius (lateral); femur, patella, tibia (medial, weight-bearing),
  fibula (lateral);
- hands and feet as three groups each, with the grouping explained: 8 carpals, 5 metacarpals, 14
  phalanges; 7 tarsals, 5 metatarsals, 14 phalanges. Each digit is one rod standing for its
  phalanges;
- joints (shoulder, elbow, hip, knee, each side) as markers with their type and movements; bones
  and muscles link to them ("Forms", "Flexes", "Extended by").

**Muscles** (`structures/muscles.ts`, §11.3–11.6): occipitofrontalis, orbicularis oculi and oris,
masseter, temporalis, sternocleidomastoid, trapezius; pectoralis major, serratus anterior, rectus
abdominis, external oblique, latissimus dorsi, erector spinae; deltoid, biceps brachii, brachialis,
brachioradialis, triceps brachii, forearm flexor and extensor compartments; gluteus maximus,
quadriceps femoris, sartorius, adductors, hamstrings, gastrocnemius, soleus, tibialis anterior.
Each is marked **Individual structure** or **Grouped representation** (with the members named).
Actions are paraphrased from the text. **Attachments** appear only where the section's text or
tables state them (masseter, temporalis, sternocleidomastoid, trapezius, serratus anterior, rectus
abdominis, sartorius, quadriceps insertion); for every other muscle the panel says they are not
listed. Lower-limb origins in OpenStax's tables are images, not text, so they were not used.

**Interactions**: Isolate one structure, **Isolate both sides** of a left/right pair, **Skeleton and
muscles together** (one toggle for both layers), and joint links from bones and muscles.

**Movement demonstrations** (`movements.ts`): **Elbow flexion** and **Knee flexion**, left or right.
- Each states its reference posture (the anatomical position), the movement's definition (§9.5:
  flexion decreases the angle between the bones; knee flexion brings the foot toward the posterior
  thigh), the joint and the principal structures: flexors (biceps brachii, brachialis,
  brachioradialis; hamstrings, sartorius) and the opposing extensor (triceps brachii; quadriceps).
  In the view they carry text labels ("Flexor · …", "Opposes · …"), not just a highlight.
- The view frames the limb exactly side-on. A small 2D sketch shows the same pose with the same
  anterior side, so the pose can be read without WebGL.
- The slider runs from **Extended (reference posture)** to **Flexed (end of this demonstration)**,
  described in words; no angles are shown, because no population-specific range of motion is
  claimed. **Play** sweeps out and back (4 s), pauses in a hidden tab, and is not offered with
  reduced motion.
- The model: rigid segments rotate about one transverse axis through the joint
  (`rotateAboutX`, unit tested). Muscles that cross the joint just stretch between their ends.
  Muscle shortening, forces, joint surfaces, ligaments, knee rolling/gliding and rotation, and
  patellar sliding are not modelled, and the panel says so. Demonstrations are never stored in
  links.

**Compare upper and lower limbs**: a table of girdle, proximal and distal segments, wrist/ankle
groups, palm/mid-foot, digits, main hinge, ball-and-socket joint, and hinge flexors and extensors,
with buttons that select each structure.

**Organ systems and tours** (panel *Organ systems and tours*). Each module card has **Show this
system** (that layer plus the skin for context), a tour, and a close-up where one exists:
- **Respiratory**: nasal cavity, pharynx (shared with the digestive system), larynx, trachea, left
  and right primary bronchi, lungs and diaphragm. Tour *Follow a breath of air* (8 steps: the
  conducting zone in order, gas exchange, what moves the air, breathing out). Close-up: **Gas
  exchange in an alveolus** (alveolus, capillary, respiratory membrane; O₂ in and CO₂ out by
  diffusion from higher to lower partial pressure; no values shown).
- **Digestive**: mouth, pharynx, esophagus, stomach, small intestine (duodenum around the head of
  the pancreas, plus jejunum and ileum drawn together because they have no clear boundary), large
  intestine; liver, gallbladder, bile ducts and pancreas. Tour *Follow food through the digestive
  tract* (9 steps). Bile and pancreatic juice are separate **Contribution (not part of the route)**
  steps, with a dashed badge, a different marker colour and the words; food never passes through
  the accessory organs.
- **Urinary**: kidneys, ureters, bladder, urethra. Tour *Follow urine from kidney to exit*.
  Close-up: **A nephron**: blood arrives at the glomerulus, filtration into Bowman's capsule, then
  modification along the tubule by reabsorption (about 99% of filtrate returned) and secretion
  (urea, K⁺, ammonia, creatinine, some drugs), then the collecting duct. It is stated as the broad
  sequence only.
- **Nervous**: brain as four regions (cerebrum, diencephalon, brain stem, cerebellum), spinal cord,
  cranial nerves (12 pairs, grouped), spinal nerves (31 pairs: 8 cervical, 12 thoracic, 5 lumbar, 5
  sacral, 1 coccygeal, drawn as stubs), and limb nerves, organised under *Central nervous system*
  and *Peripheral nervous system*. Tour *From a touch to a movement*: every step is labelled
  central or peripheral (sensation → spinal nerves → spinal cord → integration → down → out to
  muscles). It is labelled a conceptual sequence, not a real pathway.
- **Cardiovascular**: tour *The systemic circuit through the body* (heart → aorta → carotids →
  descending aorta and iliacs → femoral artery → capillaries (not drawn) → venae cavae → lungs).
  Two steps link to the detailed heart module, whose blood-flow tour covers the pulmonary circuit.

**Tours** (`src/data/anatomy/atlas/tours.ts`):
- They start only from a button. **Previous**, **Next**, a numbered step for direct selection and
  **Exit tour** / **Finish tour** are always available.
- Each step says what it represents, its kind (*Route*, *Contribution*, *What happens here*) and
  what is highlighted, with sources. Highlighted structures carry "Step n · name" labels.
- A marker moves along the step's path (2.5 s, repeating). With reduced motion it is shown still,
  with dots along the path, and the bar says so. The bar and the badge call the movement a
  conceptual route that is not timed.
- During a tour, selection and layer changes wait, and links, saves and notes use the view from
  before the tour. Exit restores that view exactly (selection, view, layers, opacity, region,
  configuration). Tours are never stored in links, and a reload ends one.
- Every tour has *All steps as text*. Close-ups have the same Previous/Next/steps controls and are
  plain SVG, so tours and close-ups work without WebGL.

**Where is it?** (`src/features/anatomy/atlas/WherePanels.tsx`, data in
`src/data/anatomy/atlas/relationships.ts`):
- **Find a structure** in the *Where is it?* panel (left column; on phones, the *Structures* tab).
  Choosing a result selects it, focuses its body region (head and neck, thorax, abdomen, pelvis,
  back, upper or lower limbs; structures spread over the body keep the whole body) and frames
  it with the camera.
- **In words.** The details panel's *Where is it?* section says the region, the body side and
  where that side appears in the current view (for example *on the body's left (on your right in
  this front view)*), and the system. Everything spatial is also available as text, so it works
  without WebGL.
- **Stated relationships.** Directional statements (superior/inferior, anterior/posterior,
  medial/lateral, proximal/distal, superficial/deep; the terms as defined in A&P 2e §1.6) are
  given **only where a cited section states them in words**. Each item shows the term as a
  labelled badge, the statement, a button to select the other structure, the source link and
  *Where in the source* (the section and subsection it paraphrases; no source text is copied). The
  one derived statement (the humerus is proximal to the radius and ulna) says how it follows from
  the source and the §1.6 definition. Structures with no stated relationship say so; nothing is
  read off the schematic geometry. Sources: §1.6, 8.2, 9.6, 11.5, 22.2, 22.3, 25.2, 25.3.
- **Also in this region** lists other structures with the same region tag, explicitly *not*
  measured distances.
- **Hidden layers.** Selecting a structure whose layer is hidden still turns the layer on (as
  before), and now the details panel says so in a highlighted note (*To show Left biceps
  brachii: the muscular layer was hidden, so it has been turned on.*). The same note explains a
  cleared region filter or a reproductive configuration being shown.

**Coordinated views.**
- **Region presets**: *Whole body, Head and neck, Thorax, Abdomen, Pelvis, Upper limbs, Lower
  limbs* as pressed buttons above the full *Region* list (which also has the back). The region
  stays in links (`region=`).
- **Whole-body overview**: a small flat front-view silhouette in the viewport's lower-left corner
  outlines the focused region, so a regional close-up keeps its place in the body. Clicking a
  region on it does what the preset does. It is decorative for assistive technology (the presets
  are the accessible equivalent) and hidden below 480 px.
- **Orientation indicator**: a compact axis glyph (lower right) with S/I, L/R (body's left and
  right) and A/P, recomputed from the camera every frame (`scene/orientation.ts`, unit tested
  against the front, back and side views). An axis seen end-on shows only the end facing you. It
  is drawn in SVG and included in PNG exports.
- Selection stays synchronized between the model, the list and the details, as before.

**Relationship explorations** (panel *Relationships*): *Diaphragm, lungs and the thoracic
cavity*, *Kidney, ureter and bladder*, and *Biceps, triceps, elbow and forearm bones*. Each opens
with a question, shows its systems with the skin for context, focuses the region, and numbers its
structures in the view (*1 · Left kidney*) and in a list. Its relationships come from the same
sourced list, with a *What the model can't show* note (for example: the pleurae and mediastinum
are not drawn; the bladder is shown at one size although it distends). The triceps item says the
cited text does not state its position in words, so none is given. While an exploration is open,
other selections wait, links and saves keep the view from before it, and *Close and restore my
view* brings that view back. Explorations are never stored in links (exports say so).

**Model readability changes in this release.**
- The diaphragm is now a dome (an upper half-ellipsoid, new `dome` option on ellipsoid shapes)
  under the lungs and heart with the liver beneath it, instead of a flat disc that cut through
  the lung bases. Its limitation text was updated.
- Unit tests check that the drawing does not contradict the stated directions (lungs above the
  diaphragm, kidneys beside the spine with the right one lower, adrenal glands above the
  kidneys, the bladder and urethra below them, the ulna medial to the radius, the biceps in front
  of the humerus and the brachialis behind the biceps). These checks don't make the shapes
  accurate; they only catch contradictions.
- Long button labels in side panels now wrap instead of widening the panel (the right panel was
  12 px wider than its column).
- **Assets:** no new assets. Every new shape, the overview silhouette and the indicator are drawn
  from code in this repository, so there is nothing third-party to license or redistribute.

**Reproductive anatomy** is off by default. Turning it on requires choosing **Typical ovarian
configuration** or **Typical testicular configuration** (OpenStax's terms; the chapter describes the
typical anatomy of XX and XY individuals). The panel says neither is universal and that intersex
variations are not modelled. Links store the choice (`repro=`), and a structure from one
configuration can't appear in a link for the other.

**Links**: `?atlas=<id>&bview=front|back|side&layers=<systems>&region=<id>&repro=ovarian|testicular`.
`bview` is always present; `layers` only when it differs from the default; `region` only when it is
not the whole body. Invalid values are rejected by the same parser that validates saved entries.

**Sources** (each read for this release): OpenStax Anatomy and Physiology 2e §1.2, 1.6, 5.1, 5.2,
7.1–7.4, 8.1–8.4, 9.1, 9.5, 9.6, 11.3–11.6, 12.1, 13.2, 13.4, 17.1, 17.3, 17.4, 17.6, 19.1, 20.3, 20.5, 21.1, 22.1–22.4, 23.1, 23.3–23.6,
25.2–25.6, 27.1 and 27.2. Unit tests check sourced relative positions (the right kidney lower than the
left, adrenal glands on the kidneys, the right lung shorter and wider), and that every structure
cites a registered source and states a limitation. Tests do not establish anatomical accuracy.

## Anatomy: detailed heart module

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

### Comparing vessels

**Compare vessels** (under Start blood-flow tour) compares two of the five great vessels side by
side. The comparison covers direction relative to the heart, the name (artery or vein), the
connected chamber, the circuit (pulmonary or systemic), oxygenation in normal adult circulation,
and main function. The facts restate the heart entries (OpenStax A&P 2e §19.1) in a comparable
form, `src/data/anatomy/vessels.ts`. A unit test checks that they agree with the heart data.

The panel explains that arteries and veins are named by flow direction, not oxygen content, with
the pulmonary vessels as the example (§20.1). It also states the context: a normal adult heart
after birth, drawn as a schematic, and colours are a convention. Presets: *Aorta vs pulmonary
trunk*, *Pulmonary arteries vs pulmonary veins* (the pulmonary trunk entry includes the
arteries), *Venae cavae vs aorta*.

**Rules.**
- **Entering** ends isolation. If a vessel was selected it becomes **A**; otherwise both slots
  start empty.
- **Picks** from the list or the model fill A, then B; later picks replace B. Picking a vessel
  already compared, or a chamber, valve or the septum, is refused with an announcement. Those
  items are disabled in the list.
- **Clear** one slot (clearing A moves B into A) or both. Clear selection clears both.
- **Leaving** keeps vessel A selected in normal exploring.
- Whole and Cutaway keep the comparison, because every vessel is visible in both views.
- Focus and Isolate are unavailable while comparing.
- **The tour:** comparison can't be entered during the tour (the button is disabled). Starting
  the tour closes the comparison, and Exit tour returns to normal exploring with vessel A
  selected, not to the comparison.
- **Links and Save** share vessel A as the selected structure. The comparison itself isn't stored,
  so existing `part`/`heart` links are unchanged.

**Marking without colour.** Both vessels are highlighted. Their 3D labels read "A · …" and "B · …",
with solid and dashed borders. The list shows A/B letter badges, and the slots and table headers
repeat the letters. All of it works from the HTML list and table without WebGL.

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

Chemistry has five sections (**Periodic table**, **Atomic structure**, **Molecules**, **Bonding and
geometry**, **Reactions and stoichiometry**), chosen with the module tabs. Links without a section key are molecule links, so every
older link and saved exploration opens as before. Other sections add `csec=periodic|atomic|bonding`,
plus `el=<1–118>` for the selected element. Invalid values are rejected by the same parser that
validates saved entries.

### Molecules

| Molecule | Formula | Geometry shown |
| --- | --- | --- |
| Water | H₂O | Bent around O1 |
| Carbon dioxide | CO₂ | Linear; two C=O double bonds |
| Methane | CH₄ | Tetrahedral around C1 |
| Ammonia | NH₃ | Trigonal pyramidal around N1 (lone pair not drawn) |
| Ethanol | C₂H₆O | Approximately tetrahedral around C1 and C2, bent around O1; **one conformation** (anti) |
| Benzene | C₆H₆ | Planar ring, trigonal planar around every carbon; **aromatic** ring bonds |
| Oxygen | O₂ | Linear (diatomic); O=O double bond |
| Nitrogen | N₂ | Linear (diatomic); N≡N triple bond |
| Hydrogen peroxide | H₂O₂ | Bent around each O; **non-planar** (H–O–O–H dihedral 119.8°) |
| Formaldehyde | CH₂O | Trigonal planar around C; C=O double bond; H–C–H 116.1° |
| Acetylene | C₂H₂ | Linear; C≡C triple bond |
| Ethene | C₂H₄ | Planar; trigonal planar around each C; C=C double bond |

The six molecules added in this release use CCCBDB experimental coordinates exactly as listed
(fetched for this release), with PubChem CIDs 977, 947, 784, 712, 6326 and 6325 checked for
formula. Each molecule's notes name the reference CCCBDB gives: Huber & Herzberg (1979) for O₂ and
N₂ (equilibrium re), Redington et al. (1962) for H₂O₂, Gurvich et al. (1989) for formaldehyde,
Kuchitsu (1998, an "rm structure") for acetylene, and Herzberg (1966) for ethene. All are labelled
*experimental*; none are computed. Unit tests reproduce each reported bond length, angle and the
H₂O₂ dihedral from the coordinates, and check the listed bond orders.

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


### Atomic structure

Pick an element (list, or Previous/Next). The panel shows:
- protons (Z) and electrons in the neutral atom (also Z);
- the electron configuration exactly as PubChem lists it, with superscripts, and PubChem's
  *predicted* or *calculated* note for some heavy elements;
- electrons per shell (from that configuration) and the molecules in this app containing the
  element.

**Neutrons** are shown only for isotopes in a small verified library: H-1/2/3 (deuterium, tritium),
C-12/13/14, N-14/15, O-16/17/18, Mg-24/25/26, Cl-35/37, Fe-54/56/57/58 and U-233/234/235/236/238, as
listed by NIST's *Atomic Weights and Isotopic Compositions*. Each row shows N = A − Z worked out.
Other elements say no isotope is in the library. Neutron counts are never estimated from atomic
weight, and abundances and isotopic masses are not shown.

The center shows either a **Shell diagram (simplified)** or **Orbitals (quantum picture)**:
- **Shell diagram**: electrons are evenly spaced, motionless dots on circles, one per shell, with
  the text that this is a counting picture. Electrons do not travel on circles like planets; the
  Bohr model's precise orbits were found untenable and it ignores electron–electron interactions
  (OpenStax §6.2).
- **Orbitals**: generic s (spherical) and p (dumbbell) shapes, described as regions where an
  electron is likely to be found, not paths (§6.3), plus a table of the element's occupied
  subshells.
Nothing in this section animates.

Data: `src/data/chemistry/atomic.data.ts` is generated from PubChem's periodic-table JSON (retrieved
2026-10-16: configurations and Pauling electronegativities, null where none is listed).
`atomic.ts` expands noble-gas cores, and unit tests check that every element expands to exactly Z
electrons.

### Bonding and geometry

- **Covalent, ionic and metallic bonding**, each with what holds the particles together, an
  example and typical properties (OpenStax §7.1, 7.2, 10.5).
- **When a single-molecule model does not apply**: the four kinds of crystalline solid. Only
  molecular solids are made of discrete molecules; in ionic, metallic and covalent network solids
  the bonding extends through the crystal, and a formula such as NaCl is a ratio of ions.
- **Geometry and polarity** for every molecule in the library. Polarity is given only where the
  cited section states it: water polar; CO₂, CH₄, O₂ and N₂ nonpolar. The rest say "not stated in
  this app's sources".
- **Electronegativity: a rough guide with limits**: pick two elements to see PubChem's values,
  |ΔEN| and a rule of thumb by element kind (two nonmetals generally covalent; a metal with a
  nonmetal often ionic). The text quotes OpenStax's counter-examples: HF (ΔEN ≈ 1.9) and NH₃ (≈ 0.9)
  are both polar covalent, while NaCl (≈ 2.1) and MnI₂ (≈ 1.0) are both ionic. It notes that
  tables differ, and no bond type is assigned from ΔEN alone.

### Reactions and stoichiometry

**Reactions and stoichiometry** (`csec=reactions&rx=<id>`) is a fifth Chemistry section. It is
plain HTML and SVG, loads when opened (a ~22 kB chunk) and needs no WebGL. Calculations live in
`src/chem/stoichiometry.ts`, content in `src/data/chemistry/reactions.ts`, and the UI in
`src/features/chemistry/reactions/ReactionLab.tsx`.

**Library** (10 reactions, each with its source section of OpenStax Chemistry 2e):

| Type | Reactions |
| --- | --- |
| Synthesis | N₂(g) + 3H₂(g) → 2NH₃(g) (§4.3); 2Na(s) + Cl₂(g) → 2NaCl(s) (§4.2); H₂(g) + Cl₂(g) → 2HCl(g) (§4.4) |
| Decomposition | 2H₂O → 2H₂ + O₂ (§4.1); 2NaN₃(s) → 3N₂(g) + 2Na(s), initiated by an electric current (§4.3) |
| Combustion | CH₄ + 2O₂ → CO₂ + 2H₂O (§4.1); 2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O (§4.3) |
| Precipitation | CaCl₂(aq) + 2AgNO₃(aq) → Ca(NO₃)₂(aq) + 2AgCl(s), with complete and net ionic Ag⁺(aq) + Cl⁻(aq) → AgCl(s) (§4.1) |
| Acid–base | Mg(OH)₂(s) + 2HCl(aq) → MgCl₂(aq) + 2H₂O(l) (§4.2) |
| Ionic equations | CO₂(aq) + 2NaOH(aq) → Na₂CO₃(aq) + H₂O(l), with complete and net ionic CO₂(aq) + 2OH⁻(aq) → CO₃²⁻(aq) + H₂O(l) (§4.1) |

- Physical states and conditions appear only where the cited section gives them. Where it gives
  none (water, methane, octane), the entry says so. Net ionic forms appear only where the section
  derives them; the antacid entry says its net ionic form is not shown.
- Every entry says that a balanced equation shows conservation of atoms (and charge), **not**
  that a reaction happens, how fast, how completely or under which conditions.

**Balancing.** Each reaction opens unbalanced (every coefficient 1). Coefficients are whole
numbers from 1 to 30, changed with − / + or typed (invalid entries such as 0 or 1.5 are ignored).
A table lists each element's atoms on both sides with *Equal* / *Differs* (and a check or cross
icon), plus a **Charge** row for ionic equations; the verdict says which elements differ, or that
the equation is balanced but not in smallest whole numbers. *Coefficient or subscript?* explains,
with the reaction's own first substance, that a coefficient counts formula units while a
subscript is part of the substance's identity. **Step by step** walks through balancing by
inspection (for octane, the 12½ O₂ that forces doubling); each step can be applied to the editor.
*Molecular / Complete ionic / Net ionic* switches the precipitation and CO₂ examples between
forms, names the spectator ions and checks charge.

**Particle picture.** A static SVG of the current coefficients: one group of circles per formula
unit, each circle labelled with its element symbol and CPK-coloured. It is labelled conceptual:
sizes, positions and spacing mean nothing, and it shows no mechanism, speed or conditions. It is
shown for up to 24 neutral formula units.

**Stoichiometry** (always uses the source's balanced equation, whatever the editor shows):
- **Molar masses** are sums of the CIAAW 2024 abridged standard atomic weights (based on *Atomic
  Weights 2021*), e.g. H 1.0080 ± 0.0002, O 15.999 ± 0.001, Cl 35.45 ± 0.01, shown to 0.01 g/mol.
  The uncertainties are listed; they are not propagated.
- **Mole-to-mole**: moles of every substance from a known amount, with the ratio used.
- **Limiting reactant and theoretical yield** (reactions with two or more reactants): amounts in g
  or mol per reactant; moles, moles ÷ coefficient, the limiting reactant(s) (all of them when the
  amounts are exactly in ratio, within a relative 10⁻⁹), the theoretical yield in g and mol for the
  chosen product, and what is left over. **Actual yield** (measured) gives the percent yield;
  above 100 % is shown with a note about measurement problems rather than clipped. The text keeps
  theoretical (calculated, complete reaction) and actual (measured, often lower) yield apart.
- Input: a finite, non-negative number up to 1 000 000; empty, negative, non-numeric and larger
  values show a message and are never coerced. A zero amount gives zero product with an
  explanation. Results are rounded to three significant figures for display (integers keep all
  their digits); calculations use full precision.

**Links** store the reaction only (`rx`), never coefficients or amounts; an unknown `rx` is
replaced by the default (methane combustion). Exports say that coefficients and amounts are not
restored.

### Periodic table

**Molecules / Periodic table** at the top of the Chemistry library switches the centre view. The
table and its data load only when this view is opened (a separate ~13 kB chunk).

- **Data.** All 118 elements, generated from the
  [PubChem Periodic Table](https://pubchem.ncbi.nlm.nih.gov/periodic-table/) REST data (NIH/NLM),
  retrieved 2026-10-16, into `src/data/chemistry/periodicTable.data.ts` (atomic number, symbol,
  name, PubChem category). Names use PubChem's US spellings (Aluminum, Cesium).
- **Positions** are computed from the atomic number (`positionOf`), not typed in. The layout
  follows the common IUPAC-style table: group 3 of periods 6 and 7 holds the placeholders
  "57–71" and "89–103", and La–Lu and Ac–Lr are drawn as two separate rows with no group number.
- **Classifications** (one filter at a time):
  - *Block* (s, p, d, f), derived from position. Helium is s-block (1s²) although it sits in group
    18. All 30 elements of the two separate rows are listed as f-block. References differ here:
    some place La and Ac, others Lu and Lr, in the d block under Sc and Y. This layout makes no
    claim about that choice.
  - *Category*, PubChem's GroupBlock labels (alkali metal … actinide). Other references draw the
    metal/metalloid/nonmetal boundaries differently, so the label always says "(PubChem)".
- **Not included:** atomic weights and isotope data. For elements with no stable isotopes, PubChem
  lists one isotope's mass, which is not a standard atomic weight, so masses are left out rather
  than shown misleadingly.
- **Access.** Each cell is a button named "Oxygen, O, atomic number 8"; arrow keys move between
  cells, and the selected cell is outlined and pressed. A **List** layout gives the same elements
  as a plain list. On phones, the table scrolls sideways inside its own panel; the page never
  does.
- **Selected element.** Symbol, atomic number, period, group, block and category. **In this app's
  molecules** opens any of the six molecules containing the element in the molecule view, where
  the measurement tools work as before.

## Biology Explorer — cells, DNA, division and energy

Biology has six sections (**Cells**, **DNA and RNA**, **Cell division**, **Meiosis**,
**Inheritance**, **Energy processes**). Links without `bsec` are cell links, so older links and
saves open as before; the other sections add `bsec=dna|division|meiosis|inheritance|energy`. Process sections are saved and shared as the section alone. They
are plain HTML and SVG, load when first opened, and need no WebGL.

### Bacterial cell

A third model, **Bacterium** (`type=bacterium`), is one representative rod-shaped bacterium with
nine structures of its own: capsule, cell wall, plasma membrane, cytoplasm, nucleoid, ribosomes,
flagellum, pili and fimbriae. It does not reuse the eukaryotic entries, whose text mentions the
nucleus and ER. Based on OpenStax Biology 2e §4.2:
- **Representative**: chromosomal DNA in a nucleoid (no membrane), ribosomes, a cell membrane and
  a cell wall. OpenStax lists these for prokaryotes in general, and the wall entry says this is a
  general statement.
- **Variable**: a capsule (many bacteria), and flagella, pili or fimbriae (some prokaryotes). Each
  is tagged "present in some bacteria", and the disclaimer says shape and size vary and states the
  0.1–5.0 µm vs 10–100 µm size difference.
- Whole view: the translucent capsule with the appendages outside it. Cutaway: a wedge opens
  through the capsule, wall and membrane.
- **Animal, plant and bacterial cells compared**: a table of membrane, ribosomes, where DNA is,
  membrane-bound organelles, chloroplasts, cell wall (cellulose vs peptidoglycan), appendages and
  typical diameter. Links select the structure in the model on screen.

### DNA and RNA

A flat, schematic segment of 12 base pairs, not a real gene and not a helix: coding strand 5′→3′
on top, template strand 3′→5′ below. Base letters are coloured by base and also written out. Rung
dashes show 2 or 3 hydrogen bonds. **Inspect a base pair** (buttons, or letters in the drawing)
gives both bases, purine/pyrimidine and the hydrogen bonds. Four manual steps cover the backbone,
pairing, strand direction and transcription. In the transcription step, **Add the next RNA
nucleotide** builds the RNA 5′→3′ against the template, and the result is the coding strand with
U for T (OpenStax §14.2, 15.1, 15.2). `src/data/biology/dna.ts` holds pairing, validation and
transcription, unit tested (mismatch detection included).

### Cell division

Seven manual steps: interphase (labelled *not part of mitosis*), prophase, prometaphase,
metaphase, anaphase and telophase (*part of mitosis*), and cytokinesis (*not part of mitosis:
divides the cytoplasm*).
- The illustrative cell has **4 chromosomes** (two homologous pairs, told apart by colour and
  length), stated with the note that human body cells have 46.
- Terms are consistent: 4 chromosomes of 2 sister chromatids until anaphase; then each chromatid
  is called a chromosome (8 in total, 4 to each pole); each daughter cell has 4.
- A note says mitosis does not make gametes; gametes come from meiosis, which halves the
  chromosome number (§10.1, 10.2, 11.1).
- A unit test checks that the drawing's chromatid count matches the text at every stage.

### Meiosis

**Meiosis** (`bsec=meiosis`) steps through nine stages with Previous/Next or direct steps:
interphase (one round of DNA replication), prophase I, metaphase I, anaphase I, telophase I and
cytokinesis, prophase II, metaphase II, anaphase II, telophase II and cytokinesis (OpenStax
Biology 2e §11.1).
- **Same cell as mitosis:** an illustrative animal cell with 2n = 4 (two homologous pairs, A
  longer and B shorter), as in OpenStax's own figure and this app's mitosis module (a unit test
  ties the two together). The text says human cells have 46.
- **Chromosomes are data** (`src/data/biology/meiosis.ts`): every chromosome has a pair, a parent
  of origin and one or two chromatids made of segments, and each stage is built from them. The
  drawing and a **counts table** (chromosomes, chromatids, chromosome sets and the contents of each
  cell, e.g. *AM (2 sister chromatids, carrying a crossed-over segment)*) are generated from the
  same data, and unit tests check the counts at every stage for every option: 4 chromosomes / 8
  chromatids (diploid) through anaphase I; 2 cells of 2 chromosomes / 4 chromatids (haploid) after
  telophase I; 4 single-chromatid chromosomes per cell in anaphase II; 4 haploid cells of 2
  single-chromatid chromosomes at the end.
- **Homologous chromosomes vs sister chromatids:** colour *and* an M/P letter show maternal and
  paternal origin; two bars joined at a centromere are one chromosome of two sister chromatids.
  Homologs separate in anaphase I, sisters in anaphase II.
- **Crossing over** (a checkbox): one exchange between nonsister chromatids of pair A in prophase
  I. With it, all four products are genetically different; without it, products come in identical
  pairs (tested).
- **Independent assortment** (*Pair B like pair A / Pair B flipped*): changes which chromosomes
  travel together from metaphase I; the text gives 2ⁿ (2² = 4 here, 2²³ for human gametes).
- Labelled conceptual: sizes, positions and shapes are schematic, stages run into each other, and
  no timing is shown.

**Mitosis versus meiosis** (the side panel) compares DNA replication, number of divisions, what
homologous chromosomes do, chromosome sets (2n → 2n vs 2n → n), products, and roles in animals,
in the same 2n = 4 context. It notes that roles depend on the life cycle: many fungi and algae
make spores by meiosis and plants alternate generations (§11.2).

### Inheritance

**Inheritance** (`bsec=inheritance&p1=…&p2=…`) is a one-gene Mendelian model using Mendel's pea
seed colour: *Y* (yellow) dominant over *y* (green) (§12.2). Human traits are deliberately not
used.
- **Assumptions** are listed: one gene with two alleles; complete dominance; each diploid parent
  passes on one of its alleles with probability ½; random combination of gametes; equal survival.
  The panel says many traits do not follow this model (incomplete dominance, codominance,
  multiple alleles, recessive lethals, sex linkage, and continuous traits such as height that many
  genes affect; §12.1, 12.2).
- **Parents** (YY, Yy or yy each) show their phenotype and their gametes with probabilities. The
  **Punnett square** has four equally likely cells (¼ each); the **probability table** gives
  exact fractions and percentages for each genotype and phenotype, explaining the sum rule.
  Unit tests check that genotype and phenotype probabilities total 1 for all nine crosses, and the
  1:2:1 / 3:1 / 1:1 results.
- **Sampling simulation:** 4, 20, 100, 1000 or any whole number up to 10 000 offspring, each
  getting one allele from each parent at random from a **seeded generator** (`src/lib/random.ts`,
  mulberry32). The seed is shown and editable: *Run with this seed* repeats exactly; *Run again*
  picks a new one. The table compares observed counts and shares with expected counts (n × p) and
  theoretical probabilities, and a bar chart shows observed shares as bars and theory as marks.
  The theoretical values are computed exactly and never depend on the simulation; the text says
  observed outcomes vary, especially in small samples.
- **Links** store the parent genotypes only (invalid values are corrected); simulation results,
  sample size and seed are not stored.

### Energy processes

Photosynthesis and cellular respiration side by side. Each has a **Simplified net equation**
(6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂ and its reverse, from OpenStax Concepts of Biology §4.1) kept apart
from its **pathway stages**:
- photosynthesis: light-dependent reactions (thylakoid membranes) and the Calvin cycle (stroma);
- respiration: glycolysis (cytoplasm), pyruvate oxidation and the citric acid cycle (matrix), and
  oxidative phosphorylation (inner mitochondrial membrane in eukaryotes).

Each stage has a short explanation, *Go deeper* and sources, and opens the chloroplast or
mitochondrion in the cell model where relevant. No ATP yields are given. A test checks that both
equations balance and are reverses of each other.

## Biology: animal cell model

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

### Animal and plant cells

**Animal cell / Plant cell** at the top of the structure list switches between two simplified
models. Both are schematic and not to scale.

- **Plant model (13 structures):** cell wall, plasma membrane, cytoplasm (with the cytosol
  distinction), nucleus and nucleolus, five chloroplasts, the large central vacuole and its
  membrane, three mitochondria, rough and smooth ER, Golgi apparatus and ribosomes. The box-shaped
  cell has the wall outside and the membrane just inside it.
  - In the whole-cell view only the wall is drawn. Everything else counts as internal and opens
    the cutaway when selected.
  - The vacuole membrane is drawn as an outer shell, opened in the cutaway, so the vacuole inside
    can be selected separately.
- **Shared behaviour.** Selection, copies (chloroplast 1–5, mitochondrion 1–3), Focus, Isolate,
  labels, the details tabs, sources and the accessible list work the same in both models.
- **Content** is from OpenStax Biology 2e §4.3, plus §4.4 for the Golgi's role in making
  cell-wall polysaccharides. It covers:
  - the cell wall (cellulose, outside the membrane, support; the membrane is still the selective
    barrier);
  - chloroplasts (photosynthesis; two membranes, thylakoids, grana, stroma, own DNA and
    ribosomes);
  - the central vacuole (water regulation, firmness against the wall, storage);
  - that plant cells also have mitochondria.

  The word "tonoplast" is not used, because the cited page does not use it.
- **Comparison panel** (details panel, nothing selected): structures in both models, those
  emphasized in the plant model, the lysosome as animal-model only, and the functional
  differences, each with its source. The textbook's statement about plant digestion is
  attributed ("the textbook describes digestion in plant cells as taking place in vacuoles"), not
  presented as a universal rule.
- **Switching models.** A structure both models share stays selected (as a whole type, because
  copy numbers differ), a structure the new model lacks is cleared with an announcement, and
  isolation ends. Related-structure links to something the current model doesn't have are shown
  as plain text, "(not in the plant model)".
- **Links.** `type=plant` is added only for the plant cell. Links without `type` are animal-cell
  links, so every existing link opens exactly as before. A plant-only structure in an animal link
  falls back to no selection.

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

## Physics Explorer — projectile, spring, circuit, wave and optics labs

Four experiments (**Projectile**, **Spring–mass**, **DC circuit**, **Wave**). Links without
`experiment` are projectile links; each switch removes the other experiments' keys.

### Projectile motion lab

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

### Spring–mass oscillation lab

**Projectile / Spring–mass** at the top of the inputs switches experiments. Each lab keeps its own
state and URL keys. The spring lab and its scene load only when opened (~15 kB + 3 kB).

- **Model** (OpenStax University Physics Vol. 1, §15.1–15.2): an ideal spring, F = −kx, attached to
  a block on a frictionless horizontal surface, with no damping.
  - Displacement x is measured from equilibrium, with +x to the right.
  - The block is released from rest; the initial velocity is fixed at 0 m/s and the panel says so.
  - x(t) = x₀ cos ωt, v = −x₀ω sin ωt, a = −ω²x, F = −kx, with ω = √(k/m), T = 2π√(m/k),
    f = 1/T.
  - K = ½mv², U = ½kx², E = ½kA².
  - Every value is evaluated analytically from one simulation clock (`src/physics/spring.ts`,
    separate from rendering), so playback speed and frame rate can't change results.
- **Inputs:** mass 0.1–10 kg (step 0.1), spring constant 1–200 N/m (step 1), initial
  displacement −0.5 to 0.5 m (step 0.01). Zero displacement is allowed: the block stays at rest,
  the energy is zero, and a note explains this (the period is still shown).
- **Playback:** launch, pause, resume, reset and a scrubber over a window of three periods. At the
  end of the window, playback stops ("End of the window") and **Launch again** restarts. When a
  background tab becomes visible again, playback continues from where it was instead of jumping
  ahead.
- **Readouts:** time, position, velocity, acceleration and restoring force. Energy bars for kinetic,
  spring-potential and total energy share one scale. A summary gives period, frequency, angular
  frequency, amplitude, maximum speed and total energy. The position–time graph has a current-time
  marker.
- **Scene:** a side view with the wall, coil, block, a dashed equilibrium line, ticks every 0.25 m,
  and a restoring-force arrow that always points toward x = 0. Without WebGL, the inputs, playback,
  readouts, energy bars and graph all still work.
- **Links:** `?experiment=spring&mass=…&k=…&x0=…`. Links without `experiment` are projectile links,
  exactly as before. Switching back to the projectile removes the spring keys. Shared links open
  paused at t = 0; off-step values are snapped and invalid ones fall back on their own.

### DC circuit lab

An ideal voltage source (no internal resistance, so the terminal voltage equals the emf), ideal
wires and ohmic resistors of fixed resistance (OpenStax University Physics Vol. 2 §9.1, 9.4, 9.5,
10.1, 10.2). There are five **preset arrangements** and no free-form builder: two or three
resistors in series, two or three in parallel, and R₁ in series with R₂ parallel to R₃.
- Inputs: source voltage 0.5–24 V (0.5 V steps) and resistances 1–1000 Ω (positive only, 1 Ω
  steps).
- **Readouts** per resistor: current, voltage drop and power; for the source: R_eq, current and
  power supplied. Small values use mA and mW.
- **Equations used**, substituted: R_eq (sum, reciprocal sum or the mixed form), I = ε/R_eq,
  V = IR, and P = IV = I²R = V²/R. The text checks that the power dissipated equals the εI
  supplied.
- The schematic is SVG. By default, still arrows show the **conventional-current** direction (+
  terminal → circuit → − terminal). **Show flow (conceptual)** starts markers that move at a fixed
  pace; more markers per length means more current. Their speed means nothing and they are not
  individual charges. The panel says that in metal wires electrons actually move the other way.
  With reduced motion only the arrows are shown.
- Links (`experiment=circuit&arr=…&emf=…&r1=…&r2=…[&r3=…]`) open with the markers paused.
  `src/physics/circuit.ts` is independent of rendering; tests cover series, parallel and mixed
  reference cases, power balance and boundary inputs.

### Wave lab

An ideal travelling sinusoidal wave y(x, t) = A sin(kx − ωt) moving in +x (Vol. 1 §16.1, 16.2).
- **Dependency, stated in the UI:** you set amplitude A, frequency f and wavelength λ (plus the
  inspected point x₀). The speed is derived, v = fλ, with no speed control, so v = fλ can't be
  violated. Readouts also give T = 1/f, k = 2π/λ and ω = 2πf, plus y and the medium's transverse
  velocity ∂y/∂t at x₀.
- **Play/Pause** (real time, looping over two periods, paused in a hidden tab; not offered with
  reduced motion) and a **time scrubber**. Links open paused at t = 0.
- The medium is a row of 49 particles moving only up and down. The inspected particle stays at
  x₀ with its vertical track drawn, while a marked crest travels at v. The text says the pattern
  and energy move but the medium does not.
- Two clearly titled graphs: **displacement vs position** at the current t (a snapshot), and
  **displacement vs time** at x₀ (one particle's history, with a time marker).
- Assumptions: one wave already filling the region, no damping, no reflections, and the speed is
  set via f and λ rather than from medium properties. Tests cover v = fλ, reference values,
  periodicity, the pattern's travel at v, the transverse velocity bound and input bounds.

### Optics lab

**Optics** (`experiment=optics`) is a fifth physics lab with two connected parts. It is static
(nothing animates), plain HTML and SVG, and needs no WebGL. Calculations are in
`src/physics/optics.ts`, the UI in `src/features/physics/optics/OpticsLab.tsx`. Sources: OpenStax
University Physics Volume 3 §1.1 (Table 1.1 indices at 589 nm), §1.2, §1.3, §1.4, §2.2 and §2.4.

**Reflection and refraction** (`opt=refraction&n1=…&n2=…&inc=…`):
- Inputs: n₁ and n₂ from 1.0000 to 2.5000 (positive indices only; 4 decimals so air can be 1.0003)
  and the angle of incidence θ₁ from 0 to 89.99°, **measured from the normal**. Presets: air →
  water, water → air, air → crown glass, crown glass → air, diamond → air, equal indices; plus *Set
  θ₁ to the critical angle* and *Normal incidence*.
- The diagram shows the incident ray, the normal (dashed), the reflected ray (thin and dashed,
  because how much light reflects is not modelled; solid under total internal reflection) and the
  transmitted ray, with angle arcs and media labels. Shading darkens with n, and the labels give
  the values.
- Readouts: θ₁, θr = θ₁, θ₂ from n₁ sin θ₁ = n₂ sin θ₂, and θc = arcsin(n₂/n₁). The equations are
  shown with the numbers substituted.
- **Edge cases:** normal incidence (no bending); equal indices (no bending and no reflected ray:
  there is no boundary); a critical angle only when n₁ > n₂ (from lower to higher index there is
  none, even at 89.99°); **total internal reflection only when θ₁ > θc**, with no transmitted ray
  drawn.
- **Classification comes from the calculation, not the display.** The lab computes
  sin θ₂ = n₁ sin θ₁ / n₂ and calls it total internal reflection when that exceeds 1. The only
  tolerance (10⁻¹², `SIN_TOLERANCE`) absorbs floating-point rounding, which is about 10⁻¹⁶ per
  operation; it corresponds to roughly 10⁻¹⁰° and has nothing to do with the 0.01° slider step.
  θc is shown to four decimals. When θ₁ and θc look the same at the two decimals of the angle
  field (for example 41.14° and 41.1395° for n₁ = 1.52, n₂ = 1), the verdict says so and gives
  both to four decimals, without changing the result.
- **Set θ₁ to the critical angle** switches to an exact **critical mode**: θ₁ is θc at full
  precision (shown as *θc = 41.1395° (exact)*, with a note), so θ₂ is exactly 90°. Links store it
  as `inc=critical`; typing or sliding an angle leaves the mode, and `inc=critical` without a
  critical angle (n₁ ≤ n₂) is corrected to the default.

**Thin lens** (`opt=lens&lens=converging|diverging&f=…&do=…`):
- Inputs: lens type, |f| from 2 to 20 cm, object distance dₒ from 1 to 60 cm (object height 2 cm).
  Presets: beyond 2F, between F and 2F, at F, inside F, diverging.
- Readouts: dᵢ from 1/dₒ + 1/dᵢ = 1/f, m = hᵢ/hₒ = −dᵢ/dₒ, the image height, real or virtual, upright
  or inverted, with the equations substituted. **Sign convention** (§2.4): f > 0 converging,
  f < 0 diverging; dᵢ > 0 on the side opposite the object (real), dᵢ < 0 on the object's side
  (virtual); m > 0 upright, m < 0 inverted.
- The diagram draws the three **principal rays** (1 parallel then through F, 2 through the centre,
  3 through or toward a focal point then parallel), F and 2F on both sides, and the image: solid
  for real, dashed for virtual with dashed backward extensions. The horizontal scale fits the scene
  (±25 to ±65 cm) and the vertical scale is exaggerated, as the caption says.
- **Edge cases:** with the object at the focal plane the image is at **infinity**: dᵢ = ∞, m
  undefined, the rays leave parallel, ray 3 is omitted and **no image is drawn**. Approaching the
  focal plane, dᵢ grows without bound (1010 cm at dₒ = 10.1 cm with f = 10 cm); an image beyond the
  diagram is described in words, never drawn off-scale. A diverging lens always gives a virtual,
  upright, smaller image.
- **Assumptions** listed in the lab: rays only (no diffraction or interference), one wavelength
  (no dispersion), no intensities, the thin-lens approximation and paraxial rays (no spherical
  aberration).

**Links** store every input of the chosen part; invalid values (for example f = 0 or a negative
dₒ) fall back to defaults. Home's *How does a lens form an image?* now appears, because its
destination exists.

### Physics sources

- [OpenStax University Physics Volume 1 — 4.3 Projectile Motion](https://openstax.org/books/university-physics-volume-1/pages/4-3-projectile-motion)
- [OpenStax University Physics Volume 1 — 3.5 Free Fall](https://openstax.org/books/university-physics-volume-1/pages/3-5-free-fall)

## Mathematics Explorer — functions, surfaces, vectors and statistics

Three sections, switched with the **Mathematics section** buttons: **2D functions**, **3D
surfaces** and **Vectors and transformations**. The section is stored as `msec` (`functions`,
`vectors`); links without `msec` are surface links, so every older Mathematics link opens exactly
as before. All formulas come from fixed preset libraries: there is no formula entry, no `eval`,
and no computer algebra. The 2D sections are SVG and HTML only; they never mount WebGL.

### 2D functions

- Families: linear, quadratic, cubic, sine, cosine, exponential and logarithmic, each with a
  stated domain and bounded parameters (`fn`, `f<param>`).
- **Point and derivative.** The inspected point (`fx`) and f′(x) are computed from exact formulas
  for each family, and the tangent line equation is shown.
- **Secant.** A step h gives the secant through x and x + h with its slope and its difference from
  f′(x); moving h toward 0 shows the secant approaching the tangent. h = 0 is refused, not
  divided by.
- **Definite integral** on [a, b] (`ia`, `ib`). The signed integral is F(b) − F(a) from the
  antiderivative. The geometric (total) area ∫|f| is a Simpson’s-rule estimate and is labelled
  "≈". Positive parts are solid and negative parts are hatched, so sign is never shown by colour alone.
- **Domains and gaps.** ln(x) is only defined for x > 0: no point, curve or integral is drawn at
  x ≤ 0, link values there are rejected and replaced, and an interval reaching x ≤ 0 shows an
  error instead of a number. Curves are sampled into separate segments and never joined across
  a gap or a jump out of view.
- Zoom in, zoom out, reset the view, and centre on the point. The view itself is not stored in links.

### Vectors and transformations

- Two vectors u, v (`vu`, `vv`) and a scalar k (`vk`) show u + v by the parallelogram rule, k·u,
  the dot product with its arithmetic, the angle, and the lengths.
- A 2×2 matrix M (`vm`, row-major `a,b,c,d`) is drawn as the original grid, unit square and
  vectors (dashed grey) beside their images (solid colour).
- det M = ad − bc is read as the area scale factor; a negative determinant means reversed
  orientation. When det M = 0 the plane collapses onto a line (or a point for the zero matrix)
  and no inverse exists; otherwise the inverse is shown.
- Presets: identity, rotate 90°, shear, scale, reflect, singular.

### Statistics and probability

**Statistics and probability** (`msec=statistics`) is a fourth Mathematics section with two parts.
It is plain HTML and SVG and needs no WebGL. Calculations are in `src/math/statistics.ts`, sample
data in `src/data/mathematics/datasets.ts`, and the UI in
`src/features/mathematics/statistics/StatisticsLab.tsx`. Sources: OpenStax Introductory Statistics
2e §2.2, 2.3, 2.4, 2.5, 2.7 and 4.3.

**Descriptive statistics** (`sv=describe&ds=<dataset>[&bins=…]`):
- **Data:** four sample datasets, each with its provenance: *Heights of 40 students* (textbook
  example data, Example 2.23), *Fourteen values* (textbook example, §2.3), and two **synthetic**
  sets labelled as such (negative and repeated values; one potential outlier). Or **your own
  values**: up to 1000 numbers separated by commas, spaces, semicolons or new lines (negatives,
  decimals and exponents accepted, magnitude up to 10⁹). Invalid and too-large entries are listed by
  position and ignored; more than 1000 are cut off with a message.
- **Results:** sorted data, count, mean, median, range, Q1 and Q3, IQR, and **population** variance
  and standard deviation (σ², σ, divided by N) kept apart from **sample** variance and standard
  deviation (s², s, divided by n − 1; *undefined for one value*), with a note on when to use each.
  The mean uses compensated summation and the variance is computed from deviations about the mean
  (two passes), so large offsets stay accurate.
- **Quartile convention** (documented in the panel): Q1 and Q3 are the medians of the lower and upper
  halves (§2.3); with an odd count the median is left out of both halves; with one value Q1 = Q3 =
  that value. It reproduces the textbook values (Q1 = 64.5, median 66, Q3 = 70 for the heights; 2, 7
  and 9 for the fourteen values). Other conventions can differ slightly, and the panel says so.
- **Histogram** with 1–30 equal-width bins from the minimum (left edges included, the last bin
  also includes the maximum; identical values give one bin of width 1), starting at a suggested
  √n kept within 5–15. The caption explains how bin choice changes the picture but not the data.
- **Box plot** (§2.4): whiskers to the minimum and maximum, the box from Q1 to Q3 and the median,
  with **potential outliers** (beyond 1.5 × IQR, §2.3) circled and listed.
- **Edge cases handled:** no data (a prompt), one value, repeated values (zero spread), negative
  values.

**Binomial probability** (`sv=binomial&bn=…&bp=…&br=…&seed=…`):
- n from 1 to 500 trials and p from 0 to 1 (step 0.01). **Exact** P(X = k) = C(n, k) pᵏ qⁿ⁻ᵏ for every
  k, computed in logarithms so the largest n neither overflows nor underflows; p = 0 and p = 1 are
  exact (all mass at 0 or n) with a note. Readouts: μ = np, σ² = npq, σ and the total of the
  probabilities. n = 1 is described as a Bernoulli trial.
- **Simulation:** 1–10 000 repetitions of the experiment from a **visible seed** (the same seeded
  generator as the inheritance lab). *Run again* picks a new seed. The same n, p, repetitions and
  seed always give the same counts, so the configuration is shareable. The chart shows exact
  probabilities as bars and observed shares as marks; the table lists exact probabilities,
  expected counts, observed counts and shares for every k with P ≥ 0.0001 or observed at least
  once. The exact values never depend on the simulation.

**Privacy: what links, saves and exports contain** (also stated in the panel):
- Nothing is uploaded; all calculations run in the browser.
- Links, *Save exploration*, recent history and notebook notes store the section, the dataset's
  name, the bin count, and n, p, the repetitions and the seed.
- **Typed values are not stored** unless you tick *Include my values in the link and in saved
  explorations* (at most 100 values, as `data=`); otherwise only "your own values" is recorded.
  A PNG export shows the chart (which reflects the data) and the link, not the list of values.

**Related topic:** a curated *Same mathematics* link joins this section with Biology's inheritance
lab. Under the one-gene model each offspring is like a Bernoulli trial (green seeds with p = 1/4 for
Yy × Yy), so the number of green-seeded offspring is binomial; its limits are stated (independent
offspring, fixed probability, one gene with complete dominance; many traits do not follow it). The
inheritance simulation also links to the binomial lab with the same n and p.

### 2D sources

- [OpenStax Calculus Volume 1](https://openstax.org/books/calculus-volume-1/pages/1-introduction):
  - [1.2](https://openstax.org/books/calculus-volume-1/pages/1-2-basic-classes-of-functions),
    [1.3](https://openstax.org/books/calculus-volume-1/pages/1-3-trigonometric-functions) and
    [1.5](https://openstax.org/books/calculus-volume-1/pages/1-5-exponential-and-logarithmic-functions):
    function families and domains;
  - [3.1](https://openstax.org/books/calculus-volume-1/pages/3-1-defining-the-derivative): secants
    approaching the tangent;
  - [3.3](https://openstax.org/books/calculus-volume-1/pages/3-3-differentiation-rules),
    [3.5](https://openstax.org/books/calculus-volume-1/pages/3-5-derivatives-of-trigonometric-functions) and
    [3.9](https://openstax.org/books/calculus-volume-1/pages/3-9-derivatives-of-exponential-and-logarithmic-functions):
    derivative rules;
  - [5.2](https://openstax.org/books/calculus-volume-1/pages/5-2-the-definite-integral) and
    [5.3](https://openstax.org/books/calculus-volume-1/pages/5-3-the-fundamental-theorem-of-calculus):
    signed area, total area and the Fundamental Theorem.
- OpenStax Calculus Volume 3:
  [2.1 Vectors in the Plane](https://openstax.org/books/calculus-volume-3/pages/2-1-vectors-in-the-plane),
  [2.3 The Dot Product](https://openstax.org/books/calculus-volume-3/pages/2-3-the-dot-product) and
  [2.4 The Cross Product](https://openstax.org/books/calculus-volume-3/pages/2-4-the-cross-product)
  (parallelogram area).
- OpenStax College Algebra 2e:
  [7.7 Solving Systems with Inverses](https://openstax.org/books/college-algebra-2e/pages/7-7-solving-systems-with-inverses) and
  [7.8 Cramer’s Rule](https://openstax.org/books/college-algebra-2e/pages/7-8-solving-systems-with-cramers-rule)
  (2×2 inverse and determinant).

## Mathematics: 3D surfaces

Choose a surface z = f(x, y), reshape it with parameters, read exact values at points, and cut it
with vertical cross-sections.

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

### Tangent planes and gradients

When a point is inspected, **Local slope at P** shows:
- ∂f/∂x and ∂f/∂y, symbolically and as numbers;
- the gradient ∇f = (fₓ, fᵧ), with its magnitude |∇f| and its direction from +x;
- the tangent plane z = f(x₀, y₀) + fₓ(x − x₀) + fᵧ(y − y₀), with the numbers substituted;
- a sentence on steepest increase.

**Display formatting** is separate from the analytic values, which are never rounded. Numbers with
|v| ≥ 0.1 show three decimals, 0.001 ≤ |v| < 0.1 three significant figures (0.00250), and smaller
values scientific notation (1.23 × 10⁻⁴), so a small non-zero coefficient or offset is never shown
as 0. Exact values drop padding zeros (`z = 0 + 1·(x − 1) + 1·(y + 1)`). When any number in the
equation is rounded it reads `z ≈ …`, with a line saying the plane and readouts use exact values.
Example: sine, A = k = 0.05, at (0, 0) gives fx = 0.0025 and `z ≈ 0 + 0.00250·x + 0·y` (≈ because
0.05 × 0.05 is not exactly 0.0025 in binary floating point).

The derivatives are derived by hand for each fixed surface (`src/math/tangent.ts`) and never read
from the mesh: plane (a, b), paraboloid (2ax, 2by), saddle (2ax, −2by), and sine
(Ak·cos kx·cos ky, −Ak·sin kx·sin ky). Unit tests check them against finite differences, and check
that each plane passes through the point and agrees with the surface to first order.

- **Zero gradient** (e.g. the saddle origin, or a flat plane): the panel says the tangent plane is
  horizontal, that the rate of change is zero in every direction, and that such a point can be a
  maximum, a minimum or a saddle point. Floating-point residue below 10⁻¹² (such as sin(π) ≈ 1.2 × 10⁻¹⁶) is treated as 0.
- **Gradient vs normal.** ∇f is two-dimensional, in the x–y input plane, and the scene draws it
  flat on the floor under P. The panel states that it is not the surface normal, which is
  (−fₓ, −fᵧ, 1).
- **Overlays** (**Tangent plane**, **Gradient arrow**) are off by default and not stored in links.
  The plane is a bounded square patch (half-width 15% of the domain). The arrow's length grows
  with |∇f| but is capped at 30% of the domain. Without WebGL, the toggles are hidden and every
  number and equation is still shown.
- Sources: OpenStax Calculus Vol. 3 §4.3 (partial derivatives), §4.4 (tangent planes), §4.6
  (gradient).

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

## Navigation: breadcrumbs, topic drawer and module memory

Every explorer has a **subject bar** under the top bar (`src/components/SubjectBar.tsx`):
- **Breadcrumbs** (`nav` named *Breadcrumb*): *Home › subject › module › topic*, for example
  *Home › Chemistry › Molecules › Water* or *Home › Anatomy › Body atlas › Left femur*. The last
  item has `aria-current="page"`. The breadcrumb follows the page as you select things, because
  `pushState`/`replaceState` are wrapped once to announce address changes
  (`src/lib/location.ts`). Old links without a module key land in the module they always opened.
  On phones *Home* is left out (it is in the top bar) and a long topic is truncated.
- **Topics** opens a drawer (a modal `dialog`) listing every module of every subject, current
  subject first, with its contents and curated topics. Typing filters modules and topics; with no
  match it offers the global search. The current module says *You are here*. Esc, the close button
  or the backdrop closes it, and focus returns to **Topics**. On phones it fills the screen width.
- **Module memory.** The last valid state of each module in this browser session is kept in
  `sessionStorage` (`stem-explorer.module-context`, re-validated before use). A module link in the
  drawer reopens that state and says *Where you left it*; otherwise it opens the module's default.
- **The topic map** (`src/data/topics.ts`) is the single list of modules and curated topics used by
  Home, the breadcrumbs, the drawer and the questions. Every link in it goes through the same
  validation as saved explorations, and a unit test checks that each link is canonical and opens
  its own module.

**Module navigation versus display controls.** Inside explorers, module switches (Chemistry
section, Biology section, Physics experiment, Mathematics section, Anatomy module) are drawn as
tabs under a *Module* caption; display options (views, labels, representations, tools) keep the
pill toggles in the toolbars.

**History.** Switching module inside an explorer now adds a history entry (as Anatomy already
did), so Back returns to the previous module. Back, Forward and in-app links remount the explorer
so it re-reads its state from the address; parameters a link does not store (camera, open panels)
start fresh, as when opening a link.

## Home page, search and the exploration library

**Home** is `#/home`. It is also what you see with no hash or with any hash that is not a subject
(`#/`, `#/nowhere`). The brand logo and the **Home** tab in the top bar lead back to it. Home does
not mount a WebGL canvas and does not load the Three.js chunk.

Home is laid out top to bottom:
- **Hero**: a two-line headline, a one-sentence explanation, the global search (the main action)
  with example queries (*mitral valve*, *H₂O*, *Golgi*, *saddle*, *spring*; a unit test checks each
  one has results), **Browse subjects**, and a small decorative SVG illustration (a cell outline, a
  bent three-atom molecule and a travelling wave). The illustration is hidden from assistive
  technology and from phones narrower than 520 px, where the search comes first.
- A first-visit **welcome panel**, shown only while there is no history and nothing saved. It has
  two concrete starting points (a guided activity and the heart) and how exploring works. For
  returning visitors it is replaced by a compact **Continue exploring** strip of recent visits,
  and the guide moves behind **How it works**.
- **Explore by question**: short curated questions (*How does breathing work?*, *Why do molecules
  have different shapes?*, *How does a lens form an image?*) that open the module answering them.
  A question is listed only when its destination module exists in the topic map, so the lens
  question stays hidden until the optics lab ships (a unit test checks this).
- **Explore subjects**: one row per subject in its accent colour (tokens `--subject-*`), with a
  small SVG illustration labelled as a simplified preview, a one-line summary and the subject's
  **actual modules**, each a link with what it contains. The module list and its counts (for
  example *All 118 elements*, *12 3D molecules*) come from the topic map
  (`src/data/topics.ts`), not hand-written text. The row is clickable through its action link;
  module links sit above it and are their own targets. On phones the modules show as names only,
  two per row.
- **Featured exploration**: one larger card for real, implemented content (the saddle's level
  point), with **More starting points** below it.
- **Guided activities** with their learning goals, then **Saved explorations** with backup.
- Library messages (saved, renamed, removed, cleared, imported, errors) appear in one dismissible
  status region at the bottom of the screen, so a message stays visible even when its section
  disappears (for example after Clear history).

**Motion** is restrained and never gates content:
- Sections and cards fade up 8 px over 240 ms, staggered by at most about 200 ms. Everything is in
  the DOM and focusable from the first frame.
- Featured cards, question cards and the spotlight lift 2–3 px on hover and on keyboard focus;
  the wide subject rows change their border instead. Transforms don't move layout.
- The hero illustration's wave and molecule move with transform-only keyframes (a test checks
  this). They run only while the illustration is on screen (IntersectionObserver) and the tab is
  visible. A visible **Pause decorative animation** button (`aria-pressed`) stops them, and the
  choice is remembered on this browser (`stem-explorer:hero-paused`, per-viewer convenience only).
- With `prefers-reduced-motion: reduce`, nothing animates, cards don't lift, and the pause button
  is not shown.
- No scroll hijacking, intro, audio, particles or WebGL on Home.

Featured explorations are ordinary deep links that use only supported URL parameters. When a step
can't be stored in a URL (picking atoms for an angle, starting the blood-flow tour, saving a physics
Run A, inspecting a point), the card says what to do next.

**Search** on Home shows the first 12 results of the global search (see *Search, related topics
and presentation*) and links to the full, filterable results. The search box is a plain input
followed by a list of links, so Tab moves into the results and Enter opens one.

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

## Exploration notebook

**Add note** (next to Copy link and Save exploration in every explorer) opens an inline editor
with a title (suggested from the view) and plain-text observations. Nothing is stored until
**Save note**. The note keeps a snapshot of that explorer's canonical share settings, the same
parameters Copy link uses. It never stores activity progress, animation time, tour steps or
camera positions; a note written during the Anatomy tour stores the pre-tour view.

**Notebook** (`#/notebook`, in the top bar) lists notes newest first, with a subject filter that
shows counts. Each note has its created and updated times, **Reopen exploration** (a relative
in-app link rebuilt from the stored state), **Edit** (the same editor, with **Save changes**) and
**Delete**, which offers **Undo** and puts the note back in its place. The page says notes live
in this browser only and can be lost when site data is cleared.

- **Unsaved changes, without browser dialogs:**
  - Cancel with edits asks *Discard your unsaved changes?* (Discard or Keep editing).
  - Every edit is written straight away to this tab's `sessionStorage`
    (`stem-explorer:note-draft:new:<subject>` or `…:edit:<note id>`), separately from saved notes.
    A reload, leaving the explorer or opening another subject keeps it; the explorer (or the note
    card) then mentions the draft, and the next editor offers **Restore draft** or **Discard draft**
    before showing the fields, so the earlier draft can't be overwritten by accident. Save and an
    explicit Discard remove it. Drafts last as long as the tab's session.
  - A new-note draft stores the exploration it was started in. The editor always shows
    *Attached to: …*; if that is not the view on screen (a Water draft restored while viewing
    Benzene), it says so, links to that view and offers *Attach to Benzene instead*. Nothing is
    reattached silently.
  - If a draft can't be stored (session storage blocked or full), the editor says that the draft
    won't survive a reload and to save the note.
- **Storage** (`stem-explorer:notes`, a JSON array of version-1 entries). It follows the same rules
  as saved explorations:
  - reads never write;
  - a damaged list is reported and left untouched (new notes are paused);
  - entries from newer versions are preserved;
  - quota and other write failures are reported, and the editor stays open with the text;
  - limits: 100 notes, 80-character titles, 5,000-character observations (UTF-16 code units, as a
    textarea counts them); the cap never splits an emoji;
  - control characters are removed except line breaks and tabs, and lone surrogates become U+FFFD.

  Text is always rendered as text, with line breaks kept by CSS. Imported markup such as
  `<img onerror>` shows literally and never runs. Other tabs update through the `storage` event
  (notes key only).
- **Backup.** **Export notebook** downloads `stem-explorer-notebook-YYYY-MM-DD.json` (`format:
  "stem-explorer.notebook"`, `version: 1`, `exportedAt`, `notes` with title, body, subject, params
  and times; no IDs). **Import notebook** works like saved-exploration import:
  - merge-only, under 4 MB, with a preview of new, duplicate (same title, text and exploration),
    invalid and over-limit notes;
  - **Import N notes** re-reads storage, checks the plan entry by entry, and writes once;
  - a failed write changes nothing.

  **Size limits are compatible.** After cleaning, each code unit costs at most 3 bytes in a file
  (CJK and other BMP text 3, emoji 4 bytes per 2 code units, JSON escapes 2), so a full notebook's
  text is at most 100 × 5,080 × 3 ≈ 1.52 MB. The 4 MB import limit leaves room for settings and
  formatting while staying finite. Tests export 100 maximum-length notes of ASCII, Cyrillic, CJK,
  emoji and escape-heavy text and import each into an empty notebook. (The earlier 1 MB limit
  rejected valid exports of multibyte text.) Saved-exploration backups keep their 1 MB limit.

  The two backup formats are kept apart. Each import recognizes the other's file and says where
  to import it, so existing saved-exploration backups keep working unchanged.

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
| Biology | `structure`, `cell`, `type` | `plasma-membrane`, `cytoplasm`, `nucleus`, `nucleolus`, `mitochondrion`, `rough-er`, `smooth-er`, `golgi`, `ribosome`, `lysosome`, plus (plant model) `cell-wall`, `chloroplast`, `central-vacuole`, `vacuole-membrane` · `whole`, `cutaway` · `plant` (omitted for the animal cell) |
| Physics | `speed`, `angle`, `height`, `gravity`; or `experiment=spring` with `mass`, `k`, `x0` | plain numbers inside the ranges above; each invalid value falls back to its default on its own; no `experiment` means projectile |
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
| `src/data/anatomy/atlas/relationships.test.ts` | Every relationship names existing structures and a registered source with its quoted basis; explorations list existing structures and relationships; one-side statements apply to both sides except the right-kidney one; no position is stated for the triceps; the drawing does not contradict the stated directions. |
| `src/features/anatomy/atlas/scene/orientation.test.ts` | The orientation indicator for front, back and left-lateral cameras (body's left to the screen's right in front, anterior to the left in the side view, end-on axes), for the atlas's own view directions. |
| `src/math/statistics.test.ts` | Parsing (separators, negatives, exponents, invalid and too-large tokens with positions, the 1000-value cap, empty input); textbook quartiles for both cited datasets, odd counts, one and two values; population vs sample variance; one value and repeated values; negatives and the 1.5 × IQR outlier rule; accuracy with a 10⁸ offset; histogram edges, totals for any bin count, identical values and invalid bin counts; suggested bins; binomial hand values, totals of 1 up to n = 500 and p = 0.999, exact p = 0 and 1, mean np and variance npq, the Bernoulli case; the simulation repeating per seed, p = 0 and 1, closeness for 10 000 repetitions; dataset provenance. |
| `src/physics/optics.test.ts` | Law of reflection; Snell's law (air → water, the textbook air → diamond example); normal incidence and equal indices; the critical angle only from higher to lower index and total internal reflection beyond it; the 1.52 → 1 at 41.14° reproduction (total internal reflection, θc ≈ 41.1395104°); below, at and above θc at full precision for four media pairs; the tolerance far below one slider step; critical mode only when θc exists; invalid input. Thin lens: beyond 2F, inside F, diverging at five distances, the object at the focal plane (infinity, no magnification), image distance growing near the focal plane (±1010 / −990 cm), invalid input; principal rays meeting at real and virtual images and leaving parallel at infinity; parameter domains. |
| `src/data/biology/meiosis.test.ts` | Meiosis uses the mitosis module's 2n = 4; chromosome, chromatid and set counts at all nine stages for all four option combinations; the text states the computed counts; homologs separate in meiosis I and sisters in meiosis II; crossing over gives four distinct products (two without), with only nonsister chromatids exchanging; independent assortment; the comparison's sources and context. One-gene model: probabilities totalling 1 for all nine crosses, 1:2:1, 3:1 and 1:1. Simulation: repeatable per seed, counts adding up, different seeds differing, impossible genotypes never produced, large samples near ¼, zero offspring; the generator stays in [0, 1) and seeds are validated. |
| `src/chem/stoichiometry.test.ts` | Formula parsing (parentheses, two-letter symbols, malformed input); element-by-element balance, lowest terms, invalid coefficients and charge; every library equation and ionic form balanced in lowest terms with a registered source; type coverage; balancing steps from all 1s to the source's coefficients; molar masses against hand sums; mole ratios; limiting reactant with leftovers, exact ratios (including floating-point residue), zero and invalid amounts; percent yield (zero theoretical yield, above 100 %); significant-figure rounding and charge text. |
| `src/data/topics.test.ts` | Unique module ids and modules for every subject; every module and topic link canonical and claimed by exactly its own module; the breadcrumb naming each curated topic; old links without module keys; counts from data; questions listed only when their module exists, with canonical links. |
| `src/lib/textWrap.test.ts` | Caption wrapping within the width; long URLs broken at delimiters or before `%`-escapes and rejoining exactly at four widths; strings with no delimiters; graphemes (subscripts, combining marks, ZWJ emoji, flags) never split; widths narrower than a character; long titles; empty text. PNG `iTXt` metadata: standard CRC-32, UTF-8 round trip with the image chunks intact, rejecting non-PNG data and bad keywords. |
| `src/lib/measurement.test.ts` | Distance and angle maths against known geometry. Also the cosine clamp, zero-length arms, duplicate and restarting selections, and how results are labelled. |
| `src/data/chemistry/molecules.test.ts` | Atom counts against formulas, IDs, bonds and connectivity. Also cited sources, and that coordinates reproduce every reported bond length and angle. |
| `src/data/chemistry/atomic.test.ts` | Every element's PubChem configuration expands to exactly Z electrons; shell counts for H, O, Na, Ca, Fe and Cr (a filling exception); predicted/calculated notes kept apart; PubChem electronegativities and missing values; N = A − Z; the isotope library has distinct, plausible entries. |
| `src/data/biology/processes.test.ts` | A–T/G–C pairing with 2/3 hydrogen bonds and purine–pyrimidine pairs; duplex validation and mismatch reporting; RNA from the template equals the coding strand with U; mitosis stage kinds, consistent chromosome/chromatid counts in text and drawing, the no-gametes note; energy sources and structure links; balanced, mutually reverse net equations. |
| `src/physics/labs.test.ts` | Circuits: series sums and equal currents, parallel equal voltages and adding currents (including 2∥3∥6 Ω = 1 Ω), the mixed arrangement, power balance P = εI = ΣI²R, invalid zero/negative resistance and out-of-range voltage, snapping. Waves: v = fλ and derived k, ω, T; y at quarter wavelength, after one period and half a period; travel at v; medium velocity bounded by Aω; bounds. |
| `src/features/chemistry/state.test.ts` | Switching molecules mid-measurement, duplicate picks, announcements and clearing. |
| `src/features/chemistry/scene/measurementGeometry.test.ts` | Angle arc and label placement, including straight and degenerate angles. |
| `src/data/biology/organelles.test.ts` | Required structures with stable, URL-safe IDs; every content field present; known sources and related structures. Also that cytoplasm and cytosol are distinguished, and that the text never claims all proteins pass through the Golgi. |
| `src/features/biology/state.test.ts` | Selecting types and single copies, and rejecting invalid copies and IDs. Also auto-cutaway, isolation and Show all, clearing, and changing view. |
| `src/lib/urlState.test.ts` | Valid and invalid parameters for all five subjects. Also that no subject reads another's keys, round trips, that time is never stored, and share links built from the given origin. |
| `src/physics/projectile.test.ts` | Known analytical cases: straight up (4 s, 20 m), horizontal launch, a raised start, dropping from rest, and the level-ground range formula. Also: constant vₓ and vᵧ slope −g; impact clamping (never below ground); immediate impact and very short flights; NaN and negative time; non-positive gravity; playback speed and frame rate not changing results; the frame-step cap; input parsing, clamping and rounding. |
| `src/features/physics/state.test.ts` | No auto-launch, edits reset to t = 0, Reset vs Restore defaults, pause/resume/landed announcements, scrubbing pauses, immediate impact, playback speed, and Run A storing inputs only. |
| `src/features/physics/sceneMath.test.ts` | Equal axis scales, framing all compared runs, tick steps and labels, and separate vector scales. |
| `src/data/anatomy/heart.test.ts` | All 14 structures, with URL-safe IDs, known sources and valid, reciprocal connections. Also oxygen-pathway colours by side, cusp counts, the exact 14-step blood-flow order with external lungs and body, and valve-after-chamber ordering. |
| `src/data/anatomy/atlas/atlas.test.ts` | The eleven systems each with drawn structures and omissions; unique ids and resolvable parents, relations and pairs; descriptions, functions, regions, registered sources and limitations on every structure; groups explain their grouping; left structures on +x; sourced relative positions (right kidney lower, adrenals above kidneys, heart between the lungs, lungs above the diaphragm above the liver, right lung shorter and wider); reproductive structures always in a labelled variant and hidden by default; search; inventory completeness. |
| `src/data/anatomy/atlas/movements.test.ts` | Rotation about the joint axis keeps the pivot and distances, turns "down" to forward (elbow) or back (knee), and reverses exactly; stretching moves only a muscle's distal end; every demo structure exists on both sides; pivots sit on the joint markers; elbow flexion moves the hand forward and up and knee flexion the heel back and up; progress is clamped and described without degrees. |
| `src/data/anatomy/atlas/tours.test.ts` | Every tour step names real structures and registered sources; paths are finite and absent for process steps; the food tour keeps accessory contributions (liver, gallbladder, bile ducts, pancreas) out of the route and places them at the duodenum; the airflow tour follows the conducting zone in order; every nerve-tour step is labelled CNS or PNS; circulation descends the aorta and returns by the venae cavae, linking to the heart module. |
| `src/features/anatomy/atlas/atlas.test.ts` | View descriptions checked against camera geometry; defaults; selecting a hidden structure shows its layer and says so; reproductive selection and switching; no reproductive layer without a configuration; isolation of structures and groups; region dimming and clearing; opacity clamping; shared-system drawing; link round trip and invalid or inconsistent links. |
| `src/features/anatomy/state.test.ts` | Auto-cutaway for internal structures and unknown IDs. Isolation, Show all and clearing. View changes. Tour bounds and navigation, selection locked during the tour, and exit restoring the previous state. The share state during the tour is the pre-tour state (review finding B). Vessel comparison: entering, filling and replacing slots, refusing non-vessels, clearing, leaving, views, the tour ending and blocking comparison, and the shared state. |
| `src/math/surfaces.test.ts` | Known values for every surface, and the coordinate mapping (round trip, right-handed). Slices: lines, constants, upward and downward parabolas, sinusoids, and zero amplitude, including very small non-zero amplitudes (review finding A). Parameter validation, domain clamping, sine sampling density, constant-height colors and formula formatting. |
| `src/math/functions.test.ts` | Exact derivatives against finite differences and antiderivatives against f; exact signed integrals for known cases versus total area when f changes sign; the logarithm's domain (no value, plot or integral at x ≤ 0); curves never joined across a gap; secant slopes approaching f′ and h = 0 refused; exponential with k = 0; vector addition, scaling, dot product and angle; determinant as signed area scale; inverse and singular collapse. |
| `src/features/mathematics/state.test.ts` | Preset switching resets to defaults; foreign or invalid parameters are ignored; clamping and reset; point clamping with feedback; the point following parameter changes; slice enable, axis and position. |
| `src/lib/backup.test.ts` | Export contents (saved only, no IDs, origins or history); round trip with fresh IDs; oversized, malformed, foreign and unsupported files; mixed new, duplicate and invalid entries, with existing titles kept and URL fields ignored; plain-text titles; the saved-item limit; a single write that leaves data unchanged on quota failure; refusing when the library changed since the preview, including when the count is unchanged but the entries differ; never overwriting a damaged list. |
| `src/features/activities/activities.test.ts` | One activity per subject with goal, setup, 3–5 steps, conclusion and https sources; no setup completes a step; the change lists; detection rules for every detected step (including the wrong vertex, changed speed and other surfaces); the Anatomy tour snapshot; Physics replace never resuming; the Physics summary matching `solveTrajectory`. |
| `src/data/glossary.test.ts` | Unique glossary ids and terms; biology terms shared by several structures have one definition and all reach the glossary; every entry cites known sources or is marked as a convention or unit; links are valid relative routes; every subject guide has every section, references existing terms and sources, and cites each deeper explanation. |
| `src/data/chemistry/periodicTable.test.ts` | 118 elements with contiguous atomic numbers and unique symbols and names; positions of reference elements in every period and both f rows; no two elements in one cell; block counts (s 14, p 36, d 38, f 30) and helium in s; f rows agreeing with PubChem's categories; search by number, symbol (listed first) and name prefix; molecules containing an element. |
| `src/physics/spring.test.ts` | Known period, frequency and ω; T scaling with m and k and independence from amplitude; start at rest, quarter- and half-period positions and velocities; energy conservation and F = ma at every instant; zero displacement; bad times; results independent of playback rate; input normalization. |
| `src/features/physics/spring/springState.test.ts` | No auto-launch; launch, pause, resume, end of window and reset; edits returning to t = 0; scrubbing pausing; the zero-displacement announcement. |
| `src/math/tangent.test.ts` | Hand-derived partials against known values and against finite differences for every surface; tangent planes through the point with first-order agreement; the plane surface as its own tangent plane; the saddle origin (zero gradient, z = 0); flat-plane and sine residue degenerate cases; gradient magnitude and direction; the substituted equation; display formatting that never shows small non-zero coefficients or offsets as 0 (A = k = 0.05 sine case, small negatives, scientific notation, ≈ marking). |
| `src/data/anatomy/vessels.test.ts` | Vessel facts cover exactly the model's vessels, name them by direction (artery = away, vein = toward, including the reversed pulmonary pattern), agree with the heart entries' oxygenation and connections, and presets pair different vessels. |
| `src/lib/notesStore.test.ts` | Add, edit, delete and undo with the canonical snapshot; empty titles and invalid explorations refused; length caps and control characters; the note limit; unavailable, damaged and quota states leaving data unchanged; newer-version entries preserved. |
| `src/lib/notebookBackup.test.ts` | Export/import round trip without IDs; the notebook and saved-exploration formats recognising each other; duplicates, invalid notes and the limit; text kept as text; nothing written when the plan changed or the write fails; 100 maximum-length notes of ASCII, Cyrillic, CJK, emoji and escaped text exported and imported into an empty notebook; emoji never split, lone surrogates replaced; a finite input limit. |
| `src/lib/noteDrafts.test.ts` | Draft round trip with its exploration snapshot, never touching saved notes; scopes kept apart; older drafts without a snapshot; malformed drafts and unknown versions ignored; quota, refused and unavailable storage reported. |
| `src/lib/searchIndex.test.ts` | Every subject, atlas and heart structure, element, molecule, cell model and structure, process, lab, function, section and surface is indexed with a deep link that its subject's parser accepts; atlas links turn on the structure's layer and reproductive links carry their configuration; symbols, synonyms and plurals; subject and type filters; grouping in subject order; formula normalization; ranking; empty and unmatched queries. |
| `src/data/related.test.ts` | Every cross-subject relation joins existing items in different subjects, cites registered sources and states its limits; the circulation–circuit link is an analogy with its failure stated; topics read from explorer URLs; both directions resolve; views without a link get none. |
| `src/data/inventory.test.ts` | The README content inventory matches the counts in the data. |
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
- `periodic.e2e.ts`: selecting elements into the panel (including a lanthanoid), search by number and
  name, block and category filters, the list alternative, arrow-key movement, and opening a molecule
  from an element with the measurement tools still working. `mobile.e2e.ts` and `no-webgl.e2e.ts`
  add contained scrolling on phones and use without WebGL.
- `plant.e2e.ts`: switching models (list, badge, link, shared selection kept), chloroplast copies,
  wall vs membrane, relationships to structures the model lacks, switching back clearing a
  plant-only selection, unchanged animal links, the whole view and isolation, the comparison panel,
  and saving a plant view.
- `spring.e2e.ts`: switching experiments with both labs' settings kept and backward-compatible links;
  known analytic values (period, quarter-period readouts, force, energy); energy conservation while
  scrubbing; launch, pause, resume, end of window and reset; zero displacement and input bounds; a
  background tab not jumping ahead (Playwright's fake clock); saving a spring view.
- `tangent.e2e.ts`: partial derivatives, gradient and the substituted tangent plane at a typed point,
  updating with parameters; the saddle origin's zero gradient and explanation; optional overlays
  that keep point inspection and cross-sections working and stay out of links.
- `compare.e2e.ts`: choosing two vessels, replacing B, clearing one or both, the comparison table and
  letter badges; presets and the direction-not-oxygen explanation; entering with a selected vessel
  and isolation, leaving with A selected and links unchanged; Whole/Cutaway; the tour ending and
  blocking the comparison.
- `notebook.e2e.ts`: adding a note with an explicit save, opening the notebook, reopening the
  exploration, editing, deleting and undoing; unsaved-change handling (Cancel confirmation, a
  restored draft after leaving, drafts surviving a reload, a Water draft restored over Benzene
  staying attached to Water, explicit discard, edit drafts, and the message when a draft can't be
  stored); a full 100-note CJK notebook exported and imported; subject filter, safe text rendering and no tour state stored;
  empty, damaged and quota states; notebook export/import and cross-format messages; a second tab
  updating.
- `atlas.e2e.ts`: Anatomy opening to the atlas, the heart module with Back/Forward between modules and
  old heart links; list and search selection with sourced details, pairs, relations, a hidden layer
  shown with an announcement, view and reload; layer toggles, opacity and regions; the explicit
  reproductive choice; clicking the model, Isolate, Focus and Reset; orientation labels on the
  correct sides in front, back and side views; the inventory; saving and reopening an atlas state.
- `musculoskeletal.e2e.ts`: grouped hand bones with the grouping explained; humerus → elbow joint
  link; isolating both femurs; vertebral regions; the skeleton+muscle toggle; sourced attachments
  (sternocleidomastoid) and "Not listed" (deltoid); grouped hamstrings; elbow and knee
  demonstrations (labels, conceptual wording, slider words, sketch orientation per side, the canvas
  changing, Play/Pause, exit, nothing in the link); reduced motion without Play; the limb comparison.
- `organ-tours.e2e.ts`: tours start only on request; Next, Previous and direct steps; the address
  unchanged during a tour; the gas-exchange close-up from the tour; Exit restoring selection and
  view; food-tour contributions labelled apart from the route; CNS/PNS labels; brain regions and
  spinal nerves; the nephron close-up; circulation linking to the heart module; still markers with
  reduced motion.
- `biology-sections.e2e.ts`: the bacterial model, its comparison and reload; old plant links; DNA pair
  inspection, steps and building the RNA; mitosis stages, terms, cytokinesis and the gamete note;
  energy stages opening the mitochondrion; saving and reopening a section.
- `circuits-waves.e2e.ts`: circuit readouts for series and parallel, equations, assumptions, the
  1 Ω minimum, a mixed link reopening paused with arrows then markers; the wave's derived speed,
  paused start, scrubbing to −A after half a period, both graph kinds, Play/Pause, nothing about
  time in the link; reduced motion; old links and dropping lab keys.
- `search-present.e2e.ts`: the Search page from the top bar (focus in the box, synonyms, a femur
  result opening the atlas, Back restoring the query, *Fe* opening iron in the periodic table);
  subject and type filters in the link and after reload, the filtered-out empty state and Clear
  filters; Home's *See all results*; related topics both ways (wave lab ↔ sine) and the circuit
  analogy with its limits; presentation mode hiding the top bar and side panels, a real PNG
  download, Esc returning focus to Present, a WebGL export, and Back/Forward ending presentation.
- `statistics.e2e.ts` (reset): seed 31 then *Restore default settings* gives 2026 in the field, the
  legend, the link and the same table; reset with invalid seed text clears the error; the reset
  configuration reloads; typed values survive a reset with *Include my values* turned off and no
  data in the link. `optics.e2e.ts` adds the 41.14° reproduction (θc 41.1395°, total internal
  reflection, the rounding sentence, no transmitted ray, a solid reflected ray), just below θc,
  critical mode through reload, and an invalid `inc=critical` link.
- `statistics.e2e.ts`: the heights dataset (40 values, median 66, Q1/Q3 64.5/70, population and
  sample variance differing), bins 6 → 12 → suggested, the bin explanation, a synthetic dataset
  labelled with its outlier circled; typed values with invalid and too-large entries reported by
  position, negatives, one value (sample variance undefined), repeated values; the link and copied
  link without the values by default, with them after opting in, and restoring after reload; the
  privacy note; the binomial n = 20, p = 0.25 (μ 5, σ² 3.75, total 1.000000, P(5) = 0.2023), the same
  observed table after reload, a new seed leaving the exact column unchanged, p = 0 and p = 1, n =
  500 still summing to 1, invalid links corrected; the inheritance simulation's link to the
  binomial lab (n = 100, p = 1/4) and the curated related topic both ways. Mobile and no-WebGL runs
  cover the section.
- `optics.e2e.ts`: Snell's law for air → water at 30° (22.04°, toward the normal, no critical
  angle), normal incidence, equal indices (no reflected ray), the link; no critical angle from
  lower to higher index at 89.99°, water → air with θc = 48.63°, total internal reflection at 60°
  (no transmitted ray), the critical-angle button giving θ₂ = 90°, bending away at 45°; the thin
  lens beyond 2F (15.0 cm, −0.500, real, inverted), inside F (−10.0 cm, virtual, three dashed
  extensions), at F (∞, m undefined, no image, two rays), at 10.1 cm (1010 cm, described not drawn),
  a diverging lens (−10 cm, virtual, upright), the sign convention, reload; the Home lens question
  and invalid links. Mobile and no-WebGL runs cover the lab.
- `meiosis-inheritance.e2e.ts`: meiosis counts in the table at prophase I, telophase I (two
  haploid cells of 2 chromosomes / 4 chromatids) and telophase II (four cells of 2 / 2), the 2² text,
  sisters staying together in anaphase I, flipping pair B changing which chromosomes travel
  together, crossing over on and off, and the comparison panel; the Punnett square, exact
  probabilities, changing a parent (link, breadcrumb, reload), assumptions and limits, invalid
  genotypes corrected; the simulation repeating for a seed, counts adding up, theory unchanged, a
  new seed, and invalid sample sizes and seeds. Mobile and no-WebGL runs cover both sections.
- `reactions.e2e.ts`: balancing water from all 1s (counts, *Differs*, the minimum coefficient,
  0 ignored, the balanced verdict, doubling flagged as not lowest terms, the coefficient/subscript
  explanation); octane's steps; switching reactions resets the editor; net and complete ionic
  forms with spectators and the charge row; mole-to-mole for ammonia; H₂ + Cl₂ with 3 and 2 mol
  (Cl₂ limiting, 146 g = 4.00 mol HCl, 1.00 mol H₂ left, 68.6 % from 100 g, the >100 % note),
  exactly stoichiometric amounts, zero, negative, non-numeric and too-large input; Copy link
  storing only the reaction, reload resetting coefficients, the CIAAW note, 18.02 g/mol for water,
  the "does not show whether a reaction happens" note and an invalid `rx`. `no-webgl.e2e.ts` and
  `mobile.e2e.ts` (no horizontal overflow at 390 px) cover the lab too.
- `navigation.e2e.ts`: Home lists each subject's real modules and only questions whose destination
  exists; a module link and a question open the right state with the breadcrumb; the breadcrumb
  following a molecule change; a module switch with Back and Forward; the drawer (focus in the
  filter, *You are here*, Esc returning focus, filtering, the empty state, keyboard opening a
  module, *Where you left it* restoring Methane, Back afterwards); a curated topic (Iron); the bar
  hidden in presentation. `mobile.e2e.ts` adds the breadcrumb and drawer at 390 px with no
  horizontal overflow and Back.
- `atlas-where.e2e.ts`: *Where is it?* finding the left ureter (region preset pressed, `region=`
  in the link, the sentence in words, a sourced relationship with its OpenStax link, the
  region-tag note, selecting the bladder from a relationship, *Whole body* clearing the region);
  the hidden-layer note for the biceps and the *no relationship recorded* message for the femur;
  the three explorations (seven numbered structures, quoted statements, limits, the view label,
  links unchanged while open, restoring the earlier view, the triceps note); the overview and the
  orientation indicator flipping between front and back views, and in a PNG export.
  `no-webgl.e2e.ts` runs *Where is it?* and an exploration without WebGL; `mobile.e2e.ts` runs it
  from the Structures tab at 390 px.
- `export.e2e.ts` decodes each exported PNG (`e2e/png.ts`) and reads its text metadata: a Chemistry
  angle export (the 104.5° value, numbered atom labels and badge in the image, the value's box
  matching the page within 1 px, pixels changed inside overlays and identical to the raw canvas
  where there is none, the caption's measurement and *not restored* text, the link lines joining
  to the link, the measurement and URL unchanged afterwards); a Chemistry distance export marked
  *not bonded*; an Anatomy export with the selected-structure, orientation and schematic labels;
  the SVG circuit lab (not blank, no camera note); and a text-only view's message. `mobile.e2e.ts`
  exports at 390 px with a long atlas link (several link lines, nothing in the right margin) and a
  long Unicode title; `no-webgl.e2e.ts` checks the WebGL-unavailable message.
- `notebook.e2e.ts` also saves notes on the vectors, circuit, DNA and atomic-structure views and
  reopens each snapshot with identical link values.
- `math-sections.e2e.ts`: exact point and derivative for 2·sin x, the secant getting closer to f′ as h
  shrinks and h = 0 refused; a signed integral cancelling over a period while the total area does
  not, with solid and hatched parts; ln links at x ≤ 0 corrected and an interval reaching x ≤ 0
  refused; the dot product, reflection (det −1) and singular matrix; old surface links, reload,
  and saving and reopening a section.
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
which test screenshots trigger.

**Browsers tested.** The browser tests run in Google Chrome (`channel: 'chrome'`) on macOS: desktop
at 1440 × 900, phone emulation at 390 × 844, and Chrome with WebGL disabled. Firefox and Safari
were **not** tested. Playwright can only drive them with its own engine builds, which aren't
installed here, and driving Safari through safaridriver would mean changing Safari's settings.
Microsoft Edge is installed, but it uses the same Chromium engine, so it would add no engine
coverage.

**Running a subset.** `npx playwright test e2e/notebook.e2e.ts` runs one file;
`--project=mobile` or `--project=no-webgl` runs one project. Stop any manually started
`vite preview` on port 4173 before running the suite. Otherwise Playwright reuses that server,
which may be serving an older build.

## Bundle and loading

Measured on the production build (`npm run build`, Vite 8):
- **First load:** about 700 kB of JavaScript, or about 210 kB gzipped. That is the main chunk
  (483 kB, or 144 kB gzipped) plus the chunks it preloads: atlas data (86 kB), cell structures,
  elements, sources, heart and surfaces. It holds React, the app shell, Home, the search index
  and the data that link validation needs. This grew with the atlas and the global search, and
  it is the largest remaining size cost.
- **Three.js and React Three Fiber:** 912 kB, or 242 kB gzipped, loaded only when a 3D view
  mounts. Home never loads it.
- **Lazy-loaded on first use:** the atlas explorer (69 kB), the heart module (26 kB), each scene
  (3–30 kB), the chemistry sections (8–14 kB each), the biology process views (4–7 kB), the
  circuit, wave and spring labs (9–16 kB), the function and vector labs (9–10 kB), and the
  Search (7 kB), Notebook (13 kB) and Glossary (3 kB) pages.

From the local production preview in headless Chrome, Home was ready in about 0.2 s. An explorer
became interactive at once, while its 3D view took about 3.5 s under software WebGL (SwiftShader).
These are local measurements, not network or real-device figures.

## Project structure

```
src/
  App.tsx                       hash routing: Home (#/home, default) and subjects (#/chemistry, …)
  components/                   shell: TopNav, AppLink, ErrorBoundary, Tabs, ViewportShell, CopyLinkButton, ShareActions, RangeField
  features/home/                Home page, search, saved/recent sections, backup, activity entries, SVG subject illustrations
  features/activities/          guided-activity types, hook (state, detection, snapshot/restore) and panel
  features/guide/, features/glossary/   About this explorer panel, term buttons, source links; glossary page
  features/notebook/            Notebook page, note editor (unsaved-draft handling), notebook backup
  lib/notesStore.ts, lib/notebookBackup.ts, lib/useNotebook.ts   notes storage, backup format, sync hook
  physics/spring.ts, features/physics/spring/   spring–mass model, lab, panels and scene
  math/tangent.ts               analytic partial derivatives and tangent planes
  data/anatomy/vessels.ts       vessel comparison facts
  data/chemistry/periodicTable*.ts   element data (generated from PubChem) and layout
  data/guides.ts, data/glossary.ts, data/sources.ts   subject guide content, shared definitions, source registry
  components/SubjectBar.tsx     breadcrumbs and the Topics drawer
  features/*/activity.ts        each subject's activity definition and setup
  math/statistics.ts            parsing, summaries, quartiles, histogram, binomial distribution and simulation
  data/mathematics/datasets.ts  sample datasets with provenance (textbook or synthetic)
  physics/optics.ts             Snell's law, critical angle, thin lens, principal rays
  data/biology/meiosis.ts       meiosis stages built from chromosome data, counts, mitosis comparison
  data/biology/inheritance.ts   one-gene Mendelian model, exact probabilities, seeded simulation
  lib/random.ts                 seeded random-number generator (mulberry32)
  chem/stoichiometry.ts         formula parsing, balance, molar mass, mole ratios, limiting reactant, yields
  data/chemistry/reactions.ts   curated reactions, CIAAW atomic weights, balancing steps
  data/
    subjects.ts                 subject list and planned features
    topics.ts                   navigation map: subject → module → topic, and Home questions
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
    location.ts                 address-change events, history entries for module switches, navigation count
    moduleContext.ts            last state per module (sessionStorage) for the topic drawer
    links.ts                    validated in-app links (canonicalize → href), atlas links with layers
    exportImage.ts              presentation PNG export: scene + overlay snapshot, caption, metadata
    textWrap.ts                 caption wrapping (URL-safe, grapheme-safe)
    pngText.ts                  PNG iTXt text metadata (write and read)
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

Second review (this release):
- **Optics critical angle.** With n₁ = 1.52, n₂ = 1 and θ₁ = 41.14° (θc ≈ 41.1395104°), the lab
  suppressed total internal reflection inside a 0.005° window (half the slider step) and drew a
  transmitted ray at 90°. Classification now uses sin θ₂ with a floating-point-only tolerance,
  rounding coincidences are explained in words, and *Set θ₁ to the critical angle* keeps θc at full
  precision (`inc=critical`) instead of a rounded 41.14°.
- **Statistics reset.** *Restore defaults* changed the seed in the state but left the seed field
  showing the old text, so the field, the legend and the link disagreed. *Restore default
  settings* now resets the seed field with the state (also when the field held invalid text),
  turns off *Include my values*, and says what it did. Values typed into *Your own values* are user
  data, not settings: they are **kept** (the dataset choice returns to the default sample), and the
  message says how to use them again. The seed field was the only other input string kept apart
  from the state in this module; the range fields commit on blur, so they cannot go stale.

First review:

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

## Search, related topics and presentation

### Global search

**Search** (top bar, `#/search`, or *See all results* on Home) runs locally over an index built
from the app's own data (`src/lib/searchIndex.ts`); nothing is sent over the network.
- **What is indexed:** subjects, atlas and heart structures, elements, molecules, cell models and
  structures, biology processes, physics labs, functions, surfaces, vector and matrix tools, and
  glossary terms. The page's empty state lists the counts, generated from the index.
- **Matching** is case-insensitive. It covers names; formulas written with digits or subscripts;
  element symbols; well-established synonyms stored with the content (for example *windpipe*
  for the trachea); simple plurals; and whole words in descriptions, ranked last. Hyphenated
  compounds such as *oxygen-rich* do not count as matches.
- **Ranking:** explorer content comes before glossary terms. Then: exact name, formula or symbol;
  name prefix; name contains; exact synonym; other terms; description words; then alphabetical.
- **Results** are grouped by subject (in the app's order) and then by type, eight per group with
  *Show all*.
- **Filters:** a subject filter (toggle buttons) and a type filter (a select). The query and
  filters are kept in the link as `?q=…&sf=<subject>&st=<type>#/search`, so reload and
  Back/Forward restore them. Typing does not add history entries.
- **Empty states** distinguish *nothing matches* from *nothing matches with these filters*. The
  second shows how many results the filters hide and offers a *Clear filters* button.
- **Every result opens a real state.** Each link goes through the same validation as saved
  explorations (`canonicalize`), and building the index fails if any link is invalid. Atlas
  results turn on the structure's layer. Reproductive structures open with their own
  configuration (`repro`), never as a default.

### Related topics

`src/data/related.ts` holds a small, curated set of cross-subject links. Each link has a kind, a
statement, its scope or limits, and sources:
- **Same mathematics:** the same equation describes both, within the stated model. Examples: the
  wave lab and the sine function, the spring lab and the cosine function, an ideal projectile and
  the quadratic function, projectile velocity and vectors, and the inheritance model and the
  binomial distribution.
- **Real connection:** a physical or biological link. Examples: gas exchange in the lungs and O₂
  and CO₂; the net equations of photosynthesis and respiration and their molecules.
- **Analogy only:** a similarity in form, with where it breaks down. The one analogy is blood
  flow = ΔP / resistance compared with I = V / R (A&P 20.2, UP2 9.4). It is never presented as an
  equivalence.

Related topics appear under *Related across subjects* in every explorer's **About this explorer**
panel (read from the current view) and under matching search results. A view without a curated
link says so; links are never generated automatically. Tests check that every link joins
existing items in different subjects, cites registered sources and states its limits.

### Presentation mode

**Present** (top bar, in any explorer) hides the top bar, the side panels and the phone tabs, and
lets the stage fill the window. A bar at the top shows the view's title and the kind of model.
- **Exit presentation** or **Esc** leaves presentation mode, and focus returns to **Present**.
  Leaving the page also ends it, and presenting never changes the explorer's state or link.
- **Export PNG** saves the stage's main picture as a download (`stem-explorer-<subject>-<date>.png`).
  The picture is the 3D canvas or, without one, the largest SVG.

**What an export contains** (`src/lib/exportImage.ts`):
- **The picture with its annotations.** In 3D views, atom labels, measurement values, selected-
  structure labels, orientation labels, the view badge (which carries *Schematic shapes, not to
  scale* and similar labels) and legends are HTML drawn over the canvas. The export copies the
  canvas pixels and reads those overlays in the same synchronous step, so both come from one
  rendered frame (scene labels are moved in the frame that renders the scene) and the labels stay
  where the captured camera put them. Each overlay is then painted at its position with its own
  colours, borders and fonts; an overlay drawn in SVG (the atlas's orientation indicator and
  whole-body overview) is serialized at capture time and drawn as an image. Interaction hints (*Drag to rotate…*) and controls are left out. SVG
  labs keep their labels because they are SVG text, serialized with computed styles inlined.
- **A caption above and below the picture:**
  - the title and *Restored by the link:* the settings the link stores;
  - *In this image:* the scientific content repeated as text, for example *Bond angle H1–O1–H2 =
    104.5°, from the model's source coordinates*, or *Selected: Left femur (id femur-left,
    skeletal system)* and the view orientation;
  - *Not restored by the link:* what the picture shows that the link cannot recreate. Every 3D
    export lists the camera angle and zoom; views add their own (a measurement and its atoms, the
    selected atom, an atlas tour or movement demonstration, isolation, layer opacity, labels turned
    off, a heart vessel comparison). The export never claims the link recreates these;
  - the model label (for example *Schematic model … not to scale*) and the complete link.
- **Wrapping.** Captions wrap at spaces. A string wider than a line, such as a URL, is broken
  inside, preferably after a URL delimiter (`/ ? & = # , ; : . _ ~ + -`) or before a `%`-escape,
  and never inside a grapheme (`src/lib/textWrap.ts`), so the whole link stays readable at phone
  widths and its lines join back into the exact link.
- **Text metadata.** The PNG carries UTF-8 `iTXt` chunks: `Title`, `Description` (the caption
  text), `Source` (the link), `Software` and `STEM-Explorer-Layout` (JSON: every caption line,
  the link lines, the picture box and each overlay's text and box in image pixels). Tests read
  these and the decoded pixels.
- **Unsupported views.** Without WebGL the message says the 3D view is unavailable; a view of text
  and tables (for example *Bonding and geometry*) says it has no single picture and suggests Copy
  link or Save. Exporting never changes the explorer's state, measurement or link.

## Content inventory, attribution and limitations

### Content inventory

Counted from the data; a unit test (`src/data/inventory.test.ts`) fails if this table drifts.

| Content | Count |
| --- | --- |
| Atlas structures | 208 |
| Atlas systems | 11 |
| Atlas tours | 5 |
| Movement demonstrations | 2 |
| Sourced anatomical relationships | 19 |
| Relationship explorations | 3 |
| Heart module structures | 14 |
| Elements | 118 |
| Molecules | 12 |
| Curated reactions | 10 |
| Isotopes in the library | 25 |
| Cell structures (animal, plant, bacterial) | 23 |
| Cell division stages | 7 |
| Meiosis stages | 9 |
| Physics labs | 5 |
| Function families | 7 |
| Surfaces | 4 |
| Matrix presets | 6 |
| Sample datasets | 4 |
| Glossary terms | 83 |
| Cross-subject relations | 10 |
| Registered sources | 133 |
| Search index entries | 511 |

The atlas's own inventory (*Body atlas → What is included*) lists every structure by system and
how it is drawn (individual, group or container), with what is omitted.

### Attribution

- **Text** is written for this app. It paraphrases the cited sections and does not reproduce
  their text or figures. The atlas's anatomical relationships also say *where in the source*
  each statement comes from (section and subsection), in paraphrase. Every claim links to the section it relies on, next to the content.
- **Textbooks:** OpenStax *Anatomy and Physiology 2e*, *Biology 2e*, *Concepts of Biology*,
  *Chemistry 2e*, *University Physics* Volumes 1 and 2, *Calculus* Volumes 1 and 3, and
  *College Algebra 2e*. OpenStax books are published under CC BY 4.0. They are cited by section;
  no text or images are copied.
- **Data:** PubChem (NCBI) for electron configurations and electronegativities, NIST for
  isotopic compositions and NIST CCCBDB for molecular geometry. Values are used with citation, and
  where a source marks a value as predicted or calculated, the app says so.
- **Models and pictures** are generated in code from simple shapes. No licensed anatomy models,
  scans or third-party images are used.
- **Software:** React, three.js, React Three Fiber and drei (MIT), and Lucide icons (ISC).

### Limitations

- **Schematic models.** Anatomy and cell models show position and relationships, not exact form
  or size. Anatomy shows one typical arrangement; real bodies vary. The two reproductive
  configurations are shown only on request, and neither is presented as universal.
- **Idealised physics:** no air resistance, friction, internal battery resistance or damping, as
  each lab states.
- **Mathematics** is computed from fixed formula libraries, with no free formula entry. Graphs are
  sampled at a finite resolution, and the total area is a labelled numerical estimate.
- **Not stored in links:** tour progress, playback time, the 2D plot zoom, measurement picks, open
  panels, relationship explorations, reaction coefficients and calculator amounts, meiosis
  toggles, the inheritance simulation, and typed statistics values (unless you opt in). Where a
  link cannot restore something, the app says so.
- **Coverage is selective:** each subject covers the listed modules and curated content only, not
  a whole discipline. Anatomical relationships, reactions, datasets and related topics are small
  curated sets.
- **Search** has no fuzzy spelling correction, and synonyms cover only well-established names.
- **Related topics** are a small curated set, not a complete map of connections.
- **PNG export** copies overlays as positioned boxes and words: font fallbacks, emoji and effects
  such as shadows may look slightly different from the page. Overlays outside the canvas (for
  example side panels) are not part of the picture; their key content is repeated in the caption.
- **Bundle:** the first load is about 700 kB of JavaScript (about 210 kB gzipped), because link
  validation and search need the atlas, element and cell data. The heavier 3D code loads only
  with a 3D view.
- **Tested in Chromium only** (Chrome with SwiftShader in Playwright). Other engines are not
  tested. Tests check behaviour and agreement with the cited values. They do not establish
  scientific accuracy.

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
