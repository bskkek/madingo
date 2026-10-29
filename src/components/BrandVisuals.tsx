import React from 'react';
import { SupportedLang } from '../data/curriculum';

export const MadingoWordmark: React.FC<{ size?: 'sm' | 'md' | 'lg'; lightText?: boolean }> = ({
  size = 'md',
  lightText = false,
}) => {
  const textSizes = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-4xl',
  };
  const wheelSizes = {
    sm: 'w-5 h-5',
    md: 'w-6 h-6',
    lg: 'w-9 h-9',
  };

  return (
    <span
      dir="ltr"
      className={`inline-flex items-center font-display font-extrabold tracking-tight select-none whitespace-nowrap shrink-0 ${textSizes[size]} ${
        lightText ? 'text-white' : 'text-brand-blue dark:text-white'
      }`}
      aria-label="madingo"
    >
      <span>mading</span>
      <svg
        viewBox="0 0 36 36"
        className={`${wheelSizes[size]} inline-block ms-0.5 shrink-0 animate-[spin_6s_linear_infinite]`}
        aria-hidden="true"
      >
        <circle cx="18" cy="18" r="15" fill="#2B2F3A" stroke="#FF8A1F" strokeWidth="3.5" />
        <circle cx="18" cy="18" r="9.5" fill="#0B3D91" stroke="#F4F1DE" strokeWidth="1.8" />
        <circle cx="18" cy="18" r="4" fill="#FF8A1F" />
        <path
          d="M18 8.5V14M18 22V27.5M8.5 18H14M22 18H27.5"
          stroke="#F4F1DE"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
};

export const LanguageFlagIcon: React.FC<{ lang: SupportedLang; className?: string }> = ({
  lang,
  className = 'w-8 h-6',
}) => {
  if (lang === 'ru') {
    return (
      <svg viewBox="0 0 36 24" className={`${className} rounded-md shadow-xs shrink-0`} aria-hidden="true">
        <rect width="36" height="8" y="0" fill="#FFFFFF" />
        <rect width="36" height="8" y="8" fill="#0B3D91" />
        <rect width="36" height="8" y="16" fill="#E5484D" />
        <rect width="35" height="23" x="0.5" y="0.5" rx="2" fill="none" stroke="#CBD5E1" strokeOpacity="0.6" />
      </svg>
    );
  }
  if (lang === 'en') {
    return (
      <svg viewBox="0 0 36 24" className={`${className} rounded-md shadow-xs shrink-0`} aria-hidden="true">
        <rect width="36" height="24" fill="#0A1F44" />
        <path d="M0 0L36 24M36 0L0 24" stroke="#FFFFFF" strokeWidth="4.5" />
        <path d="M0 0L36 24M36 0L0 24" stroke="#E5484D" strokeWidth="2" />
        <path d="M18 0V24M0 12H36" stroke="#FFFFFF" strokeWidth="7" />
        <path d="M18 0V24M0 12H36" stroke="#E5484D" strokeWidth="4" />
      </svg>
    );
  }
  if (lang === 'ar') {
    // Neutral Arabic language emblem flag (deep emerald with golden calligraphy arch & star)
    return (
      <svg viewBox="0 0 36 24" className={`${className} rounded-md shadow-xs shrink-0`} aria-hidden="true">
        <rect width="36" height="24" fill="#0F6E56" />
        <circle cx="17" cy="12" r="6.5" fill="#F4F1DE" />
        <circle cx="19.2" cy="12" r="5.3" fill="#0F6E56" />
        <polygon
          points="22,8.5 22.9,10.8 25.4,10.8 23.4,12.2 24.1,14.5 22,13.1 19.9,14.5 20.6,12.2 18.6,10.8 21.1,10.8"
          fill="#FF8A1F"
        />
      </svg>
    );
  }
  // French (fr)
  return (
    <svg viewBox="0 0 36 24" className={`${className} rounded-md shadow-xs shrink-0`} aria-hidden="true">
      <rect width="12" height="24" x="0" fill="#0B3D91" />
      <rect width="12" height="24" x="12" fill="#FFFFFF" />
      <rect width="12" height="24" x="24" fill="#E5484D" />
      <rect width="35" height="23" x="0.5" y="0.5" rx="2" fill="none" stroke="#CBD5E1" strokeOpacity="0.6" />
    </svg>
  );
};

