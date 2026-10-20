
export function PageFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center px-4 animate-fade-in motion-reduce:animate-none"
      role="status"
    >
      <p className="text-sm text-muted">Loading…</p>
    </div>
  );
}