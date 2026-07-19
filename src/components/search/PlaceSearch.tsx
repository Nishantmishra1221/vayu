import { useEffect, useRef, useState } from 'react';
import { Search, Loader2 } from 'lucide-react';
import { searchPlaces } from '../../api/client';
import type { GeocodeSuggestion } from '../../types';
import { useResolveFlow } from './useResolveFlow';

/**
 * Debounced Nominatim autocomplete. 1000ms debounce — Nominatim allows one
 * request per second and getting blocked mid-demo is not an option.
 */
export default function PlaceSearch({ compact = false, autoFocus = false }: { compact?: boolean; autoFocus?: boolean }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<GeocodeSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resolve = useResolveFlow();

  useEffect(() => {
    if (query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setBusy(true);
    const t = setTimeout(async () => {
      const results = await searchPlaces(query);
      setSuggestions(results);
      setOpen(results.length > 0);
      setHighlight(0);
      setBusy(false);
    }, 1000);
    return () => {
      clearTimeout(t);
      setBusy(false);
    };
  }, [query]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pick = async (s: GeocodeSuggestion) => {
    setOpen(false);
    setQuery('');
    inputRef.current?.blur();
    await resolve(s);
  };

  return (
    <div className="relative">
      <div
        className={`flex items-center gap-2 rounded border bg-panel px-3 transition-colors focus-within:border-accent ${
          compact ? 'h-8 border-line' : 'h-12 border-line-strong shadow-2xl'
        }`}
      >
        {busy ? (
          <Loader2 size={compact ? 13 : 16} className="animate-spin text-muted" />
        ) : (
          <Search size={compact ? 13 : 16} className="text-muted" />
        )}
        <input
          ref={inputRef}
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => {
            if (!open) return;
            if (e.key === 'ArrowDown') {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, suggestions.length - 1));
            } else if (e.key === 'ArrowUp') {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === 'Enter' && suggestions[highlight]) {
              pick(suggestions[highlight]);
            } else if (e.key === 'Escape') {
              setOpen(false);
            }
          }}
          placeholder="Search a city, ward, or landmark"
          aria-label="Search a city, ward, or landmark"
          className={`w-full bg-transparent font-body text-primary placeholder:text-muted focus:outline-none ${
            compact ? 'text-2xs' : 'text-sm'
          }`}
        />
        {!compact && <kbd className="rounded border border-line px-1.5 font-mono text-2xs text-muted">/</kbd>}
      </div>
      {open && (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 overflow-hidden rounded border border-line bg-elevated shadow-2xl">
          {suggestions.map((s, i) => (
            <li key={`${s.osmType}-${s.osmId}-${s.fixtureId ?? i}`}>
              <button
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(s)}
                className={`block w-full truncate px-3 py-2 text-left text-2xs ${
                  i === highlight ? 'bg-accent-dim text-primary' : 'text-secondary'
                }`}
              >
                {s.displayName}
                {s.fixtureId && <span className="ml-2 font-mono text-[9px] text-muted">CACHED</span>}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
