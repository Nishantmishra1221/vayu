import { Marker } from 'react-map-gl/maplibre';
import { MapPin } from 'lucide-react';
import { useAppStore } from '../../store/useAppStore';

export default function ClickPin() {
  const inspector = useAppStore((s) => s.inspector);
  if (!inspector) return null;
  return (
    <Marker longitude={inspector.lon} latitude={inspector.lat} anchor="bottom">
      <div className="relative flex flex-col items-center">
        <span
          key={inspector.key}
          className="pin-pulse absolute bottom-0 h-5 w-5 translate-y-1/2 rounded-full border-2 border-accent"
        />
        <MapPin size={26} className="relative text-accent drop-shadow-lg" fill="#1F3A5F" />
      </div>
    </Marker>
  );
}
