export function satangToBaht(satang: number): string {
  const baht = satang / 100;
  return baht.toFixed(2);
}

export function bahtToSatang(bahtStr: string): number {
  // แปลงสตริงเป็นจำนวนทศนิยมโดยตรง
  const bahtFloat = parseFloat(bahtStr);
  // คูณด้วย 100 เพื่อแปลงเป็นสตางค์
  const satang = bahtFloat * 100;
  // ปัดเศษเป็นจำนวนเต็ม
  return Math.round(satang);
}
