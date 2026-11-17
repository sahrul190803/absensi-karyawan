import { Capacitor } from "@capacitor/core";
import { Keyboard, KeyboardResize } from "@capacitor/keyboard";
import { SplashScreen } from "@capacitor/splash-screen";
import { StatusBar, Style } from "@capacitor/status-bar";

export async function initializeNative() {
  if (!Capacitor.isNativePlatform()) return;

  const dark = document.documentElement.classList.contains("dark");
  try {
    await Keyboard.setResizeMode({ mode: KeyboardResize.Body });
  } catch {
    /* keyboard plugin is optional on some platforms */
  }
  try {
    await StatusBar.setStyle({ style: dark ? Style.Dark : Style.Light });
    if (Capacitor.getPlatform() === "android") {
      await StatusBar.setBackgroundColor({
        color: dark ? "#141410" : "#f7f7f2",
      });
    }
  } catch {
    /* status bar may not be available */
  }
  try {
    await SplashScreen.hide();
  } catch {
    /* already hidden */
  }
}
