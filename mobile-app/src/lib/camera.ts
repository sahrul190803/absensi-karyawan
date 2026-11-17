import { Capacitor } from "@capacitor/core";
import {
  Camera,
  CameraDirection,
  CameraResultType,
  CameraSource,
} from "@capacitor/camera";

export function isNativeApp() {
  return Capacitor.isNativePlatform();
}

// Native camera on Android/iOS. The web build keeps using getUserMedia so the
// same screen can be developed in a desktop browser.
export async function captureNativePhoto(): Promise<string | null> {
  if (!Capacitor.isNativePlatform()) return null;

  const photo = await Camera.getPhoto({
    source: CameraSource.Camera,
    direction: CameraDirection.Front,
    resultType: CameraResultType.Base64,
    quality: 72,
    width: 720,
    allowEditing: false,
    saveToGallery: false,
    correctOrientation: true,
  });

  if (!photo.base64String) throw new Error("Foto tidak tersedia.");
  const format = photo.format === "png" ? "png" : "jpeg";
  return `data:image/${format};base64,${photo.base64String}`;
}
