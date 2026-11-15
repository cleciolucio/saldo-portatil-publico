import { test, expect, state } from '../helpers/qa';

test('NAV-01 @integration: atalhos preservam mês e dados, focam a área e marcam o menu', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  const before = await state(page);
  const nav = page.getByRole('navigation', { name: 'Áreas do sistema' });
  const targets = await nav
    .locator('a')
    .evaluateAll((links) =>
      links.map((link) => ({ href: link.getAttribute('href')!, label: link.textContent! })),
    );
  for (const item of targets) {
    if (await page.locator('#navigationToggle').isVisible())
      await page.locator('#navigationToggle').click();
    const link = nav.getByRole('link', { name: item.label, exact: true, includeHidden: true });
    await link.click();
    await expect(page.locator(item.href)).toBeFocused();
    await expect(link).toHaveAttribute('aria-current', 'location');
    await expect(nav.locator('[aria-current]')).toHaveCount(1);
    await expect(page.locator('#month')).toHaveValue('2027-01');
    if (await page.locator('#navigationToggle').isVisible())
      await expect(page.locator('#navigationLinks')).toBeHidden();
  }
  expect(await state(page)).toEqual(before);
});

test('NAV-02 @regression: menu compacto aceita teclado e Escape sem rolagem horizontal', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const toggle = page.locator('#navigationToggle');
  await expect(toggle).toBeVisible();
  await toggle.focus();
  await page.keyboard.press('Enter');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await page.keyboard.press('ArrowDown');
  await expect(page.getByRole('link', { name: 'Painel', exact: true })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await expect(page.locator('#navigationLinks')).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('NAV-03 @positive: link direto e histórico do navegador chegam à seção correta', async ({
  page,
}) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/#investmentsSection');
  await expect(page.locator('#investmentsSection')).toBeFocused();
  if (await page.locator('#navigationToggle').isVisible())
    await page.locator('#navigationToggle').click();
  await page.getByRole('navigation').getByRole('link', { name: 'Cartões', exact: true }).click();
  await expect(page.locator('#cardsSection')).toBeFocused();
  await page.goBack();
  await expect(page.locator('#investmentsSection')).toBeFocused();
  await page.goForward();
  await expect(page.locator('#cardsSection')).toBeFocused();
});
