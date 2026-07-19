import { Hexagon } from 'lucide-react';
import { EXAMPLE_CHIPS, searchPlaces } from '../../api/client';
import PlaceSearch from './PlaceSearch';
import { useResolveFlow } from './useResolveFlow';

export default function LandingOverlay() {
  const resolve = useResolveFlow();

  const pickChip = async (name: string) => {
    const results = await searchPlaces(name);
    if (results[0]) await resolve(results[0]);
  };

  return (
    <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-base/40">
      <div className="mb-8 flex flex-col items-center gap-2">
        <Hexagon size={34} className="text-accent" strokeWidth={2} />
        <h1 className="font-display text-xl font-semibold tracking-wide text-primary">VAYU</h1>
        <p className="text-2xs text-secondary">Urban air quality intelligence for smart city intervention</p>
      </div>
      <div className="w-[480px] max-w-[90vw]">
        <PlaceSearch autoFocus />
      </div>
      <div className="mt-4 flex gap-2">
        {EXAMPLE_CHIPS.map((c) => (
          <button
            key={c}
            onClick={() => pickChip(c)}
            className="rounded-full border border-line bg-panel px-3.5 py-1.5 text-2xs text-secondary transition-colors hover:border-accent hover:text-accent"
          >
            {c}
          </button>
        ))}
      </div>
    </div>
  );
}
