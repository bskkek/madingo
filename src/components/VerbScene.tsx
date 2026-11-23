import React from 'react';

/* ============================================================================
   MADINGO — VERB SCENES (Verbs window)
   Parametric flat-illustration animation engine: one SVG character rig
   (shared face/body style, like the reference video) + a scene per action.
   Every verb maps to a scene id; scenes actually MOVE (CSS keyframes in
   index.css, bound inline with transform-box: fill-box).
   ========================================================================== */

export type VerbPalette = {
  skin: string;
  hair: string;
  hairStyle: 'grey' | 'ponytail' | 'curly';
  shirt: string;
  pants: string;
  shoes: string;
};

export const VERB_PALETTES: VerbPalette[] = [
  { skin: '#f2c89b', hair: '#d8d8d8', hairStyle: 'grey', shirt: '#5b7fa6', pants: '#6b4a2f', shoes: '#f5f5f5' },
  { skin: '#e8b98a', hair: '#2b2118', hairStyle: 'ponytail', shirt: '#6a9a6b', pants: '#3a3a3a', shoes: '#f5f5f5' },
  { skin: '#c98d5a', hair: '#1e1a17', hairStyle: 'curly', shirt: '#e08a3c', pants: '#3a5a7a', shoes: '#ffffff' },
];

const anim = (
  name: string,
  dur: string,
  origin = 'center',
  delay = '0s',
  timing = 'ease-in-out',
): React.CSSProperties => ({
  animation: `${name} ${dur} ${timing} ${delay} infinite`,
  transformBox: 'fill-box',
  transformOrigin: origin,
});

const once = (name: string, dur: string, origin = 'center'): React.CSSProperties => ({
  animation: `${name} ${dur} ease-in-out infinite`,
  transformBox: 'fill-box',
  transformOrigin: origin,
});

/* --- shared bits --------------------------------------------------------- */

const Ground: React.FC<{ y?: number; w?: number }> = ({ y = 272, w = 190 }) => (
  <ellipse cx={200} cy={y} rx={w / 2} ry={10} fill="rgba(0,0,0,0.22)" />
);

const Face: React.FC<{ p: VerbPalette; happy?: boolean; sad?: boolean }> = ({ p, happy, sad }) => (
  <g>
    <circle cx={0} cy={0} r={25} fill={p.skin} />
    {/* hair cap */}
    <path d="M -25 -2 A 25 25 0 0 1 25 -2 L 25 -8 A 25 25 0 0 0 -25 -8 Z" fill={p.hair} />
    {p.hairStyle === 'grey' && <circle cx={-23} cy={-14} r={7} fill={p.hair} />}
    {p.hairStyle === 'ponytail' && (
      <path d="M 22 -12 Q 40 4 34 34 Q 28 12 18 2 Z" fill={p.hair} />
    )}
    {p.hairStyle === 'curly' && (
      <>
        <circle cx={-14} cy={-20} r={8} fill={p.hair} />
        <circle cx={0} cy={-24} r={8} fill={p.hair} />
        <circle cx={14} cy={-20} r={8} fill={p.hair} />
      </>
    )}
    {/* eyes */}
    {happy ? (
      <>
        <path d="M -13 2 Q -9 -3 -5 2" stroke="#2b2118" strokeWidth={2.4} fill="none" strokeLinecap="round" />
        <path d="M 5 2 Q 9 -3 13 2" stroke="#2b2118" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      </>
    ) : (
      <>
        <circle cx={-9} cy={0} r={2.6} fill="#2b2118" />
        <circle cx={9} cy={0} r={2.6} fill="#2b2118" />
      </>
    )}
    {/* mouth */}
    {sad ? (
      <path d="M -8 14 Q 0 7 8 14" stroke="#2b2118" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    ) : happy ? (
      <path d="M -10 8 Q 0 20 10 8 Q 0 14 -10 8 Z" fill="#7a3b2e" />
    ) : (
      <path d="M -8 10 Q 0 17 8 10" stroke="#2b2118" strokeWidth={2.4} fill="none" strokeLinecap="round" />
    )}
  </g>
);

type LimbProps = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  color: string;
  width: number;
  style?: React.CSSProperties;
  transform?: string;
  /** Rendered inside the limb group (hand, held prop) so it follows the swing. */
  children?: React.ReactNode;
};

/** A thick round-capped limb line, optionally animated (CSS rotate about
    its own top-centre = the joint). Children (hand + held prop) rotate with it. */
const Limb: React.FC<LimbProps> = ({ x1, y1, x2, y2, color, width, style, transform, children }) => (
  <g style={style} transform={transform}>
    <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth={width} strokeLinecap="round" />
    {children}
  </g>
);

type PersonProps = {
  p: VerbPalette;
  x?: number;
  y?: number;
  s?: number;
  flip?: boolean;
  lean?: number;
  happy?: boolean;
  sad?: boolean;
  armLStyle?: React.CSSProperties;
  armRStyle?: React.CSSProperties;
  legLStyle?: React.CSSProperties;
  legRStyle?: React.CSSProperties;
  headStyle?: React.CSSProperties;
  bodyStyle?: React.CSSProperties;
  armLTransform?: string;
  armRTransform?: string;
  legLTransform?: string;
  legRTransform?: string;
  /** Held prop, drawn at the hand (inside the arm group so it swings with it). */
  handPropL?: React.ReactNode;
  handPropR?: React.ReactNode;
};

/** Standing person rig. Origin at the feet (ground), facing right.
    Head centre (0,88) r25 · torso y116..192 · hips y190 · feet y268. */
