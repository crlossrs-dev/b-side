import { useEffect, useState } from 'react';
import { lookupTracks } from './api/itunes';
import Backdrop from './components/Backdrop';
import Cassette from './components/Cassette';
import Search from './components/Search';
import { usePlayer } from './hooks/usePlayer';
import { MIN_FRAGMENT, PREVIEW_SECONDS, readTapeFromUrl, tapeUrl } from './share';

const MAX_TRACKS = 12;
const PER_SIDE = MAX_TRACKS / 2;
const SHELLS = [
  { name: 'Rojo', value: '#E5241D' },
  { name: 'Azul', value: '#2447F9' },
  { name: 'Amarillo', value: '#FFC400' },
  { name: 'Gris', value: '#B9BEC6' },
];
const SHARE_OPTIONS = { shells: SHELLS.map((s) => s.value), maxTracks: MAX_TRACKS };

const onSide = (list, side) => list.filter((t) => t.side === side);
const clock = (seconds) => `0:${String(Math.round(seconds)).padStart(2, '0')}`;

function Key({ label, onClick, pressed, disabled, children }) {
  return (
    <button className="key" onClick={onClick} aria-label={label} aria-pressed={pressed} disabled={disabled}>
      <svg viewBox="0 0 24 24" aria-hidden="true">{children}</svg>
    </button>
  );
}

