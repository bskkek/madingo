import React, { useState, useEffect } from 'react';
import { useI18n } from '../lib/i18n';

const CHARACTER_CONFIGS = [
  {
    id: 'girl',
    sprite: '/assets/madi-crew/sprites/girl.png',
    style: { left: '0.000%', top: '25.764%', width: '21.381%', '--i': 0 },
    idleClass: 'wave',
    dur: '2.2s',
  },
  {
    id: 'professor',
    sprite: '/assets/madi-crew/sprites/professor.png',
    style: { left: '20.977%', top: '0.000%', width: '22.143%', '--i': 1 },
    idleClass: 'breathe',
    dur: '4.2s',
  },
  {
    id: 'kid',
    sprite: '/assets/madi-crew/sprites/kid.png',
    style: { left: '41.112%', top: '30.120%', width: '18.450%', '--i': 2 },
    idleClass: 'hop',
    dur: '2.6s',
  },
  {
    id: 'builder',
    sprite: '/assets/madi-crew/sprites/builder.png',
    style: { left: '57.234%', top: '19.450%', width: '22.890%', '--i': 3 },
    idleClass: 'sway',
    dur: '3.4s',
  },
  {
    id: 'engineer',
    sprite: '/assets/madi-crew/sprites/engineer.png',
    style: { left: '78.500%', top: '21.200%', width: '21.500%', '--i': 4 },
    idleClass: 'lean',
    dur: '3.8s',
  },
];

export const MadiCrewSection: React.FC = () => {
  const { t } = useI18n();
  const [activeBubble, setActiveBubble] = useState<string | null>('professor');
  const [jumpingChar, setJumpingChar] = useState<string | null>(null);

  const getPhrase = (id: string) => {
    switch (id) {
      case 'girl': return t('crew.phraseGirl');
      case 'professor': return t('crew.phraseProfessor');
      case 'kid': return t('crew.phraseKid');
      case 'builder': return t('crew.phraseBuilder');
      case 'engineer': return t('crew.phraseEngineer');
      default: return '';
    }
  };

  const handleCharacterClick = (id: string) => {
    setJumpingChar(id);
    setActiveBubble(id);
    setTimeout(() => setJumpingChar(null), 600);
  };

  useEffect(() => {
    const ids = ['girl', 'professor', 'kid', 'builder', 'engineer'];
    let idx = 0;
    const interval = setInterval(() => {
      idx = (idx + 1) % ids.length;
      setActiveBubble(ids[idx]);
    }, 4500);
    return () => clearInterval(interval);
  }, []);

  return (
    <section className="py-16 px-4 bg-slate-50 dark:bg-slate-900/40 border-t border-slate-100 dark:border-slate-800 overflow-hidden">
      <div className="max-w-4xl mx-auto text-center space-y-2 mb-10">
        <h2 className="text-2xl sm:text-3xl font-display font-black text-slate-900 dark:text-white">
          {t('crew.heading')}
        </h2>
        <p className="text-slate-600 dark:text-slate-400 text-sm sm:text-base font-medium">
          {t('crew.caption')}
        </p>
      </div>

      <div className="crew-wrap max-w-4xl mx-auto p-2 sm:p-6 flex justify-center items-center">
        <div className="crew relative w-full max-w-[920px] aspect-[2231/1145]" style={{ direction: 'ltr' }}>
          <div className="absolute inset-[2%_14%_0_14%] rounded-full bg-[#EFE9DF] opacity-90 dark:bg-[#16213A]" />

          <div className="car absolute top-[28%] left-[32%] w-[18%] z-10 animate-drive">
            <img src="/assets/madi-crew/sprites/car.png" alt="Car" className="w-full h-auto select-none" draggable={false} />
          </div>

          {CHARACTER_CONFIGS.map((char) => {
            const isTalking = activeBubble === char.id;
            const isJumping = jumpingChar === char.id;
            const phrase = getPhrase(char.id);

            return (
              <button
                key={char.id}
                type="button"
                onClick={() => handleCharacterClick(char.id)}
                className={`fig absolute p-0 border-0 bg-transparent cursor-pointer transition-all focus:outline-none focus-visible:ring-4 focus-visible:ring-orange-500 rounded-2xl ${
                  isJumping ? 'jump' : ''
                }`}
                style={{
                  left: char.style.left,
                  top: char.style.top,
                  width: char.style.width,
                  animationDelay: `${0.15 + (char.style['--i'] as number) * 0.14}s`,
                }}
                aria-label={char.id}
              >
                <span className="shadow absolute left-[8%] right-[8%] bottom-[-1.2%] h-[3.2%] rounded-full bg-slate-900/18 blur-[2px]" />
                <span
                  className={`bubble absolute bottom-[calc(100%+4px)] left-1/2 -translate-x-1/2 whitespace-nowrap px-3 py-1 rounded-full bg-white dark:bg-slate-900 text-slate-900 dark:text-white border-2 border-slate-900 dark:border-slate-700 text-xs sm:text-sm font-extrabold shadow-md transition-all z-30 ${
                    isTalking ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-90 translate-y-1.5 pointer-events-none'
                  }`}
                >
                  <bdi>{phrase}</bdi>
                </span>
                <span className={`bob block animate-${char.idleClass}`}>
                  <img src={char.sprite} alt={char.id} className="w-full h-auto select-none" draggable={false} />
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </section>
  );
};
