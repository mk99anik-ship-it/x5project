export function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const earth = 6371;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const lat1 = (aLat * Math.PI) / 180;
  const lat2 = (bLat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * earth * Math.asin(Math.min(1, Math.sqrt(h)));
}

export function formatKm(km: number): string {
  if (km < 1) {
    const meters = Math.max(50, Math.round(km * 1000 / 10) * 10);
    return `${meters.toLocaleString('ru-RU')} м`;
  }
  return `${km.toLocaleString('ru-RU', { maximumFractionDigits: 1, minimumFractionDigits: 1 })} км`;
}
