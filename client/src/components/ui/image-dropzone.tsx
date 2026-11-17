import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Loader2, Trash2, UploadCloud } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getImageUrl } from "@/lib/format";
import { cn } from "@/lib/utils";

interface ImageDropzoneProps {
  urls: string[];
  onChange: (urls: string[]) => void;
  multiple?: boolean;
  label?: string;
}

export function ImageDropzone({
  urls,
  onChange,
  multiple = true,
  label = "Drop product images here, or click to select files",
}: ImageDropzoneProps) {
  const [uploading, setUploading] = useState(false);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;
      setUploading(true);
      try {
        if (multiple && acceptedFiles.length > 1) {
          const formData = new FormData();
          acceptedFiles.forEach((file) => formData.append("images", file));
          const res = await api.upload<{ images: Array<{ url: string }> }>("/upload/multiple", formData);
          const newUrls = (res.images || []).map((i) => i.url);
          onChange([...urls, ...newUrls]);
          toast.success(`Uploaded ${newUrls.length} images`);
        } else {
          const uploaded: string[] = [];
          for (const file of acceptedFiles) {
            const formData = new FormData();
            formData.append("image", file);
            const res = await api.upload<{ url: string }>("/upload", formData);
            if (res.url) uploaded.push(res.url);
          }
          onChange(multiple ? [...urls, ...uploaded] : uploaded.slice(0, 1));
          toast.success("Image uploaded");
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [multiple, onChange, urls]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { "image/*": [".png", ".jpg", ".jpeg", ".webp"] },
    multiple,
    disabled: uploading,
  });

  const handleRemove = (index: number) => {
    const targetUrl = urls[index];
    onChange(urls.filter((_, idx) => idx !== index));
    if (targetUrl.startsWith("/uploads/")) {
      api.post("/upload/delete", { imageUrl: targetUrl }).catch(() => {});
    }
  };

  return (
    <div className="space-y-3">
      <div
        {...getRootProps()}
        className={cn(
          "flex cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-border bg-secondary/40 px-4 py-6 text-center transition-colors hover:border-primary/50 hover:bg-secondary/70",
          isDragActive && "border-primary bg-primary/5",
          uploading && "pointer-events-none opacity-60"
        )}
      >
        <input {...getInputProps()} />
        {uploading ? (
          <Loader2 className="mb-2 h-6 w-6 animate-spin text-primary" />
        ) : (
          <UploadCloud className="mb-2 h-6 w-6 text-muted-foreground" />
        )}
        <p className="text-xs font-medium text-foreground">
          {uploading ? "Uploading to studio storage..." : label}
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground">PNG, JPG, WebP up to 10MB</p>
      </div>

      {urls.length > 0 && (
        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {urls.map((url, idx) => (
            <div
              key={`${url}-${idx}`}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-secondary"
            >
              <img
                src={getImageUrl(url)}
                alt={`Upload ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                onClick={() => handleRemove(idx)}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 rounded-md bg-card/90 p-1 text-destructive opacity-0 shadow transition-opacity group-hover:opacity-100"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
