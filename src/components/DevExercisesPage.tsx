import React, { useState } from 'react';
import { ArrowLeft, FlaskConical } from 'lucide-react';
import { DEV_SAMPLE_EXERCISES, CurriculumLesson, LessonStep } from '../data/curriculum';
import { useI18n } from '../lib/i18n';
import { LessonPlayer } from './LessonPlayer';

interface DevExercisesPageProps {
  soundEnabled: boolean;
  onBackToApp: () => void;
}

export const DevExercisesPage: React.FC<DevExercisesPageProps> = ({
  soundEnabled,
  onBackToApp,
}) => {
  const { t } = useI18n();
  const [selectedType, setSelectedType] = useState<string>('all');

  const filteredSteps: LessonStep[] =
    selectedType === 'all'
      ? DEV_SAMPLE_EXERCISES
      : DEV_SAMPLE_EXERCISES.filter((s) => s.type === selectedType);

  const previewLesson: CurriculumLesson = {
    id: `dev-preview-${selectedType}`,
    unitId: 'unit-dev',
    orderIndex: 0,
    slug: `dev-preview-${selectedType}`,
    estimatedMinutes: 5,
    title: {
      en: 'Exercise Sandbox (/dev/exercises)',
      ru: 'Песочница упражнений (/dev/exercises)',
      ar: 'مختبر التمارين (/dev/exercises)',
      fr: 'Bac à sable des exercices (/dev/exercises)',
    },
    description: {
      en: 'Interactive test harness for all 10 Phase 2 exercise types.',
      ru: 'Интерактивное тестирование всех 10 типов упражнений Фазы 2.',
      ar: 'اختبار تفاعلي لجميع أنواع التمارين العشرة.',
      fr: 'Test interactif des 10 types d’exercices de la Phase 2.',
    },
    steps: filteredSteps,
  };

  return (
    <div className="min-h-screen flex flex-col bg-[var(--surface-canvas)]">
      <div className="bg-brand-navy text-white px-4 sm:px-6 py-3 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToApp}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 rtl:rotate-180" />
            <span>{t('nav.tabMap')}</span>
          </button>
          <div className="flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-accent-orange" />
            <span className="font-display font-bold text-sm">{t('dev.exercisesTitle')}</span>
          </div>
        </div>

        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={() => setSelectedType('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer ${
              selectedType === 'all'
                ? 'bg-accent-orange text-brand-navy'
                : 'bg-white/10 text-slate-200 hover:bg-white/20'
            }`}
          >
            All (10)
          </button>
          {DEV_SAMPLE_EXERCISES.map((step) => (
            <button
              key={step.id}
              type="button"
              onClick={() => setSelectedType(step.type)}
              className={`px-2.5 py-1 rounded-lg text-xs font-mono cursor-pointer ${
                selectedType === step.type
                  ? 'bg-accent-orange text-brand-navy font-bold'
                  : 'bg-white/10 text-slate-200 hover:bg-white/20'
              }`}
            >
              {step.type}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1">
        <LessonPlayer
          key={previewLesson.id}
          lesson={previewLesson}
          soundEnabled={soundEnabled}
          onExitToMap={onBackToApp}
          onRecordMistake={() => {}}
          onCompleteLesson={onBackToApp}
        />
      </div>
    </div>
  );
};