export type MishaExpression = 'idle' | 'happy' | 'sad' | 'cheering';

export const MishaMascot: React.FC<{
  expression?: MishaExpression;
  size?: number;
  className?: string;
}> = ({ expression = 'idle', size = 140, className = '' }) => {
  const isCheering = expression === 'cheering';
  const isHappy = expression === 'happy' || expression === 'cheering';
  const isSad = expression === 'sad';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 180 180"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`select-none shrink-0 ${className}`}
      role="img"
      aria-label={`Misha the MADI mechanic (${expression})`}
    >
      {/* Subtle aura circle */}
      <circle
        cx="90"
        cy="94"
        r="72"
        fill={isSad ? '#FEE2E2' : isHappy ? '#DCFCE7' : '#DBEAFE'}
        fillOpacity="0.65"
      />

      {/* Body & Blue Mechanic Overalls */}
      <path
        d="M46 164 C46 130 62 118 90 118 C118 118 134 130 134 164 Z"
        fill="#FF8A1F"
      />
      {/* Overall bib and straps */}
      <path d="M62 122 L66 164 L114 164 L118 122 Z" fill="#0B3D91" />
      <rect x="64" y="116" width="10" height="26" rx="4" fill="#0A1F44" />
      <rect x="106" y="116" width="10" height="26" rx="4" fill="#0A1F44" />
      <circle cx="69" cy="134" r="3" fill="#FF8A1F" />
      <circle cx="111" cy="134" r="3" fill="#FF8A1F" />
      {/* Chest pocket with small gear badge */}
      <rect x="76" y="138" width="28" height="20" rx="5" fill="#0A1F44" />
      <circle cx="90" cy="148" r="5" fill="#F4F1DE" />

      {/* Neck */}
      <rect x="80" y="104" width="20" height="18" rx="6" fill="#FDE2C8" />

      {/* Ears */}
      <circle cx="48" cy="82" r="9" fill="#FDE2C8" />
      <circle cx="132" cy="82" r="9" fill="#FDE2C8" />

      {/* Head */}
      <rect x="52" y="46" width="76" height="66" rx="32" fill="#FFE8D1" stroke="#0A1F44" strokeWidth="2.5" />

      {/* Messy Dark-Blue Anime Hair */}
      <path
        d="M46 72 C44 48 64 36 90 36 C116 36 136 48 134 72 C126 60 118 56 108 64 C102 52 88 52 80 64 C70 54 56 58 46 72 Z"
        fill="#0A1F44"
      />
      {/* Spiky side tufts */}
      <path d="M46 68 L34 62 L48 56 Z" fill="#0A1F44" />
      <path d="M134 68 L146 62 L132 56 Z" fill="#0A1F44" />

      {/* Orange Mechanic Work Cap with Wheel Emblem */}
      <path
        d="M48 56 C50 28 70 18 90 18 C110 18 130 28 132 56 Z"
        fill="#FF8A1F"
        stroke="#0A1F44"
        strokeWidth="2.5"
      />
      {/* Cap Visor */}
      <path
        d="M44 54 Q90 44 138 54 Q142 60 130 62 Q90 52 48 62 Q40 60 44 54 Z"
        fill="#E06D06"
        stroke="#0A1F44"
        strokeWidth="2"
      />
      {/* Small Wheel Emblem on Cap */}
      <circle cx="90" cy="37" r="10" fill="#0A1F44" stroke="#F4F1DE" strokeWidth="2" />
      <circle cx="90" cy="37" r="4.5" fill="#FF8A1F" />

      {/* Expressive Anime Eyes */}
      {isSad ? (
        <>
          {/* Sad angled brows & teary eyes */}
          <path d="M62 68 L78 73" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" />
          <path d="M118 68 L102 73" stroke="#0A1F44" strokeWidth="3" strokeLinecap="round" />
          <ellipse cx="72" cy="82" rx="7" ry="8" fill="#0A1F44" />
          <ellipse cx="108" cy="82" rx="7" ry="8" fill="#0A1F44" />
          <circle cx="70" cy="79" r="2.8" fill="#FFFFFF" />
          <circle cx="106" cy="79" r="2.8" fill="#FFFFFF" />
          <circle cx="65" cy="90" r="3" fill="#38BDF8" />
        </>
      ) : isCheering ? (
        <>
          {/* Joyful curved arc eyes */}
          <path
            d="M63 82 Q72 70 81 82"
            stroke="#0A1F44"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          <path
            d="M99 82 Q108 70 117 82"
            stroke="#0A1F44"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
        </>
      ) : (
        <>
          {/* Big bright anime eyes */}
          <path d="M63 69 Q72 65 80 69" stroke="#0A1F44" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M100 69 Q108 65 117 69" stroke="#0A1F44" strokeWidth="2.5" strokeLinecap="round" />
          <ellipse cx="72" cy="81" rx="8" ry="9.5" fill="#0A1F44" />
          <ellipse cx="108" cy="81" rx="8" ry="9.5" fill="#0A1F44" />
          <circle cx="72" cy="82" r="5" fill="#0B3D91" />
          <circle cx="108" cy="82" r="5" fill="#0B3D91" />
          <circle cx="69" cy="77" r="3" fill="#FFFFFF" />
          <circle cx="105" cy="77" r="3" fill="#FFFFFF" />
          <circle cx="75" cy="85" r="1.5" fill="#FFFFFF" />
          <circle cx="111" cy="85" r="1.5" fill="#FFFFFF" />
        </>
      )}

      {/* Cheek blush */}
      <ellipse cx="59" cy="90" rx="5" ry="2.5" fill="#FF8A1F" fillOpacity="0.45" />
      <ellipse cx="121" cy="90" rx="5" ry="2.5" fill="#FF8A1F" fillOpacity="0.45" />

      {/* Mouth */}
      {isSad ? (
        <path
          d="M80 100 Q90 92 100 100"
          stroke="#0A1F44"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      ) : isHappy ? (
        <path
          d="M77 94 Q90 108 103 94 Z"
          fill="#E5484D"
          stroke="#0A1F44"
          strokeWidth="2.5"
          strokeLinejoin="round"
        />
      ) : (
        <path
          d="M80 96 Q90 103 100 96"
          stroke="#0A1F44"
          strokeWidth="3"
          strokeLinecap="round"
          fill="none"
        />
      )}

      {/* Mechanic Wrench held in right hand */}
      <g
        transform={
          isCheering
            ? 'translate(132, 74) rotate(-18)'
            : isSad
            ? 'translate(134, 110) rotate(25)'
            : 'translate(132, 92) rotate(0)'
        }
      >
        <rect x="6" y="16" width="10" height="38" rx="4" fill="#94A3B8" stroke="#0A1F44" strokeWidth="2.2" />
        <path
          d="M1 12 C1 3 21 3 21 12 C21 17 16 20 16 20 L14 11 L8 11 L6 20 C6 20 1 17 1 12 Z"
          fill="#CBD5E1"
          stroke="#0A1F44"
          strokeWidth="2.2"
        />
        {/* Hand holding wrench */}
        <circle cx="11" cy="34" r="8" fill="#FFE8D1" stroke="#0A1F44" strokeWidth="2.2" />
      </g>
    </svg>
  );
};

