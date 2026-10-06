interface NominatimSearchResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  name?: string;
}

interface NominatimReverseResult {
  display_name?: string;
}

export interface AddressSearchResult {
  id: string;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}

const NOMINATIM_URL = "https://nominatim.openstreetmap.org";
const MIN_REQUEST_INTERVAL_MS = 1100;
let requestQueue: Promise<void> = Promise.resolve();
let lastRequestStartedAt = 0;

function wait(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

async function requestNominatim<T>(url: string): Promise<T> {
  const request = requestQueue.then(async () => {
    const delay = MIN_REQUEST_INTERVAL_MS - (Date.now() - lastRequestStartedAt);
    if (delay > 0) await wait(delay);
    lastRequestStartedAt = Date.now();

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "Accept-Language": "vi,en",
      },
    });
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("OpenStreetMap đang giới hạn yêu cầu. Vui lòng chờ một chút rồi thử lại.");
      }
      if (response.status === 403) {
        throw new Error("Dịch vụ tìm địa chỉ OpenStreetMap tạm từ chối yêu cầu. Vui lòng thử lại sau.");
      }
      throw new Error(`Không thể tìm địa chỉ trên OpenStreetMap (HTTP ${response.status}).`);
    }
    return response.json() as Promise<T>;
  });

  requestQueue = request.then(() => undefined, () => undefined);
  return request;
}

export async function searchAddresses(queryText: string): Promise<AddressSearchResult[]> {
  const queryTextTrimmed = queryText.trim();
  if (!queryTextTrimmed) return [];
  if (queryTextTrimmed.length > 200) {
    throw new Error("Địa chỉ tìm kiếm không được dài quá 200 ký tự.");
  }

  const query = new URLSearchParams({
    q: queryTextTrimmed,
    format: "jsonv2",
    addressdetails: "1",
    limit: "5",
    countrycodes: "vn",
  });
  const results = await requestNominatim<NominatimSearchResult[]>(
    `${NOMINATIM_URL}/search?${query.toString()}`,
  );

  return results.flatMap((result) => {
    const latitude = Number(result.lat);
    const longitude = Number(result.lon);
    if (
      !Number.isFinite(latitude)
      || !Number.isFinite(longitude)
      || !result.display_name
    ) {
      return [];
    }
    return [{
      id: String(result.place_id),
      name: result.name?.trim() || result.display_name.split(",")[0],
      address: result.display_name,
      latitude,
      longitude,
    }];
  });
}

export async function reverseGeocode(
  latitude: number,
  longitude: number,
): Promise<string> {
  const query = new URLSearchParams({
    lat: String(latitude),
    lon: String(longitude),
    format: "jsonv2",
    addressdetails: "1",
    zoom: "18",
  });
  const result = await requestNominatim<NominatimReverseResult>(
    `${NOMINATIM_URL}/reverse?${query.toString()}`,
  );
  if (!result.display_name) {
    throw new Error("OpenStreetMap không tìm thấy địa chỉ tại vị trí này.");
  }
  return result.display_name;
}
