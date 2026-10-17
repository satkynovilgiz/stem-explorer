import { expect, test, waitForViewport } from './fixtures.ts'

// This project launches Chrome with --disable-3d-apis, so WebGL is unavailable.

test('Biology stays usable without WebGL and hides 3D-only controls', async ({ page }) => {
  await page.goto('/?structure=nucleus#/biology')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('.viewport-message')).toContainText('Every structure, its description and its sources remain available')
  await expect(page.getByRole('toolbar', { name: 'Cell view controls' })).toHaveCount(0)

  await expect(page.locator('#structure-heading')).toHaveText('Nucleus')
  await page.locator('.structure-item', { hasText: 'Lysosomes' }).click()
  await expect(page.locator('#structure-heading')).toHaveText('Lysosomes')
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /openstax\.org/)
})

test('Chemistry stays usable without WebGL', async ({ page }) => {
  await page.goto('/?molecule=benzene#/chemistry')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('#molecule-heading')).toHaveText('Benzene')
})

test('Physics keeps inputs, playback, readouts and graphs without WebGL', async ({ page }) => {
  await page.goto('/#/physics')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('.viewport-message')).toContainText('inputs, playback controls, readouts and graphs below still work')
  await expect(page.getByRole('toolbar', { name: '3D view controls' })).toHaveCount(0)

  await page.getByRole('slider', { name: /^Time/ }).fill('1.2')
  await expect(page.locator('.graph-readout').first()).toContainText('At t = 1.20 s: y = 9.91 m')
  await page.getByRole('button', { name: 'Resume' }).click()
  await expect(page.locator('.status-tag')).toHaveText('Landed — values at impact', { timeout: 30_000 })
})

test('Mathematics keeps parameters, point evaluation and the slice graph without WebGL', async ({ page }) => {
  await page.goto('/?surface=sine&slice=x&at=1.5#/mathematics')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('Only the 3D view is unavailable')
  await expect(page.getByRole('toolbar', { name: '3D view controls' })).toHaveCount(0)
  await page.getByRole('slider', { name: 'Amplitude slider' }).fill('2')
  await expect(page.locator('.math-left .formula-display')).toHaveText('z = 2.00·sin(1.00·x)·cos(1.00·y)')
  const x = page.getByRole('textbox', { name: /^x/ })
  await x.fill('1.5708')
  await x.press('Enter')
  await expect(page.locator('.point-readout')).toContainText('≈ 2.000') // 2·sin(π/2)·cos(0)
  await expect(page.locator('.slice-graph desc')).toContainText('a sinusoidal wave')
})

test('Anatomy keeps the list, explanations, sources and tour without WebGL', async ({ page }) => {
  await page.goto('/?part=aorta#/anatomy')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('step-by-step blood-flow tour still work')
  await expect(page.getByRole('toolbar', { name: 'Heart view controls' })).toHaveCount(0)
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
  await page.getByRole('button', { name: 'Start blood-flow tour' }).click()
  await page.getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('#tour-heading')).toContainText('Right atrium')
  await page.getByRole('button', { name: 'Exit tour' }).click()
  await page.getByRole('tab', { name: 'Sources' }).click()
  await expect(page.locator('.sources a').first()).toHaveAttribute('href', /openstax\.org/)
})

test('Home works without WebGL and still opens explorers', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1, name: 'Explore science. See how it works.' })).toBeVisible()
  // Five subject cards plus the featured exploration.
  await expect(page.locator('.subject-art')).toHaveCount(6)
  await page.getByRole('searchbox', { name: 'Search everything you can explore' }).fill('aorta')
  await page.getByRole('list', { name: 'Search results' }).getByRole('link', { name: /Aorta/ }).first().click()
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('3D view unavailable')
  await expect(page.locator('#part-heading')).toHaveText('Aorta')
})

