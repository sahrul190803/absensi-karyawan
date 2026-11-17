import { WifiOff } from "lucide-react";
import { useNetworkStatus } from "@/lib/network";

export function NetworkBanner() {
  const online = useNetworkStatus();
  if (online) return null;
  return (
    <p
      role="status"
      className="mb-4 flex items-center gap-2 rounded-lg border border-warning/40 bg-warning-quiet px-3 py-2 text-sm text-warning"
    >
      <WifiOff className="size-4 shrink-0" aria-hidden="true" />
      Tidak ada koneksi internet. Data mungkin belum terbaru.
    </p>
  );
}
