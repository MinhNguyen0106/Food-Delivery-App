"use client";

import "leaflet/dist/leaflet.css";

import L from "leaflet";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, Marker, TileLayer, useMap, useMapEvents } from "react-leaflet";

import {
  reverseGeocode,
  searchAddresses,
  type AddressSearchResult,
} from "@/services/maps/openstreetmap";

interface RestaurantLocation {
  latitude: number;
  longitude: number;
  address: string;
}

interface RestaurantLocationPickerProps {
  latitude: number;
  longitude: number;
  address: string;
  onLocationChange: (location: RestaurantLocation) => void;
  onResolvingChange: (resolving: boolean) => void;
}

function MapController({ latitude, longitude }: { latitude: number; longitude: number }) {
  const map = useMap();

  useEffect(() => {
    map.setView([latitude, longitude], 16);
  }, [latitude, longitude, map]);

  return null;
}

function MapTapHandler({
  onSelect,
}: {
  onSelect: (latitude: number, longitude: number) => void;
}) {
  useMapEvents({
    click(event) {
      onSelect(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

export default function RestaurantLocationPicker({
  latitude,
  longitude,
  address,
  onLocationChange,
  onResolvingChange,
}: RestaurantLocationPickerProps) {
  const geocodeRequest = useRef(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AddressSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState("");
  const markerIcon = useMemo(
    () => L.divIcon({
      className: "restaurant-osm-marker",
      html: '<span style="display:block;width:20px;height:20px;border:3px solid white;border-radius:50% 50% 50% 0;background:#c2410c;box-shadow:0 1px 5px #0008;transform:rotate(-45deg)"></span>',
      iconSize: [26, 26],
      iconAnchor: [13, 26],
    }),
    [],
  );

  const selectCoordinate = useCallback(async (
    selectedLatitude: number,
    selectedLongitude: number,
  ) => {
    const requestId = ++geocodeRequest.current;
    setError("");
    setSearchResults([]);
    onResolvingChange(true);
    onLocationChange({
      latitude: selectedLatitude,
      longitude: selectedLongitude,
      address: "",
    });
    try {
      const selectedAddress = await reverseGeocode(selectedLatitude, selectedLongitude);
      if (requestId === geocodeRequest.current) {
        onLocationChange({
          latitude: selectedLatitude,
          longitude: selectedLongitude,
          address: selectedAddress,
        });
      }
    } catch (cause) {
      if (requestId === geocodeRequest.current) {
        setError(cause instanceof Error
          ? cause.message
          : "Không thể lấy địa chỉ từ OpenStreetMap.");
      }
    } finally {
      if (requestId === geocodeRequest.current) onResolvingChange(false);
    }
  }, [onLocationChange, onResolvingChange]);

  async function searchAddress() {
    const query = searchQuery.trim();
    if (!query || isSearching) return;
    setIsSearching(true);
    setError("");
    setSearchResults([]);
    try {
      const results = await searchAddresses(query);
      setSearchResults(results);
      if (results.length === 0) {
        setError("Không tìm thấy địa chỉ phù hợp. Thử thêm tên đường, quận hoặc thành phố.");
      }
    } catch (cause) {
      setError(cause instanceof Error
        ? cause.message
        : "Không thể tìm địa chỉ trên OpenStreetMap.");
    } finally {
      setIsSearching(false);
    }
  }

  function chooseSearchResult(result: AddressSearchResult) {
    geocodeRequest.current += 1;
    onResolvingChange(false);
    onLocationChange({
      latitude: result.latitude,
      longitude: result.longitude,
      address: result.address,
    });
    setSearchResults([]);
    setError("");
  }

  function locateCurrentPosition() {
    setError("");
    if (!navigator.geolocation) {
      setError("Trình duyệt không hỗ trợ định vị. Hãy chọn điểm trực tiếp trên bản đồ.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        void selectCoordinate(position.coords.latitude, position.coords.longitude);
      },
      () => setError("Không thể lấy vị trí hiện tại. Kiểm tra quyền vị trí hoặc chọn điểm trên bản đồ."),
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  return (
    <div className="mt-1.5 space-y-3">
      <div className="flex gap-2">
        <input
          value={searchQuery}
          maxLength={200}
          onChange={(event) => {
            setSearchQuery(event.target.value);
            setSearchResults([]);
            setError("");
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              void searchAddress();
            }
          }}
          placeholder="Tìm địa chỉ nhà hàng..."
          aria-label="Tìm địa chỉ nhà hàng trên OpenStreetMap"
          className="h-11 min-w-0 flex-1 rounded-lg border border-slate-300 px-3 text-sm outline-none focus:border-emerald-700 focus:ring-2 focus:ring-emerald-700/10"
        />
        <button
          type="button"
          onClick={() => void searchAddress()}
          disabled={!searchQuery.trim() || isSearching}
          className="rounded-lg bg-emerald-800 px-4 text-sm font-semibold text-white hover:bg-emerald-900 disabled:opacity-50"
        >
          {isSearching ? "Đang tìm..." : "Tìm"}
        </button>
      </div>
      {searchResults.length > 0 && (
        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white">
          {searchResults.map((result) => (
            <button
              key={result.id}
              type="button"
              onClick={() => chooseSearchResult(result)}
              className="block w-full border-b border-slate-100 px-3 py-2.5 text-left last:border-b-0 hover:bg-emerald-50"
            >
              <span className="block text-sm font-medium text-slate-800">{result.name}</span>
              <span className="mt-0.5 block text-xs text-slate-500">{result.address}</span>
            </button>
          ))}
        </div>
      )}
      <div className="relative h-80 overflow-hidden rounded-xl border border-slate-200">
        <MapContainer
          center={[latitude, longitude]}
          zoom={16}
          scrollWheelZoom
          className="h-full w-full"
        >
          <TileLayer
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          />
          <MapController latitude={latitude} longitude={longitude} />
          <MapTapHandler onSelect={(lat, lon) => void selectCoordinate(lat, lon)} />
          <Marker
            position={[latitude, longitude]}
            icon={markerIcon}
            draggable
            eventHandlers={{
              dragend(event) {
                const selected = event.target.getLatLng();
                void selectCoordinate(selected.lat, selected.lng);
              },
            }}
          />
        </MapContainer>
        <button
          type="button"
          onClick={locateCurrentPosition}
          className="absolute right-3 top-3 z-[1000] rounded-lg bg-white px-3 py-2 text-xs font-semibold text-slate-800 shadow hover:bg-slate-50"
        >
          Vị trí hiện tại
        </button>
      </div>
      <p className="text-xs text-slate-500">
        Chạm bản đồ, kéo ghim hoặc tìm địa chỉ để cập nhật vị trí. Nhà hàng chỉ lưu một địa chỉ.
      </p>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
        <span>Vĩ độ: {latitude.toFixed(6)}</span>
        <span>Kinh độ: {longitude.toFixed(6)}</span>
      </div>
      <p className="text-xs text-slate-500">Địa chỉ hiện tại: {address || "Đang xác định địa chỉ..."}</p>
      {error && <p role="status" className="text-sm text-red-700">{error}</p>}
      <p className="text-xs text-slate-400">
        © OpenStreetMap contributors. Tìm kiếm và tọa độ được gửi đến dịch vụ công cộng OpenStreetMap.
      </p>
    </div>
  );
}