export const Person: React.FC<PersonProps> = ({
  p, x = 200, y = 0, s = 1, flip, lean = 0, happy, sad,
  armLStyle, armRStyle, legLStyle, legRStyle, headStyle, bodyStyle,
  armLTransform, armRTransform, legLTransform, legRTransform,
  handPropL, handPropR,
}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s}) rotate(${lean})`}>
    {/* legs (hip y190, feet y268) */}
    <Limb x1={-8} y1={190} x2={-14} y2={264} color={p.pants} width={13} style={legLStyle} transform={legLTransform} />
    <Limb x1={8} y1={190} x2={14} y2={264} color={p.pants} width={13} style={legRStyle} transform={legRTransform} />
    {/* shoes */}
    <ellipse cx={-16} cy={267} rx={11} ry={5.5} fill={p.shoes} />
    <ellipse cx={16} cy={267} rx={11} ry={5.5} fill={p.shoes} />
    {/* torso */}
    <g style={bodyStyle}>
      <rect x={-26} y={116} width={52} height={78} rx={15} fill={p.shirt} />
    </g>
    {/* arms (shoulder ±24,128 → hand ±30,180); hand + held prop live inside
        the arm group so they follow its swing */}
    <Limb x1={-24} y1={128} x2={-30} y2={180} color={p.shirt} width={11} style={armLStyle} transform={armLTransform}>
      <circle cx={-30} cy={182} r={6.5} fill={p.skin} />
      {handPropL}
    </Limb>
    <Limb x1={24} y1={128} x2={30} y2={180} color={p.shirt} width={11} style={armRStyle} transform={armRTransform}>
      <circle cx={30} cy={182} r={6.5} fill={p.skin} />
      {handPropR}
    </Limb>
    {/* neck + head — outer group positions the head, inner group animates it
        (a CSS animation transform would override the SVG translate otherwise) */}
    <rect x={-7} y={104} width={14} height={14} fill={p.skin} />
    <g transform="translate(0 88)">
      <g style={headStyle}>
        <Face p={p} happy={happy} sad={sad} />
      </g>
    </g>
  </g>
);

/** Seated person rig (chair/desk scenes). Origin at the seat. */
export const SeatedPerson: React.FC<PersonProps & { chair?: string }> = ({
  p, x = 200, y = 0, s = 1, flip, happy, sad, armLStyle, armRStyle, headStyle, chair = '#8a6a4a',
  handPropL, handPropR,
}) => (
  <g transform={`translate(${x} ${y}) scale(${flip ? -s : s} ${s})`}>
    {/* chair */}
    <rect x={-34} y={150} width={10} height={112} fill={chair} />
    <rect x={-34} y={150} width={66} height={10} rx={4} fill={chair} />
    {/* legs: thigh forward, shin down */}
    <line x1={-6} y1={158} x2={34} y2={158} stroke={p.pants} strokeWidth={13} strokeLinecap="round" />
    <line x1={34} y1={158} x2={34} y2={258} stroke={p.pants} strokeWidth={13} strokeLinecap="round" />
    <ellipse cx={36} cy={261} rx={11} ry={5.5} fill={p.shoes} />
    {/* torso */}
    <rect x={-26} y={84} width={52} height={78} rx={15} fill={p.shirt} />
    {/* arms; hand + held prop inside the arm group so they follow its swing */}
    <Limb x1={-24} y1={96} x2={-30} y2={146} color={p.shirt} width={11} style={armLStyle}>
      <circle cx={-30} cy={148} r={6.5} fill={p.skin} />
      {handPropL}
    </Limb>
    <Limb x1={24} y1={96} x2={30} y2={146} color={p.shirt} width={11} style={armRStyle}>
      <circle cx={30} cy={148} r={6.5} fill={p.skin} />
      {handPropR}
    </Limb>
    <rect x={-7} y={72} width={14} height={14} fill={p.skin} />
    <g transform="translate(0 56)">
      <g style={headStyle}>
        <Face p={p} happy={happy} sad={sad} />
      </g>
    </g>
  </g>
);

const Ball: React.FC<{ x: number; y: number; r?: number; style?: React.CSSProperties }> = ({ x, y, r = 16, style }) => (
  <g transform={`translate(${x} ${y})`}>
    <g style={style}>
      <circle r={r} fill="#f5f5f5" stroke="#2b2f3a" strokeWidth={2} />
      <polygon points={`0,-${r * 0.55} ${r * 0.5},-${r * 0.15} ${r * 0.3},${r * 0.5} -${r * 0.3},${r * 0.5} -${r * 0.5},-${r * 0.15}`} fill="#2b2f3a" />
    </g>
  </g>
);

const Heart: React.FC<{ x: number; y: number; s?: number; style?: React.CSSProperties; color?: string }> = ({
  x, y, s = 1, style, color = '#e5484d',
}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <g style={style}>
      <path
        d="M0 6 C -14 -8 -22 2 0 16 C 22 2 14 -8 0 6 Z"
        fill={color}
        transform="translate(0 -6)"
      />
    </g>
  </g>
);

/* --- scenes, part 1 ------------------------------------------------------ */

type SceneFn = (p: VerbPalette) => React.ReactElement;

const scenePush: SceneFn = (p) => (
  <g>
    <Ground />
    {/* vegetable cart */}
    <g style={anim('vBob', '0.9s')}>
      <line x1={252} y1={222} x2={206} y2={186} stroke="#8a6a4a" strokeWidth={6} strokeLinecap="round" />
      <line x1={252} y1={236} x2={206} y2={200} stroke="#8a6a4a" strokeWidth={6} strokeLinecap="round" />
      <rect x={246} y={206} width={104} height={46} rx={8} fill="#a97a4e" />
      <rect x={246} y={206} width={104} height={10} rx={5} fill="#8a6a4a" />
      {/* vegetables */}
      <ellipse cx={268} cy={200} rx={12} ry={8} fill="#e8802e" />
      <ellipse cx={292} cy={198} rx={13} ry={9} fill="#6a9a4b" />
      <ellipse cx={316} cy={200} rx={11} ry={8} fill="#c9a06a" />
      <circle cx={336} cy={200} r={7} fill="#e86a4e" />
      <g style={anim('vWheelSpin', '1.2s', 'center', '0s', 'linear')}>
        <circle cx={258} cy={256} r={17} fill="#3a3a3a" />
        <circle cx={258} cy={256} r={8} fill="#f5f5f5" />
        <line x1={258} y1={241} x2={258} y2={271} stroke="#f5f5f5" strokeWidth={2} />
        <line x1={243} y1={256} x2={273} y2={256} stroke="#f5f5f5" strokeWidth={2} />
      </g>
    </g>
    {/* old man pushing, leaning forward */}
    <g style={anim('vBob', '0.9s')}>
      <Person
        p={p} x={168} lean={10}
        legLStyle={anim('vLegSwingL', '0.9s', 'top center')}
        legRStyle={anim('vLegSwingR', '0.9s', 'top center')}
        armLTransform="rotate(-62 -24 128)"
        armRTransform="rotate(-72 24 128)"
      />
    </g>
  </g>
);

const sceneLaugh: SceneFn = (p) => (
  <g>
    <Ground />
    <g style={anim('vLaugh', '0.45s')}>
      <Person
        p={p} x={200} happy
        headStyle={anim('vHeadBob', '0.45s')}
        armLTransform="rotate(28 -24 128)"
        armRTransform="rotate(-28 24 128)"
      />
    </g>
    {/* laugh marks */}
    <text x={246} y={70} fontSize={26} fontWeight={800} fill="#ffd94a" style={anim('vTwinkle', '0.9s')}>ха</text>
    <text x={132} y={58} fontSize={22} fontWeight={800} fill="#ffd94a" style={anim('vTwinkle', '0.9s', 'center', '0.3s')}>ха</text>
  </g>
);

const sceneEat: SceneFn = (p) => (
  <g>
    <Ground />
    <SeatedPerson
      p={p} x={180}
      headStyle={anim('vChew', '0.5s')}
      armRStyle={anim('vEatArm', '1.4s', 'top center')}
      handPropR={(
        <g transform="translate(30 148)">
          <ellipse cx={0} cy={-14} rx={20} ry={9} fill="#e8a04c" />
          <rect x={-20} y={-8} width={40} height={7} rx={3} fill="#6a9a4b" />
          <rect x={-20} y={-2} width={40} height={8} rx={3} fill="#6b4226" />
          <ellipse cx={0} cy={8} rx={20} ry={8} fill="#e8a04c" />
        </g>
      )}
    />
  </g>
);

const sceneKick: SceneFn = (p) => (
  <g>
    <Ground />
    <Person
      p={p} x={150} lean={-6}
      legLStyle={anim('vLegSwingL', '0.8s', 'top center')}
      legRStyle={anim('vKick', '0.9s', 'top center')}
      armLStyle={anim('vArmSwingL', '0.8s', 'top center')}
      armRStyle={anim('vArmSwingR', '0.8s', 'top center')}
    />
    {/* ball flying off the foot */}
    <Ball x={196} y={248} style={anim('vBallFly', '0.9s', 'center', '0s', 'ease-out')} />
    <path d="M 210 210 Q 260 170 320 150" stroke="#ffffff" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" fill="none" opacity={0.5} />
  </g>
);

const sceneWalk: SceneFn = (p) => (
  <g>
    <Ground />
    <line x1={30} y1={272} x2={370} y2={272} stroke="#ffffff" strokeWidth={3} strokeDasharray="14 18" opacity={0.35} style={anim('vDashMove', '0.7s', 'center', '0s', 'linear')} />
    <g style={anim('vBob', '0.7s')}>
      <Person
        p={p} x={200}
        legLStyle={anim('vLegSwingL', '0.7s', 'top center')}
        legRStyle={anim('vLegSwingR', '0.7s', 'top center')}
        armLStyle={anim('vArmSwingL', '0.7s', 'top center')}
        armRStyle={anim('vArmSwingR', '0.7s', 'top center')}
      />
    </g>
  </g>
);

const sceneRun: SceneFn = (p) => (
  <g>
    <Ground />
    <line x1={30} y1={272} x2={370} y2={272} stroke="#ffffff" strokeWidth={3} strokeDasharray="14 18" opacity={0.35} style={anim('vDashMove', '0.4s', 'center', '0s', 'linear')} />
    {/* speed lines */}
    <line x1={96} y1={120} x2={140} y2={120} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.5} style={anim('vDashMove', '0.4s', 'center', '0s', 'linear')} />
    <line x1={80} y1={160} x2={126} y2={160} stroke="#ffffff" strokeWidth={4} strokeLinecap="round" opacity={0.4} style={anim('vDashMove', '0.4s', 'center', '0s', 'linear')} />
    <g style={anim('vBob', '0.45s')}>
      <Person
        p={p} x={200} lean={14}
        legLStyle={anim('vLegSwingL', '0.45s', 'top center')}
        legRStyle={anim('vLegSwingR', '0.45s', 'top center')}
        armLStyle={anim('vArmSwingL', '0.45s', 'top center')}
        armRStyle={anim('vArmSwingR', '0.45s', 'top center')}
      />
    </g>
  </g>
);

const sceneRead: SceneFn = (p) => (
  <g>
    <Ground />
    <SeatedPerson p={p} x={180} headStyle={{ transform: 'rotate(8deg)' }} />
    {/* open book in the hands */}
    <g transform="translate(212 132)">
      <path d="M -34 0 Q -17 -10 0 0 Q 17 -10 34 0 L 34 26 Q 17 16 0 26 Q -17 16 -34 26 Z" fill="#f5f0e0" stroke="#c9b896" strokeWidth={2} />
      <g style={anim('vPageFlip', '1.6s', 'left center')}>
        <path d="M 0 0 Q 17 -10 34 0 L 34 26 Q 17 16 0 26 Z" fill="#ffffff" stroke="#c9b896" strokeWidth={1.5} />
      </g>
      <line x1={0} y1={0} x2={0} y2={26} stroke="#c9b896" strokeWidth={2} />
    </g>
  </g>
);

const sceneWrite: SceneFn = (p) => (
  <g>
    <Ground />
    {/* desk */}
    <rect x={120} y={196} width={180} height={12} rx={5} fill="#8a6a4a" />
    <rect x={136} y={208} width={10} height={56} fill="#6b4a2f" />
    <rect x={274} y={208} width={10} height={56} fill="#6b4a2f" />
    {/* paper */}
    <rect x={196} y={164} width={86} height={34} rx={4} fill="#ffffff" />
    <line x1={206} y1={174} x2={272} y2={174} stroke="#8aa0b8" strokeWidth={2} strokeDasharray={120} style={anim('vDrawLine', '1.6s', 'center', '0s', 'linear')} />
    <line x1={206} y1={184} x2={258} y2={184} stroke="#8aa0b8" strokeWidth={2} strokeDasharray={120} style={anim('vDrawLine', '1.6s', 'center', '0.4s', 'linear')} />
    <SeatedPerson
      p={p} x={170}
      armRStyle={anim('vPenWrite', '0.9s', 'top center')}
      handPropR={(
        <g transform="translate(30 148)">
          <line x1={-4} y1={-10} x2={10} y2={18} stroke="#2b5a8a" strokeWidth={4} strokeLinecap="round" />
        </g>
      )}
    />
  </g>
);

const sceneDrink: SceneFn = (p) => (
  <g>
    <Ground />
    <Person
      p={p} x={200}
      headStyle={anim('vHeadBob', '1.4s')}
      armRStyle={anim('vEatArm', '1.6s', 'top center')}
      handPropR={(
        <g transform="translate(30 182)">
          <path d="M -10 -16 L -8 12 L 8 12 L 10 -16 Z" fill="#bfe3f0" opacity={0.9} />
          <rect x={-8} y={-6} width={16} height={16} rx={2} fill="#e8a04c" opacity={0.9} />
        </g>
      )}
    />
  </g>
);

const sceneSleep: SceneFn = (p) => (
  <g>
    <Ground />
    {/* bed */}
    <rect x={90} y={218} width={220} height={16} rx={6} fill="#8a6a4a" />
    <rect x={96} y={234} width={12} height={34} fill="#6b4a2f" />
    <rect x={292} y={234} width={12} height={34} fill="#6b4a2f" />
    <rect x={96} y={200} width={52} height={20} rx={9} fill="#f5f0e0" />
    {/* lying person: head on pillow, blanket over body */}
    <g style={anim('vBreathe', '2.4s', 'center')}>
      <path d="M 148 218 Q 200 196 300 212 L 300 218 L 148 218 Z" fill={p.shirt} />
    </g>
    <g transform="translate(132 192)">
      <Face p={p} />
    </g>
    {/* Zzz */}
    <text x={180} y={150} fontSize={26} fontWeight={800} fill="#cfe8ff" style={anim('vZzz', '2.4s')}>Z</text>
    <text x={206} y={128} fontSize={20} fontWeight={800} fill="#cfe8ff" style={anim('vZzz', '2.4s', 'center', '0.8s')}>Z</text>
    <text x={228} y={108} fontSize={15} fontWeight={800} fill="#cfe8ff" style={anim('vZzz', '2.4s', 'center', '1.6s')}>Z</text>
  </g>
);

/* --- scenes, part 2 ------------------------------------------------------ */

const sceneTalk: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={170} headStyle={anim('vHeadBob', '0.9s')} armRTransform="rotate(-30 24 128)" />
    {/* speech bubble with pulsing dots */}
    <g>
      <rect x={238} y={46} width={110} height={52} rx={16} fill="#ffffff" />
      <polygon points="238,86 252,86 238,108" fill="#ffffff" />
      <circle cx={266} cy={72} r={6} fill="#5b7fa6" style={anim('vTwinkle', '0.9s')} />
      <circle cx={290} cy={72} r={6} fill="#5b7fa6" style={anim('vTwinkle', '0.9s', 'center', '0.3s')} />
      <circle cx={314} cy={72} r={6} fill="#5b7fa6" style={anim('vTwinkle', '0.9s', 'center', '0.6s')} />
    </g>
  </g>
);

const sceneListen: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={190} armRTransform="rotate(-128 24 128)" headStyle={{ transform: 'rotate(-6deg)' }} />
    {/* sound waves travelling to the ear */}
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M ${300 + i * 16} 62 Q ${316 + i * 16} 88 ${300 + i * 16} 114`}
        stroke="#ffd94a" strokeWidth={4} fill="none" strokeLinecap="round"
        style={anim('vSoundWave', '1.2s', 'center', `${i * 0.25}s`)}
      />
    ))}
  </g>
);

