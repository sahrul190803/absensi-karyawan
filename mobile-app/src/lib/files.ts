import { Capacitor } from "@capacitor/core";
import { Directory, Filesystem } from "@capacitor/filesystem";
import { Share } from "@capacitor/share";
import { apiBlob } from "@/lib/api";

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result ?? "");
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.onerror = () => reject(new Error("Gagal membaca file."));
    reader.readAsDataURL(blob);
  });
}

// Downloads an authenticated API file and opens the platform share/save sheet.
// The browser path is a normal download; the native path writes to the app
// cache first so PDFs can be opened by the device's viewer.
export async function openAuthenticatedFile(path: string, filename: string) {
  const blob = await apiBlob(path);
  const extension = blob.type.includes("pdf")
    ? "pdf"
    : blob.type.includes("png")
      ? "png"
      : blob.type.includes("webp")
        ? "webp"
        : "jpg";
  const finalName = filename.includes(".") ? filename : `${filename}.${extension}`;

  if (!Capacitor.isNativePlatform()) {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = finalName;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    return;
  }

  const data = await blobToBase64(blob);
  const result = await Filesystem.writeFile({
    path: finalName,
    data,
    directory: Directory.Cache,
    recursive: true,
  });
  await Share.share({
    title: finalName,
    url: result.uri,
    dialogTitle: "Buka atau simpan file",
  });
}
