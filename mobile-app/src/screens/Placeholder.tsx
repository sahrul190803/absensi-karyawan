import { Link } from "react-router-dom";
import { ExternalLink, Hammer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API_URL } from "@/lib/api";
import { openExternal } from "@/lib/external";

export function PlaceholderScreen({
  title,
  description,
  webPath,
  backTo = "/app",
}: {
  title: string;
  description: string;
  webPath?: string;
  backTo?: string;
}) {
  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          {description}
        </p>
      </header>

      <section className="rounded-lg border border-dashed bg-card px-5 py-10 text-center">
        <Hammer
          className="mx-auto size-7 text-muted-foreground"
          aria-hidden="true"
        />
        <p className="mt-3 text-sm font-medium">Modul sedang dibangun</p>
        <p className="mx-auto mt-1 max-w-sm text-sm leading-6 text-muted-foreground">
          Layar ini sudah terhubung ke aplikasi. Fitur lengkapnya akan
          ditambahkan pada tahap berikutnya.
        </p>
        <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
          <Button asChild variant="outline" className="h-11">
            <Link to={backTo}>Kembali</Link>
          </Button>
          {webPath && (
            <Button
              className="h-11"
              onClick={() => void openExternal(`${API_URL}${webPath}`)}
            >
              <ExternalLink aria-hidden="true" />
              Buka versi web
            </Button>
          )}
        </div>
      </section>
    </div>
  );
}