export default function App() {
  // Si la página se abre con una cinta en el enlace, se parte de ella
  const [shared] = useState(() => readTapeFromUrl(SHARE_OPTIONS));
  const [tracks, setTracks] = useState([]);
  const [title, setTitle] = useState(shared?.title ?? '');
  const [shell, setShell] = useState(shared?.shell ?? SHELLS[0].value);
  const [loadingTape, setLoadingTape] = useState(Boolean(shared));
  const [notice, setNotice] = useState('');
  const [trimming, setTrimming] = useState(null); // id de la canción con el recorte abierto
  const [link, setLink] = useState('');
  const [copied, setCopied] = useState(false);

  // Orden en el que suena la cinta: primero la cara A y luego la B
  const sides = { A: onSide(tracks, 'A'), B: onSide(tracks, 'B') };
  const ordered = [...sides.A, ...sides.B];
  const player = usePlayer(ordered);

  useEffect(() => {
    if (!shared) return;
    lookupTracks(shared.items.map((i) => i.id))
      .then((found) => {
        const byId = new Map(found.map((t) => [t.id, t]));
        const list = shared.items.filter((i) => byId.has(i.id)).map((i) => ({ ...byId.get(i.id), ...i }));
        setTracks(list);
        if (list.length < shared.items.length) {
          setNotice('Alguna canción de esta cinta ya no está disponible y se ha quitado.');
        }
      })
      .catch((e) => setNotice(e.message))
      .finally(() => setLoadingTape(false));
  }, [shared]);

  const change = (update) => { setTracks(update); setLink(''); setCopied(false); };

  const add = (t) => change((prev) => {
    if (prev.length >= MAX_TRACKS || prev.some((p) => p.id === t.id)) return prev;
    const side = onSide(prev, 'A').length < PER_SIDE ? 'A' : 'B';
    return [...prev, { ...t, side, from: 0, to: PREVIEW_SECONDS }];
  });

  const remove = (id) => change((prev) => prev.filter((t) => t.id !== id));

  // Pasa la canción a la otra cara (al final), si hay hueco
  const flip = (id) => change((prev) => {
    const track = prev.find((t) => t.id === id);
    const target = track.side === 'A' ? 'B' : 'A';
    if (onSide(prev, target).length >= PER_SIDE) return prev;
    return [...prev.filter((t) => t.id !== id), { ...track, side: target }];
  });

  // Sube o baja la canción dentro de su cara
  const move = (id, delta) => change((prev) => {
    const track = prev.find((t) => t.id === id);
    const same = onSide(prev, track.side);
    const other = same[same.indexOf(track) + delta];
    if (!other) return prev;
    return prev.map((t) => (t === track ? other : t === other ? track : t));
  });

  const trim = (id, patch) => {
    change((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
    // al mover el principio de la canción que suena, se oye desde el punto nuevo
    if (id === player.currentId && patch.from !== undefined) player.seek(patch.from);
  };

  const share = async () => {
    const url = tapeUrl({ title, shell, tracks: ordered });
    window.history.replaceState(null, '', url);
    setLink(url);
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      setCopied(false); // sin permiso para copiar: el enlace queda a la vista para copiarlo a mano
    }
  };

  const current = ordered[player.index];
  const currentSide = current?.side ?? 'A';

  return (
    <>
      <Backdrop />
      <div className="page">
        <aside className="deck">
          <h1 className="brand">Cara B</h1>
          <Cassette
            title={title}
            side={currentSide}
            color={shell}
            playing={player.playing}
            rewinding={player.rewinding}
            progress={player.progress}
            trackKey={player.currentId}
          />

          <p className="now" aria-live="polite">
            {player.error && <strong>{player.error}</strong>}
            {!player.error && player.rewinding && 'Rebobinando…'}
            {!player.error && !player.rewinding && current && <>{current.title}<span> {current.artist}</span></>}
            {!player.error && !current && (tracks.length
              ? 'Dale al play para escuchar la cinta.'
              : 'Busca una canción y añádela a la cinta para poder darle al play.')}
          </p>

          <div className="keys">
            <Key label="Canción anterior" onClick={player.prev} disabled={player.index <= 0}>
              <path d="M6 5h2v14H6zM20 5v14L9 12z" />
            </Key>
            <Key label={player.playing ? 'Pausar' : 'Reproducir'} onClick={player.toggle}
              pressed={player.playing || player.rewinding} disabled={!tracks.length}>
              {player.playing ? <path d="M6 5h4v14H6zM14 5h4v14h-4z" /> : <path d="M7 4v16l13-8z" />}
            </Key>
            <Key label="Canción siguiente" onClick={player.next}
              disabled={player.index < 0 || player.index >= ordered.length - 1}>
              <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
            </Key>
          </div>

          <label className="field">
            <span>Título de la cinta</span>
            <input value={title} onChange={(e) => { setTitle(e.target.value); setLink(''); }} maxLength={28}
              placeholder="Para el viaje a Lisboa" />
          </label>

          <fieldset className="swatches">
            <legend>Color de la carcasa</legend>
            {SHELLS.map((s) => (
              <label key={s.value} title={s.name}>
                <input type="radio" name="shell" value={s.value} checked={shell === s.value}
                  onChange={() => { setShell(s.value); setLink(''); }} />
                <span style={{ background: s.value }} />
                <span className="sr-only">{s.name}</span>
              </label>
            ))}
          </fieldset>
        </aside>

        <main className="work">
          <Search onAdd={add} isAdded={(id) => tracks.some((t) => t.id === id)} full={tracks.length >= MAX_TRACKS} />

          <section className="tape">
            <h2>Tu cinta <span>{tracks.length} de {MAX_TRACKS}</span></h2>
            {loadingTape && <p className="empty">Cargando la cinta del enlace…</p>}
            {notice && <p className="search__error" role="alert">{notice}</p>}
            {!tracks.length && !loadingTape && (
              <p className="empty">Está vacía. Busca una canción arriba para empezar a grabar.</p>
            )}

            {['A', 'B'].map((side) => sides[side].length > 0 && (
              <div key={side}>
                <h3>Cara {side} <span>{sides[side].length} de {PER_SIDE}</span></h3>
                <ol className="rows">
                  {sides[side].map((t, i) => {
                    const active = t.id === player.currentId;
                    const other = side === 'A' ? 'B' : 'A';
                    const open = trimming === t.id;
                    const trimmed = t.from > 0 || t.to < PREVIEW_SECONDS;
                    return (
                      <li className={`row row--tape${active ? ' is-active' : ''}`} key={t.id}>
                        <button className="row__play" onClick={() => (active ? player.toggle() : player.play(t))}
                          aria-label={`${active && player.playing ? 'Pausar' : 'Reproducir'} ${t.title}`}>
                          <img className="row__art" src={t.artwork} alt="" width={44} height={44} />
                        </button>
                        <span className="row__text">
                          <span className="row__title">{t.title}</span>
                          <span className="row__artist">
                            {t.artist}{trimmed && `, de ${clock(t.from)} a ${clock(t.to)}`}
                          </span>
                        </span>
                        <span className="row__actions">
                          <button className="btn btn--quiet" onClick={() => move(t.id, -1)} disabled={i === 0}
                            aria-label={`Subir ${t.title}`}>↑</button>
                          <button className="btn btn--quiet" onClick={() => move(t.id, 1)}
                            disabled={i === sides[side].length - 1} aria-label={`Bajar ${t.title}`}>↓</button>
                          <button className="btn btn--quiet" onClick={() => flip(t.id)}
                            disabled={sides[other].length >= PER_SIDE}
                            title={sides[other].length >= PER_SIDE ? `La cara ${other} está llena` : undefined}>
                            A cara {other}
                          </button>
                          <button className="btn btn--quiet" onClick={() => setTrimming(open ? null : t.id)}
                            aria-expanded={open}>
                            Recortar
                          </button>
                          <button className="btn btn--quiet btn--danger" onClick={() => remove(t.id)}
                            aria-label={`Quitar ${t.title}`}>
                            Quitar
                          </button>
                        </span>
                        {open && (
                          <div className="trim">
                            <label>
                              <span>Empieza en {clock(t.from)}</span>
                              <input type="range" min={0} max={PREVIEW_SECONDS - MIN_FRAGMENT} step={1} value={t.from}
                                onChange={(e) => {
                                  const from = Number(e.target.value);
                                  trim(t.id, { from, to: Math.max(t.to, from + MIN_FRAGMENT) });
                                }} />
                            </label>
                            <label>
                              <span>Acaba en {clock(t.to)}</span>
                              <input type="range" min={MIN_FRAGMENT} max={PREVIEW_SECONDS} step={1} value={t.to}
                                onChange={(e) => {
                                  const to = Number(e.target.value);
                                  trim(t.id, { to, from: Math.min(t.from, to - MIN_FRAGMENT) });
                                }} />
                            </label>
                            <p>Sonarán {Math.round(t.to - t.from)} segundos. iTunes solo da 30 segundos de cada canción.</p>
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ol>
              </div>
            ))}

            {tracks.length > 0 && (
              <div className="share">
                <button className="btn btn--big" onClick={share}>
                  {copied ? 'Enlace copiado' : 'Copiar enlace de la cinta'}
                </button>
                {link && (
                  <input className="share__link" readOnly value={link} aria-label="Enlace de la cinta"
                    onFocus={(e) => e.target.select()} />
                )}
                <p>Quien abra el enlace verá esta cinta, con su título, su color y sus recortes.</p>
              </div>
            )}
          </section>
        </main>
      </div>
    </>
  );
}