export const CarSprite: React.FC<{ className?: string }> = ({ className = 'w-14 h-9' }) => (
  <svg viewBox="0 0 80 48" fill="none" className={className} aria-hidden="true">
    {/* Shadow */}
    <ellipse cx="40" cy="43" rx="32" ry="4" fill="#0A1F44" fillOpacity="0.3" />
    {/* Car Body */}
    <path
      d="M10 30 L18 14 C20 10 25 8 32 8 H52 C58 8 62 11 66 17 L74 26 C76 28 77 31 77 34 V36 C77 38 75 40 72 40 H10 C7 40 5 38 5 35 V33 C5 31 7 30 10 30 Z"
      fill="#FF8A1F"
      stroke="#0A1F44"
      strokeWidth="2.5"
    />
    {/* Windows */}
    <path d="M23 13 H40 V24 H17 L23 13 Z" fill="#E0F2FE" stroke="#0A1F44" strokeWidth="2" />
    <path d="M44 13 H55 L62 24 H44 V13 Z" fill="#E0F2FE" stroke="#0A1F44" strokeWidth="2" />
    {/* Racing stripe */}
    <rect x="8" y="29" width="66" height="4" rx="2" fill="#F4F1DE" />
    {/* Headlight */}
    <rect x="71" y="27" width="5" height="5" rx="2" fill="#FEF08A" />
    {/* Wheels */}
    <circle cx="22" cy="38" r="8" fill="#2B2F3A" stroke="#0A1F44" strokeWidth="2.5" />
    <circle cx="22" cy="38" r="3.5" fill="#F4F1DE" />
    <circle cx="58" cy="38" r="8" fill="#2B2F3A" stroke="#0A1F44" strokeWidth="2.5" />
    <circle cx="58" cy="38" r="3.5" fill="#F4F1DE" />
  </svg>
);