const sceneSwim: SceneFn = (p) => (
  <g>
    {/* water */}
    <path d="M 40 210 Q 90 196 140 210 T 240 210 T 340 210" stroke="#7cc4e8" strokeWidth={5} fill="none" strokeLinecap="round" style={anim('vCloudDrift', '2s')} />
    <path d="M 60 238 Q 110 226 160 238 T 260 238 T 360 238" stroke="#7cc4e8" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.7} style={anim('vCloudDrift', '2s', 'center', '0.5s')} />
    {/* swimmer, horizontal */}
    <g style={anim('vFloatY', '1.6s')}>
      <ellipse cx={200} cy={196} rx={58} ry={20} fill={p.shirt} />
      <g transform="translate(262 190)">
        <Face p={p} />
      </g>
      {/* stroking arm */}
      <g style={anim('vStir', '1.2s', 'center', '0s', 'linear')}>
        <line x1={170} y1={196} x2={140} y2={176} stroke={p.skin} strokeWidth={10} strokeLinecap="round" />
      </g>
      <line x1={150} y1={200} x2={128} y2={222} stroke={p.pants} strokeWidth={11} strokeLinecap="round" style={anim('vLegSwingL', '0.8s', 'top center')} />
      <line x1={156} y1={204} x2={136} y2={228} stroke={p.pants} strokeWidth={11} strokeLinecap="round" style={anim('vLegSwingR', '0.8s', 'top center')} />
    </g>
    <Ground y={272} />
  </g>
);

