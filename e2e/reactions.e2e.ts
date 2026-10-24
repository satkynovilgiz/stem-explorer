import type { Page } from '@playwright/test'
import { expect, test } from './fixtures.ts'

const verdict = (page: Page) => page.locator('.reaction-lab .rx-verdict').first()
const coef = (page: Page, name: string) => page.getByRole('spinbutton', { name: `Coefficient of ${name}` })
const inc = (page: Page, name: string) => page.getByRole('button', { name: `Increase the coefficient of ${name}` })
const params = (page: Page) => new URL(page.url()).searchParams

test('balancing by coefficients: element counts, lowest terms, and limits on coefficients', async ({ page }) => {
  await page.goto('/?csec=reactions&rx=water-decomposition#/chemistry')
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' }).locator('[aria-current="page"]')).toHaveText('Decomposition of water')
  // Starts unbalanced (every coefficient 1); O differs.
  await expect(verdict(page)).toHaveText('Not balanced yet: O differ between the sides.')
  const rows = page.locator('.rx-counts tbody tr')
  await expect(rows.nth(1)).toContainText('O')
  await expect(rows.nth(1)).toContainText('Differs')
  // Coefficients never go below 1, and typing 0 is ignored.
  await expect(page.getByRole('button', { name: 'Decrease the coefficient of water' })).toBeDisabled()
  await coef(page, 'water').fill('0')
  await expect(coef(page, 'water')).toHaveValue('1')
  await inc(page, 'water').click()
  await expect(verdict(page)).toContainText('H differ')
  await inc(page, 'hydrogen').click()
  await expect(verdict(page)).toHaveText('Balanced: every element is conserved, in the smallest whole numbers.')
  await expect(page.locator('.rx-equation').first()).toContainText('2H2O')
  // Doubling everything still conserves atoms, but is not in lowest terms.
  await coef(page, 'water').fill('4')
  await coef(page, 'hydrogen').fill('4')
  await coef(page, 'oxygen').fill('2')
  await expect(verdict(page)).toContainText('every coefficient shares a common factor')
  // The explanation of coefficients versus subscripts uses this reaction's own species.
  await expect(page.locator('.rx-explainer')).toContainText('means two units of water, so 4 H and 2 O')
})

test('step-by-step balancing applies each step; net ionic equations conserve charge', async ({ page }) => {
  await page.goto('/?csec=reactions&rx=octane-combustion#/chemistry')
  await page.getByRole('button', { name: 'Step 3' }).click()
  await expect(coef(page, 'water')).toHaveValue('9')
  await expect(page.locator('.rx-steps li.is-active')).toContainText('would need 12½ O₂')
  await page.getByRole('button', { name: 'Step 4' }).click()
  await expect(coef(page, 'oxygen')).toHaveValue('25')
  await expect(verdict(page)).toContainText('Balanced')

  await page.getByRole('combobox', { name: 'Reaction' }).selectOption('silver-chloride-precipitation')
  await expect.poll(() => params(page).get('rx')).toBe('silver-chloride-precipitation')
  // A new reaction starts unbalanced again.
  await expect(coef(page, 'silver nitrate')).toHaveValue('1')
  const forms = page.getByRole('group', { name: 'Equation form' })
  await forms.getByRole('button', { name: 'Net ionic' }).click()
  const ionic = page.locator('section', { has: page.getByRole('heading', { name: 'Molecular and ionic equations' }) })
  await expect(ionic.locator('.rx-equation')).toContainText('Ag⁺(aq)')
  await expect(ionic.locator('.rx-equation')).toContainText('Cl⁻(aq)')
  await expect(ionic).toContainText('Spectator ions (Ca²⁺, NO₃⁻) are removed')
  await expect(ionic.locator('.rx-counts tbody tr', { hasText: 'Charge' })).toContainText('Equal')
  await forms.getByRole('button', { name: 'Complete ionic' }).click()
  await expect(ionic.locator('.rx-equation')).toContainText('Ca²⁺(aq)')
})

