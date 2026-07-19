export default function ConfidenceBar({ value, label }: { value: number; label?: string }) {
  return (
    <div className="flex items-center gap-2" title={`Confidence ${(value * 100).toFixed(0)}%`}>
      <div className="h-1.5 flex-1 rounded-full bg-elevated overflow-hidden">
        <div
          className="h-full rounded-full bg-accent transition-all"
          style={{ width: `${Math.round(value * 100)}%` }}
        />
      </div>
      <span className="font-mono text-2xs text-secondary shrink-0">
        {label ?? 'confidence'} {value.toFixed(2)}
      </span>
    </div>
  );
}
