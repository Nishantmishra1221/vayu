import { useEffect } from 'react';
import { useAppStore } from '../store/useAppStore';
import LandingOverlay from '../components/search/LandingOverlay';

/** Route "/" — the search state. Clears any previously selected place. */
export default function LandingPage() {
  const place = useAppStore((s) => s.place);
  const reset = useAppStore((s) => s.reset);

  useEffect(() => {
    if (place) reset();
    // reset only on entering the landing route
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <LandingOverlay />;
}
