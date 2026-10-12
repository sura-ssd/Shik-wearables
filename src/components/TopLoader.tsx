interface TopLoaderProps {
  isLoading: boolean;
}

export function TopLoader({ isLoading }: TopLoaderProps) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed inset-x-0 top-0 z-[60] h-[3px] origin-left bg-accent ${
        isLoading ? "animate-progress" : "scale-x-100 opacity-0 transition-opacity duration-300"
      }`}
    />
  );
}
