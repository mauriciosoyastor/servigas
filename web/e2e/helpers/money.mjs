/**
 * Fill a data-money-input with a numeric amount (pesos, not cents).
 * Uses Playwright fill so the input handler parses via parseArs.
 * @param {import('@playwright/test').Locator} locator
 * @param {number|string} amount
 */
export async function fillMoneyInput(locator, amount) {
  await locator.fill(String(amount));
  await locator.dispatchEvent("input");
  await locator.dispatchEvent("blur");
}
