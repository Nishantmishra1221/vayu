import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '../../store/useAppStore';
import { useSnapshot } from '../../api/queries';

/**
 * Animated wind particles in screen space, drifting along the current wind
 * vector. Turning this on is an explicit user action, so it takes priority
 * over the ambient prefers-reduced-motion setting; under reduced motion we
 * still draw the wind field, just as a static arrow grid instead of an
 * animated one.
 */
export default function WindOverlay() {
  const place = useAppStore((s) => s.place);
  const enabled = useAppStore((s) => s.overlays.wind);
  const { data: snapshot } = useSnapshot(place);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [reducedMotion, setReducedMotion] = useState(
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const windFrom = snapshot?.weather.windDirectionDeg ?? 0;
  const windKmh = snapshot?.weather.windSpeedKmh ?? 0;

  useEffect(() => {
    if (!enabled || !snapshot) return;
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

    if (reducedMotion) {
      const drawArrow = (x: number, y: number, len: number) => {
        const ex = x + Math.sin(flowRad) * len;
        const ey = y - Math.cos(flowRad) * len;
        const headAngle1 = flowRad + Math.PI - Math.PI / 6;
        const headAngle2 = flowRad + Math.PI + Math.PI / 6;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(ex, ey);
        ctx.moveTo(ex + Math.sin(headAngle1) * 4, ey - Math.cos(headAngle1) * 4);
        ctx.lineTo(ex, ey);
        ctx.lineTo(ex + Math.sin(headAngle2) * 4, ey - Math.cos(headAngle2) * 4);
        ctx.stroke();
      };
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = 'rgba(55,72,94,0.6)';
      ctx.lineWidth = 1.5;
      const gap = 90;
      const len = 14 + Math.min(windKmh, 40) * 0.5;
      for (let x = gap / 2; x < canvas.width; x += gap) {
        for (let y = gap / 2; y < canvas.height; y += gap) {
          drawArrow(x, y, len);
        }
      }
      return () => {
        window.removeEventListener('resize', resize);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      };
    }

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
  }, [enabled, snapshot, windFrom, windKmh, reducedMotion]);

  if (!enabled || !snapshot) return null;
  return (
    <canvas
      ref={canvasRef}
      className="pointer-events-none absolute inset-0 z-10 h-full w-full"
      aria-hidden
    />
  );
}