export const HeroPanoramaIllustration: React.FC<{ scrollOffset?: number }> = ({
  scrollOffset = 0,
}) => {
  const carShift = Math.min(140, Math.max(0, scrollOffset * 0.25));

  return (
    <div className="relative w-full overflow-hidden border-0 shadow-none bg-transparent">
      <svg
        viewBox="0 0 800 420"
        className="w-full h-auto block select-none"
        role="img"
        aria-label="Illustration of MADI University campus building connected by a highway to the Moscow skyline with a driving car"
      >
        <defs>
          <linearGradient id="skyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0A1F44" />
            <stop offset="55%" stopColor="#0B3D91" />
            <stop offset="100%" stopColor="#FF8A1F" stopOpacity="0.35" />
          </linearGradient>
        </defs>

        <rect width="800" height="420" fill="url(#skyGrad)" />

        {/* Warm sunset glow behind Moscow skyline */}
        <circle cx="620" cy="195" r="110" fill="#FF8A1F" fillOpacity="0.22" />
        <circle cx="620" cy="195" r="70" fill="#F4F1DE" fillOpacity="0.18" />

        {/* Distant clouds / stars */}
        <circle cx="140" cy="52" r="2" fill="#F4F1DE" fillOpacity="0.7" />
        <circle cx="280" cy="38" r="2.5" fill="#F4F1DE" fillOpacity="0.5" />
        <circle cx="460" cy="48" r="2" fill="#F4F1DE" fillOpacity="0.7" />

        {/* RIGHT SIDE: Stylized Moscow Skyline (Moscow City glass towers + Tower + Onion Domes) */}
        <g transform={`translate(${-scrollOffset * 0.04}, 0)`}>
          {/* Moscow City Glass Towers */}
          <path d="M510 250 L518 105 L548 92 L548 250 Z" fill="#38BDF8" fillOpacity="0.35" stroke="#BAE6FD" strokeWidth="1.5" />
          <path d="M556 250 L556 80 L590 100 L590 250 Z" fill="#0284C7" fillOpacity="0.45" stroke="#BAE6FD" strokeWidth="1.5" />
          {/* Stylized Onion Domes */}
          <rect x="652" y="175" width="36" height="75" rx="4" fill="#F4F1DE" />
          <path
            d="M670 125 C650 145 648 166 670 175 C692 166 690 145 670 125 Z"
            fill="#FF8A1F"
          />
          <rect x="702" y="190" width="32" height="60" rx="4" fill="#F4F1DE" />
          <path
            d="M718 148 C702 164 700 182 718 190 C736 182 734 164 718 148 Z"
            fill="#2FBF71"
          />
        </g>

        {/* Ground Horizon */}
        <path d="M0 245 Q400 225 800 248 L800 420 L0 420 Z" fill="#132238" />

        {/* LEFT SIDE: Iconic MADI Campus Neoclassical Main Building */}
        <g transform="translate(28, 108)">
          {/* Main facade */}
          <rect x="0" y="54" width="210" height="105" rx="4" fill="#F4F1DE" stroke="#0A1F44" strokeWidth="2.5" />
          {/* Classical Triangular Pediment Roof */}
          <polygon points="-8,54 105,6 218,54" fill="#E2DBC7" stroke="#0A1F44" strokeWidth="2.5" />
          {/* MADI Rooftop Sign */}
          <rect x="65" y="24" width="80" height="22" rx="5" fill="#0B3D91" />
          <text
            x="105"
            y="39"
            textAnchor="middle"
            fill="#FFFFFF"
            fontFamily="'Baloo 2', sans-serif"
            fontWeight="800"
            fontSize="14"
            letterSpacing="2"
          >
            МАДИ
          </text>
          {/* 6 Neoclassical Columns */}
          {[22, 52, 82, 112, 142, 172].map((cx) => (
            <rect key={cx} x={cx} y="56" width="14" height="92" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="1.5" />
          ))}
          {/* Campus Entrance Arch */}
          <rect x="86" y="114" width="38" height="45" rx="8" fill="#0A1F44" />
        </g>

        {/* THE WINDING HIGHWAY FROM MADI TO MOSCOW */}
        <path
          d="M 130 268 C 250 365, 430 375, 580 295 C 655 255, 710 250, 780 248 L 800 325 C 710 330, 645 345, 560 375 C 390 425, 200 415, 65 290 Z"
          fill="#2B2F3A"
          stroke="#475569"
          strokeWidth="3"
        />
        {/* Dashed Center Lane Markings (--lane #F4F1DE) */}
        <path
          d="M 110 278 C 245 385, 435 390, 585 320 C 665 282, 725 278, 790 276"
          fill="none"
          stroke="#F4F1DE"
          strokeWidth="5"
          strokeDasharray="18 16"
          strokeLinecap="round"
        />

        {/* Animated Car Driving Along the Road */}
        <g transform={`translate(${260 + carShift}, ${330 - carShift * 0.18}) rotate(-8)`}>
          <rect x="6" y="16" width="76" height="22" rx="8" fill="#FF8A1F" stroke="#0A1F44" strokeWidth="2.5" />
          <path d="M18 16 L28 4 H58 L68 16 Z" fill="#0B3D91" stroke="#0A1F44" strokeWidth="2.5" />
          <path d="M30 7 H55 L62 16 H23 Z" fill="#BAE6FD" />
          <circle cx="24" cy="38" r="8" fill="#0A1F44" stroke="#F4F1DE" strokeWidth="2.5" />
          <circle cx="62" cy="38" r="8" fill="#0A1F44" stroke="#F4F1DE" strokeWidth="2.5" />
          {/* Headlight beam */}
          <polygon points="82,20 130,10 130,36 82,28" fill="#FEF08A" fillOpacity="0.35" />
        </g>
      </svg>
    </div>
  );
};

