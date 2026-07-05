export function satangToBaht(satang: number): string {
  return (satang / 100).toFixed(2);
}

export function bahtToSatang(baht: string | number): number {
  const numericBaht = typeof baht === "number" ? baht : Number.parseFloat(baht);
  return Math.round(numericBaht * 100);
}

export function buildUrl(baseApiUrl: string, path: string): string {
  return `${baseApiUrl}${path.startsWith("/") ? path : `/${path}`}`;
}
