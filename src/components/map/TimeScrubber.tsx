import { useEffect } from 'react';
import { Pause, Play } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';
import { useForecast } from '../../api/queries';
import { formatDayTimeIST } from '../../lib/format';

/** now → +72h in 3h steps. Only the pollution layer is time-varying. */
export default function TimeScrubber() {
  const place = useAppStore((s) => s.place);
  const activeLayer = useAppStore((s) => s.activeLayer);
  const timeOffsetHours = useAppStore((s) => s.timeOffsetHours);
  const setTimeOffset = useAppStore((s) => s.setTimeOffset);
  const playing = useAppStore((s) => s.scrubberPlaying);
  const setPlaying = useAppStore((s) => s.setScrubberPlaying);
  const { data: forecast } = useForecast(place);

  const timeVarying = activeLayer === 'pollution';

  useEffect(() => {
    if (!playing || !timeVarying) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPlaying(false);
      return;
    }
    const t = setInterval(() => {
      const cur = useAppStore.getState().timeOffsetHours;
      if (cur >= 72) {
        setPlaying(false);
        setTimeOffset(0);
      } else {
        setTimeOffset(cur + 3);
      }
    }, 400);
    return () => clearInterval(t);
  }, [playing, timeVarying, setPlaying, setTimeOffset]);

  if (!place) return null;

  const issued = forecast ? new Date(forecast.issuedAt) : new Date();
  const label = new Date(issued.getTime() + timeOffsetHours * 3600_000);

  return (
    <div
      className={`pointer-events-auto flex w-[430px] min-w-[280px] shrink items-center gap-3 rounded border border-line bg-panel/90 px-3 py-2 backdrop-blur-sm transition-opacity ${
        timeVarying ? '' : 'opacity-40'
      }`}
    >
      <button
        onClick={() => timeVarying && setPlaying(!playing)}
        disabled={!timeVarying}
        aria-label={playing ? 'Pause forecast animation' : 'Play forecast animation'}
        className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-elevated text-secondary hover:text-primary disabled:cursor-not-allowed"
      >
        {playing ? <Pause size={13} /> : <Play size={13} />}
      </button>
      <input
        type="range"
        min={0}
        max={72}
        step={3}
        value={timeOffsetHours}
        disabled={!timeVarying}
        onChange={(e) => setTimeOffset(Number(e.target.value))}
        aria-label="Forecast time offset"
        className="flex-1 accent-[#4C9AFF]"
      />
      <span className="w-[150px] shrink-0 text-right font-mono text-[10px] text-secondary">
        {timeVarying
          ? timeOffsetHours === 0
            ? `${formatDayTimeIST(label)} · now`
            : `${formatDayTimeIST(label)} · forecast`
          : 'current conditions'}
      </span>
    </div>
  );
}
