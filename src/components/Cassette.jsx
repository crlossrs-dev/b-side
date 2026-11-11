import { useEffect, useRef } from 'react';

// Medidas en unidades del SVG (4 unidades = 1 mm de un casete real de 100 × 63,5 mm)
const HUB = 44;        // radio de la bobina vacía
const FULL = 96;       // radio de la bobina con toda la cinta
const LEFT_X = 115;
const RIGHT_X = 285;
const REEL_Y = 122;
const TAPE_SPEED = 9000; // la cinta avanza siempre igual; cada bobina gira según lo llena que esté

function Hub({ cx, innerRef }) {
  return (
    <g ref={innerRef}>
      <circle cx={cx} cy={REEL_Y} r="19" fill="#f3f2ee" />
      <circle cx={cx} cy={REEL_Y} r="13" fill="#141414" />
      {[0, 60, 120, 180, 240, 300].map((deg) => (
        <rect key={deg} x={cx - 2.2} y={REEL_Y - 14} width="4.4" height="6.5" rx="1" fill="#f3f2ee"
          transform={`rotate(${deg} ${cx} ${REEL_Y})`} />
      ))}
    </g>
  );
}

function Screw({ x, y }) {
  return (
    <g>
      <circle cx={x} cy={y} r="5.5" fill="url(#cs-screw)" stroke="#000" strokeOpacity=".35" strokeWidth=".8" />
      <path d={`M${x - 3} ${y - 3}L${x + 3} ${y + 3}M${x + 3} ${y - 3}L${x - 3} ${y + 3}`}
        stroke="#000" strokeOpacity=".55" strokeWidth="1.3" strokeLinecap="round" />
    </g>
  );
}

/**
 * Casete en SVG con proporciones reales y marcas de uso: plástico rozado,
 * pegatina amarillenta con una esquina levantada y cristal rayado.
 * - playing: las bobinas giran; la que tiene menos cinta gira más rápido, como en uno de verdad.
 * - rewinding: las bobinas giran deprisa hacia atrás mientras suena el rebobinado.
 * - progress (0 a 1): la cinta pasa de la bobina izquierda a la derecha.
 * - trackKey: al cambiar de canción, la carcasa da un pequeño golpe de tecla.
 */
