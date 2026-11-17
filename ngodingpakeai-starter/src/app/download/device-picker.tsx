"use client";

import { useSyncExternalStore } from "react";
import {
  ArrowRight,
  Download,
  ExternalLink,
  Laptop,
  Monitor,
  ShieldAlert,
  Smartphone,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { DOWNLOAD_LINKS } from "./links";

type Platform = "android" | "ios" | "macos" | "windows" | "linux" | "unknown";

const subscribe = () => () => {};
const getServerSnapshot = () => "unknown" as Platform;

function detectPlatform(): Platform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;
  const platform = navigator.platform;
  const iPad =
    /Macintosh/i.test(ua) &&
    navigator.platform === "MacIntel" &&
    (navigator.maxTouchPoints ?? 0) > 1;

  if (/Android/i.test(ua)) return "android";
  if (/iPhone|iPad|iPod/i.test(ua) || iPad) return "ios";
  if (/Macintosh|Mac OS X/i.test(ua) || /Mac/i.test(platform)) return "macos";
  if (/Windows/i.test(ua)) return "windows";
  if (/Linux/i.test(ua)) return "linux";
  return "unknown";
}

const CONTENT = {
  android: {
    title: "Android terdeteksi",
    description:
      "Unduh APK resmi Hadirku Lecarassa untuk HP atau tablet Android.",
    primary: { href: DOWNLOAD_LINKS.apk, label: "Download APK Android" },
    secondary: { href: "#android", label: "Cara install" },
    note: "Versi 1.2 · ±8.4 MB · APK release resmi",
    warning: null,
  },
  ios: {
    title: "iPhone / iPad terdeteksi",
    description:
      "Build iOS tersedia sebagai IPA unsigned. Pasang lewat Sideloadly atau AltStore dengan Apple ID Anda.",
    primary: { href: DOWNLOAD_LINKS.ios, label: "Download IPA iOS" },
    secondary: { href: "#ios", label: "Panduan install iOS" },
    note: "Versi 1.2 · ±1.5 MB · belum di App Store",
    warning:
      "Apple ID gratis: aplikasi berlaku sekitar 7 hari dan perlu di-sign ulang. Untuk TestFlight/App Store diperlukan Apple Developer berbayar.",
  },
  macos: {
    title: "Mac terdeteksi",
    description:
      "Gunakan aplikasi web di browser untuk HRD/Admin, atau pasang IPA unsigned lewat Sideloadly/Xcode.",
    primary: { href: DOWNLOAD_LINKS.web, label: "Buka aplikasi web" },
    secondary: { href: DOWNLOAD_LINKS.ios, label: "Download IPA iOS" },
    note: "Aplikasi web berjalan langsung di browser.",
    warning:
      "IPA unsigned tidak bisa dibuka seperti aplikasi Mac biasa. Gunakan Sideloadly/Xcode atau aplikasi web.",
  },
  windows: {
    title: "Komputer Windows terdeteksi",
    description:
      "Buka aplikasi web untuk HRD/Admin. APK Android tersedia untuk HP atau emulator Android.",
    primary: { href: DOWNLOAD_LINKS.web, label: "Buka aplikasi web" },
    secondary: { href: DOWNLOAD_LINKS.apk, label: "Download APK Android" },
    note: "Aplikasi web bisa dipakai di Chrome, Edge, atau Firefox.",
    warning: null,
  },
  linux: {
    title: "Komputer Linux terdeteksi",
    description:
      "Buka aplikasi web untuk HRD/Admin. APK Android tersedia untuk HP atau emulator Android.",
    primary: { href: DOWNLOAD_LINKS.web, label: "Buka aplikasi web" },
    secondary: { href: DOWNLOAD_LINKS.apk, label: "Download APK Android" },
    note: "Aplikasi web bisa dipakai di Chrome, Firefox, atau browser modern.",
    warning: null,
  },
  unknown: {
    title: "Pilih sesuai perangkat",
    description:
      "Kami belum bisa mendeteksi perangkat ini. Pilih opsi yang paling sesuai.",
    primary: { href: DOWNLOAD_LINKS.web, label: "Buka aplikasi web" },
    secondary: { href: DOWNLOAD_LINKS.apk, label: "Download APK Android" },
    note: "Tersedia juga IPA iOS unsigned untuk iPhone/iPad.",
    warning: null,
  },
} as const;

const ICONS = {
  android: Smartphone,
  ios: Smartphone,
  macos: Laptop,
  windows: Monitor,
  linux: Monitor,
  unknown: Monitor,
} as const;

export function DevicePicker() {
  const platform = useSyncExternalStore<Platform>(
    subscribe,
    detectPlatform,
    getServerSnapshot,
  );

  const content = CONTENT[platform];
  const Icon = ICONS[platform];
  const primaryExternal = content.primary.href.startsWith("http");
  const secondaryExternal = content.secondary.href.startsWith("http");

  return (
    <section className="rounded-xl border border-border-strong bg-background p-4 sm:p-5">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-border-strong bg-primary-quiet text-primary-text">
          <Icon className="size-5" aria-hidden="true" />
        </span>
        <div>
          <p className="text-sm font-semibold">{content.title}</p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {content.description}
          </p>
        </div>
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row">
        <Button asChild className="h-11 flex-1">
          <a
            href={content.primary.href}
            {...(primaryExternal
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
          >
            <Download aria-hidden="true" />
            {content.primary.label}
            {primaryExternal ? (
              <ExternalLink aria-hidden="true" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
          </a>
        </Button>
        <Button asChild variant="outline" className="h-11">
          <a
            href={content.secondary.href}
            {...(secondaryExternal
              ? { target: "_blank", rel: "noreferrer" }
              : {})}
          >
            {content.secondary.label}
          </a>
        </Button>
      </div>

      <p className="mt-3 text-xs text-muted-foreground">{content.note}</p>

      {content.warning && (
        <p className="mt-3 flex items-start gap-2 rounded-md border border-warning/40 bg-warning/5 px-3 py-2 text-xs leading-5 text-muted-foreground">
          <ShieldAlert
            className="mt-0.5 size-3.5 shrink-0 text-foreground"
            aria-hidden="true"
          />
          <span>{content.warning}</span>
        </p>
      )}
    </section>
  );
}
