import { useState } from "react";
import { SmoothImage } from "./SmoothImage";

interface ProductGalleryProps {
  images: string[];
  alt: string;
  badge?: string;
}

/** One large photo plus a row of thumbnails when there is more than one photo. */
export function ProductGallery({ images, alt, badge }: ProductGalleryProps) {
  const [index, setIndex] = useState(0);
  const safeIndex = Math.min(index, images.length - 1);
  const current = images[safeIndex];

  return (
    <div className="min-w-0">
      <div className="relative aspect-[4/4.5] overflow-hidden rounded-[28px] bg-surface">
        <SmoothImage
          alt={images.length > 1 ? `${alt} (photo ${safeIndex + 1} of ${images.length})` : alt}
          className="size-full object-contain"
          height="1125"
          key={current}
          src={current.replace("w=900", "w=1400")}
          width="1000"
        />
        {badge && (
          <span className="absolute left-4 top-4 rounded-full bg-canvas/95 px-3 py-1.5 text-xs font-semibold text-ink">
            {badge}
          </span>
        )}
      </div>

      {images.length > 1 && (
        <ul aria-label="Product photos" className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {images.map((source, photoIndex) => (
            <li className="shrink-0" key={source}>
              <button
                aria-current={photoIndex === safeIndex}
                aria-label={`Show photo ${photoIndex + 1} of ${images.length}`}
                className={`relative block size-16 overflow-hidden rounded-xl border bg-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:size-20 ${
                  photoIndex === safeIndex ? "border-accent ring-1 ring-accent" : "border-border hover:border-muted"
                }`}
                onClick={() => setIndex(photoIndex)}
                type="button"
              >
                <img alt="" className="size-full object-contain" height="160" loading="lazy" src={source} width="160" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
