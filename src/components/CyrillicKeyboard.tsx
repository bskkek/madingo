import React from 'react';
import { Delete, RotateCcw } from 'lucide-react';
import { useI18n } from '../lib/i18n';

const CYRILLIC_ROWS: string[][] = [
  ['Й', 'Ц', 'У', 'К', 'Е', 'Н', 'Г', 'Ш', 'Щ', 'З', 'Х', 'Ъ'],
  ['Ф', 'Ы', 'В', 'А', 'П', 'Р', 'О', 'Л', 'Д', 'Ж', 'Э', 'Ё'],
  ['Я', 'Ч', 'С', 'М', 'И', 'Т', 'Ь', 'Б', 'Ю'],
];

interface CyrillicKeyboardProps {
  onKeyPress: (letter: string) => void;
  onBackspace?: () => void;
  onClear?: () => void;
  highlightedKey?: string | null;
  shakingKey?: string | null;
  showSpaceBar?: boolean;
}

export const CyrillicKeyboard: React.FC<CyrillicKeyboardProps> = ({
  onKeyPress,
  onBackspace,
  onClear,
  highlightedKey,
  shakingKey,
  showSpaceBar = false,
}) => {
  const { t } = useI18n();

  return (
    <div
      className="w-full rounded-3xl bg-slate-100 dark:bg-slate-900/90 border border-slate-200 dark:border-slate-800 p-3 sm:p-4 select-none"
      role="group"
      aria-label="Russian Cyrillic Keyboard"
    >
      <div className="flex flex-col gap-2">
        {CYRILLIC_ROWS.map((row, rIdx) => (
          <div key={rIdx} className="flex items-center justify-center gap-1 sm:gap-1.5 flex-wrap">
            {row.map((letter) => {
              const isHighlighted = highlightedKey?.toUpperCase() === letter;
              const isShaking = shakingKey?.toUpperCase() === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => onKeyPress(letter)}
                  aria-label={`Cyrillic letter ${letter}`}
                  className={`min-h-[46px] min-w-[30px] sm:min-w-[38px] px-2 rounded-xl font-display font-bold text-base sm:text-lg transition transform active:scale-95 cursor-pointer flex items-center justify-center shadow-xs border ${
                    isShaking
                      ? 'animate-shake bg-error text-white border-error'
                      : isHighlighted
                      ? 'bg-accent-orange text-brand-navy border-accent-orange ring-2 ring-accent-orange/50 animate-pulse'
                      : 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white border-slate-200 dark:border-slate-700 hover:border-brand-blue dark:hover:border-accent-orange'
                  }`}
                >
                  {letter}
                </button>
              );
            })}

            {rIdx === 2 && onBackspace && (
              <button
                type="button"
                onClick={onBackspace}
                aria-label={t('lesson.backspaceBtn')}
                className="min-h-[46px] px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <Delete className="w-4 h-4" />
                <span className="hidden md:inline">{t('lesson.backspaceBtn')}</span>
              </button>
            )}

            {rIdx === 2 && onClear && (
              <button
                type="button"
                onClick={onClear}
                aria-label={t('lesson.clearWordBtn')}
                className="min-h-[46px] px-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-semibold text-xs flex items-center gap-1 hover:bg-slate-300 dark:hover:bg-slate-700 transition cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span className="hidden md:inline">{t('lesson.clearWordBtn')}</span>
              </button>
            )}
          </div>
        ))}

        {showSpaceBar && (
          <div className="flex items-center justify-center gap-1.5 pt-1">
            {['.', ',', '?', '!'].map((punct) => (
              <button
                key={punct}
                type="button"
                onClick={() => onKeyPress(punct)}
                className={`min-h-[44px] min-w-[38px] px-2.5 rounded-xl font-mono font-bold text-base border transition cursor-pointer ${
                  highlightedKey === punct
                    ? 'bg-accent-orange text-brand-navy border-accent-orange ring-2 ring-accent-orange/50'
                    : 'bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                }`}
              >
                {punct}
              </button>
            ))}
            <button
              type="button"
              onClick={() => onKeyPress(' ')}
              aria-label="Space"
              className={`min-h-[44px] flex-1 max-w-xs px-6 rounded-xl font-display font-bold text-xs sm:text-sm border transition cursor-pointer ${
                highlightedKey === ' '
                  ? 'bg-accent-orange text-brand-navy border-accent-orange ring-2 ring-accent-orange/50'
                  : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-200 dark:border-slate-700 hover:border-brand-blue'
              }`}
            >
              ПРОБЕЛ · SPACE
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