test('mole ratios, limiting reactant, theoretical and actual yield, with zero and invalid input', async ({ page }) => {
  await page.goto('/?csec=reactions&rx=ammonia-synthesis#/chemistry')
  const moles = page.locator('.rx-calc', { has: page.getByRole('heading', { name: 'Mole-to-mole' }) })
  await moles.getByRole('combobox', { name: 'Known substance' }).selectOption({ label: 'hydrogen (H2)' })
  await moles.getByRole('textbox', { name: 'Amount' }).fill('3')
  await expect(moles.locator('tbody tr', { hasText: 'NH3' })).toContainText('2.00')

  await page.getByRole('combobox', { name: 'Reaction' }).selectOption('hcl-synthesis')
  const calc = page.locator('.rx-calc', { has: page.getByRole('heading', { name: 'Limiting reactant and theoretical yield' }) })
  for (const name of ['hydrogen', 'chlorine']) await calc.getByRole('group', { name: `Unit for ${name}` }).getByRole('button', { name: 'mol' }).click()
  await calc.getByRole('textbox', { name: /\(g\) hydrogen$/ }).fill('3')
  await calc.getByRole('textbox', { name: /\(g\) chlorine$/ }).fill('2')
  await expect(calc.locator('tr.is-limiting')).toContainText('Cl2')
  // 4 mol HCl × 36.458 g/mol = 145.8 g; 1 mol H₂ left over.
  await expect(calc.locator('.rx-verdict').first()).toContainText('chlorine limits the reaction. Theoretical yield of hydrogen chloride: 146 g (4.00 mol)')
  await expect(calc.locator('tbody tr', { hasText: 'H2' })).toContainText('1.00 mol')
  await calc.getByRole('textbox', { name: /Actual yield/ }).fill('100')
  await expect(calc.locator('.rx-verdict').nth(1)).toContainText('Percent yield = actual ÷ theoretical × 100 = 68.6 %')
  await calc.getByRole('textbox', { name: /Actual yield/ }).fill('160')
  await expect(calc.locator('.rx-verdict').nth(1)).toContainText('Above 100 % points to a measurement problem')
  // Exactly stoichiometric amounts use up both reactants.
  await calc.getByRole('textbox', { name: /\(g\) hydrogen$/ }).fill('2')
  await expect(calc.locator('.rx-verdict').first()).toContainText('exactly in the equation’s ratio')
  // Zero and invalid input.
  await calc.getByRole('textbox', { name: /\(g\) hydrogen$/ }).fill('0')
  await expect(calc.locator('.rx-verdict').first()).toContainText('A reactant amount is zero, so no product can form.')
  await calc.getByRole('textbox', { name: /\(g\) hydrogen$/ }).fill('-1')
  await expect(calc.getByRole('alert')).toContainText('Enter a number')
  await calc.getByRole('textbox', { name: /\(g\) hydrogen$/ }).fill('abc')
  await expect(calc.getByRole('alert')).toContainText('Enter a number')
  await calc.getByRole('textbox', { name: /\(g\) hydrogen$/ }).fill('2e7')
  await expect(calc.getByRole('alert')).toContainText('Enter at most 1,000,000')
  await expect(calc).toContainText('Enter an amount for every reactant.')
})

test('links store the reaction only; molar masses cite their atomic weights; nothing claims the reaction happens', async ({ page, baseURL }) => {
  await page.goto('/?csec=reactions&rx=magnesium-hydroxide-neutralization#/chemistry')
  await inc(page, 'hydrochloric acid').click()
  await page.getByRole('button', { name: 'Copy link' }).click()
  expect(await page.evaluate(() => navigator.clipboard.readText())).toBe(`${baseURL}/?molecule=water&view=ball-and-stick&csec=reactions&rx=magnesium-hydroxide-neutralization#/chemistry`)
  await page.reload()
  await expect(coef(page, 'hydrochloric acid')).toHaveValue('1')
  await expect(page.locator('.rx-calc', { hasText: 'Molar masses' })).toContainText('CIAAW 2024 abridged standard atomic weights')
  await expect(page.locator('.rx-calc', { hasText: 'Molar masses' }).locator('tbody tr', { hasText: 'H2O' })).toContainText('18.02')
  await expect(page.locator('.info')).toContainText('It does not show whether a reaction actually happens')
  await expect(page.locator('.rx-particle-figure')).toContainText('Conceptual particle picture')
  // An invalid reaction id is corrected to the default.
  await page.goto('/?csec=reactions&rx=nonsense#/chemistry')
  await expect.poll(() => params(page).get('rx')).toBe('methane-combustion')
})
