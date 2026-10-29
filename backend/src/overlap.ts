export function overlaps(
  aStart: string,
  aDurationMinutes: number,
  bStart: string,
  bDurationMinutes: number,
): boolean {
  const aS = new Date(aStart).getTime();
  const aE = aS + aDurationMinutes * 60_000;
  const bS = new Date(bStart).getTime();
  const bE = bS + bDurationMinutes * 60_000;
  return aS < bE && bS < aE;
}
