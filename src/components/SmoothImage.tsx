import { useEffect, useRef, useState, type ImgHTMLAttributes, type SyntheticEvent } from "react";
import { Skeleton } from "./Skeleton";

type LoadState = "loading" | "loaded" | "error";

/**
 * An <img> that shows a pulsing placeholder while it loads, fades in when ready,
 * and shows a short message if it fails. Its parent must be `relative`.
 */
export function SmoothImage({ className = "", onError, onLoad, ...props }: ImgHTMLAttributes<HTMLImageElement>) {
  const [state, setState] = useState<LoadState>("loading");
  const imageRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const image = imageRef.current;
    if (image?.complete && image.naturalWidth > 0) setState("loaded");
  }, []);

  function handleLoad(event: SyntheticEvent<HTMLImageElement>) {
    setState("loaded");
    onLoad?.(event);
  }

  function handleError(event: SyntheticEvent<HTMLImageElement>) {
    setState("error");
    onError?.(event);
  }

  return (
    <>
      {state === "loading" && <Skeleton className="absolute inset-0 rounded-none" />}
      {state === "error" && (
        <div className="absolute inset-0 flex items-center justify-center bg-surface px-3 text-center text-xs text-muted">
          Image unavailable
        </div>
      )}
      <img
        {...props}
        className={`${className} transition-[opacity,transform] duration-500 motion-reduce:transition-none ${
          state === "loaded" ? "opacity-100" : "opacity-0"
        }`}
        onError={handleError}
        onLoad={handleLoad}
        ref={imageRef}
      />
    </>
  );
}
