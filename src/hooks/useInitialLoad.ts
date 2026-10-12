import { useEffect, useState } from "react";

const MIN_LOADING_MS = 600;
const MAX_LOADING_MS = 3000;

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function preloadImage(src: string): Promise<void> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve();
    image.onerror = () => resolve();
    image.src = src;
  });
}

/**
 * Returns false until the web fonts and the first hero image are ready.
 * Shows loading for at least MIN_LOADING_MS (avoids a flash) and never longer than
 * MAX_LOADING_MS (so a slow image can't block the shop).
 */
export function useInitialLoad(firstImage?: string): boolean {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const assets = Promise.all([
      document.fonts.ready,
      firstImage ? preloadImage(firstImage) : Promise.resolve(),
    ]);

    Promise.all([Promise.race([assets, wait(MAX_LOADING_MS)]), wait(MIN_LOADING_MS)]).then(() => {
      if (!cancelled) setIsReady(true);
    });

    return () => {
      cancelled = true;
    };
  }, [firstImage]);

  return isReady;
}
