export interface MapCoordinate {
  latitude: number;
  longitude: number;
}

export interface DrivingRoute {
  distanceMeters: number;
  coordinates: MapCoordinate[];
}

interface OsrmRouteResponse {
  code?: unknown;
  routes?: unknown;
}

const OSRM_ROUTE_URL = 'https://router.project-osrm.org/route/v1/driving';

function validCoordinate(value: MapCoordinate): boolean {
  return Number.isFinite(value.latitude)
    && Number.isFinite(value.longitude)
    && value.latitude >= -90
    && value.latitude <= 90
    && value.longitude >= -180
    && value.longitude <= 180;
}

export function straightLineDistanceMeters(start: MapCoordinate, end: MapCoordinate): number {
  const radians = (degrees: number) => degrees * Math.PI / 180;
  const latitudeDelta = radians(end.latitude - start.latitude);
  const longitudeDelta = radians(end.longitude - start.longitude);
  const latitude1 = radians(start.latitude);
  const latitude2 = radians(end.latitude);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371000 * 2 * Math.atan2(Math.sqrt(haversine), Math.sqrt(1 - haversine));
}

export async function getDrivingRoute(
  start: MapCoordinate,
  end: MapCoordinate,
): Promise<DrivingRoute> {
  if (!validCoordinate(start) || !validCoordinate(end)) {
    throw new Error('Tọa độ nhà hàng hoặc địa chỉ giao hàng không hợp lệ.');
  }
  const coordinates = `${start.longitude},${start.latitude};${end.longitude},${end.latitude}`;
  const query = new URLSearchParams({ overview: 'full', geometries: 'geojson' });
  let response: Response;
  try {
    response = await fetch(`${OSRM_ROUTE_URL}/${coordinates}?${query.toString()}`);
  } catch (error) {
    throw new Error('Không thể kết nối dịch vụ tìm đường OpenStreetMap.', { cause: error });
  }
  if (!response.ok) {
    throw new Error(`Không thể lấy tuyến giao hàng (HTTP ${response.status}).`);
  }

  const payload = await response.json() as OsrmRouteResponse;
  if (payload.code !== 'Ok' || !Array.isArray(payload.routes) || payload.routes.length === 0) {
    throw new Error('Không tìm được tuyến giao hàng giữa nhà hàng và địa chỉ này.');
  }
  const route = payload.routes[0];
  if (typeof route !== 'object' || route === null || Array.isArray(route)) {
    throw new Error('Dịch vụ tìm đường trả về tuyến không hợp lệ.');
  }
  const routeRecord = route as Record<string, unknown>;
  const distanceMeters = routeRecord.distance;
  const geometry = routeRecord.geometry;
  if (
    typeof distanceMeters !== 'number'
    || !Number.isFinite(distanceMeters)
    || distanceMeters < 0
    || typeof geometry !== 'object'
    || geometry === null
    || Array.isArray(geometry)
  ) {
    throw new Error('Dịch vụ tìm đường trả về dữ liệu quãng đường không hợp lệ.');
  }
  const rawCoordinates = (geometry as Record<string, unknown>).coordinates;
  if (!Array.isArray(rawCoordinates) || rawCoordinates.length < 2) {
    throw new Error('Dịch vụ tìm đường không trả về hình học tuyến đường.');
  }
  const routeCoordinates = rawCoordinates.map((point): MapCoordinate => {
    if (
      !Array.isArray(point)
      || point.length < 2
      || typeof point[0] !== 'number'
      || typeof point[1] !== 'number'
    ) {
      throw new Error('Dịch vụ tìm đường trả về tọa độ tuyến không hợp lệ.');
    }
    const coordinate = { latitude: point[1], longitude: point[0] };
    if (!validCoordinate(coordinate)) {
      throw new Error('Dịch vụ tìm đường trả về tọa độ tuyến ngoài phạm vi.');
    }
    return coordinate;
  });
  return { distanceMeters, coordinates: routeCoordinates };
}
