const AppError = require('./AppError');

const DEFAULT_ROUTING_URL = 'https://router.project-osrm.org/route/v1/driving';
const REQUEST_TIMEOUT_MS = 5000;

function routingUrl() {
  return (process.env.OSRM_ROUTING_URL || DEFAULT_ROUTING_URL).replace(/\/+$/, '');
}

function coordinates(latitude, longitude) {
  const lat = Number(latitude);
  const lon = Number(longitude);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90 ||
      !Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new AppError('Delivery coordinates are invalid', 400, 'INVALID_COORDINATES');
  }
  return { latitude: lat, longitude: lon };
}

exports.getDrivingEstimate = async (origin, destination) => {
  const from = coordinates(origin.latitude, origin.longitude);
  const to = coordinates(destination.latitude, destination.longitude);
  const url = new URL(
    `${routingUrl()}/${from.longitude},${from.latitude};${to.longitude},${to.latitude}`
  );
  url.searchParams.set('overview', 'false');

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new Error(`Routing provider returned HTTP ${response.status}`);
    }
    const result = await response.json();
    const route = result.routes && result.routes[0];
    if (
      result.code !== 'Ok' ||
      !route ||
      !Number.isFinite(route.distance) ||
      route.distance < 0 ||
      !Number.isFinite(route.duration) ||
      route.duration < 0
    ) {
      throw new Error('Routing provider did not return a valid driving route');
    }
    return {
      distanceMeters: Math.ceil(route.distance),
      travelSeconds: Math.ceil(route.duration),
    };
  } catch (error) {
    console.error('Driving route estimate failed', error);
    throw new AppError(
      'Không thể xác minh quãng đường giao hàng lúc này. Vui lòng thử lại.',
      502,
      'ROUTING_PROVIDER_ERROR'
    );
  } finally {
    clearTimeout(timeout);
  }
};

exports.coordinates = coordinates;
