export function satangToBaht(satang: number): string {
  const baht = satang / 100;
  return baht.toFixed(2);
}

export function bahtToSatang(bahtStr: string): number {
  const bahtFloat = parseFloat(bahtStr.replace(".", ""));
  const satang = bahtFloat * 100;
  return Math.round(satang);
}
