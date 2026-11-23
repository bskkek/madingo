// ============================================================================
// MADINGO — TEACHER AVATAR (ANIMATED CHARACTER)
// The user himself, as the personal assistant (Aniss answers any
// question and finds books in the MADI library). Three portraits of the
// SAME character (mustard sweater with the circular MADI badge on the
// chest, cream background): neutral (default face) / explaining (while
// he answers) / proud (when the student gets it).
// CSS life (see index.css): idle bob, blink, speaking pulse, smooth
// cross-fades between expressions.
// Image paths go through import.meta.env.BASE_URL — never a hardcoded
// /teacher/... path.
// ============================================================================

import React from 'react';

const BASE = import.meta.env.BASE_URL;

export type TeacherMood = 'neutral' | 'explaining' | 'proud';

export const TEACHER_IMAGES: Record<TeacherMood, string> = {
  neutral:
    BASE +
    'teacher/media-generation-aniss-neutral-0-94b82ec9-bf83-4ea1-a47f-e552e4e74523.webp',
  explaining:
    BASE +
    'teacher/media-generation-aniss-explaining-0-ac806fef-b0c9-45a7-9e09-fbe5bf7a7bb4.webp',
  proud:
    BASE +
    'teacher/media-generation-aniss-proud-0-a844acfd-2764-47bd-8d0c-9732e10c4477.webp',
};

interface TeacherAvatarProps {
  mood?: TeacherMood;
  /** True while he is speaking (mic / TTS) — speaking pulse + glow ring. */
  speaking?: boolean;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<TeacherAvatarProps['size']>, string> = {
  xs: 'w-8 h-8',
  sm: 'w-20 h-20 sm:w-24 sm:h-24',
  md: 'w-11 h-11',
  lg: 'w-44 h-44 sm:w-56 sm:h-56',
};

export const TeacherAvatar: React.FC<TeacherAvatarProps> = ({
  mood = 'neutral',
  speaking = false,
  size = 'sm',
  className = '',
}) => {
  const moods: TeacherMood[] = ['neutral', 'explaining', 'proud'];
  return (
    <div
      className={`avatar-bob relative shrink-0 ${SIZE_CLASSES[size]} ${className}`}
      aria-label="Учитель"
      role="img"
    >
      {/* Speaking glow ring */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute -inset-2 rounded-full transition-opacity duration-500 ${
          speaking
            ? 'opacity-100 ring-4 ring-accent-orange/60 shadow-[0_0_28px_rgba(255,122,0,0.45)]'
            : 'opacity-0 ring-4 ring-transparent'
        }`}
      />
      <div
        className={`relative w-full h-full rounded-full overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl ${
          speaking ? 'avatar-speaking' : ''
        }`}
      >
        {/* All three expressions stacked; only the current mood is visible,
            cross-faded so he changes face smoothly instead of snapping. */}
        <div className="avatar-blink absolute inset-0">
          {moods.map((m) => (
            <img
              key={m}
              src={TEACHER_IMAGES[m]}
              alt={m === mood ? 'Учитель' : ''}
              aria-hidden={m !== mood}
              draggable={false}
              className={`absolute inset-0 w-full h-full object-cover object-top select-none transition-opacity duration-700 ${
                m === mood ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
