import type { DevicePosition } from "@/lib/geolocation";

const TIMEZONE = "Asia/Jakarta";

const jakartaParts = (date: Date) => {
  const day = date.toLocaleDateString("id-ID", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIMEZONE,
  });
  const time = date.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    timeZone: TIMEZONE,
  });
  return { day, time };
};

export type WatermarkInput = {
  mode: "check-in" | "check-out";
  locationFree: boolean;
  locationName?: string;
  placeNote?: string;
  position: DevicePosition | null;
};

export function drawWatermark(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  input: WatermarkInput,
) {
  const scale = width / 720;
  const pad = Math.round(14 * scale);
  const panelHeight = Math.round(104 * scale);
  const parts = jakartaParts(new Date());

  context.fillStyle = "rgba(12, 10, 8, 0.64)";
  context.fillRect(0, height - panelHeight, width, panelHeight);
  context.fillStyle = "#E4F222";
  context.fillRect(0, height - panelHeight, Math.round(6 * scale), panelHeight);

  context.textBaseline = "top";
  context.fillStyle = "#E4F222";
  context.font = `600 ${Math.round(11 * scale)}px system-ui, sans-serif`;
  context.fillText(
    `HADIRKU LECARASSA · ${input.mode === "check-in" ? "ABSEN MASUK" : "ABSEN PULANG"}`,
    pad,
    height - panelHeight + Math.round(10 * scale),
  );

  context.fillStyle = "#FFFFFF";
  context.font = `700 ${Math.round(22 * scale)}px ui-monospace, Consolas, monospace`;
  context.fillText(
    `${parts.day} · ${parts.time} WIB`,
    pad,
    height - panelHeight + Math.round(28 * scale),
  );

  const placeLine = input.locationFree
    ? input.placeNote?.trim()
      ? `Tempat: ${input.placeNote.trim()}`
      : "Mode dinas luar — foto tanpa lokasi"
    : `Lokasi: ${input.locationName ?? "-"}`;
  const gpsLine = input.position
    ? `GPS ${input.position.latitude.toFixed(5)}, ${input.position.longitude.toFixed(5)} ±${Math.round(input.position.accuracy)} m`
    : "GPS tidak tersedia";

  context.font = `500 ${Math.round(13 * scale)}px system-ui, sans-serif`;
  context.fillText(
    placeLine.slice(0, 70),
    pad,
    height - panelHeight + Math.round(60 * scale),
  );
  context.fillText(
    gpsLine,
    pad,
    height - panelHeight + Math.round(80 * scale),
  );
}

export async function addWatermark(
  dataUrl: string,
  input: WatermarkInput,
): Promise<string> {
  const image = new Image();
  image.src = dataUrl;
  await image.decode();

  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth;
  canvas.height = image.naturalHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia.");

  context.drawImage(image, 0, 0);
  drawWatermark(context, canvas.width, canvas.height, input);
  return canvas.toDataURL("image/jpeg", 0.82);
}

export function captureVideoFrame(
  video: HTMLVideoElement,
  input: WatermarkInput,
): string {
  const maxWidth = 720;
  const scale = Math.min(1, maxWidth / (video.videoWidth || maxWidth));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round((video.videoWidth || maxWidth) * scale);
  canvas.height = Math.round((video.videoHeight || maxWidth) * scale);
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas tidak tersedia.");

  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  drawWatermark(context, canvas.width, canvas.height, input);
  return canvas.toDataURL("image/jpeg", 0.82);
}
