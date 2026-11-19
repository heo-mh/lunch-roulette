import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import {
  MenuItem,
  PresetKey,
  SpinHistoryItem,
  WheelStatus,
} from './types/roulette';
import {
  PRESET_PACKS,
  createMenuItemsFromNames,
  getNextSliceColor,
} from './data/presets';
import { soundEngine } from './utils/sound';
import { RouletteWheel } from './components/RouletteWheel';
import { MenuManager } from './components/MenuManager';
import { HistoryPanel } from './components/HistoryPanel';
import { ResultModal } from './components/ResultModal';

const STORAGE_KEYS = {
  items: 'lunch-roulette:items:v1',
  preset: 'lunch-roulette:preset:v1',
  history: 'lunch-roulette:history:v1',
  sound: 'lunch-roulette:sound:v1',
} as const;

function loadInitialItems(): MenuItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.items);
    if (raw) {
      const parsed = JSON.parse(raw) as MenuItem[];
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage read errors
  }
  return createMenuItemsFromNames(PRESET_PACKS[0].items);
}

function loadInitialPreset(): PresetKey | 'custom' {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.preset);
    if (
      raw === 'custom' ||
      PRESET_PACKS.some((pack) => pack.key === raw)
    ) {
      return raw as PresetKey | 'custom';
    }
  } catch {
    // Ignore storage read errors
  }
  return 'popular';
}

function loadInitialHistory(): SpinHistoryItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.history);
    if (raw) {
      const parsed = JSON.parse(raw) as SpinHistoryItem[];
      if (Array.isArray(parsed)) return parsed;
    }
  } catch {
    // Ignore storage read errors
  }
  return [];
}

function loadInitialSound(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.sound);
    if (raw === 'false') return false;
  } catch {
    // Ignore storage read errors
  }
  return true;
}

