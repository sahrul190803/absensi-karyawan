import { useEffect, useState } from "react";
import { ImageOff, LoaderCircle } from "lucide-react";
import { apiBlob } from "@/lib/api";

export function AuthenticatedImage({
  path,
  alt,
  className,
}: {
  path: string;
  alt: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    setSrc(null);
    setFailed(false);

    void apiBlob(path)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setSrc(objectUrl);
      })
      .catch(() => {
        if (active) setFailed(true);
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (failed) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 rounded-md border bg-muted text-sm text-muted-foreground">
        <ImageOff className="size-4" aria-hidden="true" />
        Gambar tidak tersedia
      </div>
    );
  }
  if (!src) {
    return (
      <div className="flex min-h-40 items-center justify-center gap-2 rounded-md border bg-muted text-sm text-muted-foreground">
        <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
        Memuat gambar…
      </div>
    );
  }
  return <img src={src} alt={alt} className={className} />;
}
