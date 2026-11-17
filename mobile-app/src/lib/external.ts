import { Capacitor } from "@capacitor/core";
import { Browser } from "@capacitor/browser";

export async function openExternal(url: string) {
  if (Capacitor.isNativePlatform()) {
    await Browser.open({ url });
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
}
