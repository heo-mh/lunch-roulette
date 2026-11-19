import React from 'react';
import { SpinHistoryItem } from '../types/roulette';

interface HistoryPanelProps {
  history: SpinHistoryItem[];
  onClearHistory: () => void;
}

function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('ko-KR', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  onClearHistory,
}) => {
  return (
    <section
      id="history"
      aria-label="최근 당첨 기록"
      className="flex flex-col border-t border-[#2a2a2c] bg-[#161618]"
    >
      <div className="flex items-center justify-between border-b border-[#2a2a2c] px-5 py-3.5">
        <div className="flex items-baseline gap-2">
          <h2 className="font-mono text-xs font-bold tracking-[0.14em] text-[#ececec]">
            RECENT LOG
          </h2>
          <span className="font-num text-[11px] text-[#ececec]/45">
            {history.length}
          </span>
        </div>

        {history.length > 0 && (
          <button
            type="button"
            onClick={onClearHistory}
            className="font-mono text-[11px] text-[#ececec]/45 transition-colors hover:text-[#facc15] whitespace-nowrap"
          >
            [CLEAR]
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="px-5 py-5 text-center font-mono text-[11px] text-[#ececec]/40">
          아직 당첨 기록이 없습니다
        </div>
      ) : (
        <ol className="menu-scroll max-h-[168px] overflow-y-auto py-1">
          {history.slice(0, 8).map((entry, idx) => (
            <li
              key={entry.id}
              className="flex items-center justify-between gap-3 px-5 py-2 text-xs transition-colors hover:bg-white/[0.02]"
            >
              <div className="flex min-w-0 items-center gap-2.5">
                <span className="font-num text-[11px] text-[#ececec]/45">
                  {String(idx + 1).padStart(2, '0')}.
                </span>
                <span
                  aria-hidden="true"
                  className="h-2.5 w-2.5 shrink-0"
                  style={{ backgroundColor: entry.color }}
                />
                <span className="truncate font-medium text-[#ececec]/90">
                  {entry.menuName}
                </span>
              </div>

              <div className="flex shrink-0 items-center gap-2 font-num text-[11px]">
                <span className="text-[#ececec]/45">
                  {entry.probability.toFixed(1)}%
                </span>
                <span aria-hidden="true" className="text-[#ececec]/25">
                  ·
                </span>
                <span className="text-[#facc15]">{formatTime(entry.timestamp)}</span>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
};
