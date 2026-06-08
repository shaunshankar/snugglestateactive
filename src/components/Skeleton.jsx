export function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton rounded-xl ${className}`} />;
}

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl p-5 space-y-3">
      <SkeletonBlock className="h-4 w-1/3" />
      <SkeletonBlock className="h-8 w-1/2" />
      <SkeletonBlock className="h-3 w-2/3" />
    </div>
  );
}

export function SkeletonList({ count = 3 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl p-4 flex gap-3 items-center">
          <SkeletonBlock className="h-10 w-10 rounded-full flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <SkeletonBlock className="h-4 w-3/4" />
            <SkeletonBlock className="h-3 w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
}
