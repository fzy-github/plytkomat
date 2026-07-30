import { expect, test } from '@playwright/test'

test('smoke: scena, elementy, wyniki, autosave i eksport', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('canvas')).toBeVisible()

  // Dodanie wnęki przez UI aktualizuje listę elementów.
  await page.selectOption('select.add-element', 'niche')
  const nicheRow = page.locator('.element-row', { hasText: /Niche|Wnęka/ })
  await expect(nicheRow).toHaveCount(1)

  // Typ płytki + region przez panel powierzchni (klik w ścianę w 3D).
  await page.getByRole('button', { name: /Add tile type|Dodaj typ/ }).click()
  await page.locator('canvas').click({ position: { x: 520, y: 330 } })
  const tileWhole = page.getByRole('button', { name: /Tile whole|Kafelkuj/ })
  if (await tileWhole.count()) {
    await tileWhole.click()
    await expect(page.locator('.results-table')).toContainText('m²')
  }

  // Autosave: po przeładowaniu projekt (wnęka) nadal jest.
  await page.waitForTimeout(700)
  await page.reload({ waitUntil: 'networkidle' })
  await expect(nicheRow).toHaveCount(1)

  // Eksport odpala pobranie pliku JSON.
  const download = page.waitForEvent('download')
  await page.getByRole('button', { name: /^Export$|^Eksport$/ }).click()
  expect((await download).suggestedFilename()).toMatch(/\.json$/)

  // Przełącznik języka działa.
  await page.getByRole('button', { name: 'PL', exact: true }).click()
  await expect(page.getByRole('button', { name: /Dodaj typ płytki/ })).toBeVisible()
})
