import { Check, Loader2 } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function ResolvingChecklist() {
  const resolving = useAppStore((s) => s.resolving);
  if (!resolving) return null;
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center bg-base/60 backdrop-blur-[2px]">
      <div className="w-[420px] rounded border border-line bg-panel p-5 shadow-2xl">
        <p className="mb-3 font-display text-2xs font-medium uppercase tracking-widest text-muted">
          Fusing sources
        </p>
        <ul className="space-y-2">
          {resolving.map((step, i) => (
            <li key={i} className="flex items-center gap-2.5 font-mono text-2xs text-secondary animate-fade-up">
              {step.done ? (
                <Check size={13} className="shrink-0 text-aqi-good" />
              ) : (
                <Loader2 size={13} className="shrink-0 animate-spin text-accent" />
              )}
              <span className={step.done ? '' : 'text-primary'}>{step.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
