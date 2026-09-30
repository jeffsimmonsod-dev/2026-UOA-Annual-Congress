import { useEffect, useState } from "react";
import { ImageOff, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type PreviewState =
  | { status: "loading" }
  | { status: "ready"; url: string }
  | { status: "error"; message: string };

export function AdminPhotoPreview({ objectPath, conferenceId, pin, alt }: {
  objectPath: string;
  conferenceId: number;
  pin: string;
  alt: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState<PreviewState>({ status: "loading" });

  useEffect(() => {
    const controller = new AbortController();
    let objectUrl: string | null = null;
    let active = true;
    setState({ status: "loading" });

    async function load() {
      try {
        // The admin API returns an object path like /objects/photos/…; the
        // storage route already supplies the /objects/ part of the URL.
        const path = objectPath.replace(/^\/?objects\/?/, "").replace(/^\/+/, "");
        if (!path) throw new Error("No photo path was provided.");
        const safePath = path.split("/").map(encodeURIComponent).join("/");
        const response = await fetch(`/api/storage/objects/${safePath}?conferenceId=${encodeURIComponent(conferenceId)}`, {
          headers: { "X-Admin-Pin": pin, "X-Conference-Id": String(conferenceId) },
          credentials: "include",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error(`Photo could not be loaded (${response.status}).`);
        const blob = await response.blob();
        if (!blob.type.startsWith("image/")) throw new Error("The photo response was not an image.");
        objectUrl = URL.createObjectURL(blob);
        if (active) setState({ status: "ready", url: objectUrl });
        else URL.revokeObjectURL(objectUrl);
      } catch (error) {
        if (active && !controller.signal.aborted) {
          setState({ status: "error", message: error instanceof Error ? error.message : "Photo could not be loaded." });
        }
      }
    }
    void load();
    return () => {
      active = false;
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectPath, conferenceId, pin, attempt]);

  if (state.status === "loading") {
    return <Skeleton className="mt-3 h-48 w-full rounded-lg" data-testid="status-admin-photo-loading" />;
  }

  if (state.status === "error") {
    return <div className="mt-3 flex min-h-28 flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-background/70 p-4 text-center" data-testid="status-admin-photo-error">
      <ImageOff className="h-5 w-5 text-muted-foreground" />
      <p className="text-xs text-muted-foreground">{state.message}</p>
      <Button size="sm" variant="outline" onClick={() => setAttempt(value => value + 1)} data-testid="button-retry-admin-photo"><RotateCcw className="mr-1.5 h-3.5 w-3.5" />Retry photo</Button>
    </div>;
  }

  return <div className="mt-3 overflow-hidden rounded-lg border border-border bg-muted/60">
    <img src={state.url} alt={alt} className="max-h-80 w-full object-contain" data-testid="img-admin-community-photo" onError={() => setState({ status: "error", message: "Photo could not be displayed." })} />
  </div>;
}