const sceneFly: SceneFn = (p) => (
  <g>
    <g style={anim('vFloatY', '1.8s')}>
      {/* hummingbird, like the video */}
      <ellipse cx={200} cy={170} rx={52} ry={24} fill="#b07a45" />
      <ellipse cx={196} cy={180} rx={40} ry={14} fill="#f2e3c8" />
      <circle cx={248} cy={152} r={17} fill="#b07a45" />
      <polygon points="264,150 286,156 264,162" fill="#e8a04c" />
      <circle cx={253} cy={148} r={3} fill="#2b2118" />
      {/* flapping wing */}
      <g style={anim('vFlap', '0.35s', 'bottom center')}>
        <path d="M 196 158 Q 180 96 214 84 Q 222 120 206 158 Z" fill="#2e5a6a" />
      </g>
      <path d="M 152 178 L 128 196 M 154 186 L 134 206" stroke="#8a5a2e" strokeWidth={5} strokeLinecap="round" />
      <circle cx={160} cy={120} r={2.5} fill="#ffffff" style={anim('vTwinkle', '1s')} />
      <circle cx={240} cy={100} r={2} fill="#ffffff" style={anim('vTwinkle', '1s', 'center', '0.4s')} />
    </g>
    <Ground y={272} />
  </g>
);

const sceneDrive: SceneFn = (p) => (
  <g>
    <line x1={20} y1={262} x2={380} y2={262} stroke="#ffffff" strokeWidth={3} strokeDasharray="16 20" opacity={0.4} style={anim('vDashMove', '0.5s', 'center', '0s', 'linear')} />
    <g style={anim('vBob', '0.5s')}>
      {/* car body */}
      <rect x={110} y={196} width={190} height={44} rx={18} fill="#f08a3c" />
      <path d="M 150 198 L 168 162 L 238 162 L 256 198 Z" fill="#f08a3c" />
      <rect x={176} y={168} width={56} height={28} rx={6} fill="#bfe3f0" />
      {/* driver head in the window */}
      <circle cx={196} cy={180} r={11} fill={p.skin} />
      <path d="M 185 178 A 11 11 0 0 1 207 178 L 207 174 A 11 11 0 0 0 185 174 Z" fill={p.hair} />
      {/* wheels */}
      {[142, 268].map((cx) => (
        <g key={cx} style={anim('vWheelSpin', '0.6s', 'center', '0s', 'linear')}>
          <circle cx={cx} cy={242} r={17} fill="#2b2f3a" />
          <circle cx={cx} cy={242} r={8} fill="#d8d8d8" />
          <line x1={cx} y1={227} x2={cx} y2={257} stroke="#d8d8d8" strokeWidth={2} />
          <line x1={cx - 15} y1={242} x2={cx + 15} y2={242} stroke="#d8d8d8" strokeWidth={2} />
        </g>
      ))}
      <circle cx={292} cy={212} r={6} fill="#ffe9a8" />
    </g>
    <Ground y={272} />
  </g>
);

const sceneCook: SceneFn = (p) => (
  <g>
    <Ground />
    {/* stove + pot */}
    <rect x={130} y={216} width={140} height={14} rx={5} fill="#6b4a2f" />
    <rect x={140} y={230} width={120} height={34} rx={6} fill="#3a3a3a" />
    <path d="M 150 216 L 146 168 L 254 168 L 250 216 Z" fill="#4a4a55" />
    <ellipse cx={200} cy={168} rx={54} ry={8} fill="#5a5a66" />
    <ellipse cx={200} cy={170} rx={46} ry={6} fill="#e8a04c" opacity={0.85} />
    {/* steam */}
    {[0, 1, 2].map((i) => (
      <path
        key={i}
        d={`M ${176 + i * 24} 158 Q ${182 + i * 24} 138 ${176 + i * 24} 122`}
        stroke="#ffffff" strokeWidth={4} fill="none" strokeLinecap="round" opacity={0.6}
        style={anim('vSteam', '1.8s', 'center', `${i * 0.5}s`)}
      />
    ))}
    {/* stirring spoon */}
    <g style={anim('vStir', '1.4s', 'center', '0s', 'linear')}>
      <line x1={200} y1={168} x2={200} y2={120} stroke="#c9a06a" strokeWidth={5} strokeLinecap="round" />
      <ellipse cx={200} cy={114} rx={8} ry={10} fill="#c9a06a" />
    </g>
    <Person p={p} x={316} s={0.72} armLTransform="rotate(-30 -24 128)" />
  </g>
);

const sceneClean: SceneFn = (p) => (
  <g>
    <Ground />
    {/* bucket */}
    <path d="M 96 228 L 104 262 L 136 262 L 144 228 Z" fill="#5b7fa6" />
    <ellipse cx={120} cy={228} rx={24} ry={6} fill="#7cc4e8" />
    <Person
      p={p} x={220} lean={8}
      armRStyle={anim('vScrub', '0.5s', 'top center')}
      handPropR={(
        <g transform="translate(30 182)">
          <rect x={-18} y={-6} width={36} height={12} rx={4} fill="#c9a06a" />
          <line x1={-14} y1={6} x2={-14} y2={14} stroke="#2b5a8a" strokeWidth={3} />
          <line x1={0} y1={6} x2={0} y2={14} stroke="#2b5a8a" strokeWidth={3} />
          <line x1={14} y1={6} x2={14} y2={14} stroke="#2b5a8a" strokeWidth={3} />
        </g>
      )}
    />
    {/* sparkles on the clean floor */}
    <path d="M 300 256 l 0 12 M 294 262 l 12 0" stroke="#ffd94a" strokeWidth={3} strokeLinecap="round" style={anim('vTwinkle', '1s')} />
    <path d="M 330 250 l 0 10 M 325 255 l 10 0" stroke="#ffd94a" strokeWidth={3} strokeLinecap="round" style={anim('vTwinkle', '1s', 'center', '0.5s')} />
  </g>
);

const sceneWork: SceneFn = (p) => (
  <g>
    <Ground />
    {/* desk + laptop */}
    <rect x={120} y={196} width={180} height={12} rx={5} fill="#8a6a4a" />
    <rect x={136} y={208} width={10} height={56} fill="#6b4a2f" />
    <rect x={274} y={208} width={10} height={56} fill="#6b4a2f" />
    <rect x={188} y={140} width={76} height={54} rx={6} fill="#2b2f3a" />
    <rect x={194} y={146} width={64} height={42} rx={4} fill="#bfe3f0" style={anim('vTwinkle', '2s')} />
    <rect x={180} y={194} width={92} height={6} rx={3} fill="#3a3a3a" />
    <SeatedPerson
      p={p} x={170}
      armLStyle={anim('vType', '0.28s', 'top center')}
      armRStyle={anim('vType', '0.28s', 'top center', '0.14s')}
      headStyle={anim('vHeadBob', '1.2s')}
    />
  </g>
);