export const VocabIllustration: React.FC<{ iconKey?: string; className?: string }> = ({
  iconKey = 'car',
  className = 'w-16 h-16',
}) => {
  const badges: Record<string, { bg: string; emoji: string; label: string }> = {
    bus: { bg: '#DBEAFE', emoji: '🚌', label: 'Bus' },
    pharmacy: { bg: '#DCFCE7', emoji: '➕', label: 'Pharmacy' },
    window: { bg: '#E0F2FE', emoji: '🪟', label: 'Window' },
    bus_stop: { bg: '#FEF3C7', emoji: '🚏', label: 'Bus Stop' },
    cat: { bg: '#FFEDD5', emoji: '🐱', label: 'Cat' },
    map: { bg: '#E0E7FF', emoji: '🗺️', label: 'Map' },
    metro: { bg: '#DBEAFE', emoji: '🚇', label: 'Metro' },
    bridge: { bg: '#E2E8F0', emoji: '🌉', label: 'Bridge' },
    taxi: { bg: '#FEF9C3', emoji: '🚕', label: 'Taxi' },
    pin: { bg: '#FEE2E2', emoji: '📍', label: 'Location' },
    food: { bg: '#FFEDD5', emoji: '🍲', label: 'Food' },
    book: { bg: '#E0E7FF', emoji: '📘', label: 'Book' },
    traffic_light: { bg: '#FEF3C7', emoji: '🚦', label: 'Traffic Light' },
    student: { bg: '#DBEAFE', emoji: '🎓', label: 'Student' },
    plate: { bg: '#F1F5F9', emoji: '🔢', label: 'Number' },
    night: { bg: '#1E293B', emoji: '🌙', label: 'Night' },
    water: { bg: '#E0F2FE', emoji: '💧', label: 'Water' },
    door: { bg: '#F3E8FF', emoji: '🚪', label: 'Door' },
    wheel: { bg: '#FFEDD5', emoji: '🛞', label: 'Wheel' },
    flag: { bg: '#DBEAFE', emoji: '🇷🇺', label: 'Russia' },
    bread: { bg: '#FEF3C7', emoji: '🍞', label: 'Bread' },
    thumb_up: { bg: '#DCFCE7', emoji: '👍', label: 'Good' },
    road: { bg: '#E2E8F0', emoji: '🛣️', label: 'Road' },
    sun: { bg: '#FEF9C3', emoji: '☀️', label: 'Morning' },
    building: { bg: '#E0E7FF', emoji: '🏢', label: 'Building' },
    lamp: { bg: '#FEF9C3', emoji: '💡', label: 'Lamp' },
    lecture: { bg: '#DBEAFE', emoji: '🏛️', label: 'Lecture' },
    tree: { bg: '#DCFCE7', emoji: '🌳', label: 'Park' },
    passport: { bg: '#FEE2E2', emoji: '🛂', label: 'Passport' },
    wrench: { bg: '#E2E8F0', emoji: '🔧', label: 'Engineer' },
    campus: { bg: '#DBEAFE', emoji: '🏫', label: 'Institute' },
    sign: { bg: '#FEF3C7', emoji: '⚠️', label: 'Road Sign' },
    factory: { bg: '#E2E8F0', emoji: '🏭', label: 'Factory' },
    ticket: { bg: '#FFEDD5', emoji: '🎟️', label: 'Ticket' },
    fuel: { bg: '#FEE2E2', emoji: '⛽', label: 'Fuel' },
    garage: { bg: '#FFEDD5', emoji: '🛠️', label: 'Garage' },
    city: { bg: '#E0F2FE', emoji: '🌆', label: 'City' },
    square: { bg: '#FEE2E2', emoji: '🏛️', label: 'Square' },
    wiper: { bg: '#E0F2FE', emoji: '🪥', label: 'Wiper' },
    tea: { bg: '#FEF3C7', emoji: '☕', label: 'Tea' },
    clock: { bg: '#F1F5F9', emoji: '⌚', label: 'Clock' },
    headlight: { bg: '#FEF9C3', emoji: '🔦', label: 'Headlight' },
    atom: { bg: '#E0E7FF', emoji: '⚛️', label: 'Physics' },
    exam: { bg: '#DCFCE7', emoji: '📝', label: 'Exam' },
    screen: { bg: '#E0F2FE', emoji: '🖥️', label: 'Screen' },
    compass: { bg: '#FFEDD5', emoji: '🧭', label: 'South' },
    apple: { bg: '#FEE2E2', emoji: '🍎', label: 'Apple' },
    globe: { bg: '#DBEAFE', emoji: '🌍', label: 'Language' },
    tram: { bg: '#FEE2E2', emoji: '🚋', label: 'Tram' },
    museum: { bg: '#F3E8FF', emoji: '🏛️', label: 'Museum' },
    driver: { bg: '#DBEAFE', emoji: '🧑‍✈️', label: 'Driver' },
    plane: { bg: '#E0F2FE', emoji: '✈️', label: 'Airplane' },
    users: { bg: '#DCFCE7', emoji: '👥', label: 'We' },
    notebook: { bg: '#FEF3C7', emoji: '📓', label: 'Notebook' },
    gate: { bg: '#E2E8F0', emoji: '🚧', label: 'Entry' },
    wave: { bg: '#FFEDD5', emoji: '👋', label: 'Wave' },
    handshake: { bg: '#DBEAFE', emoji: '🤝', label: 'Formal Greeting' },
    heart: { bg: '#FEE2E2', emoji: '❤️', label: 'Thanks' },
    gift: { bg: '#FEF3C7', emoji: '✨', label: 'Please' },
    id_card: { bg: '#E0E7FF', emoji: '🪪', label: 'Name Badge' },
    chat: { bg: '#DCFCE7', emoji: '💬', label: 'Chat' },
  };

  const item = badges[iconKey] || { bg: '#DBEAFE', emoji: '🚗', label: 'Russian Word' };

  return (
    <div
      className={`${className} rounded-2xl flex items-center justify-center border border-slate-200/80 dark:border-slate-700 shadow-xs shrink-0 select-none`}
      style={{ backgroundColor: item.bg }}
      role="img"
      aria-label={item.label}
    >
      <span className="text-3xl leading-none">{item.emoji}</span>
    </div>
  );
};

