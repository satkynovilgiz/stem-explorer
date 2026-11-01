import { readFile } from 'node:fs/promises'
import { expect, test } from './fixtures.ts'

type Counts = Record<string, { total: number }>
const counts = async () => JSON.parse(await readFile(new URL('../src/reference/generated/counts.json', import.meta.url), 'utf8')) as Counts

test('hero: one-sentence description, Start exploring and Browse reference library; facts use the generated counts', async ({ page }) => {
  const c = await counts()
  const total = Object.values(c).reduce((n, x) => n + x.total, 0)
  await page.goto('/')
  await expect(page.locator('.home-lead').first()).toContainText('Interactive models and a sourced reference library')
  await expect(page.getByRole('list', { name: 'What is here' })).toContainText(`${total} reference entries`)
  for (const [subject, x] of Object.entries(c)) {
    if (x.total) await expect(page.locator(`.subject-card.is-${subject} .subject-card-ref`)).toHaveText(`${x.total} reference ${x.total === 1 ? 'entry' : 'entries'}`)
    await expect(page.locator(`.library-subject.is-${subject} .library-subject-count`)).toHaveText(String(x.total))
  }
  await page.getByRole('link', { name: 'Browse reference library' }).click()
  await expect(page.getByRole('heading', { level: 1, name: 'Reference library' })).toBeVisible()
})

test('home search shows reference entries labelled apart from labs, loading the index only once someone types', async ({ page }) => {
  const manifests: string[] = []
  page.on('request', (r) => r.url().includes('manifest') && manifests.push(r.url()))
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  expect(manifests).toEqual([])
  await page.getByLabel('Search everything you can explore').fill('enzyme')
  const refs = page.getByRole('list', { name: 'Reference entries' })
  await expect(refs.getByRole('link').first()).toContainText('Reference ·')
  await expect(page.getByRole('list', { name: 'Search results' }).locator('.result-kind').first()).toHaveText('Interactive lab')
  await expect(page.getByRole('status').filter({ hasText: /reference/ })).toContainText(/explorer result.*reference entr/)
  await page.getByRole('link', { name: /See all \d+ reference entr/ }).click()
  await expect(page.getByRole('searchbox', { name: 'Search the reference library' })).toHaveValue('enzyme')
})

test('the body atlas preview opens the atlas at a system without loading 3D on the homepage', async ({ page }) => {
  await page.goto('/')
  const preview = page.getByRole('region', { name: 'Explore the body system by system' })
  await expect(preview).toContainText('schematic')
  await expect(page.locator('canvas')).toHaveCount(0)
  await preview.getByRole('link', { name: /^Respiratory/ }).click()
  await expect(page).toHaveURL(/asys=respiratory/)
  await expect(page.getByRole('navigation', { name: 'Atlas level' })).toContainText('Respiratory')
})

test('connections say what kind of link they are and open both ends; sources and limits are explained', async ({ page }) => {
  await page.goto('/')
  const connections = page.getByRole('region', { name: 'Connections between subjects' })
  await expect(connections.locator('.connection')).toHaveCount(6)
  await expect(connections.locator('.connection-kind', { hasText: 'Analogy only' })).toHaveCount(1)
  await expect(page.getByRole('region', { name: 'Sources and model limits' })).toContainText('not an expert review')
  await connections.getByRole('link', { name: /Boyle/ }).click()
  await expect(page).toHaveURL(/#\/physics$/)
})
