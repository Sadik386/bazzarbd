import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Upload, X, Loader2, ImagePlus, Check, GripVertical } from "lucide-react";
import { cloudinaryUrl } from "@/lib/cloudinary";

interface ImageUploadProps {
  onUploadComplete?: (imageUrl: string) => void;
  onMultipleUploadComplete?: (imageUrls: string[]) => void;
  maxImages?: number;
  currentImages?: string[];
  onDeleteImage?: (imageUrl: string) => void;
  onReorder?: (newOrder: string[]) => void;
}

const ImageUpload = ({
  onUploadComplete,
  onMultipleUploadComplete,
  maxImages = 10,
  currentImages = [],
  onDeleteImage,
  onReorder,
}: ImageUploadProps) => {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploadedImages, setUploadedImages] = useState<string[]>(currentImages);
  const [dragActive, setDragActive] = useState(false);

  // --- Reorder drag state ---
  const dragItemIndex = useRef<number | null>(null);
  const dragOverItemIndex = useRef<number | null>(null);
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
  const [overIndex, setOverIndex] = useState<number | null>(null);

  useEffect(() => {
    setUploadedImages(currentImages);
  }, [currentImages]);

  // ── Upload zone drag handlers ──────────────────────────────────────────────
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  // ── Image compression (Canvas, no deps) ───────────────────────────────────
  const compressImage = (file: File): Promise<File> => {
    return new Promise((resolve) => {
      if (!file.type.startsWith("image/") || file.type === "image/gif") {
        return resolve(file);
      }
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target?.result as string;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          const ctx = canvas.getContext("2d");
          const MAX_WIDTH = 1200;
          const MAX_HEIGHT = 1200;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; }
          } else {
            if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; }
          }

          canvas.width = width;
          canvas.height = height;

          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob(
              (blob) => {
                if (blob) {
                  const compressedFile = new File([blob], file.name, { type: "image/jpeg", lastModified: Date.now() });
                  resolve(compressedFile.size < file.size ? compressedFile : file);
                } else {
                  resolve(file);
                }
              },
              "image/jpeg",
              0.85
            );
          } else {
            resolve(file);
          }
        };
        img.onerror = () => resolve(file);
      };
      reader.onerror = () => resolve(file);
    });
  };

  // ── Core upload ────────────────────────────────────────────────────────────
  const uploadImage = async (file: File, silentState = false) => {
    if (!silentState) { setUploading(true); setProgress(0); }

    const formData = new FormData();
    formData.append("image", file);

    try {
      const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:5001/api";
      const response = await fetch(`${apiUrl}/upload/upload`, { method: "POST", body: formData });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Upload failed");
      }

      const data = await response.json();
      const imageUrl = data.image.url;

      setUploadedImages((prev) => [...prev, imageUrl]);
      if (!silentState) setProgress(100);
      if (onUploadComplete && !onMultipleUploadComplete) onUploadComplete(imageUrl);
      if (!silentState) setTimeout(() => { setUploading(false); setProgress(0); }, 500);

      return imageUrl;
    } catch (error) {
      console.error("Error uploading image:", error);
      if (!silentState) { setUploading(false); setProgress(0); }
      throw error;
    }
  };

  const uploadMultipleImages = async (files: FileList | File[]) => {
    const filesArray = Array.from(files).slice(0, maxImages - uploadedImages.length);
    if (filesArray.length === 0) return;

    setUploading(true);
    setProgress(5);

    try {
      let completedCount = 0;
      const uploadPromises = filesArray.map(async (file) => {
        try {
          const compressed = await compressImage(file);
          const url = await uploadImage(compressed, true);
          completedCount++;
          setProgress(Math.floor((completedCount / filesArray.length) * 100));
          return url;
        } catch (err) {
          console.error(`Failed to upload ${file.name}:`, err);
          return null;
        }
      });

      const results = await Promise.all(uploadPromises);
      const uploadedUrls = results.filter((url): url is string => url !== null);
      if (uploadedUrls.length > 0 && onMultipleUploadComplete) onMultipleUploadComplete(uploadedUrls);
    } catch (error) {
      console.error("Multiple upload error:", error);
    } finally {
      setTimeout(() => { setUploading(false); setProgress(0); }, 500);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      uploadMultipleImages(e.dataTransfer.files);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (e.target.files && e.target.files[0]) uploadMultipleImages(e.target.files);
  };

  const handleDeleteImage = (imageUrl: string) => {
    setUploadedImages((prev) => prev.filter((img) => img !== imageUrl));
    if (onDeleteImage) onDeleteImage(imageUrl);
  };

  // ── Reorder drag handlers ──────────────────────────────────────────────────
  const handleImageDragStart = (e: React.DragEvent, index: number) => {
    dragItemIndex.current = index;
    setDraggingIndex(index);
    e.dataTransfer.effectAllowed = "move";
    // Use a transparent 1x1 ghost so we render our own drag preview via CSS
    const ghost = document.createElement("canvas");
    ghost.width = 1; ghost.height = 1;
    e.dataTransfer.setDragImage(ghost, 0, 0);
  };

  const handleImageDragEnter = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    dragOverItemIndex.current = index;
    setOverIndex(index);
  };

  const handleImageDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleImageDragEnd = () => {
    const from = dragItemIndex.current;
    const to = dragOverItemIndex.current;

    if (from !== null && to !== null && from !== to) {
      const reordered = [...uploadedImages];
      const [removed] = reordered.splice(from, 1);
      reordered.splice(to, 0, removed);
      setUploadedImages(reordered);
      if (onReorder) onReorder(reordered);
    }

    dragItemIndex.current = null;
    dragOverItemIndex.current = null;
    setDraggingIndex(null);
    setOverIndex(null);
  };

  const canUploadMore = uploadedImages.length < maxImages;

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {canUploadMore && (
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 text-center transition-all ${
            dragActive ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"
          } ${uploading ? "opacity-50 pointer-events-none" : ""}`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <input
            id="file-upload"
            type="file"
            accept="image/*"
            multiple
            onChange={handleChange}
            className="hidden"
            disabled={uploading}
          />

          <AnimatePresence>
            {uploading ? (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <Loader2 className="w-8 h-8 mx-auto animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Uploading...</p>
                <div className="w-full bg-secondary rounded-full h-2">
                  <motion.div className="bg-primary h-2 rounded-full" initial={{ width: 0 }} animate={{ width: `${progress}%` }} />
                </div>
              </motion.div>
            ) : (
              <label htmlFor="file-upload" className="cursor-pointer block space-y-3">
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                  <ImagePlus className="w-8 h-8 mx-auto text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">
                      Drop images here or{" "}
                      <span className="text-primary hover:underline cursor-pointer">browse</span>
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">PNG, JPG, WEBP up to 5MB each</p>
                  </div>
                </motion.div>
              </label>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Uploaded Images — drag to reorder */}
      {uploadedImages.length > 0 && (
        <>
          <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest flex items-center gap-1.5">
            <GripVertical className="w-3 h-3" />
            Drag images to reorder · First image is the cover
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {uploadedImages.map((imageUrl, index) => {
              const isDragging = draggingIndex === index;
              const isOver = overIndex === index && draggingIndex !== index;

              return (
                <div
                  key={imageUrl}
                  draggable
                  onDragStart={(e) => handleImageDragStart(e, index)}
                  onDragEnter={(e) => handleImageDragEnter(e, index)}
                  onDragOver={handleImageDragOver}
                  onDragEnd={handleImageDragEnd}
                  style={{ transition: "opacity 0.15s, transform 0.15s, box-shadow 0.15s" }}
                  className={`relative group aspect-square rounded-xl overflow-hidden border-2 cursor-grab active:cursor-grabbing select-none
                    ${isDragging
                      ? "opacity-30 scale-95 border-primary/40 shadow-none"
                      : isOver
                      ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.3)] scale-[1.03]"
                      : "border-border hover:border-primary/50 hover:shadow-md"
                    }`}
                >
                  <img
                    src={cloudinaryUrl(imageUrl)}
                    alt={`Product image ${index + 1}`}
                    className="w-full h-full object-cover pointer-events-none"
                    draggable={false}
                  />

                  {/* Position badge */}
                  <div
                    className={`absolute top-2 left-2 rounded-full text-[10px] font-bold px-2 py-0.5 leading-none flex items-center gap-1 shadow
                      ${index === 0
                        ? "bg-primary text-primary-foreground"
                        : "bg-black/60 text-white backdrop-blur-sm"
                      }`}
                  >
                    {index === 0 ? "Cover" : `#${index + 1}`}
                  </div>

                  {/* Grip handle (top-right) */}
                  <div className="absolute top-2 right-8 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                    <GripVertical className="w-4 h-4 text-white drop-shadow" />
                  </div>

                  {/* Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleDeleteImage(imageUrl)}
                    className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/90 z-10"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>

                  {/* Drop indicator overlay */}
                  {isOver && (
                    <div className="absolute inset-0 bg-primary/10 border-2 border-primary rounded-xl pointer-events-none" />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* Image Count */}
      {uploadedImages.length > 0 && (
        <p className="text-xs text-muted-foreground">
          {uploadedImages.length} / {maxImages} images uploaded
        </p>
      )}
    </div>
  );
};

export default ImageUpload;
