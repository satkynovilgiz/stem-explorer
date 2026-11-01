# STEM Explorer: product, UX and engineering audit

Started 2026-11-01 against the production build (the same bundle Vercel serves), Chrome only. Every
finding below was reproduced; nothing is listed from code reading alone. Status is updated as fixes
land.

## How it was checked

- **Automated sweep** (`scratchpad` script, not committed): 30 pages × 6 widths (1440, 1280, 1024,
  768, 390, 360 px) = 180 checks for console errors, failed requests, broken images, horizontal page
  overflow, H1 count, controls without an accessible name, and touch targets under 24 × 24 px.
- **Search relevance**: the queries required by the chemistry brief, run on the Chemistry page.
- **Manual review** of screenshots at desktop and phone width for Home, Chemistry and its pages.
- The full Playwright suite (desktop, phone emulation, no-WebGL) after each milestone.

Not checked: Safari, Firefox, real phones and tablets (only Chrome's device emulation), screen
readers (only the accessibility tree via Playwright), real low-end GPUs (software WebGL only).

## Findings

| # | Severity | Finding (how to reproduce) | Component | Status |
|---|---|---|---|---|
| 1 | High | Chemistry search “mole” ranked *Molecular structure* and *Molecules in 3D* above the mole calculator; “what is molarity” and “how much water do I add” returned nothing. | `features/chemistry/home/chemIndex.ts` | Open (milestone 4) |
| 2 | High | The molarity calculator showed the full topic list, a 12-molecule library, a water-angle activity, a separate explanation panel, layout and Present controls. Open `?csec=solutions&st=molarity#/chemistry`. | `ChemistryExplorer.tsx` | **Fixed** (b82b7fc, M2): single-column calculator |
| 3 | High | “See a worked example” opened the calculator with its examples collapsed. | `ChemistryHome.tsx` | **Fixed** (M2): opens the explanation at its worked example |
| 4 | High | Home listed ~10 competing sections below the subject cards. | `features/home/Home.tsx` | **Fixed** (b82b7fc): moved to Discover |
| 5 | Medium | The Chemistry topics page had two H1s (“Chemistry Explorer”, “Chemistry”). | `App.tsx` | **Fixed** (b82b7fc) |
| 6 | Medium | The Biology cell page scrolls sideways at 1440, 1280, 1024, 390 and 360 px (19–61 px): the cell-comparison table widened its grid column. Open `#/biology`, scroll right. | `features/biology/CellComparison.tsx` | **Fixed** (M2): table scrolls in its own box; regression test |
| 7 | Medium | Chemistry topics were reachable only by first choosing a group (an extra click) and the page mixed groups, a feature card and a molecule card. Student feedback: the page should read like a table of contents, then elements, then molecules. | `ChemistryHome.tsx` | Fixed in the next commit |
| 8 | Medium | Touch targets under 24 px on phones: inline text buttons 22 px tall (bonding molecule links, reaction steps, atlas “Show …” links, DNA steps), native checkboxes 13 × 13, slider tracks 16 px. Below the WCAG 2.2 AA target-size minimum. | several | Open |
| 9 | Low | `THREE.Clock` deprecation warning from React Three Fiber 9.8.2 in every 3D view. | dependency | Known; harmless |
| 10 | Low | One phone test (topic drawer → Back) occasionally fails in emulated Chrome; a trace shows the app adds exactly one history entry. | `e2e/mobile.e2e.ts` | Open (test harness) |

No console errors, failed requests, broken images or unnamed controls were found in the sweep, and
every page had exactly one H1 after finding 5 was fixed.
