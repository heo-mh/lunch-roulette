import React, { useEffect, useMemo, useRef, useState } from 'react';
import { MenuItem } from '../types/roulette';
import { soundEngine } from '../utils/sound';

interface RouletteWheelProps {
  items: MenuItem[];
  spinTrigger: number;
  isSpinning: boolean;
  onSpinStart: () => void;
  onSpinComplete: (winner: MenuItem, probability: number) => void;
  onPointerMenuChange?: (item: MenuItem | null) => void;
}

interface ComputedSlice {
  item: MenuItem;
  startAngle: number;
  endAngle: number;
  midAngle: number;
  probability: number;
}

const TWO_PI = Math.PI * 2;
const POINTER_ANGLE = -Math.PI / 2; // 12 o'clock

function normalizeAngle(angle: number): number {
  const mod = angle % TWO_PI;
  return mod < 0 ? mod + TWO_PI : mod;
}

function getSliceAtPointer(
  slices: ComputedSlice[],
  rotation: number
): { slice: ComputedSlice | null; index: number } {
  if (slices.length === 0) return { slice: null, index: -1 };
  const localAngle = normalizeAngle(POINTER_ANGLE - rotation);
  for (let i = 0; i < slices.length; i++) {
    const s = slices[i];
    if (localAngle >= s.startAngle && localAngle < s.endAngle) {
      return { slice: s, index: i };
    }
  }
  return { slice: slices[slices.length - 1], index: slices.length - 1 };
}

