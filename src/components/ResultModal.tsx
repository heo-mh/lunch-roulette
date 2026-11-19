import React, { useEffect, useRef } from 'react';
import { RotateCw, Ban, X } from 'lucide-react';
import { MenuItem } from '../types/roulette';

interface ResultModalProps {
  winner: MenuItem | null;
  probability: number;
  canExcludeAndRespin: boolean;
  onClose: () => void;
  onRespin: () => void;
  onExcludeAndRespin: (id: string) => void;
}

interface ConfettiParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  rotation: number;
  vr: number;
  opacity: number;
}

const CONFETTI_COLORS = [
  '#facc15',
  '#ececec',
  '#d93829',
  '#1e7e5c',
  '#2359b8',
  '#e36414',
];

export const ResultModal: React.FC<ResultModalProps> = ({
  winner,
  probability,
  canExcludeAndRespin,
  onClose,
  onRespin,
  onExcludeAndRespin,
}) => {
  const confettiCanvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    if (!winner) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [winner, onClose]);

  useEffect(() => {
    if (!winner) return;
    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;
    if (prefersReducedMotion) return;

    const canvas = confettiCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    const particles: ConfettiParticle[] = Array.from({ length: 64 }, () => {
      const angle = -Math.PI / 2 + (Math.random() - 0.5) * 1.4;
      const speed = 7 + Math.random() * 11;
      return {
        x: width / 2 + (Math.random() - 0.5) * 80,
        y: height * 0.44,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        size: 5 + Math.random() * 5,
        color:
          CONFETTI_COLORS[Math.floor(Math.random() * CONFETTI_COLORS.length)],
        rotation: Math.random() * Math.PI * 2,
        vr: (Math.random() - 0.5) * 0.25,
        opacity: 1,
      };
    });

    let rafId = 0;
    const start = performance.now();

    const animate = (now: number) => {
      const elapsed = now - start;
      ctx.clearRect(0, 0, width, height);

      let alive = false;
      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.32;
        p.vx *= 0.99;
        p.rotation += p.vr;
        if (elapsed > 1400) {
          p.opacity = Math.max(0, p.opacity - 0.025);
        }
        if (p.opacity > 0 && p.y < height + 40) {
          alive = true;
          ctx.save();
          ctx.globalAlpha = p.opacity;
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * 0.65);
          ctx.restore();
        }
      }

      if (alive && elapsed < 3200) {
        rafId = requestAnimationFrame(animate);
      }
    };

    rafId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafId);
  }, [winner]);

  if (!winner) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="result-menu-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#0c0c0e]/80 p-4 backdrop-blur-xs"
      onClick={onClose}
    >
      <canvas
        ref={confettiCanvasRef}
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0 h-full w-full"
      />

      <div
        className="relative z-10 w-full max-w-[420px] border border-[#2a2a2c] bg-[#161618] p-7 shadow-[0_24px_64px_rgba(0,0,0,0.75)]"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="결과 창 닫기"
          className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center text-[#ececec]/50 transition-colors hover:bg-white/[0.06] hover:text-[#ececec]"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Slice Color Accent Bar */}
        <div
          aria-hidden="true"
          className="mb-5 h-1.5 w-12"
          style={{ backgroundColor: winner.color }}
        />

        <p className="font-mono text-[11px] font-bold tracking-[0.2em] text-[#facc15] uppercase">
          SELECTED LUNCH
        </p>

        <h3
          id="result-menu-title"
          className="mt-2 text-3xl font-black tracking-tight text-[#ececec] sm:text-4xl"
          style={{ textWrap: 'balance' }}
        >
          {winner.name}
        </h3>

        <p className="mt-3 flex items-center gap-2 font-mono text-xs text-[#ececec]/55">
          <span>
            당첨 확률{' '}
            <strong className="font-num font-bold text-[#ececec]">
              {probability.toFixed(1)}%
            </strong>
          </span>
          <span aria-hidden="true">·</span>
          <span>
            비중{' '}
            <strong className="font-num font-bold text-[#ececec]">
              {winner.weight}배
            </strong>
          </span>
        </p>

        <div className="mt-7 flex flex-col gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="font-dot h-12 w-full bg-[#facc15] px-5 text-base font-bold tracking-wider text-[#0c0c0e] transition-colors hover:bg-[#fde047] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15]"
          >
            이 메뉴로 결정
          </button>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onRespin}
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#2a2a2c] bg-[#0c0c0e] px-4 font-mono text-xs font-semibold text-[#ececec]/85 transition-colors hover:border-[#facc15] hover:text-[#facc15] whitespace-nowrap"
            >
              <RotateCw className="h-3.5 w-3.5" />
              <span>다시 돌리기</span>
            </button>

            <button
              type="button"
              onClick={() => onExcludeAndRespin(winner.id)}
              disabled={!canExcludeAndRespin}
              className="inline-flex h-10 items-center justify-center gap-1.5 border border-[#2a2a2c] bg-[#0c0c0e] px-4 font-mono text-xs font-semibold text-[#ececec]/85 transition-colors hover:border-[#f87171] hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap"
            >
              <Ban className="h-3.5 w-3.5" />
              <span>제외 후 재추첨</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