export const DriverAvatarIcon: React.FC<{ avatarId: string; size?: number }> = ({
  avatarId,
  size = 48,
}) => {
  if (avatarId === 'blue-sedan') {
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <rect width="56" height="56" rx="18" fill="#0B3D91" />
        <path d="M12 34 L18 22 H38 L44 34 Z" fill="#FF8A1F" />
        <rect x="10" y="30" width="36" height="10" rx="4" fill="#F4F1DE" />
        <circle cx="18" cy="40" r="5" fill="#0A1F44" />
        <circle cx="38" cy="40" r="5" fill="#0A1F44" />
      </svg>
    );
  }
  if (avatarId === 'golden-wrench') {
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <rect width="56" height="56" rx="18" fill="#0A1F44" />
        <circle cx="28" cy="28" r="16" fill="#FF8A1F" />
        <path d="M22 22 L34 34 M34 22 L22 34" stroke="#0A1F44" strokeWidth="4" strokeLinecap="round" />
      </svg>
    );
  }
  if (avatarId === 'moscow-star') {
    return (
      <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
        <rect width="56" height="56" rx="18" fill="#2FBF71" />
        <polygon
          points="28,10 32.5,21.5 45,22 35,30 38.5,42 28,35 17.5,42 21,30 11,22 23.5,21.5"
          fill="#F4F1DE"
        />
      </svg>
    );
  }
  // Default: misha-cap
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" fill="none" aria-hidden="true">
      <rect width="56" height="56" rx="18" fill="#FF8A1F" />
      <circle cx="28" cy="28" r="15" fill="#0A1F44" stroke="#F4F1DE" strokeWidth="2.5" />
      <circle cx="28" cy="28" r="6" fill="#FF8A1F" />
    </svg>
  );
};
