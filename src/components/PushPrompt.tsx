// In-app permission prompt for real push notifications (2026-11-15).
// Shown once on the first Road visit (after a short delay), in the user's
// language. "Not now" waits 7 days; a browser-level denial is never asked
// again (see src/lib/pushClient.ts).
import React from 'react';
import { Bell } from 'lucide-react';
import { useI18n } from '../lib/i18n';

export const PushPrompt: React.FC<{ onAllow: () => void; onLater: () => void }> = ({
  onAllow,
  onLater,
}) => {
  const { t } = useI18n();
  return (
    <div
      data-testid="push-prompt"
      className="fixed inset-x-3 bottom-24 z-50 mx-auto max-w-md rounded-3xl border border-white/15 bg-[#0A1F44]/95 p-4 shadow-[0_18px_50px_rgba(0,0,0,0.55)] backdrop-blur"
      role="dialog"
      aria-label={t('push.promptTitle')}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#FF8A1F] text-white">
          <Bell className="h-6 w-6" />
        </div>
        <div className="min-w-0">
          <p className="text-[15px] font-extrabold text-white">{t('push.promptTitle')}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-white/75">{t('push.promptBody')}</p>
        </div>
      </div>
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          onClick={onAllow}
          className="min-h-[44px] flex-1 rounded-2xl bg-[#FF8A1F] px-4 text-[15px] font-extrabold text-white transition active:translate-y-[1px]"
        >
          {t('push.promptAllow')}
        </button>
        <button
          type="button"
          onClick={onLater}
          className="min-h-[44px] rounded-2xl border border-white/20 bg-white/10 px-4 text-[14px] font-bold text-white transition active:translate-y-[1px]"
        >
          {t('push.promptLater')}
        </button>
      </div>
    </div>
  );
};