const sceneStudy: SceneFn = (p) => (
  <g>
    <Ground />
    {/* desk + lamp */}
    <rect x={120} y={196} width={180} height={12} rx={5} fill="#8a6a4a" />
    <rect x={136} y={208} width={10} height={56} fill="#6b4a2f" />
    <rect x={274} y={208} width={10} height={56} fill="#6b4a2f" />
    <line x1={288} y1={196} x2={288} y2={140} stroke="#3a3a3a" strokeWidth={5} strokeLinecap="round" />
    <path d="M 272 142 L 304 142 L 296 122 L 280 122 Z" fill="#ffd94a" style={anim('vTwinkle', '2.4s')} />
    <polygon points="276,142 300,142 312,196 264,196" fill="#ffd94a" opacity={0.18} />
    {/* books stack */}
    <rect x={196} y={180} width={56} height={8} rx={3} fill="#c65b4e" />
    <rect x={200} y={172} width={48} height={8} rx={3} fill="#5b7fa6" />
    <SeatedPerson p={p} x={170} headStyle={anim('vHeadBob', '1.6s')} />
    <g transform="translate(196 132)">
      <path d="M -30 0 Q -15 -9 0 0 Q 15 -9 30 0 L 30 24 Q 15 15 0 24 Q -15 15 -30 24 Z" fill="#f5f0e0" stroke="#c9b896" strokeWidth={2} />
      <line x1={0} y1={0} x2={0} y2={24} stroke="#c9b896" strokeWidth={2} />
    </g>
  </g>
);

const sceneLove: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={200} happy armLTransform="rotate(-52 -24 128)" armRTransform="rotate(52 24 128)" />
    <Heart x={200} y={150} s={1.6} style={anim('vHeartPulse', '0.9s')} />
    <Heart x={156} y={92} s={0.8} color="#ff8a9a" style={anim('vFloatY', '1.6s', 'center', '0.2s')} />
    <Heart x={246} y={76} s={0.6} color="#ff8a9a" style={anim('vFloatY', '1.6s', 'center', '0.7s')} />
  </g>
);

/* --- scenes, part 3 ------------------------------------------------------ */

const sceneCry: SceneFn = (p) => (
  <g>
    <Ground />
    <g style={anim('vLaugh', '1.1s')}>
      <Person p={p} x={200} sad headStyle={{ transform: 'rotate(10deg)' }} armLTransform="rotate(-20 -24 128)" />
    </g>
    {/* tears */}
    <ellipse cx={188} cy={104} rx={3.5} ry={6} fill="#7cc4e8" style={anim('vTear', '1s', 'center', '0s')} />
    <ellipse cx={212} cy={104} rx={3.5} ry={6} fill="#7cc4e8" style={anim('vTear', '1s', 'center', '0.4s')} />
    <ellipse cx={200} cy={118} rx={3} ry={5} fill="#7cc4e8" style={anim('vTear', '1s', 'center', '0.7s')} />
  </g>
);

const sceneDance: SceneFn = (p) => (
  <g>
    <Ground />
    <g style={anim('vBob', '0.5s')}>
      <Person
        p={p} x={200} happy
        legLStyle={anim('vLegSwingL', '0.5s', 'top center')}
        legRStyle={anim('vLegSwingR', '0.5s', 'top center')}
        armLStyle={anim('vDanceArm', '0.5s', 'top center')}
        armRStyle={anim('vDanceArm', '0.5s', 'top center', '0.25s')}
        headStyle={anim('vHeadBob', '0.5s')}
      />
    </g>
    <text x={128} y={86} fontSize={30} fill="#ffd94a" style={anim('vFloatY', '1.2s')}>♪</text>
    <text x={252} y={66} fontSize={24} fill="#ffd94a" style={anim('vFloatY', '1.2s', 'center', '0.4s')}>♫</text>
    <text x={282} y={120} fontSize={20} fill="#ffd94a" style={anim('vFloatY', '1.2s', 'center', '0.8s')}>♪</text>
  </g>
);

const sceneJump: SceneFn = (p) => (
  <g>
    <Ground />
    <g style={anim('vJump', '0.9s')}>
      <Person
        p={p} x={200} happy
        legLTransform="rotate(28 -8 190)"
        legRTransform="rotate(-28 8 190)"
        armLTransform="rotate(-150 -24 128)"
        armRTransform="rotate(150 24 128)"
      />
    </g>
    <path d="M 150 262 q 12 -8 24 0 M 226 262 q 12 -8 24 0" stroke="#ffffff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.5} />
  </g>
);

const sceneSit: SceneFn = (p) => (
  <g>
    <Ground />
    <g style={anim('vSway', '2.2s')}>
      <SeatedPerson p={p} x={190} />
    </g>
    {/* book on the lap */}
    <rect x={196} y={150} width={52} height={10} rx={3} fill="#c65b4e" />
  </g>
);

const sceneOpen: SceneFn = (p) => (
  <g>
    <Ground />
    {/* door frame + opening door with light */}
    <rect x={140} y={70} width={120} height={200} rx={8} fill="#6b4a2f" />
    <rect x={150} y={80} width={100} height={190} fill="#ffe9a8" />
    <g style={anim('vDoorSwing', '1.8s', 'left center')}>
      <rect x={150} y={80} width={100} height={190} fill="#8a6a4a" />
      <circle cx={238} cy={176} r={6} fill="#ffd94a" />
    </g>
    <polygon points="250,80 250,270 340,270 340,80" fill="#ffe9a8" opacity={0.25} />
    <Person p={p} x={316} s={0.8} armLTransform="rotate(-70 -24 128)" />
  </g>
);

const sceneBuy: SceneFn = (p) => (
  <g>
    <Ground />
    {/* shop awning */}
    <path d="M 60 84 L 340 84 L 340 104 L 60 104 Z" fill="#c65b4e" />
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <rect key={i} x={60 + i * 47} y={84} width={23} height={20} fill={i % 2 ? '#f5f0e0' : '#c65b4e'} />
    ))}
    <Person p={p} x={180} armRTransform="rotate(-40 24 128)" />
    {/* shopping bag */}
    <g transform="translate(222 196)">
      <path d="M -20 0 L -16 34 L 16 34 L 20 0 Z" fill="#5b7fa6" />
      <path d="M -10 0 Q -10 -14 0 -14 Q 10 -14 10 0" stroke="#3a3a3a" strokeWidth={3} fill="none" />
    </g>
    {/* coin dropping into the hand */}
    <circle cx={232} cy={150} r={9} fill="#ffd94a" stroke="#c9a227" strokeWidth={2} style={anim('vCoinDrop', '1.2s')} />
    <text x={228} y={154} fontSize={11} fontWeight={800} fill="#8a6d1b">₽</text>
  </g>
);

const sceneGive: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={130} armRTransform="rotate(-62 24 128)" />
    <Person p={VERB_PALETTES[1]} x={280} flip armRTransform="rotate(62 -24 128)" />
    {/* gift box passing between them */}
    <g style={anim('vCloudDrift', '1.6s')}>
      <rect x={188} y={158} width={34} height={28} rx={4} fill="#c65b4e" />
      <rect x={202} y={158} width={6} height={28} fill="#ffd94a" />
      <rect x={188} y={168} width={34} height={5} fill="#ffd94a" />
    </g>
  </g>
);

