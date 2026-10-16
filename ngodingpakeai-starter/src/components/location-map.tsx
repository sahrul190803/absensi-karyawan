"use client";

import { useEffect } from "react";
import L from "leaflet";
import {
  Circle,
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

const pinIcon = L.divIcon({
  className: "",
  html: `<span style="display:block;width:22px;height:22px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#E4F222;border:2px solid #0C0A08;box-shadow:0 0 0 2px #ffffff;"></span>`,
  iconSize: [22, 22],
  iconAnchor: [11, 22],
});

function ClickToMove({
  onPick,
}: {
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(event) {
      onPick(event.latlng.lat, event.latlng.lng);
    },
  });
  return null;
}

function Recenter({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const map = useMap();
  useEffect(() => {
    map.setView([latitude, longitude]);
  }, [latitude, longitude, map]);
  return null;
}

export function LocationMap({
  latitude,
  longitude,
  radiusM,
  onPick,
  height = 320,
}: {
  latitude: number;
  longitude: number;
  radiusM: number;
  onPick: (lat: number, lng: number) => void;
  height?: number;
}) {
  return (
    <div
      className="relative z-0 overflow-hidden rounded-md border border-border"
      style={{ height }}
    >
      <MapContainer
        center={[latitude, longitude]}
        zoom={16}
        scrollWheelZoom
        className="size-full"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Marker
          position={[latitude, longitude]}
          icon={pinIcon}
          draggable
          eventHandlers={{
            dragend: (event) => {
              const latlng = event.target.getLatLng();
              onPick(latlng.lat, latlng.lng);
            },
          }}
        />
        <Circle
          center={[latitude, longitude]}
          radius={radiusM}
          pathOptions={{
            color: "#596200",
            weight: 1.5,
            fillColor: "#E4F222",
            fillOpacity: 0.2,
          }}
        />
        <ClickToMove onPick={onPick} />
        <Recenter latitude={latitude} longitude={longitude} />
      </MapContainer>
    </div>
  );
}
