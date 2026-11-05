import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const learn = (id: string) => `/?csec=learn&lt=${id}#/chemistry`
const nextStep = (page: Page) => page.getByRole('list', { name: 'Explore in the app' })

test.describe('Chemistry student journeys', () => {
  test('1. a mole: explanation → example → a calculation for that example', async ({ page }) => {
    await page.goto(learn('the-mole'))
    await expect(page.getByRole('heading', { level: 1, name: 'What is a mole?' })).toBeVisible()
    await expect(page.locator('.ref-plain').first()).toContainText('0.28 mol')
    await expect(page.locator('main')).not.toContainText('far more than a mole')
    await expect(page.locator('.ref-head')).not.toContainText('what is a mole')

    await page.getByRole('link', { name: 'See the worked example' }).click()
    await expect(page).toHaveURL(/lf=example/)
    const example = page.locator('#worked-example')
    await expect(example).toHaveJSProperty('open', true)
    await expect(example).toContainText('From grams to moles')
    await expect(example).toBeInViewport()

    await nextStep(page).getByRole('link', { name: /Work out the moles in 5 g of water/ }).click()
    await expect(page.getByRole('textbox', { name: 'Formula' })).toHaveValue('H2O')
    await expect(page.locator('.calc-answers')).toContainText('0.2775 mol')
    await expect(page.locator('.calc-note')).toContainText('less than one mole')
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'What is a mole?' })).toBeVisible()
  })

  test('2. molarity: formula, inputs in units, a result in words, and errors beside the field', async ({ page }) => {
    await page.goto(learn('molarity'))
    await nextStep(page).getByRole('link', { name: /Calculate a molarity/ }).click()
    await expect(page.locator('.sol-formula')).toContainText('M = n / V')
    await page.getByRole('textbox', { name: 'Amount of solute' }).fill('0.25')
    const volume = page.getByRole('textbox', { name: /Volume of solution/ })
    await volume.fill('500')
    await expect(page.locator('.sol-answer')).toHaveText('Molarity = 0.5 M')
    await expect(page.locator('.sol-meaning')).toContainText('Every litre of this solution contains 0.5 mol')

    await volume.fill('0')
    await expect(volume).toHaveAttribute('aria-invalid', 'true')
    const error = page.locator('.sol-field-error')
    await expect(error).toContainText('must be greater than zero')
    // The message is in the same field as the input, not elsewhere on the page.
    await expect(page.locator('.sol-field', { has: volume })).toContainText('must be greater than zero')
    await expect(volume).toHaveAttribute('aria-describedby', new RegExp(await error.getAttribute('id') ?? 'none'))
  })

  test('3. dilution: the link opens the stock volume, and the result explains the final volume', async ({ page }) => {
    await page.goto(learn('dilution'))
    await nextStep(page).getByRole('link', { name: /stock volume/ }).click()
    await expect(page.locator('.sol-answer')).toContainText('12.5 mL')
    const meaning = page.locator('.sol-meaning')
    await expect(meaning).toContainText('Take 12.5 mL of the stock')
    await expect(meaning).toContainText('total volume of solution is 250 mL')
    await expect(meaning).toContainText('about 237.5 mL of solvent')
    // A cross-field problem cannot belong to one field, so it stays in the result.
    await page.getByRole('textbox', { name: 'Final concentration C₂' }).fill('5')
    await expect(page.locator('.sol-result')).toContainText('more concentrated than the stock')
  })

  test('4. balancing: atom counts change with coefficients, and say why', async ({ page }) => {
    await page.goto(learn('balancing-equations'))
    await nextStep(page).getByRole('link', { name: /Balance CH₄/ }).click()
    const why = page.getByTestId('why-coefficients')
    await expect(why).toContainText('H: 1 × 4 in CH4 = 4 on the left; 1 × 2 in H2O = 2 on the right.')
    await page.getByRole('button', { name: 'Show the balanced equation' }).click()
    await expect(why).toContainText('H: 1 × 4 in CH4 = 4 on the left; 2 × 2 in H2O = 4 on the right.')
    await expect(why).toContainText('O: 2 × 2 in O2 = 4 on the left; 1 × 2 in CO2 + 2 × 1 in H2O = 4 on the right.')
    await expect(page.locator('.rx-verdict').first()).toContainText('Balanced')
  })

  test('5. water: explanation → model with the angle tool ready → its angle, by atom list', async ({ page }) => {
    await page.goto(learn('water'))
    await expect(page.locator('main')).toContainText('104.5°')
    await nextStep(page).getByRole('link', { name: /measure the H–O–H angle/ }).click()
    await expect(page.getByRole('heading', { name: 'Measure angle' })).toBeVisible()
    await expect(page.locator('.measure-reported')).toContainText('H–O–H angle: 104.4776°')
    await expect(page).toHaveURL(/mtool=angle/)
    await page.goBack()
    await expect(page.getByRole('heading', { level: 1, name: 'Water' })).toBeVisible()
    await page.goForward()
    await expect(page.getByRole('heading', { name: 'Measure angle' })).toBeVisible()
  })

  test('the older water link still opens with Inspect, and reading pages have no molecule list or activity', async ({ page }) => {
    await page.goto('/?molecule=water#/chemistry')
    await expect(page.getByRole('heading', { name: 'Measure angle' })).toHaveCount(0)
    await expect(page).not.toHaveURL(/mtool/)
    for (const path of [learn('the-mole'), '/?csec=solutions&st=molarity#/chemistry', '/?csec=reactions&rx=methane-combustion#/chemistry']) {
      await page.goto(path)
      await expect(page.getByText('Molecule library')).toHaveCount(0)
      await expect(page.getByText('Measure the H–O–H angle in water')).toHaveCount(0)
    }
  })

  test('calculator: a bad value is explained beside its field', async ({ page }) => {
    await page.goto('/?csec=tools&calc=molar-mass&cv=formula:H2O,mass:-1#/chemistry')
    await expect(page.locator('.calc-field', { has: page.getByRole('textbox', { name: /Sample mass/ }) })).toContainText('must be greater than zero')
    await page.getByRole('textbox', { name: 'Formula' }).fill('Xx2')
    await expect(page.locator('.calc-field', { has: page.getByRole('textbox', { name: 'Formula' }) })).toContainText('is not an element')
  })
})

test('a 3D file that cannot be downloaded offers a reload, with a compact message and the molecule still shown', async ({ page, consoleProblems }) => {
  const gone = /assets\/.*(MoleculeViewport|react-three|three|drei).*\.js/
  await page.route(gone, (route) => route.fulfill({ status: 404, body: 'gone' }))
  // Recovery reloads once; after that the message explains and the page stays usable.
  await page.goto('/?molecule=water#/chemistry')
  const message = page.locator('.viewport-message')
  await expect(message).toContainText('could not be loaded')
  await expect(page.getByRole('button', { name: 'Reload page' })).toBeVisible()
  await expect(page.locator('.mol-diagram')).toContainText('H–O–H angle: 104.4776 °')
  expect((await message.boundingBox())!.height).toBeLessThan(200)
  await page.unroute(gone)
  await page.getByRole('button', { name: 'Reload page' }).click()
  await expect(page.locator('canvas')).toBeVisible()
  // The failed downloads and the boundary's report are the point of this test.
  consoleProblems.length = 0
})
