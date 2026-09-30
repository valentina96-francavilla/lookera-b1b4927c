import { useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SalonImageUpload({
  salonId,
  value,
  onChange,
}: {
  salonId: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  async function upload(file: File) {
    if (!file.type.startsWith("image/")) {
      toast.error("Seleziona un'immagine.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("L'immagine deve essere massimo 5 MB.");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `${salonId}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from("salon-images")
        .upload(path, file, { upsert: false, contentType: file.type });

      if (error) throw error;

      const { data } = supabase.storage.from("salon-images").getPublicUrl(path);
      const url = data.publicUrl;

      const { error: dbError } = await supabase
        .from("salons")
        .update({ image_url: url })
        .eq("id", salonId);
      if (dbError) throw dbError;

      if (value) {
        try {
          const marker = "/storage/v1/object/public/salon-images/";
          const oldPath = value.includes(marker)
            ? decodeURIComponent(value.split(marker)[1])
            : "";
          if (oldPath) {
            await supabase.storage.from("salon-images").remove([oldPath]);
          }
        } catch {
          // The new image is already active; cleanup of the old file is best effort.
        }
      }

      onChange(url);
      toast.success("Immagine aggiornata.");
    } catch (error: any) {
      toast.error(error?.message ?? "Impossibile caricare l'immagine.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function remove() {
    if (!value) return;
    setUploading(true);
    try {
      const marker = "/storage/v1/object/public/salon-images/";
      const path = value.includes(marker)
        ? decodeURIComponent(value.split(marker)[1])
        : "";
      if (path) await supabase.storage.from("salon-images").remove([path]);

      const { error } = await supabase
        .from("salons")
        .update({ image_url: null })
        .eq("id", salonId);
      if (error) throw error;

      onChange("");
      toast.success("Immagine rimossa.");
    } catch (error: any) {
      toast.error(error?.message ?? "Impossibile rimuovere l'immagine.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="overflow-hidden rounded-xl border border-border bg-muted">
        {value ? (
          <img src={value} alt="Immagine del salone" className="h-48 w-full object-cover" />
        ) : (
          <div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
            Nessuna immagine caricata
          </div>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) void upload(file);
          }}
        />
        <Button type="button" variant="outline" disabled={uploading} onClick={() => inputRef.current?.click()}>
          <ImagePlus className="mr-2 h-4 w-4" />
          {uploading ? "Caricamento…" : value ? "Sostituisci immagine" : "Carica immagine"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" disabled={uploading} onClick={() => void remove()}>
            <Trash2 className="mr-2 h-4 w-4" />
            Rimuovi
          </Button>
        )}
      </div>
    </div>
  );
}