test('activities adapt honestly without WebGL instead of requiring the 3D view', async ({ page }) => {
  await page.goto('/#/chemistry')
  await waitForViewport(page)
  await page.locator('.activity-launch').click()
  await page.locator('.activity').getByRole('button', { name: 'Start activity' }).click()
  const panel = page.locator('.activity')
  // The Angle tool lives in the 3D toolbar, so these steps point to the Reported geometry table instead.
  await expect(panel).toContainText('The Angle tool works in the 3D view, which isn’t available in this browser')
  await expect(panel.getByRole('button', { name: 'I’ve explored this' })).toBeVisible()
  await panel.getByRole('button', { name: 'Next' }).click()
  await expect(panel).toContainText('Read the H–O–H angle in the Reported geometry table')
  await page.locator('.info').getByRole('tab', { name: 'Structure' }).click()
  await expect(page.locator('.info')).toContainText('104.5')

  // Biology: Isolate is 3D-only, so that step falls back to reading; list selection still detects.
  await page.goto('/#/biology')
  await waitForViewport(page)
  await page.locator('.activity-launch').click()
  await page.locator('.activity').getByRole('button', { name: 'Start activity' }).click()
  await page.locator('.structure-item', { hasText: 'Golgi apparatus' }).click()
  await expect(page.locator('.activity-status')).toHaveText('Done')
  await page.locator('.activity').getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.activity')).toContainText('Isolating needs the 3D view')
})

test('guides and the glossary work without WebGL', async ({ page }) => {
  await page.goto('/#/mathematics')
  await waitForViewport(page)
  await page.locator('.guide-toggle').click()
  await expect(page.locator('.guide')).toContainText('Measured, computed or illustrative?')
  await page.goto('/?term=vertical-trace#/glossary')
  await expect(page.locator('#term-vertical-trace')).toHaveClass(/is-focused/)
})

test('the periodic table works without WebGL', async ({ page }) => {
  await page.goto('/#/chemistry')
  await page.getByRole('button', { name: 'Periodic table' }).click()
  await page.getByRole('button', { name: 'Carbon, C, atomic number 6' }).click()
  await expect(page.locator('#element-heading')).toHaveText('Carbon')
  await expect(page.getByRole('button', { name: 'Open Benzene' })).toBeVisible()
})

test('the plant cell is usable from the list without WebGL', async ({ page }) => {
  await page.goto('/?type=plant#/biology')
  await waitForViewport(page)
  await page.locator('.structure-item', { hasText: 'Cell wall' }).click()
  await expect(page.locator('#structure-heading')).toHaveText('Cell wall')
  await expect(page.locator('.cell-compare')).toHaveCount(0)
})

test('the spring lab keeps inputs, playback, readouts, energy and graph without WebGL', async ({ page }) => {
  await page.goto('/?experiment=spring&mass=1&k=4&x0=0.3#/physics')
  await waitForViewport(page)
  await expect(page.locator('.viewport-message')).toContainText('readouts, energy bars and graph still work')
  await page.getByRole('slider', { name: /^Time/ }).fill('0.79')
  await expect(page.locator('.readout > div').filter({ hasText: 'Position x' }).locator('dd')).toHaveText('-0.003 m')
  await expect(page.locator('.graph-readout')).toContainText('At t = 0.790 s')
})

test('tangent plane equation and gradient values work without WebGL; overlay toggles are hidden', async ({ page }) => {
  await page.goto('/?surface=sine#/mathematics')
  await waitForViewport(page)
  for (const [label, v] of [[/^x/, '0'], [/^y/, '0']] as const) {
    const f = page.getByRole('textbox', { name: label })
    await f.fill(v)
    await f.press('Enter')
  }
  await expect(page.locator('.tangent-equation')).toHaveText('z = 0 + 1·x + 0·y')
  await expect(page.getByRole('button', { name: 'Tangent plane' })).toHaveCount(0)
})

test('the vessel comparison works from HTML controls without WebGL', async ({ page }) => {
  await page.goto('/?heart=whole#/anatomy')
  await waitForViewport(page)
  await page.locator('.compare-toggle').click()
  await page.locator('.structure-item').filter({ has: page.locator('.structure-name', { hasText: /^Aorta$/ }) }).click()
  await page.locator('.structure-item').filter({ has: page.locator('.structure-name', { hasText: /^Pulmonary veins/ }) }).click()
  await expect(page.locator('.compare-table')).toContainText('Toward the heart')
})

