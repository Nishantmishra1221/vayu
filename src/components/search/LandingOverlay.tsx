import { EXAMPLE_CHIPS, searchPlaces } from '../../api/client';
import { useAppStore } from '../../store/useAppStore';
import PlaceSearch from './PlaceSearch';
import { useResolveFlow } from './useResolveFlow';
import VayuLogo from '../shared/VayuLogo';

export default function LandingOverlay() {
  const resolve = useResolveFlow();

  const pickChip = async (name: string) => {
    // immediate feedback while geocoding runs; resolve() takes over the checklist
    useAppStore.setState({ resolving: [{ label: `Searching "${name}"…`, done: false }] });
    const results = await searchPlaces(name);
    if (results[0]) await resolve(results[0]);
    else useAppStore.setState({ resolving: null });
  };

  return (
    <div className="absolute inset-0 z-30 overflow-y-auto bg-base/50">
      <div className="relative flex min-h-full flex-col items-center justify-center px-4 py-10">
        {/* soft glow behind the hero */}
        <div className="pointer-events-none absolute h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

        <div className="animate-fade-up relative mb-8 flex flex-col items-center gap-2.5">
          <VayuLogo size={52} />
          <div className="flex items-baseline gap-2.5">
            <h1 className="font-display text-xl font-bold tracking-[0.16em] text-primary">VAYU</h1>
            <span className="font-mono text-sm text-muted">वायु</span>
          </div>
          <p className="text-center text-sm text-secondary">
            Urban air quality intelligence for smart city intervention
          </p>
        </div>
        <div
          className="animate-fade-up relative w-[480px] max-w-full"
          style={{ animationDelay: '80ms' }}
        >
          <PlaceSearch autoFocus />
        </div>
        <div
          className="animate-fade-up relative mt-4 flex max-w-[560px] flex-wrap justify-center gap-2"
          style={{ animationDelay: '160ms' }}
        >
          {EXAMPLE_CHIPS.map((c) => (
            <button
              key={c}
              onClick={() => pickChip(c)}
              className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-2xs font-medium text-secondary shadow-sm transition-all hover:-translate-y-0.5 hover:border-accent hover:text-accent hover:shadow-card"
            >
              {c}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