const sceneThink: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={170} headStyle={{ transform: 'rotate(-8deg)' }} armLTransform="rotate(-40 -24 128)" />
    {/* thought bubbles */}
    <circle cx={232} cy={96} r={6} fill="#ffffff" opacity={0.9} style={anim('vTwinkle', '1.4s')} />
    <circle cx={252} cy={76} r={9} fill="#ffffff" opacity={0.9} style={anim('vTwinkle', '1.4s', 'center', '0.4s')} />
    <g style={anim('vFloatY', '2s')}>
      <ellipse cx={296} cy={56} rx={34} ry={24} fill="#ffffff" />
      <text x={286} y={66} fontSize={28} fontWeight={800} fill="#5b7fa6">?</text>
    </g>
  </g>
);

const sceneLook: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={200} headStyle={anim('vSway', '2.4s')} armLTransform="rotate(-108 -24 128)" armRTransform="rotate(-108 24 128)" />
    {/* binoculars at the eyes */}
    <g transform="translate(0 88)">
      <circle cx={-10} cy={0} r={9} fill="#2b2f3a" />
      <circle cx={10} cy={0} r={9} fill="#2b2f3a" />
      <circle cx={-10} cy={0} r={5} fill="#bfe3f0" style={anim('vTwinkle', '1.6s')} />
      <circle cx={10} cy={0} r={5} fill="#bfe3f0" style={anim('vTwinkle', '1.6s', 'center', '0.5s')} />
    </g>
    <path d="M 240 60 L 300 30 M 246 84 L 316 58" stroke="#ffd94a" strokeWidth={3} strokeDasharray="2 8" strokeLinecap="round" opacity={0.6} />
  </g>
);

const sceneSing: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={190} happy headStyle={anim('vHeadBob', '0.8s')} armRTransform="rotate(-46 24 128)" />
    {/* microphone */}
    <g transform="translate(228 152)">
      <circle cx={0} cy={0} r={11} fill="#2b2f3a" />
      <line x1={0} y1={10} x2={0} y2={30} stroke="#2b2f3a" strokeWidth={5} strokeLinecap="round" />
    </g>
    <text x={252} y={100} fontSize={26} fill="#ffd94a" style={anim('vFloatY', '1.2s')}>♪</text>
    <text x={280} y={76} fontSize={20} fill="#ffd94a" style={anim('vFloatY', '1.2s', 'center', '0.5s')}>♫</text>
    <text x={140} y={80} fontSize={22} fill="#ffd94a" style={anim('vFloatY', '1.2s', 'center', '0.9s')}>♪</text>
  </g>
);

/* --- scenes, part 4 ------------------------------------------------------ */

const scenePlay: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={170} happy headStyle={anim('vHeadBob', '0.7s')} armRTransform="rotate(-30 24 128)" />
    {/* bouncing ball */}
    <Ball x={268} y={236} r={17} style={anim('vJump', '0.7s', 'center', '0s', 'ease-in')} />
    <ellipse cx={268} cy={270} rx={16} ry={4} fill="rgba(0,0,0,0.25)" style={anim('vHeartPulse', '0.7s', 'center', '0s', 'ease-in')} />
  </g>
);

const sceneWash: SceneFn = (p) => (
  <g>
    <Ground />
    {/* tap */}
    <rect x={176} y={60} width={48} height={12} rx={5} fill="#8a8a92" />
    <path d="M 216 66 L 216 92 L 232 92" stroke="#8a8a92" strokeWidth={10} fill="none" strokeLinecap="round" />
    {/* water drops */}
    {[0, 1, 2].map((i) => (
      <ellipse key={i} cx={226 + (i - 1) * 8} cy={112} rx={4} ry={7} fill="#7cc4e8" style={anim('vRain', '0.9s', 'center', `${i * 0.3}s`)} />
    ))}
    {/* hands under the tap */}
    <g transform="translate(196 168)">
      <ellipse cx={0} cy={0} rx={34} ry={12} fill={p.skin} />
      <ellipse cx={0} cy={16} rx={30} ry={11} fill={p.skin} opacity={0.9} />
    </g>
    {/* soap bubbles */}
    <circle cx={150} cy={120} r={8} fill="#bfe3f0" opacity={0.8} style={anim('vFloatY', '1.8s')} />
    <circle cx={262} cy={100} r={6} fill="#bfe3f0" opacity={0.8} style={anim('vFloatY', '1.8s', 'center', '0.6s')} />
    <circle cx={286} cy={140} r={9} fill="#bfe3f0" opacity={0.7} style={anim('vFloatY', '1.8s', 'center', '1.1s')} />
  </g>
);

const sceneBuild: SceneFn = (p) => (
  <g>
    <Ground />
    {/* wooden plank + nail */}
    <rect x={228} y={252} width={120} height={14} rx={4} fill="#c9a06a" />
    <line x1={288} y1={252} x2={288} y2={234} stroke="#8a8a92" strokeWidth={4} strokeLinecap="round" />
    <circle cx={288} cy={232} r={5} fill="#8a8a92" />
    <Person
      p={p} x={170}
      armRStyle={anim('vHammer', '0.7s', 'top center')}
      handPropR={(
        <g transform="translate(30 182)">
          <line x1={0} y1={0} x2={16} y2={-26} stroke="#8a6a4a" strokeWidth={5} strokeLinecap="round" />
          <rect x={6} y={-34} width={24} height={12} rx={3} fill="#5a5a66" />
        </g>
      )}
    />
  </g>
);

const sceneDraw: SceneFn = (p) => (
  <g>
    <Ground />
    {/* paper on an easel */}
    <line x1={150} y1={268} x2={170} y2={120} stroke="#8a6a4a" strokeWidth={6} strokeLinecap="round" />
    <line x1={250} y1={268} x2={230} y2={120} stroke="#8a6a4a" strokeWidth={6} strokeLinecap="round" />
    <rect x={130} y={86} width={140} height={100} rx={6} fill="#ffffff" />
    {/* star drawing itself */}
    <path
      d="M 200 104 L 208 124 L 230 124 L 212 138 L 218 160 L 200 146 L 182 160 L 188 138 L 170 124 L 192 124 Z"
      fill="none" stroke="#e8a04c" strokeWidth={4} strokeLinejoin="round"
      strokeDasharray={120} style={anim('vDrawLine', '2s', 'center', '0s', 'linear')}
    />
    <Person p={p} x={310} s={0.8} armLTransform="rotate(-46 -24 128)" />
    {/* pencil */}
    <g style={anim('vPenWrite', '0.9s', 'top center')}>
      <line x1={272} y1={170} x2={286} y2={196} stroke="#e8a04c" strokeWidth={4} strokeLinecap="round" />
    </g>
  </g>
);

const scenePhone: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={190} armRTransform="rotate(-128 24 128)" headStyle={{ transform: 'rotate(-6deg)' }} />
    {/* phone at the ear */}
    <rect x={212} y={62} width={16} height={28} rx={5} fill="#2b2f3a" transform="rotate(-12 220 76)" />
    {[0, 1].map((i) => (
      <path
        key={i}
        d={`M ${252 + i * 14} 62 Q ${266 + i * 14} 78 ${252 + i * 14} 94`}
        stroke="#ffd94a" strokeWidth={4} fill="none" strokeLinecap="round"
        style={anim('vSoundWave', '1.1s', 'center', `${i * 0.3}s`)}
      />
    ))}
  </g>
);

