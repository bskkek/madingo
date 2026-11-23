import React from 'react';
import {
  BookOpen,
  ChevronRight,
  Languages,
  Mic,
  Trophy,
  User,
  Wrench,
  X,
} from 'lucide-react';
import { useI18n } from '../lib/i18n';
import { TEACHER_IMAGES } from './TeacherAvatar';
import {
  ProfileSettingsView,
  UserProfileState,
} from './ProfileSettingsView';
import { UserRole } from '../lib/phase3Engine';
import { StreakState } from '../lib/rules';

/**
 * GlassSheets — the new design's windows, all dark glass over the MADI
 * photo backdrop (never white): the Learn and Practice bottom sheets,
 * and the Profile window that opens from the top-bar avatar.
 *
 * Every sheet/window carries a real MADI photo + a symbol badge for
 * that window (open book for Learn, trophy for Practice, person for
 * Profile). The Builder has no sheet — it is its own full tab.
 */

const BASE = import.meta.env.BASE_URL;
const MADI_WIDE = BASE + 'assets/madi/madi-wide.jpg';
const MADI_DUSK = BASE + 'assets/madi/madi-dusk.jpg';
const NAV_3D_BASE = BASE + 'nav-3d/';
const SHEET_ICONS = {
  dictionary:
    NAV_3D_BASE +
    'media-generation-nav-dictionary-0-d2dd09b2-ce79-447d-8c49-15d927505f6e.webp',
  alphabet:
    NAV_3D_BASE +
    'media-generation-nav-alphabet-0-b13b8087-43e2-41d6-b0d9-22acf600dbe7.webp',
  arena:
    NAV_3D_BASE +
    'media-generation-nav-arena-0-339440e2-b6ec-4e64-99d7-1e166ab4a9f5.webp',
} as const;

function SheetShell({
  open,
  onClose,
  label,
  children,
}: {
  open: boolean;
  onClose: () => void;
  label: string;
  children: React.ReactNode;
}) {
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={label}
    >
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/45 backdrop-blur-[2px] cursor-pointer"
      />
      <div className="relative w-full max-w-lg mx-3 mb-3 rounded-[28px] bg-[#0A1628]/90 backdrop-blur-xl border border-white/15 shadow-2xl overflow-hidden">
        {children}
      </div>
    </div>
  );
}

function SheetHero({
  photo,
  icon,
  title,
  subtitle,
  onClose,
}: {
  photo: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClose: () => void;
}) {
  return (
    <div className="relative h-28 shrink-0">
      <img
        src={photo}
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
        draggable={false}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0A1628] via-[#0A1628]/45 to-transparent" />
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-3 end-3 w-8 h-8 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
      <div className="absolute bottom-3 start-4 end-4 flex items-center gap-3">
        <span className="w-11 h-11 rounded-2xl bg-gradient-to-b from-[#FF9B32] to-[#FF7A00] text-[#0F172A] flex items-center justify-center shadow-lg ring-2 ring-white/40 shrink-0">
          {icon}
        </span>
        <span className="min-w-0">
          <span className="block font-display font-extrabold text-lg text-white leading-tight">
            {title}
          </span>
          <span className="block text-xs text-white/70 leading-snug">{subtitle}</span>
        </span>
      </div>
    </div>
  );
}

function SheetRow({
  icon,
  title,
  subtitle,
  onClick,
  testId,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  testId: string;
}) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-2xl hover:bg-white/10 active:bg-white/15 transition text-start cursor-pointer"
    >
      <span className="w-11 h-11 rounded-xl bg-white/90 flex items-center justify-center shrink-0 shadow">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block font-display font-bold text-sm text-white leading-tight">
          {title}
        </span>
        <span className="block text-xs text-white/60 leading-snug">{subtitle}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-white/50 shrink-0" />
    </button>
  );
}

export const LearnSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect: (tab: 'dictionary' | 'typing_lab' | 'verbs') => void;
}> = ({ open, onClose, onSelect }) => {
  const { t } = useI18n();
  return (
    <SheetShell open={open} onClose={onClose} label={t('nav.tabLearn')}>
      <SheetHero
        photo={MADI_WIDE}
        icon={<BookOpen className="w-5 h-5" />}
        title={t('nav.tabLearn')}
        subtitle="225 verbs · 628 words · 33 letters"
        onClose={onClose}
      />
      <div className="p-3 space-y-1 pb-4">
        <SheetRow
          testId="learn-sheet-verbs"
          icon={<Languages className="w-6 h-6 text-[#0B3D91]" />}
          title={t('nav.tabVerbs')}
          subtitle={t('nav.verbsSubtitle')}
          onClick={() => onSelect('verbs')}
        />
        <SheetRow
          testId="learn-sheet-dictionary"
          icon={
            <img
              src={SHEET_ICONS.dictionary}
              alt=""
              draggable={false}
              className="w-8 h-8 object-cover rounded-lg"
            />
          }
          title={t('nav.tabDictionary')}
          subtitle="628 words"
          onClick={() => onSelect('dictionary')}
        />
        <SheetRow
          testId="learn-sheet-alphabet"
          icon={
            <img
              src={SHEET_ICONS.alphabet}
              alt=""
              draggable={false}
              className="w-8 h-8 object-cover rounded-lg"
            />
          }
          title={t('nav.tabAlphabet')}
          subtitle="33 Cyrillic letters"
          onClick={() => onSelect('typing_lab')}
        />
      </div>
    </SheetShell>
  );
};

