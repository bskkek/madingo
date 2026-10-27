import React, { useState } from 'react';

export type MascotName = 'misha' | 'katya' | 'dima' | 'layla' | 'gudok';
export type MascotExpression = 'happy' | 'thinking' | 'cheering' | 'idle';

interface MascotProps {
  name: MascotName;
  expression?: MascotExpression;
  pose?: 1 | 2;
  size?: number;
  className?: string;
  interactive?: boolean;
}

export const Mascot: React.FC<MascotProps> = ({
  name,
  expression = 'happy',
  pose = 1,
  size = 120,
  className = '',
  interactive = true,
}) => {
  const [currentExp, setCurrentExp] = useState<MascotExpression>(expression);
  const [isBouncing, setIsBouncing] = useState(false);

  const handleClick = () => {
    if (!interactive) return;
    setIsBouncing(true);
    const expressions: MascotExpression[] = ['happy', 'cheering', 'thinking'];
    const next = expressions[(expressions.indexOf(currentExp) + 1) % expressions.length];
    setCurrentExp(next);
    setTimeout(() => setIsBouncing(false), 600);
  };

  return (
    <div
      onClick={handleClick}
      className={`inline-block select-none cursor-pointer transition-transform duration-300 ${
        isBouncing ? 'scale-110 -translate-y-2' : 'hover:scale-105'
      } ${className}`}
      title={`Click to interact with ${name}`}
    >
      {name === 'misha' && <MishaSVG expression={currentExp} pose={pose} size={size} />}
      {name === 'katya' && <KatyaSVG expression={currentExp} pose={pose} size={size} />}
      {name === 'dima' && <DimaSVG expression={currentExp} pose={pose} size={size} />}
      {name === 'layla' && <LaylaSVG expression={currentExp} pose={pose} size={size} />}
      {name === 'gudok' && <GudokSVG expression={currentExp} pose={pose} size={size} />}
    </div>
  );
};

/* --- 1. Misha (Mechanic Leader) --- */
export const MishaSVG: React.FC<{ expression: MascotExpression; pose: number; size: number }> = ({
  expression,
  size,
}) => {
  const isCheering = expression === 'cheering';
  const isThinking = expression === 'thinking';
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Aura */}
      <circle cx="90" cy="94" r="72" fill="#DBEAFE" fillOpacity="0.7" />
      {/* Body & Overalls */}
      <path d="M46 164 C46 130 62 118 90 118 C118 118 134 130 134 164 Z" fill="#FF8A1F" />
      <path d="M62 122 L66 164 L114 164 L118 122 Z" fill="#0B3D91" />
      <rect x="64" y="116" width="10" height="26" rx="4" fill="#0A1F44" />
      <rect x="106" y="116" width="10" height="26" rx="4" fill="#0A1F44" />
      <circle cx="69" cy="134" r="3" fill="#FF8A1F" />
      <circle cx="111" cy="134" r="3" fill="#FF8A1F" />
      <rect x="76" y="138" width="28" height="20" rx="5" fill="#0A1F44" />
      <circle cx="90" cy="148" r="5" fill="#F4F1DE" />
      {/* Neck & Head */}
      <rect x="80" y="104" width="20" height="18" rx="6" fill="#FDE2C8" />
      <circle cx="48" cy="82" r="9" fill="#FDE2C8" />
      <circle cx="132" cy="82" r="9" fill="#FDE2C8" />
      <rect x="52" y="46" width="76" height="66" rx="32" fill="#FFE8D1" stroke="#0A1F44" strokeWidth="2.5" />
      {/* Hair */}
      <path d="M46 72 C44 48 64 36 90 36 C116 36 136 48 134 72 C126 60 118 56 108 64 C102 52 88 52 80 64 C70 54 56 58 46 72 Z" fill="#0A1F44" />
      {/* Cap */}
      <path d="M52 56 C52 38 128 38 128 56 Z" fill="#FF8A1F" />
      <path d="M40 54 L140 54 L132 46 L48 46 Z" fill="#E5484D" />
      <circle cx="90" cy="42" r="6" fill="#F4F1DE" />
      {/* Face expression */}
      {isCheering ? (
        <>
          <path d="M68 76 Q76 70 84 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M96 76 Q104 70 112 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M74 92 Q90 106 106 92 Z" fill="#0A1F44" />
        </>
      ) : isThinking ? (
        <>
          <line x1="68" y1="74" x2="84" y2="78" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M80 96 Q90 90 100 96" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="76" cy="76" r="5" fill="#0A1F44" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M78 92 Q90 102 102 92" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* Wrench prop */}
      <path d="M26 120 L50 96 L58 104 L34 128 Z" fill="#CBD5E1" stroke="#0A1F44" strokeWidth="2" />
    </svg>
  );
};