const sceneWait: SceneFn = (p) => (
  <g>
    <Ground />
    <Person
      p={p} x={160}
      legLStyle={anim('vLegSwingL', '0.6s', 'top center')}
      armLStyle={anim('vArmSwingL', '0.6s', 'top center')}
    />
    {/* big clock */}
    <g transform="translate(292 130)">
      <circle r={52} fill="#f5f0e0" stroke="#2b2f3a" strokeWidth={5} />
      <circle r={4} fill="#2b2f3a" />
      <line x1={0} y1={0} x2={0} y2={-34} stroke="#2b2f3a" strokeWidth={4} strokeLinecap="round" style={{ ...anim('vClockSpin', '6s', 'center', '0s', 'linear'), transformOrigin: '50% 100%' }} />
      <line x1={0} y1={0} x2={22} y2={0} stroke="#2b2f3a" strokeWidth={4} strokeLinecap="round" />
      <circle cx={0} cy={-44} r={3} fill="#c65b4e" />
      <circle cx={44} cy={0} r={3} fill="#c65b4e" />
      <circle cx={0} cy={44} r={3} fill="#c65b4e" />
      <circle cx={-44} cy={0} r={3} fill="#c65b4e" />
    </g>
  </g>
);

const sceneStand: SceneFn = (p) => (
  <g>
    <Ground />
    <g style={anim('vSway', '2.6s')}>
      <Person p={p} x={200} />
    </g>
    <circle cx={140} cy={120} r={3} fill="#ffd94a" style={anim('vTwinkle', '1.6s')} />
    <circle cx={268} cy={100} r={3} fill="#ffd94a" style={anim('vTwinkle', '1.6s', 'center', '0.8s')} />
  </g>
);

const sceneFall: SceneFn = (p) => (
  <g>
    <Ground />
    <g transform="rotate(38 200 200)">
      <g style={anim('vRock', '1.2s')}>
        <Person
          p={p} x={200}
          armLTransform="rotate(-140 -24 128)"
          armRTransform="rotate(140 24 128)"
          legLTransform="rotate(40 -8 190)"
          legRTransform="rotate(-20 8 190)"
        />
      </g>
    </g>
    {/* dizzy stars */}
    <text x={238} y={66} fontSize={22} fill="#ffd94a" style={anim('vTwinkle', '0.8s')}>✦</text>
    <text x={268} y={96} fontSize={16} fill="#ffd94a" style={anim('vTwinkle', '0.8s', 'center', '0.3s')}>✦</text>
    <text x={218} y={44} fontSize={14} fill="#ffd94a" style={anim('vTwinkle', '0.8s', 'center', '0.6s')}>✦</text>
  </g>
);

const sceneCarry: SceneFn = (p) => (
  <g>
    <Ground />
    <line x1={30} y1={272} x2={370} y2={272} stroke="#ffffff" strokeWidth={3} strokeDasharray="14 18" opacity={0.35} style={anim('vDashMove', '0.7s', 'center', '0s', 'linear')} />
    <g style={anim('vBob', '0.7s')}>
      <Person
        p={p} x={180}
        legLStyle={anim('vLegSwingL', '0.7s', 'top center')}
        legRStyle={anim('vLegSwingR', '0.7s', 'top center')}
        armLTransform="rotate(-62 -24 128)"
        armRTransform="rotate(-62 24 128)"
      />
    </g>
    {/* box in front */}
    <g style={anim('vBob', '0.7s')}>
      <rect x={212} y={158} width={52} height={40} rx={5} fill="#c9a06a" />
      <rect x={212} y={172} width={52} height={5} fill="#8a6a4a" />
    </g>
  </g>
);

const sceneCatch: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={180} armLTransform="rotate(-46 -24 128)" armRTransform="rotate(-46 24 128)" headStyle={anim('vHeadBob', '0.8s')} />
    {/* ball arcing into the hands (reverse flight) */}
    <Ball x={238} y={160} style={{ animation: 'vBallFly 1s ease-out infinite reverse', transformBox: 'fill-box', transformOrigin: 'center' }} />
    <path d="M 320 60 Q 280 100 244 150" stroke="#ffffff" strokeWidth={3} strokeDasharray="2 10" strokeLinecap="round" fill="none" opacity={0.5} />
  </g>
);

/* --- scenes, part 5 ------------------------------------------------------ */

const sceneThrow: SceneFn = (p) => (
  <g>
    <Ground />
    <Person
      p={p} x={160} lean={-8}
      armRStyle={anim('vKick', '0.9s', 'top center')}
      armLStyle={anim('vArmSwingL', '0.9s', 'top center')}
    />
    <Ball x={200} y={140} style={anim('vBallFly', '0.9s', 'center', '0s', 'ease-out')} />
  </g>
);

const sceneCut: SceneFn = (p) => (
  <g>
    <Ground />
    {/* paper */}
    <rect x={120} y={200} width={160} height={56} rx={4} fill="#ffffff" />
    <line x1={120} y1={228} x2={200} y2={228} stroke="#c65b4e" strokeWidth={3} strokeDasharray="6 4" />
    {/* scissors */}
    <g transform="translate(200 190)">
      <circle r={8} fill="#5b7fa6" />
      <g style={anim('vWave', '0.6s', 'left center')}>
        <line x1={0} y1={0} x2={64} y2={-18} stroke="#8a8a92" strokeWidth={5} strokeLinecap="round" />
      </g>
      <g style={{ animation: 'vWave 0.6s ease-in-out infinite reverse', transformBox: 'fill-box', transformOrigin: 'left center' }}>
        <line x1={0} y1={0} x2={64} y2={18} stroke="#8a8a92" strokeWidth={5} strokeLinecap="round" />
      </g>
    </g>
    <Person p={p} x={316} s={0.7} />
  </g>
);

const sceneHelp: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={128} armRTransform="rotate(-58 24 128)" />
    <Person p={VERB_PALETTES[1]} x={272} flip armRTransform="rotate(58 -24 128)" />
    {/* box lifted together */}
    <g style={anim('vBob', '0.8s')}>
      <rect x={176} y={150} width={48} height={36} rx={5} fill="#c9a06a" />
      <rect x={176} y={163} width={48} height={5} fill="#8a6a4a" />
    </g>
  </g>
);

const sceneMeet: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={140} armRTransform="rotate(-58 24 128)" />
    <Person p={VERB_PALETTES[2]} x={260} flip armRTransform="rotate(58 -24 128)" />
    {/* handshake sparkle */}
    <text x={192} y={150} fontSize={22} fill="#ffd94a" style={anim('vTwinkle', '0.7s')}>✦</text>
    <text x={206} y={168} fontSize={14} fill="#ffd94a" style={anim('vTwinkle', '0.7s', 'center', '0.3s')}>✦</text>
  </g>
);