export const PracticeSheet: React.FC<{
  open: boolean;
  onClose: () => void;
  onSelect: (tab: 'arena' | 'speaking') => void;
}> = ({ open, onClose, onSelect }) => {
  const { t } = useI18n();
  return (
    <SheetShell open={open} onClose={onClose} label={t('nav.tabPractice')}>
      <SheetHero
        photo={MADI_DUSK}
        icon={<Trophy className="w-5 h-5" />}
        title={t('nav.tabPractice')}
        subtitle="Arena · Speaking"
        onClose={onClose}
      />
      <div className="p-3 space-y-1 pb-4">
        <SheetRow
          testId="practice-sheet-arena"
          icon={
            <img
              src={SHEET_ICONS.arena}
              alt=""
              draggable={false}
              className="w-8 h-8 object-cover rounded-lg"
            />
          }
          title={t('nav.tabArena')}
          subtitle="Challenges & leagues"
          onClick={() => onSelect('arena')}
        />
        <SheetRow
          testId="practice-sheet-speaking"
          icon={<Mic className="w-5 h-5 text-brand-blue" />}
          title={t('nav.tabSpeak')}
          subtitle="Repeat After Me"
          onClick={() => onSelect('speaking')}
        />
      </div>
    </SheetShell>
  );
};

export const ProfileWindow: React.FC<{
  open: boolean;
  onClose: () => void;
  profile: UserProfileState;
  streak: StreakState;
  totalFuel: number;
  completedCount: number;
  levelLabel: string;
  userRole: UserRole;
  onSaveSettings: (updates: Partial<UserProfileState>) => Promise<void>;
  onLogout: () => void;
  onDeleteAccount: () => Promise<void>;
  onOpenLegalModal?: () => void;
  onOpenContactModal?: () => void;
  onExportGdprJson?: () => void;
  onOpenTeacher?: () => void;
}> = ({
  open,
  onClose,
  profile,
  streak,
  totalFuel,
  completedCount,
  levelLabel,
  userRole,
  onSaveSettings,
  onLogout,
  onDeleteAccount,
  onOpenLegalModal,
  onOpenContactModal,
  onExportGdprJson,
  onOpenTeacher,
}) => {
  const { t } = useI18n();
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-label={t('nav.tabProfile')}
    >
      {/* Full-window MADI photo background + dark shading */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <img
          src={MADI_DUSK}
          alt=""
          className="absolute inset-0 w-full h-full object-cover"
          draggable={false}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#0A1628]/60 via-[#0A1628]/75 to-[#0A1628]/90" />
      </div>

      <div className="relative z-10 max-w-3xl mx-auto px-4 sm:px-6 pt-3 pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <img
              src={TEACHER_IMAGES.neutral}
              alt="Aniss"
              className="w-11 h-11 rounded-full object-cover object-top border-[3px] border-white shadow-xl ring-2 ring-orange-400/70 select-none"
              draggable={false}
            />
            <div>
              <div className="font-display font-extrabold text-lg text-white leading-tight">
                {profile.displayName}
              </div>
              <div className="mt-0.5 inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-accent-orange text-brand-navy text-[11px] font-display font-extrabold">
                {levelLabel}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-9 h-9 rounded-full bg-white/15 backdrop-blur-md text-white flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stats — streak, fuel, stops (one compact line per stat) */}
        <div className="mt-2 grid grid-cols-3 gap-2">
          {[
            { value: String(streak.current), label: 'days streak' },
            { value: String(totalFuel), label: 'fuel' },
            { value: String(completedCount), label: 'stops done' },
          ].map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/15 px-2 py-1.5 flex items-baseline justify-center gap-1 min-w-0"
            >
              <span className="font-display font-extrabold text-sm text-white tabular-nums leading-none">
                {s.value}
              </span>
              <span className="text-[11px] text-white/65 font-medium truncate">{s.label}</span>
            </div>
          ))}
        </div>

        {userRole !== 'student' && onOpenTeacher && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenTeacher();
            }}
            className="mt-2 w-full min-h-[48px] rounded-2xl bg-gradient-to-b from-[#FF9B32] to-[#FF7A00] text-[#0F172A] font-display font-extrabold text-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Wrench className="w-4 h-4" />
            <span>{t('nav.tabTeacher')}</span>
          </button>
        )}

        <div className="mt-2">
          <ProfileSettingsView
            surface="glass"
            profile={profile}
            onSaveSettings={onSaveSettings}
            onLogout={onLogout}
            onDeleteAccount={onDeleteAccount}
            onOpenLegalModal={onOpenLegalModal}
            onOpenContactModal={onOpenContactModal}
            onExportGdprJson={onExportGdprJson}
          />
        </div>

        <div className="mt-2 flex items-center justify-center gap-2 text-white/50 text-xs">
          <User className="w-3.5 h-3.5" />
          <span>MADI · {profile.email}</span>
        </div>
      </div>
    </div>
  );
};