/* --- 2. Katya (Young Engineer with Braids & Blueprint) --- */
export const KatyaSVG: React.FC<{ expression: MascotExpression; pose: number; size: number }> = ({
  expression,
  size,
}) => {
  const isCheering = expression === 'cheering';
  const isThinking = expression === 'thinking';
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="94" r="72" fill="#FEF3C7" fillOpacity="0.7" />
      {/* Body & White Lab Vest */}
      <path d="M46 164 C46 130 62 118 90 118 C118 118 134 130 134 164 Z" fill="#0B3D91" />
      <path d="M64 122 L72 164 L108 164 L116 122 Z" fill="#FFFFFF" stroke="#0A1F44" strokeWidth="2" />
      {/* Neck & Head */}
      <rect x="80" y="104" width="20" height="18" rx="6" fill="#FDE2C8" />
      {/* Braids */}
      <circle cx="38" cy="90" r="10" fill="#B45309" />
      <circle cx="142" cy="90" r="10" fill="#B45309" />
      <rect x="52" y="46" width="76" height="66" rx="32" fill="#FFE8D1" stroke="#0A1F44" strokeWidth="2.5" />
      {/* Hair & White Safety Hardhat */}
      <path d="M52 64 C50 44 68 34 90 34 C112 34 130 44 128 64 Z" fill="#F59E0B" />
      <path d="M48 44 C48 24 132 24 132 44 Z" fill="#FFFFFF" stroke="#0A1F44" strokeWidth="2.5" />
      <rect x="82" y="32" width="16" height="6" rx="3" fill="#E5484D" />
      {/* Face */}
      {isCheering ? (
        <>
          <path d="M68 76 Q76 70 84 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M96 76 Q104 70 112 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M74 92 Q90 106 106 92 Z" fill="#0A1F44" />
        </>
      ) : isThinking ? (
        <>
          <line x1="68" y1="74" x2="84" y2="78" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M80 96 Q90 90 100 96" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="76" cy="76" r="5" fill="#0A1F44" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M78 92 Q90 102 102 92" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* Blueprint scroll prop */}
      <rect x="110" y="124" width="36" height="24" rx="4" fill="#3B82F6" stroke="#0A1F44" strokeWidth="2" />
      <line x1="116" y1="132" x2="140" y2="132" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
      <line x1="116" y1="140" x2="130" y2="140" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
};

/* --- 3. Dima (Road Builder with Vest & Traffic Cone) --- */
export const DimaSVG: React.FC<{ expression: MascotExpression; pose: number; size: number }> = ({
  expression,
  size,
}) => {
  const isCheering = expression === 'cheering';
  const isThinking = expression === 'thinking';
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="94" r="72" fill="#FFEDD5" fillOpacity="0.7" />
      {/* Body & Hi-Vis Vest */}
      <path d="M46 164 C46 130 62 118 90 118 C118 118 134 130 134 164 Z" fill="#1E293B" />
      <path d="M62 122 L68 164 L112 164 L118 122 Z" fill="#F59E0B" />
      <rect x="74" y="122" width="8" height="42" fill="#FFFFFF" />
      <rect x="98" y="122" width="8" height="42" fill="#FFFFFF" />
      {/* Neck & Head */}
      <rect x="80" y="104" width="20" height="18" rx="6" fill="#FDE2C8" />
      <circle cx="48" cy="82" r="9" fill="#FDE2C8" />
      <circle cx="132" cy="82" r="9" fill="#FDE2C8" />
      <rect x="52" y="46" width="76" height="66" rx="32" fill="#FFE8D1" stroke="#0A1F44" strokeWidth="2.5" />
      {/* Short Brown Curly Hair */}
      <path d="M52 68 C50 44 64 36 90 36 C116 36 130 44 128 68 Z" fill="#78350F" />
      {/* Face */}
      {isCheering ? (
        <>
          <path d="M68 76 Q76 70 84 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M96 76 Q104 70 112 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M74 92 Q90 106 106 92 Z" fill="#0A1F44" />
        </>
      ) : isThinking ? (
        <>
          <line x1="68" y1="74" x2="84" y2="78" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M80 96 Q90 90 100 96" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="76" cy="76" r="5" fill="#0A1F44" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M78 92 Q90 102 102 92" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* Traffic cone prop */}
      <polygon points="26,148 42,112 58,148" fill="#FF8A1F" stroke="#0A1F44" strokeWidth="2" />
      <polygon points="34,132 50,132 46,122 38,122" fill="#FFFFFF" />
    </svg>
  );
};

/* --- 4. Layla (International Student with Backpack & Notebook) --- */
export const LaylaSVG: React.FC<{ expression: MascotExpression; pose: number; size: number }> = ({
  expression,
  size,
}) => {
  const isCheering = expression === 'cheering';
  const isThinking = expression === 'thinking';
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="94" r="72" fill="#E0F2FE" fillOpacity="0.7" />
      {/* Body & Teal Hoodie */}
      <path d="M46 164 C46 130 62 118 90 118 C118 118 134 130 134 164 Z" fill="#0F766E" />
      {/* Neck & Head */}
      <rect x="80" y="104" width="20" height="18" rx="6" fill="#FDE2C8" />
      <rect x="52" y="46" width="76" height="66" rx="32" fill="#FFE8D1" stroke="#0A1F44" strokeWidth="2.5" />
      {/* Hijab / Hair wrapper */}
      <path d="M52 64 C52 40 66 32 90 32 C114 32 128 40 128 64 C128 92 118 108 90 112 C62 108 52 92 52 64 Z" fill="#0D9488" />
      <path d="M60 52 C70 44 110 44 120 52 L128 112 C110 118 70 118 52 112 Z" fill="#14B8A6" />
      {/* Face */}
      {isCheering ? (
        <>
          <path d="M68 76 Q76 70 84 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M96 76 Q104 70 112 76" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M74 92 Q90 106 106 92 Z" fill="#0A1F44" />
        </>
      ) : isThinking ? (
        <>
          <line x1="68" y1="74" x2="84" y2="78" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M80 96 Q90 90 100 96" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="76" cy="76" r="5" fill="#0A1F44" />
          <circle cx="104" cy="76" r="5" fill="#0A1F44" />
          <path d="M78 92 Q90 102 102 92" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" fill="none" />
        </>
      )}
      {/* Cyrillic notebook prop */}
      <rect x="114" y="124" width="30" height="22" rx="3" fill="#F4F1DE" stroke="#0A1F44" strokeWidth="2" />
      <text x="120" y="140" fill="#0A1F44" fontSize="12" fontWeight="bold">А Б</text>
    </svg>
  );
};

/* --- 5. Gudok (Tiny Round Robot-Wheel Companion) --- */
export const GudokSVG: React.FC<{ expression: MascotExpression; pose: number; size: number }> = ({
  expression,
  size,
}) => {
  const isCheering = expression === 'cheering';
  return (
    <svg width={size} height={size} viewBox="0 0 180 180" fill="none" xmlns="http://www.w3.org/2000/svg">
      <circle cx="90" cy="94" r="72" fill="#F1F5F9" fillOpacity="0.7" />
      {/* Outer Wheel / Body */}
      <circle cx="90" cy="100" r="42" fill="#2B2F3A" stroke="#FF8A1F" strokeWidth="6" />
      <circle cx="90" cy="100" r="28" fill="#0B3D91" stroke="#F4F1DE" strokeWidth="3" />
      <circle cx="90" cy="100" r="10" fill="#FF8A1F" />
      {/* Glowing antenna / horn */}
      <line x1="90" y1="58" x2="90" y2="38" stroke="#0A1F44" strokeWidth="4" strokeLinecap="round" />
      <circle cx="90" cy="34" r="8" fill={isCheering ? '#10B981' : '#E5484D'} className="animate-pulse" />
      {/* Expressive digital eyes */}
      <circle cx="78" cy="92" r="6" fill="#F4F1DE" />
      <circle cx="78" cy="92" r="2.5" fill="#0A1F44" />
      <circle cx="102" cy="92" r="6" fill="#F4F1DE" />
      <circle cx="102" cy="92" r="2.5" fill="#0A1F44" />
      {/* Smile */}
      <path d="M82 106 Q90 114 98 106" stroke="#F4F1DE" strokeWidth="3" strokeLinecap="round" fill="none" />
    </svg>
  );
};
