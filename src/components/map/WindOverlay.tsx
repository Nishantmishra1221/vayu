import { useEffect, useRef } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';

/**
 * Animated wind particles in screen space, drifting along the current wind
 * vector. Disabled under prefers-reduced-motion.
 */
export default function WindOverlay() {
  const place = useAppStore((s) => s.place);
  const enabled = useAppStore((s) => s.overlays.wind);
  const { data: snapshot } = useSnapshot(place);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const windFrom = snapshot?.weather.windDirectionDeg ?? 0;
  const windKmh = snapshot?.weather.windSpeedKmh ?? 0;

  useEffect(() => {
    if (!enabled || !snapshot) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let raf = 0;
    const resize = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // wind FROM windFrom → particles flow TOWARD windFrom+180 (screen: N = up)
    const flowRad = ((windFrom + 180) * Math.PI) / 180;
    const speed = 0.25 + windKmh * 0.09;
    const vx = Math.sin(flowRad) * speed;
    const vy = -Math.cos(flowRad) * speed;

    const N = 220;
    const parts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      life: Math.random() * 120,
    }));

    const tick = () => {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillStyle = 'rgba(0,0,0,0.07)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = 'source-over';
      ctx.strokeStyle = 'rgba(55,72,94,0.55)';
      ctx.lineWidth = 1;
      for (const p of parts) {
        const nx = p.x + vx;
        const ny = p.y + vy;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(nx, ny);
        ctx.stroke();
        p.x = nx;
        p.y = ny;
        p.life -= 1;
        if (p.life <= 0 || p.x < -5 || p.x > canvas.width + 5 || p.y < -5 || p.y > canvas.height + 5) {
          p.x = Math.random() * canvas.width;
          p.y = Math.random() * canvas.height;
          p.life = 60 + Math.random() * 120;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    };
  }, [enabled, snapshot, windFrom, windKmh]);

  if (!enabled || !snapshot) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden
    />
  );
}