export default function App() {
  const [items, setItems] = useState<MenuItem[]>(loadInitialItems);
  const [activePreset, setActivePreset] = useState<PresetKey | 'custom'>(
    loadInitialPreset
  );
  const [history, setHistory] = useState<SpinHistoryItem[]>(loadInitialHistory);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(loadInitialSound);

  const [status, setStatus] = useState<WheelStatus>('IDLE');
  const [spinTrigger, setSpinTrigger] = useState(0);
  const [pointerMenu, setPointerMenu] = useState<MenuItem | null>(null);
  const [winner, setWinner] = useState<{
    item: MenuItem;
    probability: number;
  } | null>(null);

  const pendingRespinTimerRef = useRef<number | null>(null);

  const activeItems = useMemo(
    () => items.filter((item) => item.enabled),
    [items]
  );
  const totalWeight = useMemo(
    () => activeItems.reduce((sum, item) => sum + item.weight, 0),
    [activeItems]
  );
  const isSpinning = status === 'SPINNING';
  const canSpin = activeItems.length >= 2 && !isSpinning;

  // Sync sound engine & localStorage
  useEffect(() => {
    soundEngine.setEnabled(soundEnabled);
    try {
      localStorage.setItem(STORAGE_KEYS.sound, String(soundEnabled));
    } catch {
      // Ignore storage write errors
    }
  }, [soundEnabled]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.items, JSON.stringify(items));
    } catch {
      // Ignore storage write errors
    }
  }, [items]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.preset, activePreset);
    } catch {
      // Ignore storage write errors
    }
  }, [activePreset]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEYS.history, JSON.stringify(history));
    } catch {
      // Ignore storage write errors
    }
  }, [history]);

  useEffect(() => {
    return () => {
      if (pendingRespinTimerRef.current !== null) {
        window.clearTimeout(pendingRespinTimerRef.current);
      }
    };
  }, []);

  const startSpin = useCallback(() => {
    if (isSpinning) return;
    if (activeItems.length < 2) return;
    setWinner(null);
    setStatus('SPINNING');
    setSpinTrigger((prev) => prev + 1);
  }, [isSpinning, activeItems.length]);

  // Keyboard shortcuts: Space or R to spin when idle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.code !== 'KeyR') return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'BUTTON' ||
          target.isContentEditable)
      ) {
        return;
      }
      if (winner) return;
      e.preventDefault();
      startSpin();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [startSpin, winner]);

  const handleSpinComplete = useCallback(
    (chosen: MenuItem, probability: number) => {
      setStatus('RESULT');
      setWinner({ item: chosen, probability });
      setHistory((prev) => [
        {
          id: `hist-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          menuName: chosen.name,
          color: chosen.color,
          probability,
          timestamp: Date.now(),
        },
        ...prev.slice(0, 14),
      ]);
    },
    []
  );

  const handleSelectPreset = (presetKey: PresetKey) => {
    if (isSpinning) return;
    const found = PRESET_PACKS.find((p) => p.key === presetKey);
    if (!found) return;
    setActivePreset(presetKey);
    setItems(createMenuItemsFromNames(found.items));
    setWinner(null);
    setStatus('IDLE');
  };

  const handleAddMenu = (name: string) => {
    if (isSpinning) return;
    setItems((prev) => {
      const nextColor = getNextSliceColor(prev);
      const nextItem: MenuItem = {
        id: `menu-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name,
        weight: 1,
        enabled: true,
        color: nextColor.bg,
        textColor: nextColor.text,
      };
      return [...prev, nextItem];
    });
    setActivePreset('custom');
  };

  const handleToggleMenu = (id: string) => {
    if (isSpinning) return;
    setItems((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const handleChangeWeight = (id: string, delta: number) => {
    if (isSpinning) return;
    setItems((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;
        const nextWeight = Math.min(5, Math.max(1, item.weight + delta));
        return { ...item, weight: nextWeight };
      })
    );
  };

  const handleRemoveMenu = (id: string) => {
    if (isSpinning) return;
    setItems((prev) => prev.filter((item) => item.id !== id));
    setActivePreset('custom');
  };

  const handleShuffle = () => {
    if (isSpinning) return;
    setItems((prev) => {
      const copy = [...prev];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy;
    });
  };

  const handleResetAll = () => {
    if (isSpinning) return;
    const defaultPack = PRESET_PACKS[0];
    setActivePreset(defaultPack.key);
    setItems(createMenuItemsFromNames(defaultPack.items));
    setWinner(null);
    setStatus('IDLE');
  };

  const handleCloseModal = useCallback(() => {
    setWinner(null);
    setStatus('IDLE');
  }, []);

  const handleRespin = useCallback(() => {
    setWinner(null);
    setStatus('SPINNING');
    setSpinTrigger((prev) => prev + 1);
  }, []);

  const handleExcludeAndRespin = useCallback((excludeId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === excludeId ? { ...item, enabled: false } : item
      )
    );
    setWinner(null);
    setStatus('SPINNING');

    if (pendingRespinTimerRef.current !== null) {
      window.clearTimeout(pendingRespinTimerRef.current);
    }
    pendingRespinTimerRef.current = window.setTimeout(() => {
      setSpinTrigger((prev) => prev + 1);
      pendingRespinTimerRef.current = null;
    }, 60);
  }, []);

  const activePresetInfo = PRESET_PACKS.find((p) => p.key === activePreset);

  return (
    <div className="grid min-h-screen grid-rows-[64px_1fr_auto] bg-[#0c0c0e] text-[#ececec] lg:h-screen lg:grid-rows-[64px_1fr_40px] lg:overflow-hidden">
      {/* Top Bar: 3-Zone Dark Grid Contract */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between gap-8 border-b border-[#2a2a2c] bg-[#161618] px-5 sm:px-6">
        {/* Zone 1: Single-element DotGothic16 Brand */}
        <a
          href="#wheel"
          className="font-dot text-xl tracking-[0.1em] text-[#facc15] whitespace-nowrap shrink-0"
        >
          LUNCH_WHEEL
        </a>

        {/* Zone 2: Monospace Single-Line Nav Links */}
        <nav
          aria-label="주요 섹션 이동"
          className="hidden items-center gap-8 md:flex"
        >
          <a
            href="#wheel"
            className="font-mono text-xs tracking-wider text-[#ececec]/50 uppercase transition-colors hover:text-[#ececec] whitespace-nowrap shrink-0"
          >
            Roulette
          </a>
          <a
            href="#presets"
            className="font-mono text-xs tracking-wider text-[#ececec]/50 uppercase transition-colors hover:text-[#ececec] whitespace-nowrap shrink-0"
          >
            Presets
          </a>
          <a
            href="#menus"
            className="font-mono text-xs tracking-wider text-[#ececec]/50 uppercase transition-colors hover:text-[#ececec] whitespace-nowrap shrink-0"
          >
            Inventory
          </a>
          <a
            href="#history"
            className="font-mono text-xs tracking-wider text-[#ececec]/50 uppercase transition-colors hover:text-[#ececec] whitespace-nowrap shrink-0"
          >
            Log
          </a>
        </nav>

        {/* Zone 3: Single Primary Action */}
        <div className="shrink-0">
          <button
            type="button"
            onClick={startSpin}
            disabled={!canSpin}
            className="inline-flex h-9 items-center justify-center bg-[#facc15] px-5 font-mono text-xs font-bold tracking-wider text-[#0c0c0e] transition-colors hover:bg-[#fde047] disabled:cursor-not-allowed disabled:bg-[#2a2a2c] disabled:text-[#ececec]/40 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15]"
          >
            {isSpinning ? 'SPINNING...' : 'SPIN(R)'}
          </button>
        </div>
      </header>

      {/* Main 3-Column Dark Grid Workspace */}
      <main className="grid min-h-0 grid-cols-1 lg:grid-cols-[240px_1fr_360px]">
        {/* Left Column: Categorical Presets */}
        <aside
          id="presets"
          aria-label="점심 카테고리 프리셋"
          className="order-2 flex flex-col gap-3 border-t border-[#2a2a2c] bg-[#161618] p-5 lg:order-1 lg:border-t-0 lg:border-r lg:p-6"
        >
          <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#facc15] uppercase">
            Categorical Presets
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:flex lg:flex-col lg:gap-2.5">
            {PRESET_PACKS.map((pack, index) => {
              const selected = activePreset === pack.key;
              return (
                <button
                  key={pack.key}
                  type="button"
                  onClick={() => handleSelectPreset(pack.key)}
                  disabled={isSpinning}
                  className={`rounded-[4px] border px-3.5 py-2.5 text-left font-mono text-xs transition-colors whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-50 ${
                    selected
                      ? 'border-[#facc15] bg-[#facc15] font-bold text-[#0c0c0e]'
                      : 'border-transparent bg-[#2a2a2c] text-[#ececec] hover:border-[#facc15]'
                  }`}
                >
                  <span className="font-num mr-1.5 opacity-75">
                    {String(index + 1).padStart(2, '0')}.
                  </span>
                  <span>{pack.label}</span>
                </button>
              );
            })}
          </div>

          {/* Preset Description & Sound Control at Column Footer */}
          <div className="mt-2 flex items-center justify-between gap-3 border-t border-[#2a2a2c] pt-4 lg:mt-auto lg:flex-col lg:items-stretch lg:gap-3">
            <p className="text-xs leading-relaxed text-[#ececec]/50">
              “
              {activePresetInfo
                ? activePresetInfo.description
                : '사용자 지정 메뉴 구성'}
              ”
            </p>

            <button
              type="button"
              onClick={() => setSoundEnabled((prev) => !prev)}
              aria-pressed={soundEnabled}
              aria-label={soundEnabled ? '효과음 끄기' : '효과음 켜기'}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-[4px] border border-[#2a2a2c] bg-[#0c0c0e] px-3 font-mono text-xs text-[#ececec]/80 transition-colors hover:border-[#facc15] hover:text-[#facc15] whitespace-nowrap shrink-0"
            >
              {soundEnabled ? (
                <>
                  <Volume2 className="h-3.5 w-3.5 text-[#facc15]" />
                  <span>효과음 ON</span>
                </>
              ) : (
                <>
                  <VolumeX className="h-3.5 w-3.5 text-[#ececec]/40" />
                  <span>음소거 OFF</span>
                </>
              )}
            </button>
          </div>
        </aside>

        {/* Center Column: 40px Dark Grid Stage */}
        <section
          id="wheel"
          aria-label="점심 룰렛 스테이지"
          className="dark-grid-bg relative order-1 flex flex-col items-center justify-center gap-5 px-5 py-7 lg:order-2 lg:overflow-hidden lg:py-5"
        >
          {/* Dominant Roulette Wheel */}
          <div className="pt-2">
            <RouletteWheel
              items={items}
              spinTrigger={spinTrigger}
              isSpinning={isSpinning}
              onSpinStart={startSpin}
              onSpinComplete={handleSpinComplete}
              onPointerMenuChange={setPointerMenu}
            />
          </div>

          {/* Aligned Bottom Control Row: Pointer Position + Primary CTA (Zero Overlap) */}
          <div className="flex w-full max-w-[520px] flex-col items-center gap-3">
            <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:flex-row sm:gap-4">
              {/* Pointer Position Stat Block */}
              <div className="flex min-w-[180px] flex-1 flex-col justify-center border border-[#2a2a2c] bg-[#161618] px-5 py-3">
                <div className="font-mono text-[10px] font-bold tracking-[0.2em] text-[#facc15] uppercase whitespace-nowrap">
                  {isSpinning ? 'Spinning...' : 'Pointer Position'}
                </div>
                <div className="mt-1 flex items-center gap-2.5">
                  {pointerMenu && (
                    <span
                      aria-hidden="true"
                      className="h-3 w-3 shrink-0"
                      style={{ backgroundColor: pointerMenu.color }}
                    />
                  )}
                  <span className="truncate text-lg font-black tracking-tight text-[#ececec]">
                    {pointerMenu ? pointerMenu.name : '메뉴 선택'}
                  </span>
                </div>
              </div>

              {/* Primary Bottom CTA */}
              <button
                type="button"
                onClick={startSpin}
                disabled={!canSpin}
                className="font-dot flex min-h-[64px] flex-1 items-center justify-center bg-[#facc15] px-6 py-3.5 text-lg font-bold tracking-widest text-[#0c0c0e] transition-all duration-100 hover:bg-[#fde047] active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-[#2a2a2c] disabled:text-[#ececec]/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] whitespace-nowrap sm:max-w-[260px]"
              >
                {isSpinning ? '메뉴 고르는 중…' : '점심 정하기'}
              </button>
            </div>

            <div className="font-mono text-[10px] tracking-[0.18em] text-[#facc15]/85 uppercase">
              Keyboard: [Space] to rotate
            </div>
          </div>
        </section>

        {/* Right Column: Candidates Inventory & Recent Log */}
        <div
          id="menus"
          className="order-3 flex min-h-0 flex-col border-t border-[#2a2a2c] bg-[#161618] lg:border-t-0 lg:border-l lg:overflow-hidden"
        >
          <MenuManager
            items={items}
            isSpinning={isSpinning}
            onAddMenu={handleAddMenu}
            onToggleMenu={handleToggleMenu}
            onChangeWeight={handleChangeWeight}
            onRemoveMenu={handleRemoveMenu}
            onShuffle={handleShuffle}
            onResetAll={handleResetAll}
          />

          <HistoryPanel
            history={history}
            onClearHistory={() => setHistory([])}
          />
        </div>
      </main>

      {/* Bottom 40px Dark Grid Utility Bar (Real functional info only) */}
      <footer className="flex flex-wrap items-center justify-between gap-4 border-t border-[#2a2a2c] bg-[#161618] px-5 py-2.5 font-mono text-[11px] text-[#ececec]/50 sm:px-6 lg:py-0">
        <div className="flex items-center gap-3">
          <span>
            활성 메뉴{' '}
            <strong className="font-num text-[#ececec]">
              {activeItems.length}
            </strong>
            개
          </span>
          <span aria-hidden="true">·</span>
          <span>
            총 비중{' '}
            <strong className="font-num text-[#ececec]">{totalWeight}</strong>
          </span>
        </div>

        <div className="hidden sm:block">단축키: SPACE / R 회전 · ESC 닫기</div>

        <button
          type="button"
          onClick={() => setSoundEnabled((prev) => !prev)}
          className="font-mono text-[11px] text-[#facc15] transition-opacity hover:opacity-80 whitespace-nowrap"
        >
          {soundEnabled ? 'SOUND: ON' : 'SOUND: MUTED'}
        </button>
      </footer>

      {/* Winner Celebration Modal */}
      <ResultModal
        winner={winner?.item ?? null}
        probability={winner?.probability ?? 0}
        canExcludeAndRespin={activeItems.length >= 3}
        onClose={handleCloseModal}
        onRespin={handleRespin}
        onExcludeAndRespin={handleExcludeAndRespin}
      />
    </div>
  );
}