const sceneTravel: SceneFn = (p) => (
  <g>
    <Ground />
    <line x1={30} y1={272} x2={370} y2={272} stroke="#ffffff" strokeWidth={3} strokeDasharray="14 18" opacity={0.35} style={anim('vDashMove', '0.7s', 'center', '0s', 'linear')} />
    <g style={anim('vBob', '0.7s')}>
      <Person
        p={p} x={170}
        legLStyle={anim('vLegSwingL', '0.7s', 'top center')}
        legRStyle={anim('vLegSwingR', '0.7s', 'top center')}
        armRStyle={anim('vArmSwingR', '0.7s', 'top center')}
      />
    </g>
    {/* rolling suitcase */}
    <g style={anim('vBob', '0.7s')}>
      <rect x={252} y={212} width={52} height={46} rx={8} fill="#c65b4e" />
      <rect x={252} y={230} width={52} height={6} fill="#8a2f35" />
      <line x1={262} y1={212} x2={252} y2={192} stroke="#3a3a3a" strokeWidth={4} strokeLinecap="round" />
      <circle cx={260} cy={262} r={7} fill="#2b2f3a" style={anim('vWheelSpin', '0.7s', 'center', '0s', 'linear')} />
      <circle cx={296} cy={262} r={7} fill="#2b2f3a" style={anim('vWheelSpin', '0.7s', 'center', '0s', 'linear')} />
    </g>
  </g>
);

const sceneRest: SceneFn = (p) => (
  <g>
    <Ground />
    {/* armchair */}
    <rect x={120} y={150} width={150} height={112} rx={20} fill="#7a6aa8" />
    <rect x={108} y={180} width={24} height={82} rx={10} fill="#6a5a98" />
    <rect x={258} y={180} width={24} height={82} rx={10} fill="#6a5a98" />
    <SeatedPerson p={p} x={195} headStyle={anim('vHeadBob', '2.2s')} />
    {/* tea on a side table */}
    <rect x={300} y={216} width={52} height={10} rx={4} fill="#8a6a4a" />
    <rect x={318} y={226} width={8} height={36} fill="#6b4a2f" />
    <path d="M 314 216 L 314 200 L 338 200 L 338 216 Z" fill="#f5f0e0" />
    <path d="M 322 196 Q 326 186 322 176" stroke="#ffffff" strokeWidth={3} fill="none" strokeLinecap="round" opacity={0.7} style={anim('vSteam', '1.8s')} />
  </g>
);

const sceneDress: SceneFn = (p) => (
  <g>
    <Ground />
    {/* shirt on a hanger, swaying */}
    <g style={anim('vSway', '2s')}>
      <path d="M 200 76 L 200 64" stroke="#8a8a92" strokeWidth={4} strokeLinecap="round" />
      <path d="M 182 92 Q 200 78 218 92 L 232 104 L 224 118 L 216 110 L 216 152 L 184 152 L 184 110 L 176 118 L 168 104 Z" fill="#e08a3c" />
    </g>
    <Person p={p} x={150} armRStyle={anim('vWave', '1.4s', 'top center')} />
  </g>
);

const sceneSmile: SceneFn = (p) => (
  <g>
    <Ground />
    <g transform="translate(200 168) scale(2.1)">
      <circle r={25} fill={p.skin} />
      <path d="M -25 -2 A 25 25 0 0 1 25 -2 L 25 -8 A 25 25 0 0 0 -25 -8 Z" fill={p.hair} />
      <path d="M -13 2 Q -9 -3 -5 2" stroke="#2b2118" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <path d="M 5 2 Q 9 -3 13 2" stroke="#2b2118" strokeWidth={2.4} fill="none" strokeLinecap="round" />
      <circle cx={-15} cy={9} r={4} fill="#ff9a9a" opacity={0.8} style={anim('vTwinkle', '1.6s')} />
      <circle cx={15} cy={9} r={4} fill="#ff9a9a" opacity={0.8} style={anim('vTwinkle', '1.6s', 'center', '0.5s')} />
      <path
        d="M -10 8 Q 0 20 10 8"
        stroke="#2b2118" strokeWidth={2.6} fill="none" strokeLinecap="round"
        strokeDasharray={40} style={anim('vDrawLine', '1.4s', 'center', '0s', 'ease-in-out')}
      />
    </g>
  </g>
);

const sceneWant: SceneFn = (p) => (
  <g>
    <Ground />
    <Person p={p} x={200} headStyle={{ transform: 'rotate(-10deg)' }} armRTransform="rotate(-152 24 128)" />
    <text x={238} y={52} fontSize={34} fill="#ffd94a" style={anim('vTwinkle', '1s')}>★</text>
    <text x={150} y={80} fontSize={18} fill="#ffd94a" style={anim('vTwinkle', '1s', 'center', '0.5s')}>★</text>
  </g>
);

const sceneLive: SceneFn = (p) => (
  <g>
    <Ground />
    {/* sun */}
    <g style={anim('vTwinkle', '2.4s')}>
      <circle cx={330} cy={66} r={22} fill="#ffd94a" />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
        <line
          key={a} x1={330} y1={66} x2={330 + 32 * Math.cos((a * Math.PI) / 180)} y2={66 + 32 * Math.sin((a * Math.PI) / 180)}
          stroke="#ffd94a" strokeWidth={4} strokeLinecap="round"
        />
      ))}
    </g>
    {/* house */}
    <rect x={110} y={160} width={120} height={102} fill="#e8a04c" />
    <polygon points="100,164 170,112 240,164" fill="#c65b4e" />
    <rect x={158} y={206} width={26} height={56} rx={4} fill="#6b4a2f" />
    <rect x={126} y={180} width={24} height={24} fill="#bfe3f0" />
    <rect x={200} y={180} width={24} height={24} fill="#bfe3f0" />
    {/* tree */}
    <g style={anim('vSway', '2.4s')}>
      <rect x={272} y={206} width={12} height={56} fill="#6b4a2f" />
      <circle cx={278} cy={186} r={30} fill="#6a9a4b" />
    </g>
    <Person p={p} x={176} s={0.62} />
  </g>
);

/* --- registry: every scene id used in the data --------------------------- */

const SCENES: Record<string, SceneFn> = {
  push: scenePush, laugh: sceneLaugh, eat: sceneEat, kick: sceneKick, walk: sceneWalk,
  run: sceneRun, read: sceneRead, write: sceneWrite, drink: sceneDrink, sleep: sceneSleep,
  talk: sceneTalk, listen: sceneListen, swim: sceneSwim, fly: sceneFly, drive: sceneDrive,
  cook: sceneCook, clean: sceneClean, work: sceneWork, study: sceneStudy, love: sceneLove,
  cry: sceneCry, dance: sceneDance, jump: sceneJump, sit: sceneSit, open: sceneOpen,
  buy: sceneBuy, give: sceneGive, think: sceneThink, look: sceneLook, sing: sceneSing,
  play: scenePlay, wash: sceneWash, build: sceneBuild, draw: sceneDraw, phone: scenePhone,
  wait: sceneWait, stand: sceneStand, fall: sceneFall, carry: sceneCarry, catch: sceneCatch,
  throw: sceneThrow, cut: sceneCut, help: sceneHelp, meet: sceneMeet, travel: sceneTravel,
  rest: sceneRest, dress: sceneDress, smile: sceneSmile, want: sceneWant, live: sceneLive,
  /* close aliases (same action family, different verb) */
  hear: sceneListen, learn: sceneStudy, remember: sceneThink, find: sceneLook,
  ask: sceneTalk, answer: sceneTalk, call: scenePhone, shout: sceneTalk, start: sceneRun,
};

export const VERB_SCENE_IDS = Object.keys(SCENES);

/** The animated simulation for one verb. `variant` picks the character palette. */
export const VerbScene: React.FC<{ scene: string; variant?: number; className?: string }> = ({
  scene, variant = 0, className,
}) => {
  const p = VERB_PALETTES[((variant % 3) + 3) % 3];
  const fn = SCENES[scene] ?? SCENES.stand;
  return (
    <svg viewBox="0 0 400 300" className={className} role="img" aria-label={scene}>
      {fn(p)}
    </svg>
  );
};
