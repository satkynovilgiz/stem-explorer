# Chemistry content audit

Audit of the five beginner topics, carried out on 2026-11-04. Each source below was opened and
read on that date. This is an audit by the developer's tools against published sources, **not a
review by a subject expert**. The unit tests in `src/reference/catalogs/chemistry/beginner.test.ts`
recompute the arithmetic; they cannot show that the science is correct.

## Problems found and corrected

| Where | It said | Problem | Now |
|---|---|---|---|
| What is a mole? | A teaspoon of water contains "far more than a mole" of molecules | False: 5 g ÷ 18.015 g/mol ≈ 0.278 mol | About 0.28 mol, or about 1.7 × 10²³ molecules, with a worked example |
| What is a mole? | The mole is *defined so that* a mole's grams equal the atomic mass | Out of date: the SI mole is a fixed number of entities | Defined by the number; the mass relation is described as a near-exact result |
| Chemistry Overview footer | "Molecule geometries come from NIST measurements" | False for the 15 PubChem3D molecules | Says each molecule is labelled experimental or computed |
| Water entry | "The 3D viewer uses fixed illustrative coordinates" | Contradicted the model: they are experimental | One fixed experimental geometry (NIST CCCBDB) |
| Water entry | "A linear molecule with the same bonds, like CO₂" | CO₂ has C=O bonds, not O–H | Polar bonds pointing in exactly opposite directions |
| Water entry | Dissolves "sugar", "the solvent of living cells" | Not supported by the cited pages | Limited to what was read: ion-dipole attraction and ionic compounds |
| Balancing entry | Locator "combustion of methane" in §4.1 | §4.1 does not use the word combustion | §4.1 for the equation, §4.2 added for combustion |
| Several pages | "Measured" and "Measured structure" | Inconsistent names | One set of labels in `src/data/chemistry/structureKinds.ts` |

## Checked with no change needed

Molarity definition, litres of *solution*, mL conversion and worked examples; C₁V₁ = C₂V₂, final
volume, 12.5 mL and 237.5 mL; never changing a subscript; four electron pairs, two lone pairs,
lone-pair repulsion and the bent shape of water.

## Sources read

| Source | Used for | What it says |
|---|---|---|
| [BIPM, SI base unit: mole](https://www.bipm.org/en/si-base-units/mole) | Definition | One mole contains exactly 6.022 140 76 × 10²³ elementary entities |
| [NIST CODATA, Avogadro constant](https://physics.nist.gov/cgi-bin/cuu/Value?na) | Value | 6.022 140 76 × 10²³ mol⁻¹, exact |
| [OpenStax Chemistry 2e §1.4](https://openstax.org/books/chemistry-2e/pages/1-4-measurements) | Density | Water 1.0 g/cm³ (Table 1.4); 1 cm³ = 1 mL |
| [OpenStax §3.1](https://openstax.org/books/chemistry-2e/pages/3-1-formula-mass-and-the-mole-concept) | Mole | One mole of water is about 18 g |
| [OpenStax §3.3](https://openstax.org/books/chemistry-2e/pages/3-3-molarity) | Molarity, dilution | Moles per litre of solution; C₁V₁ = C₂V₂; Examples 3.14 and 3.19–3.21 |
| [OpenStax §4.1](https://openstax.org/books/chemistry-2e/pages/4-1-writing-and-balancing-chemical-equations) | Balancing | CH₄ + 2 O₂ → CO₂ + 2 H₂O; subscripts define the substance |
| [OpenStax §4.2](https://openstax.org/books/chemistry-2e/pages/4-2-classifying-chemical-reactions) | Combustion | Defines combustion; its example is ethylene, not methane |
| [OpenStax §7.6](https://openstax.org/books/chemistry-2e/pages/7-6-molecular-structure-and-polarity) | Water's shape | Example 7.13: tetrahedral pairs, bent, 104.5°; lone pairs repel more strongly |
| [OpenStax §11.2](https://openstax.org/books/chemistry-2e/pages/11-2-electrolytes) | Dissolving | Ion-dipole attractions in dissolving ionic compounds |
| [NIST CCCBDB, water](https://cccbdb.nist.gov/expgeom2x.asp?casno=7732185) | Water's geometry | O–H 0.958 Å, H–O–H 104.4776°; cites Hoy and Bunker (1979) |
| [Bolton et al. 2011, PubChem3D](https://pmc.ncbi.nlm.nih.gov/articles/PMC3269824/) | Computed conformers | Theoretical conformers from OMEGA with MMFF94s |
| [PubChem PUG REST, CID 962 3D record](https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/962/record/SDF?record_type=3d) | Computed conformers | Returns a conformer record with MMFF94 fields |

## Could not verify

- **A teaspoon is about 5 mL.** No source was reached: OpenStax §1.4 does not mention teaspoons, and
  the NIST conversion page tried returned 404. The app calls 5 g "roughly a teaspoon", lists this as
  an assumption, and calculates only from the 5 g.
- **PubChem's documentation page** (`pubchem.ncbi.nlm.nih.gov/docs/pubchem3d`) returned a browser
  check instead of content. The Bolton paper and the PUG REST record were used instead.
- **The other 11 experimental molecules and 15 computed molecules** were not re-read in this audit.
  Only water's coordinates were compared with their source page today.
- **Molar mass 18.015 g/mol** is calculated from H 1.008 and O 15.999, the values used in the brief
  and in the app's calculators. Those atomic weights were not re-read in this audit.
