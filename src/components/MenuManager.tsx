import React, { useState } from 'react';
import {
  Plus,
  Minus,
  Trash2,
  Shuffle,
  RotateCcw,
  Check,
} from 'lucide-react';
import { MenuItem } from '../types/roulette';

interface MenuManagerProps {
  items: MenuItem[];
  isSpinning: boolean;
  onAddMenu: (name: string) => void;
  onToggleMenu: (id: string) => void;
  onChangeWeight: (id: string, delta: number) => void;
  onRemoveMenu: (id: string) => void;
  onShuffle: () => void;
  onResetAll: () => void;
}

export const MenuManager: React.FC<MenuManagerProps> = ({
  items,
  isSpinning,
  onAddMenu,
  onToggleMenu,
  onChangeWeight,
  onRemoveMenu,
  onShuffle,
  onResetAll,
}) => {
  const [inputValue, setInputValue] = useState('');

  const activeItems = items.filter((item) => item.enabled);
  const totalWeight = activeItems.reduce((sum, item) => sum + item.weight, 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onAddMenu(trimmed);
    setInputValue('');
  };

  return (
    <section
      aria-label="메뉴 후보 관리"
      className="flex min-h-0 flex-1 flex-col bg-[#161618]"
    >
      {/* Panel Title Bar (Variation 3 Dark Grid) */}
      <div className="flex items-center justify-between gap-2 border-b border-[#2a2a2c] px-5 py-4">
        <div className="flex items-baseline gap-2.5">
          <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-[#ececec]">
            CANDIDATES
          </h2>
          <span className="font-num text-[11px] font-bold text-[#facc15]">
            {activeItems.length}/{items.length} ACTIVE
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onShuffle}
            disabled={isSpinning || items.length < 2}
            className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[#2a2a2c] bg-[#0c0c0e] px-2 font-mono text-[11px] text-[#ececec]/75 transition-colors hover:border-[#facc15] hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            title="메뉴 순서 섞기"
          >
            <Shuffle className="h-3 w-3" />
            <span>섞기</span>
          </button>
          <button
            type="button"
            onClick={onResetAll}
            disabled={isSpinning}
            className="inline-flex h-7 items-center gap-1 rounded-[3px] border border-[#2a2a2c] bg-[#0c0c0e] px-2 font-mono text-[11px] text-[#ececec]/75 transition-colors hover:border-[#facc15] hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-40 whitespace-nowrap shrink-0"
            title="기본 메뉴로 복원"
          >
            <RotateCcw className="h-3 w-3" />
            <span>초기화</span>
          </button>
        </div>
      </div>

      {/* Dark Input Box */}
      <form
        onSubmit={handleSubmit}
        className="flex items-center gap-2 border-b border-[#2a2a2c] px-5 py-3.5"
      >
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.nativeEvent.isComposing) return;
          }}
          placeholder="+ 새 메뉴 추가 (예: 부대찌개)"
          maxLength={24}
          disabled={isSpinning}
          aria-label="새 점심 메뉴 입력"
          className="h-10 min-w-0 flex-1 rounded-[3px] border border-[#2a2a2c] bg-[#0c0c0e] px-3.5 py-0 text-[13px] leading-normal text-[#ececec] placeholder:text-[13px] placeholder:text-[#ececec]/35 transition-colors focus:border-[#facc15] focus:outline-none disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={isSpinning || !inputValue.trim()}
          className="inline-flex h-10 items-center justify-center gap-1 rounded-[3px] bg-[#facc15] px-3.5 font-mono text-xs font-bold text-[#0c0c0e] transition-colors hover:bg-[#fde047] disabled:cursor-not-allowed disabled:bg-[#2a2a2c] disabled:text-[#ececec]/40 whitespace-nowrap shrink-0"
        >
          <Plus className="h-3.5 w-3.5 stroke-[2.5]" />
          <span>추가</span>
        </button>
      </form>

      {/* Low Active Warning */}
      {activeItems.length < 2 && (
        <div
          role="alert"
          className="border-b border-[#facc15]/30 bg-[#facc15]/10 px-5 py-2.5 text-xs font-medium text-[#facc15]"
        >
          룰렛을 돌리려면 최소 2개 이상의 메뉴를 활성화해 주세요.
        </div>
      )}

      {/* Menu Rows List */}
      <div className="menu-scroll min-h-[220px] flex-1 divide-y divide-[#2a2a2c] overflow-y-auto">
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center text-xs text-[#ececec]/50">
            등록된 메뉴가 없습니다. 위 입력창에서 메뉴를 추가해 보세요.
          </div>
        ) : (
          items.map((item) => {
            const prob =
              item.enabled && totalWeight > 0
                ? (item.weight / totalWeight) * 100
                : 0;

            return (
              <div
                key={item.id}
                className={`flex items-center justify-between gap-2.5 px-5 py-2.5 transition-colors hover:bg-white/[0.03] ${
                  item.enabled ? '' : 'opacity-45'
                }`}
              >
                {/* Toggle + Color Swatch + Name */}
                <div className="flex min-w-0 flex-1 items-center gap-2.5">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={item.enabled}
                    aria-label={`${item.name} 포함 여부 전환`}
                    disabled={isSpinning}
                    onClick={() => onToggleMenu(item.id)}
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-[2px] border transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#facc15] disabled:cursor-not-allowed ${
                      item.enabled
                        ? 'border-[#facc15] bg-[#facc15] text-[#0c0c0e]'
                        : 'border-[#3f3f44] bg-[#0c0c0e] text-transparent hover:border-[#ececec]/60'
                    }`}
                  >
                    <Check className="h-3 w-3 stroke-[3]" />
                  </button>

                  <span
                    aria-hidden="true"
                    className="h-3 w-3 shrink-0"
                    style={{ backgroundColor: item.color }}
                  />

                  <span
                    className={`truncate text-sm font-medium ${
                      item.enabled
                        ? 'text-[#ececec]'
                        : 'text-[#ececec]/50 line-through'
                    }`}
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>

                {/* Weight Stepper + Probability + Delete */}
                <div className="flex shrink-0 items-center gap-2">
                  {/* Compact Weight Stepper */}
                  <div
                    className="flex items-center rounded-[3px] border border-[#2a2a2c] bg-[#0c0c0e]"
                    aria-label={`${item.name} 비중 조절`}
                  >
                    <button
                      type="button"
                      onClick={() => onChangeWeight(item.id, -1)}
                      disabled={isSpinning || !item.enabled || item.weight <= 1}
                      aria-label={`${item.name} 비중 줄이기`}
                      className="flex h-6 w-6 items-center justify-center text-[#ececec]/60 transition-colors hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Minus className="h-2.5 w-2.5" />
                    </button>
                    <span className="font-num w-4 text-center text-[11px] font-bold text-[#ececec]">
                      {item.weight}
                    </span>
                    <button
                      type="button"
                      onClick={() => onChangeWeight(item.id, 1)}
                      disabled={isSpinning || !item.enabled || item.weight >= 5}
                      aria-label={`${item.name} 비중 늘리기`}
                      className="flex h-6 w-6 items-center justify-center text-[#ececec]/60 transition-colors hover:text-[#facc15] disabled:cursor-not-allowed disabled:opacity-30"
                    >
                      <Plus className="h-2.5 w-2.5" />
                    </button>
                  </div>

                  <span
                    className="font-num w-[42px] text-right text-[11px] font-semibold tracking-wider text-[#facc15]"
                    title="당첨 확률"
                  >
                    {item.enabled ? `${prob.toFixed(1)}%` : 'OFF'}
                  </span>

                  <button
                    type="button"
                    onClick={() => onRemoveMenu(item.id)}
                    disabled={isSpinning}
                    aria-label={`${item.name} 삭제`}
                    className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[#ececec]/35 transition-colors hover:bg-[#ef4444]/15 hover:text-[#f87171] disabled:cursor-not-allowed disabled:opacity-30"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Weight Hint */}
      <div className="border-t border-[#2a2a2c] px-5 py-2.5 font-mono text-[11px] text-[#ececec]/45">
        비중(1–5) 조절 시 룰렛 면적과 확률이 실시간 반영됩니다
      </div>
    </section>
  );
};
