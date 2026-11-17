import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

export type DevicePosition = {
  latitude: number;
  longitude: number;
  accuracy: number;
};

function fromGeolocationPosition(position: GeolocationPosition): DevicePosition {
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

async function nativePosition(): Promise<DevicePosition> {
  let permission = await Geolocation.checkPermissions();
  if (permission.location !== "granted") {
    permission = await Geolocation.requestPermissions();
  }
  if (permission.location !== "granted") {
    throw new Error("Izin lokasi ditolak.");
  }
  const position = await Geolocation.getCurrentPosition({
    enableHighAccuracy: true,
    timeout: 20_000,
    maximumAge: 0,
  });
  return {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracy: position.coords.accuracy,
  };
}

export async function getCurrentPosition(): Promise<DevicePosition> {
  if (Capacitor.isNativePlatform()) return nativePosition();

  return new Promise<DevicePosition>((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("Perangkat tidak mendukung GPS."));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => resolve(fromGeolocationPosition(position)),
      () => reject(new Error("Izin lokasi ditolak atau GPS tidak tersedia.")),
      { enableHighAccuracy: true, timeout: 20_000, maximumAge: 0 },
    );
  });
}
