export const MAX_PRICE_MINOR_UNITS = 2_147_483_647;

export function hasAtMostTwoDecimalPlaces(value: number): boolean {
  if (!Number.isFinite(value)) return false;

  const minorUnits = value * 100;
  const roundedMinorUnits = Math.round(minorUnits);
  const floatingPointTolerance =
    Number.EPSILON * Math.max(1, Math.abs(minorUnits)) * 8;

  return Math.abs(minorUnits - roundedMinorUnits) <= floatingPointTolerance;
}

export function toPriceCents(value: number): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new RangeError("price_must_be_finite_and_non_negative");
  }

  if (!hasAtMostTwoDecimalPlaces(value)) {
    throw new RangeError("price_must_have_at_most_two_decimal_places");
  }

  const minorUnits = Math.round(value * 100);
  if (!Number.isSafeInteger(minorUnits) || minorUnits > MAX_PRICE_MINOR_UNITS) {
    throw new RangeError("price_exceeds_postgresql_int_limit");
  }

  return minorUnits;
}
