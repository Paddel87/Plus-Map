"use client";

import { useMemo, useState, type CSSProperties } from "react";
import Map, {
  GeolocateControl,
  Marker,
  NavigationControl,
  type GeolocateResultEvent,
  type MapLayerMouseEvent,
} from "react-map-gl/maplibre";

import { DEFAULT_MAP_CENTER, rasterTileStyle } from "@/lib/map";

export interface LocationPickerMapProps {
  lat: number | null;
  lon: number | null;
  onChange: (next: { lat: number; lon: number }) => void;
  className?: string;
  style?: CSSProperties;
  initialZoom?: number;
}

export function LocationPickerMap({
  lat,
  lon,
  onChange,
  className,
  style,
  initialZoom = 14,
}: LocationPickerMapProps) {
  const mapStyle = useMemo(() => rasterTileStyle(), []);
  const fallback = DEFAULT_MAP_CENTER;
  const [initialView] = useState(() => ({
    latitude: lat ?? fallback.lat,
    longitude: lon ?? fallback.lon,
    zoom: lat !== null && lon !== null ? initialZoom : 11,
  }));

  function handleClick(event: MapLayerMouseEvent) {
    const { lat: nextLat, lng: nextLon } = event.lngLat;
    onChange({ lat: roundCoord(nextLat), lon: roundCoord(nextLon) });
  }

  function handleMarkerDragEnd(event: { lngLat: { lat: number; lng: number } }) {
    onChange({ lat: roundCoord(event.lngLat.lat), lon: roundCoord(event.lngLat.lng) });
  }

  function handleGeolocate(event: GeolocateResultEvent) {
    const { latitude, longitude } = event.coords;
    onChange({ lat: roundCoord(latitude), lon: roundCoord(longitude) });
  }

  return (
    <div
      className={className}
      style={{ width: "100%", height: 360, position: "relative", ...style }}
      data-testid="location-picker-map"
    >
      <Map
        mapStyle={mapStyle}
        initialViewState={initialView}
        onClick={handleClick}
        cursor="crosshair"
      >
        <NavigationControl position="top-right" showCompass={false} />
        <GeolocateControl
          position="top-right"
          positionOptions={{ enableHighAccuracy: true }}
          trackUserLocation={false}
          showAccuracyCircle={false}
          onGeolocate={handleGeolocate}
        />
        {lat !== null && lon !== null ? (
          <Marker
            latitude={lat}
            longitude={lon}
            anchor="bottom"
            draggable
            onDragEnd={handleMarkerDragEnd}
          >
            <span
              aria-label="Ausgewählter Ort"
              role="img"
              className="block h-8 w-8 -translate-y-1 rounded-full border-2 border-white bg-red-600 shadow-md"
            />
          </Marker>
        ) : null}
      </Map>
    </div>
  );
}

function roundCoord(value: number): number {
  return Math.round(value * 1_000_000) / 1_000_000;
}
