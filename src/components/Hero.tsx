import { useEffect, useState } from "react";
import { ArrowRight, Pause, Play } from "lucide-react";
import type { HeroSlide } from "../data/heroSlides";
import { Skeleton } from "./Skeleton";

const SLIDE_INTERVAL_MS = 5000;

interface HeroProps {
  isLoading?: boolean;
  slides: HeroSlide[];
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function Hero({ isLoading = false, slides }: HeroProps) {
  const [index, setIndex] = useState(0);
  // Start paused for people who ask their device to reduce motion.
  const [isPlaying, setIsPlaying] = useState(() => !window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const [isInteracting, setIsInteracting] = useState(false);
  const slideCount = slides.length;
  const current = slides[index] ?? slides[0];

  // If the list of slides gets shorter, go back to the first one.
  useEffect(() => {
    setIndex((value) => (value < slides.length ? value : 0));
  }, [slides.length]);

  useEffect(() => {
    if (isLoading || !isPlaying || isInteracting || slideCount < 2) return;
    const timer = window.setInterval(() => setIndex((value) => (value + 1) % slideCount), SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [index, isInteracting, isLoading, isPlaying, slideCount]);

  function handleShop(category: string) {
    window.dispatchEvent(new CustomEvent("shik:category", { detail: category }));
  }

  return (
    <section className="mx-auto grid max-w-content items-center gap-8 px-4 pb-10 pt-8 sm:px-6 sm:pb-14 sm:pt-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14 lg:px-10 lg:pb-16 lg:pt-12">
      <div className="relative z-10 py-2 lg:py-8">
        
        <h1 className="max-w-[600px] text-[44px] font-extrabold leading-[0.98] tracking-tightest text-ink sm:text-[60px] lg:text-[70px]">
          Made for <span className="text-muted">every day.</span>
        </h1>
        <p className="mt-5 max-w-[360px] text-base leading-7 text-muted">
          Sneakers and easy layers, picked for the rhythm of Addis and everywhere after.
        </p>
        <a
          className="mt-7 inline-flex min-h-12 items-center justify-center rounded-full bg-accent px-6 text-sm font-semibold text-accent-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent"
          href="#shop"
        >
          Shop the collection
        </a>
      </div>
      <div
        aria-label="Featured pieces"
        aria-roledescription="carousel"
        className="relative min-h-[250px] overflow-hidden rounded-[28px] bg-surface sm:min-h-[350px] lg:min-h-[430px]"
        onBlur={() => setIsInteracting(false)}
        onFocus={() => setIsInteracting(true)}
        onMouseEnter={() => setIsInteracting(true)}
        onMouseLeave={() => setIsInteracting(false)}
        role="group"
      >
        {isLoading ? (
          <Skeleton className="absolute inset-0 rounded-none" />
        ) : !current ? (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm font-semibold text-muted">
            New pieces are on the way.
          </div>
        ) : (
          <>
            {slides.map((slide, slideIndex) => (
              <div
                aria-hidden={slideIndex !== index}
                className={`absolute inset-0 transition-opacity duration-700 motion-reduce:transition-none ${
                  slideIndex === index ? "opacity-100" : "opacity-0"
                }`}
                key={slide.id}
              >
                {/* Soft blurred copy that fills the space beside the photo. */}
                <img
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 size-full scale-110 object-cover opacity-60 blur-2xl"
                  loading="lazy"
                  src={slide.image}
                />
                <img
                  alt={slide.alt}
                  className="relative size-full object-contain"
                  height="1050"
                  loading={slideIndex === 0 ? "eager" : "lazy"}
                  src={slide.image}
                  width="1400"
                />
              </div>
            ))}
            <a
              className="absolute right-4 top-4 inline-flex min-h-10 items-center gap-2 rounded-full bg-canvas/95 px-4 text-xs font-semibold text-ink transition-colors hover:bg-ink hover:text-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent sm:right-6 sm:top-6"
              href="#shop"
              onClick={() => handleShop(current.category)}
            >
              {current.cta}
              <ArrowRight aria-hidden="true" size={14} />
            </a>
            <div className="absolute inset-x-4 bottom-4 flex items-end justify-between gap-3 sm:inset-x-6 sm:bottom-6">
              <span className="min-w-0 truncate rounded-full bg-canvas/95 px-4 py-2 text-xs font-semibold text-ink">
                <span className="text-muted">{pad(index + 1)}</span> · {current.name}
              </span>
              {slideCount > 1 && (
                <div className="flex shrink-0 items-center gap-1 rounded-full bg-canvas/95 px-2 py-1">
                  <button
                    aria-label={isPlaying ? "Pause slideshow" : "Play slideshow"}
                    className="inline-flex size-8 items-center justify-center rounded-full text-ink hover:text-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                    onClick={() => setIsPlaying((value) => !value)}
                    type="button"
                  >
                    {isPlaying ? <Pause aria-hidden="true" size={14} /> : <Play aria-hidden="true" size={14} />}
                  </button>
                  {slides.map((slide, slideIndex) => (
                    <button
                      aria-current={slideIndex === index}
                      aria-label={`Show ${slide.name}`}
                      className="inline-flex size-6 items-center justify-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent"
                      key={slide.id}
                      onClick={() => setIndex(slideIndex)}
                      type="button"
                    >
                      <span
                        className={`h-2 rounded-full transition-all duration-300 motion-reduce:transition-none ${
                          slideIndex === index ? "w-5 bg-accent" : "w-2 bg-muted/60"
                        }`}
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>
            <p aria-live={isPlaying ? "off" : "polite"} className="sr-only">
              Slide {index + 1} of {slideCount}: {current.name}
            </p>
          </>
        )}
      </div>
    </section>
  );
}
