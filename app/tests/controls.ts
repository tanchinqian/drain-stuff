import type { Locator } from '@playwright/test';

export async function choose(control: Locator, label: string) {
  await control.fill(label);
  await control.locator('..').getByRole('option').filter({ hasText: label }).first().click();
}