export const RouletteWheel: React.FC<RouletteWheelProps> = ({
  items,
  spinTrigger,
  isSpinning,
  onSpinStart,
  onSpinComplete,
  onPointerMenuChange,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [canvasSize, setCanvasSize] = useState(420);

  // Animation mutable refs (60fps loop without React re-render churn)
  // Slight initial offset so the 12 o'clock pointer lands inside a slice rather than on a seam
  const rotationRef = useRef(0.24);
  const pointerTiltRef = useRef(0);
  const pointerVelRef = useRef(0);
  const rafRef = useRef<number | null>(null);
  const lastSpinTriggerRef = useRef(spinTrigger);
  const lastSliceIndexRef = useRef(-1);

  const activeItems = useMemo(
    () => items.filter((item) => item.enabled),
    [items]
  );

  const slices: ComputedSlice[] = useMemo(() => {
    const totalWeight = activeItems.reduce((sum, it) => sum + it.weight, 0);
    if (totalWeight <= 0) return [];
    let cursor = 0;
    return activeItems.map((item) => {
      const ratio = item.weight / totalWeight;
      const span = ratio * TWO_PI;
      const startAngle = cursor;
      const endAngle = cursor + span;
      cursor = endAngle;
      return {
        item,
        startAngle,
        endAngle,
        midAngle: startAngle + span / 2,
        probability: ratio * 100,
      };
    });
  }, [activeItems]);

  const slicesRef = useRef(slices);
  slicesRef.current = slices;

  const onSpinCompleteRef = useRef(onSpinComplete);
  onSpinCompleteRef.current = onSpinComplete;

  const onPointerMenuChangeRef = useRef(onPointerMenuChange);
  onPointerMenuChangeRef.current = onPointerMenuChange;

  // Responsive canvas sizing constrained by both container width and viewport height
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const updateSize = () => {
      const width = Math.floor(el.clientWidth);
      const vhCap =
        window.innerWidth >= 1024
          ? Math.floor(window.innerHeight - 310)
          : 420;
      const maxDim = Math.min(430, Math.max(260, vhCap));
      const next = Math.max(250, Math.min(maxDim, width - 36));
      setCanvasSize(next);
    };

    updateSize();
    const ro = new ResizeObserver(updateSize);
    ro.observe(el);
    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Draw the entire wheel at current rotation
  const drawWheel = (rotation: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = canvasSize;
    if (canvas.width !== size * dpr || canvas.height !== size * dpr) {
      canvas.width = size * dpr;
      canvas.height = size * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const outerRimRadius = size / 2 - 4;
    const wheelRadius = outerRimRadius - 14;
    const hubRadius = Math.max(36, size * 0.105);

    // Outer dark carbon rim
    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius, 0, TWO_PI);
    ctx.fillStyle = '#0c0c0e';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, outerRimRadius - 0.5, 0, TWO_PI);
    ctx.strokeStyle = '#2a2a2c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    const currentSlices = slicesRef.current;

    if (currentSlices.length === 0) {
      ctx.beginPath();
      ctx.arc(cx, cy, wheelRadius, 0, TWO_PI);
      ctx.fillStyle = '#1f1f23';
      ctx.fill();

      ctx.fillStyle = 'rgba(236, 236, 236, 0.55)';
      ctx.font = `600 ${Math.round(size * 0.036)}px "Noto Sans KR", sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('메뉴를 2개 이상 활성화해 주세요', cx, cy);
      ctx.restore();
      return;
    }

    // Rotate wheel coordinate system
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(rotation);

    // Draw slices
    currentSlices.forEach((slice) => {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, wheelRadius, slice.startAngle, slice.endAngle);
      ctx.closePath();
      ctx.fillStyle = slice.item.color;
      ctx.fill();

      // Dark architectural separator stroke
      ctx.strokeStyle = '#0c0c0e';
      ctx.lineWidth = 2;
      ctx.stroke();
    });

    // Subtle radial depth finish
    const sheen = ctx.createRadialGradient(0, 0, hubRadius, 0, 0, wheelRadius);
    sheen.addColorStop(0, 'rgba(0, 0, 0, 0.14)');
    sheen.addColorStop(0.7, 'rgba(255, 255, 255, 0.02)');
    sheen.addColorStop(1, 'rgba(0, 0, 0, 0.22)');
    ctx.beginPath();
    ctx.arc(0, 0, wheelRadius, 0, TWO_PI);
    ctx.fillStyle = sheen;
    ctx.fill();

    // Draw slice labels
    currentSlices.forEach((slice) => {
      const span = slice.endAngle - slice.startAngle;
      ctx.save();
      ctx.rotate(slice.midAngle);

      const availableRadius = wheelRadius - hubRadius - 24;
      const baseFontSize = Math.round(
        Math.min(size * 0.042, Math.max(11, span * wheelRadius * 0.34))
      );

      ctx.font = `700 ${baseFontSize}px "Noto Sans KR", sans-serif`;
      ctx.fillStyle = slice.item.textColor;
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';

      let label = slice.item.name;
      const maxTextWidth = availableRadius;
      if (ctx.measureText(label).width > maxTextWidth) {
        while (
          label.length > 1 &&
          ctx.measureText(`${label}…`).width > maxTextWidth
        ) {
          label = label.slice(0, -1);
        }
        label = `${label}…`;
      }

      if (slice.item.textColor === '#FFFFFF') {
        ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
        ctx.shadowBlur = 3;
        ctx.shadowOffsetY = 1;
      }

      ctx.fillText(label, wheelRadius - 18, 0);
      ctx.restore();
    });

    // Yellow accent rim pegs at each slice boundary
    currentSlices.forEach((slice) => {
      const pegR = outerRimRadius - 7;
      const px = Math.cos(slice.startAngle) * pegR;
      const py = Math.sin(slice.startAngle) * pegR;

      ctx.beginPath();
      ctx.arc(px, py, 3.2, 0, TWO_PI);
      ctx.fillStyle = '#facc15';
      ctx.fill();
      ctx.strokeStyle = '#0c0c0e';
      ctx.lineWidth = 1;
      ctx.stroke();
    });

    ctx.restore();

    // Dark hub collar ring
    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 5, 0, TWO_PI);
    ctx.fillStyle = '#0c0c0e';
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, hubRadius + 5, 0, TWO_PI);
    ctx.strokeStyle = '#2a2a2c';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.restore();
  };

  // Re-draw when items or canvas size changes while idle
  useEffect(() => {
    drawWheel(rotationRef.current);
    const { slice, index } = getSliceAtPointer(slices, rotationRef.current);
    lastSliceIndexRef.current = index;
    onPointerMenuChangeRef.current?.(slice ? slice.item : null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slices, canvasSize]);

  // Ref for mechanical pointer DOM element
  const pointerElRef = useRef<HTMLDivElement | null>(null);

  // Trigger spin animation when spinTrigger increments
  useEffect(() => {
    if (spinTrigger === lastSpinTriggerRef.current) return;
    lastSpinTriggerRef.current = spinTrigger;

    const currentSlices = slicesRef.current;
    if (currentSlices.length < 2) return;

    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
    }

    const prefersReducedMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)'
    ).matches;

    const startRotation = rotationRef.current;
    const extraTurns = prefersReducedMotion
      ? 1
      : 6 + Math.floor(Math.random() * 4);
    let randomOffset = Math.random() * TWO_PI;

    let targetRotation = startRotation + extraTurns * TWO_PI + randomOffset;
    const finalLocalAngle = normalizeAngle(POINTER_ANGLE - targetRotation);
    const boundaryMargin = 0.025;
    for (const s of currentSlices) {
      if (
        Math.abs(finalLocalAngle - s.startAngle) < boundaryMargin ||
        Math.abs(finalLocalAngle - s.endAngle) < boundaryMargin
      ) {
        randomOffset += 0.05;
        targetRotation = startRotation + extraTurns * TWO_PI + randomOffset;
        break;
      }
    }

    const totalDelta = targetRotation - startRotation;
    const duration = prefersReducedMotion ? 500 : 4600 + Math.random() * 900;
    const startTime = performance.now();
    let prevTime = startTime;

    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - prevTime) / 1000);
      prevTime = now;

      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);

      const eased = 1 - Math.pow(1 - progress, 4.2);
      const nextRotation = startRotation + totalDelta * eased;

      const derivative = 4.2 * Math.pow(1 - progress, 3.2);
      const normalizedSpeed = Math.min(1, derivative / 4.2);

      rotationRef.current = nextRotation;
      drawWheel(nextRotation);

      const { slice, index } = getSliceAtPointer(
        slicesRef.current,
        nextRotation
      );
      if (index !== lastSliceIndexRef.current && index !== -1) {
        lastSliceIndexRef.current = index;
        soundEngine.playTick(normalizedSpeed);
        onPointerMenuChangeRef.current?.(slice ? slice.item : null);

        if (!prefersReducedMotion) {
          pointerTiltRef.current = -Math.min(28, 12 + normalizedSpeed * 18);
          pointerVelRef.current = 0;
        }
      }

      if (!prefersReducedMotion && pointerElRef.current) {
        const stiffness = 360;
        const damping = 18;
        const accel =
          -stiffness * pointerTiltRef.current - damping * pointerVelRef.current;
        pointerVelRef.current += accel * dt;
        pointerTiltRef.current += pointerVelRef.current * dt;
        pointerElRef.current.style.transform = `translateX(-50%) rotate(${pointerTiltRef.current.toFixed(
          2
        )}deg)`;
      }

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rotationRef.current = normalizeAngle(nextRotation);
        pointerTiltRef.current = 0;
        pointerVelRef.current = 0;
        if (pointerElRef.current) {
          pointerElRef.current.style.transform = 'translateX(-50%) rotate(0deg)';
        }
        drawWheel(rotationRef.current);

        const finalHit = getSliceAtPointer(
          slicesRef.current,
          rotationRef.current
        );
        rafRef.current = null;
        if (finalHit.slice) {
          soundEngine.playWinChime();
          onSpinCompleteRef.current(
            finalHit.slice.item,
            finalHit.slice.probability
          );
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spinTrigger]);

  const canSpin = activeItems.length >= 2 && !isSpinning;
  const hubBtnSize = Math.round(Math.max(68, canvasSize * 0.195));

  return (
    <div
      ref={containerRef}
      className="relative mx-auto flex w-full max-w-[500px] flex-col items-center justify-center select-none"
    >
      {/* Circular Dark Wheel Shell (Variation 3) */}
      <div className="relative rounded-full border border-[#2a2a2c] bg-[#161618] p-4 shadow-[0_0_90px_rgba(0,0,0,0.65)] sm:p-5">
        {/* Mechanical Top Pointer at 12 o'clock */}
        <div
          ref={pointerElRef}
          aria-hidden="true"
          className="pointer-events-none absolute -top-2 left-1/2 z-20 origin-[50%_12px]"
          style={{ transform: 'translateX(-50%) rotate(0deg)' }}
        >
          <svg
            width="40"
            height="48"
            viewBox="0 0 40 48"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_6px_10px_rgba(0,0,0,0.65)]"
          >
            <path
              d="M20 46L6 15C4.2 11 6.8 5 11.6 5H28.4C33.2 5 35.8 11 34 15L20 46Z"
              fill="#facc15"
              stroke="#0c0c0e"
              strokeWidth="2.5"
              strokeLinejoin="round"
            />
            <circle
              cx="20"
              cy="13"
              r="4.2"
              fill="#0c0c0e"
              stroke="#facc15"
              strokeWidth="1.5"
            />
          </svg>
        </div>

        {/* Wheel Canvas Container */}
        <div
          className="relative flex items-center justify-center"
          style={{ width: canvasSize, height: canvasSize }}
        >
          <canvas
            ref={canvasRef}
            style={{ width: canvasSize, height: canvasSize }}
            className="block"
            aria-label="점심 메뉴 룰렛 휠"
          />

          {/* Center Tactile SPIN Hub Button */}
          <button
            type="button"
            onClick={onSpinStart}
            disabled={!canSpin}
            aria-label="룰렛 돌리기"
            style={{ width: hubBtnSize, height: hubBtnSize }}
            className={`font-dot absolute top-1/2 left-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-sm font-black tracking-widest transition-transform duration-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] ${
              canSpin
                ? 'bg-[#facc15] text-[#0c0c0e] shadow-[0_0_24px_rgba(250,204,21,0.28)] hover:scale-105 hover:bg-[#fde047] active:scale-90'
                : 'cursor-not-allowed bg-[#2a2a2c] text-[#ececec]/50'
            }`}
          >
            <span className="whitespace-nowrap">
              {isSpinning ? '···' : 'SPIN'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
};
