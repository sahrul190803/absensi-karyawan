import { Capacitor } from "@capacitor/core";
import { Device } from "@capacitor/device";

export type AttendanceDeviceInfo = {
  os: string;
  model: string;
  browser: string;
};

export async function getAttendanceDeviceInfo(): Promise<AttendanceDeviceInfo> {
  if (Capacitor.isNativePlatform()) {
    const info = await Device.getInfo();
    return {
      os: info.operatingSystem === "ios" ? "iOS" : "Android",
      model: info.model || "Perangkat mobile",
      browser: "Aplikasi Hadirku",
    };
  }

  const agent = window.navigator.userAgent;
  const os = /Android/i.test(agent)
    ? "Android"
    : /iPhone|iPad|iPod/i.test(agent)
      ? "iOS"
      : /Windows/i.test(agent)
        ? "Windows"
        : /Mac/i.test(agent)
          ? "macOS"
          : /Linux/i.test(agent)
            ? "Linux"
            : "Lainnya";
  const browser = /Edg\//i.test(agent)
    ? "Edge"
    : /OPR\//i.test(agent)
      ? "Opera"
      : /Chrome/i.test(agent)
        ? "Chrome"
        : /Firefox/i.test(agent)
          ? "Firefox"
          : /Safari/i.test(agent)
            ? "Safari"
            : "Lainnya";
  return {
    os,
    model: /Mobile/i.test(agent) ? "Perangkat mobile" : "Desktop",
    browser,
  };
}