export default function Cassette({ title, side = 'A', color, playing, rewinding, progress = 0, trackKey }) {
  // La cantidad de cinta es fija: lo que pierde una bobina (en superficie) lo gana la otra
  const tape = FULL * FULL - HUB * HUB;
  const left = Math.sqrt(HUB * HUB + (1 - progress) * tape);
  const right = Math.sqrt(HUB * HUB + progress * tape);

  const svgRef = useRef(null);
  const leftRef = useRef(null);
  const rightRef = useRef(null);
  const radii = useRef({ left, right });
  const angles = useRef({ left: 0, right: 0 });

  useEffect(() => { radii.current = { left, right }; }, [left, right]);

  useEffect(() => {
    if (!playing && !rewinding) return undefined;
    const speed = rewinding ? -8 : 1;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    let frame;
    let last = performance.now();
    const tick = (now) => {
      const dt = Math.min(now - last, 100) / 1000;
      last = now;
      angles.current.left -= (TAPE_SPEED / radii.current.left) * dt * speed;
      angles.current.right -= (TAPE_SPEED / radii.current.right) * dt * speed;
      leftRef.current?.setAttribute('transform', `rotate(${angles.current.left} ${LEFT_X} ${REEL_Y})`);
      rightRef.current?.setAttribute('transform', `rotate(${angles.current.right} ${RIGHT_X} ${REEL_Y})`);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, rewinding]);

  useEffect(() => {
    if (trackKey == null) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    svgRef.current?.animate?.(
      [{ transform: 'translateY(5px)' }, { transform: 'translateY(-1px)', offset: 0.6 }, { transform: 'none' }],
      { duration: 320, easing: 'ease-out' },
    );
  }, [trackKey]);

  return (
    <svg
      ref={svgRef}
      className="cassette"
      style={{ '--shell': color }}
      viewBox="0 0 400 254"
      role="img"
      aria-label={`Casete «${title || 'sin título'}», cara ${side}${playing ? ', sonando' : ''}`}
    >
      <defs>
        <linearGradient id="cs-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".28" />
          <stop offset=".12" stopColor="#fff" stopOpacity="0" />
          <stop offset=".8" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity=".28" />
        </linearGradient>
        <linearGradient id="cs-glass" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".3" />
          <stop offset=".35" stopColor="#fff" stopOpacity=".04" />
          <stop offset="1" stopColor="#fff" stopOpacity=".12" />
        </linearGradient>
        <radialGradient id="cs-screw" cx=".35" cy=".3" r=".9">
          <stop offset="0" stopColor="#e8e8e8" />
          <stop offset="1" stopColor="#7c7f85" />
        </radialGradient>
        <filter id="cs-shadow" x="-10%" y="-10%" width="120%" height="130%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
        {/* motas y polvo */}
        <filter id="cs-grain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="7" />
          <feColorMatrix values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  2.6 0 0 0 -1.25" />
        </filter>
        {/* rozaduras horizontales de entrar y salir de la pletina */}
        <filter id="cs-scuff" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".006 .45" numOctaves="2" seed="11" />
          <feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  3.2 0 0 0 -1.75" />
        </filter>
        {/* manchas de la pegatina */}
        <filter id="cs-stain" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".018 .03" numOctaves="3" seed="3" />
          <feColorMatrix values="0 0 0 0 .45  0 0 0 0 .3  0 0 0 0 .1  2.4 0 0 0 -1.15" />
        </filter>
        <clipPath id="cs-shell"><rect x="1" y="1" width="398" height="252" rx="13" /></clipPath>
        <clipPath id="cs-label"><path d="M30 17H370a7 7 0 0 1 7 7V152L354 175H30a7 7 0 0 1-7-7V24a7 7 0 0 1 7-7Z" /></clipPath>
        <clipPath id="cs-window"><rect x="84" y="94" width="232" height="56" rx="7" /></clipPath>
      </defs>

      <rect x="8" y="16" width="384" height="244" rx="14" fill="#000" opacity=".3" filter="url(#cs-shadow)" />

      {/* carcasa */}
      <rect x="1" y="1" width="398" height="252" rx="13" fill="var(--shell)" />
      <rect x="1" y="1" width="398" height="252" rx="13" fill="url(#cs-body)" />
      <rect x="1.5" y="1.5" width="397" height="251" rx="12.5" fill="none" stroke="#000" strokeOpacity=".35" />
      <rect x="4" y="4" width="392" height="246" rx="10.5" fill="none" stroke="#fff" strokeOpacity=".3" />
      {/* pestañas de protección contra grabación */}
      <rect x="30" y="0" width="22" height="5" fill="#000" opacity=".3" />
      <rect x="348" y="0" width="22" height="5" fill="#000" opacity=".3" />

      {/* pegatina: amarillenta, con manchas y la esquina de abajo a la derecha levantada */}
      <rect x="24" y="19" width="352" height="158" rx="7" fill="#000" opacity=".18" />
      <g clipPath="url(#cs-label)">
        <rect x="23" y="17" width="354" height="158" fill="#ece4cf" />
        <rect x="23" y="17" width="354" height="158" filter="url(#cs-stain)" opacity=".28" />
        <circle cx="46" cy="42" r="12" fill="none" stroke="#1a1a1a" strokeOpacity=".8" strokeWidth="1.5" />
        <text className="cassette__side" x="46" y="47.5" textAnchor="middle">{side}</text>
        <text className="cassette__title" x="68" y="50" transform="rotate(-1.2 68 50)">{title || 'Sin título'}</text>
        <line x1="66" y1="59" x2="360" y2="59" stroke="#000" strokeOpacity=".45" />
        <line x1="40" y1="79" x2="360" y2="79" stroke="#000" strokeOpacity=".2" />
        <rect x="23" y="159" width="354" height="16" fill="#1c1b1a" />
        <rect x="23" y="154" width="354" height="3" fill="#1c1b1a" />
        <text className="cassette__meta" x="40" y="171">Cara B</text>
        <text className="cassette__meta" x="336" y="171" textAnchor="end">60 min</text>
        {/* la tinta impresa se ha ido gastando */}
        <rect x="23" y="150" width="354" height="26" filter="url(#cs-scuff)" opacity=".5" />
      </g>
      {/* pliegue de la esquina levantada */}
      <path d="M377 152 L354 175 L358 156 Z" fill="#d9cfb6" />
      <path d="M377 152 L354 175" stroke="#000" strokeOpacity=".25" />

      {/* ventanilla: dentro se ven las dos bobinas de cinta */}
      <rect x="82" y="92" width="236" height="60" rx="9" fill="#000" opacity=".25" />
      <rect x="84" y="94" width="232" height="56" rx="7" fill="#1d1b1a" />
      <g clipPath="url(#cs-window)">
        {[[LEFT_X, left], [RIGHT_X, right]].map(([cx, r]) => (
          <g key={cx}>
            <circle className="cassette__pack" cx={cx} cy={REEL_Y} r={r} fill="#3d2d25" />
            <circle className="cassette__pack" cx={cx} cy={REEL_Y} r={Math.max(r - 6, HUB)} fill="none"
              stroke="#fff" strokeOpacity=".07" strokeWidth="2" />
            <circle cx={cx} cy={REEL_Y} r={HUB - 2} fill="#d9d6cf" />
            <circle cx={cx} cy={REEL_Y} r={HUB - 9} fill="#c4c0b8" />
          </g>
        ))}
        <rect x="84" y="94" width="232" height="56" fill="url(#cs-glass)" />
        <path d="M84 94h232v7H84z" fill="#000" opacity=".25" />
      </g>
      <rect x="84" y="94" width="232" height="56" rx="7" fill="none" stroke="#000" strokeOpacity=".6" />

      {/* arañazos del cristal */}
      <g clipPath="url(#cs-window)" stroke="#fff" strokeLinecap="round" fill="none">
        <path d="M150 99 L196 141" strokeOpacity=".16" strokeWidth=".7" />
        <path d="M158 97 L181 118" strokeOpacity=".1" strokeWidth=".5" />
        <path d="M236 146 L302 104" strokeOpacity=".12" strokeWidth=".6" />
      </g>

      {/* ejes: es lo único que gira a la vista */}
      <Hub cx={LEFT_X} innerRef={leftRef} />
      <Hub cx={RIGHT_X} innerRef={rightRef} />

      {/* zona del cabezal */}
      <path d="M62 253 L80 192 H320 L338 253 Z" fill="#000" opacity=".16" />
      <path d="M80 192 H320" stroke="#fff" strokeOpacity=".3" />
      <circle cx="122" cy="226" r="8" fill="#101010" />
      <circle cx="278" cy="226" r="8" fill="#101010" />
      <circle cx="165" cy="232" r="5" fill="#101010" />
      <circle cx="235" cy="232" r="5" fill="#101010" />
      <rect x="186" y="238" width="28" height="15" rx="2" fill="#101010" />

      {/* desgaste del plástico: rozaduras, motas y arañazos sueltos */}
      <g clipPath="url(#cs-shell)" pointerEvents="none">
        <rect x="1" y="176" width="398" height="77" filter="url(#cs-scuff)" opacity=".4" />
        <rect x="1" y="1" width="398" height="16" filter="url(#cs-scuff)" opacity=".3" />
        <rect x="1" y="1" width="398" height="252" filter="url(#cs-grain)" opacity=".2" />
        <g stroke="#fff" strokeLinecap="round" fill="none">
          <path d="M34 196 Q70 203 118 199" strokeOpacity=".4" strokeWidth=".8" />
          <path d="M300 214 L372 228" strokeOpacity=".3" strokeWidth=".7" />
          <path d="M344 186 L381 181" strokeOpacity=".25" strokeWidth=".6" />
          <path d="M8 96 L15 148" strokeOpacity=".3" strokeWidth=".7" />
          <path d="M386 60 L392 132" strokeOpacity=".22" strokeWidth=".6" />
        </g>
        <path d="M52 240 L96 247 M250 200 L262 203" stroke="#000" strokeOpacity=".25" strokeWidth=".7" strokeLinecap="round" />
        {/* cantos pelados */}
        <path d="M1 30 V14 A13 13 0 0 1 14 1 H36" stroke="#fff" strokeOpacity=".35" strokeWidth="2.5" fill="none" />
        <path d="M399 226 V240 A13 13 0 0 1 386 253 H352" stroke="#fff" strokeOpacity=".28" strokeWidth="2.5" fill="none" />
      </g>

      <Screw x={16} y={16} />
      <Screw x={384} y={16} />
      <Screw x={16} y={238} />
      <Screw x={384} y={238} />
      <Screw x={200} y={208} />
    </svg>
  );
}
