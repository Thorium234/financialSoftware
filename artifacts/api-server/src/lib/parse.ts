/**
 * Drizzle returns `numeric` columns as strings from the pg driver.
 * This helper casts them to numbers safely.
 */
export function parseNumeric(value: unknown): number {
  return parseFloat(value as string);
}