test('the body atlas works from HTML without WebGL: list, search, layers, details and inventory', async ({ page }) => {
  await page.goto('/#/anatomy')
  await expect(page.locator('.viewport-message')).toContainText('The structure list, search, layers, descriptions, sources and the inventory still work')
  await expect(page.getByRole('toolbar', { name: 'Body atlas view controls' })).toHaveCount(0)
  await page.getByRole('searchbox', { name: 'Search body structures' }).fill('spleen')
  await page.locator('.structure-item', { hasText: 'Spleen' }).click()
  await expect(page.locator('#atlas-structure-heading')).toHaveText('Spleen')
  await expect(page.locator('.info')).toContainText('Filters the blood')
  await page.getByText('What is included').click()
  await expect(page.locator('.atlas-inventory')).toContainText('Not included')
  expect(new URL(page.url()).searchParams.get('atlas')).toBe('spleen')
})

test('movement demonstrations and the limb comparison work without WebGL', async ({ page }) => {
  await page.goto('/#/anatomy')
  const panel = page.locator('.movement-panel')
  await panel.getByRole('button', { name: 'Knee flexion' }).click()
  await panel.getByLabel('Flexion (conceptual)').fill('60')
  await expect(panel.locator('.pose-sketch')).toBeVisible()
  await expect(panel.locator('.movement-pose')).toHaveText('Mostly flexed')
  await page.getByText('Compare upper and lower limbs').click()
  await expect(page.locator('.limb-compare table')).toContainText('14 phalanges')
})

test('atlas tours and close-ups are fully usable as text without WebGL', async ({ page }) => {
  await page.goto('/#/anatomy')
  await page.locator('.atlas-modules').getByRole('button', { name: 'Tour: Follow urine from kidney to exit' }).click()
  await expect(page.locator('.atlas-tour #atlas-tour-heading')).toHaveText('Kidneys: filtering the blood')
  await page.locator('.atlas-tour').getByRole('button', { name: 'Next' }).click()
  await expect(page.locator('.atlas-tour #atlas-tour-heading')).toHaveText('Ureters')
  await page.locator('.atlas-tour').getByRole('button', { name: 'Exit tour' }).click()
  await page.locator('.atlas-modules').getByRole('button', { name: 'Gas exchange in an alveolus' }).click()
  await expect(page.locator('[data-view="alveolus"] .schematic-svg')).toBeVisible()
})

test('atomic structure and bonding need no WebGL', async ({ page }) => {
  await page.goto('/?csec=atomic&el=1#/chemistry')
  await expect(page.locator('.info table')).toContainText('3 − 1 = 2')
  await page.getByRole('group', { name: 'Chemistry section' }).getByRole('button', { name: 'Bonding and geometry' }).click()
  await expect(page.locator('.bonding-view')).toContainText('Covalent network solid')
})

test('biology process sections need no WebGL', async ({ page }) => {
  await page.goto('/?bsec=dna#/biology')
  await expect(page.locator('.dna-svg')).toBeVisible()
  await page.getByRole('group', { name: 'Biology section' }).getByRole('button', { name: 'Energy processes' }).click()
  await expect(page.locator('.process-view')).toContainText('Glycolysis')
})

test('circuit and wave labs need no WebGL', async ({ page }) => {
  await page.goto('/?experiment=circuit#/physics')
  await expect(page.locator('.circuit-table')).toContainText('40.0 mA')
  await page.goto('/?experiment=wave#/physics')
  await expect(page.locator('.wave-graph')).toHaveCount(2)
})

test('2D functions and vectors need no WebGL', async ({ page }) => {
  await page.goto('/?msec=functions#/mathematics')
  await expect(page.locator('.fn-svg')).toBeVisible()
  await expect(page.locator('.fn-slope-value')).toContainText('(exact)')
  await page.getByRole('group', { name: 'Mathematics section' }).getByRole('button', { name: 'Vectors and transformations' }).click()
  await expect(page.locator('.vec-det-value')).toContainText('= 1')
})
