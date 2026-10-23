export function distanceKm(origin, destination) {
  if (!Array.isArray(destination) || destination.length !== 2 || !destination.every(Number.isFinite)) return Infinity;
  const rad = Math.PI / 180;
  const lat = (destination[0] - origin[0]) * rad;
  const lng = (destination[1] - origin[1]) * rad;
  const a = Math.sin(lat/2)**2 + Math.cos(origin[0]*rad)*Math.cos(destination[0]*rad)*Math.sin(lng/2)**2;
  return 6371 * 2 * Math.atan2(Math.sqrt(Math.min(1,a)), Math.sqrt(Math.max(0,1-a)));
}
export function formatDistance(km) {
  if (!Number.isFinite(km)) return '거리 정보 없음';
  return km < 1 ? `직선 ${Math.round(km*1000)}m` : `직선 ${km.toFixed(1)}km`;
}

export function isWithinRadius(km, radius) {
  return radius === 0 || (Number.isFinite(km) && km <= radius);
}

export function isWithinBounds(location, bounds) {
  if (!bounds) return true;
  if (!Array.isArray(location) || location.length !== 2 || !location.every(Number.isFinite)) return false;
  const [lat,lng] = location;
  return lat >= bounds.south && lat <= bounds.north && (bounds.west <= bounds.east ? lng >= bounds.west && lng <= bounds.east : lng >= bounds.west || lng <= bounds.east);
}
