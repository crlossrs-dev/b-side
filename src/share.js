// La cinta entera viaja dentro del enlace: no hace falta servidor ni base de datos.
// Se guarda lo mínimo (ids de las canciones, cara, recorte, título y color) y al abrir
// el enlace se piden los datos de las canciones a iTunes.

export const PREVIEW_SECONDS = 30;
export const MIN_FRAGMENT = 5;
const HASH_KEY = '#cinta=';

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, Number.isFinite(n) ? n : min));
}

export function encodeTape({ title, shell, tracks }) {
  const data = { t: title, c: shell, s: tracks.map((t) => [t.id, t.side, t.from, t.to]) };
  const bytes = new TextEncoder().encode(JSON.stringify(data));
  const base64 = btoa(String.fromCharCode(...bytes));
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** Devuelve null si el texto no es una cinta válida. */
export function decodeTape(text, { shells, maxTracks }) {
  try {
    const base64 = text.replace(/-/g, '+').replace(/_/g, '/');
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const data = JSON.parse(new TextDecoder().decode(bytes));
    if (!Array.isArray(data.s) || !data.s.length) return null;
    return {
      title: String(data.t ?? '').slice(0, 28),
      shell: shells.includes(data.c) ? data.c : shells[0],
      items: data.s.slice(0, maxTracks).map(([id, side, from, to]) => {
        const start = clamp(Number(from), 0, PREVIEW_SECONDS - MIN_FRAGMENT);
        return {
          id: Number(id),
          side: side === 'B' ? 'B' : 'A',
          from: start,
          to: clamp(Number(to), start + MIN_FRAGMENT, PREVIEW_SECONDS),
        };
      }).filter((item) => Number.isInteger(item.id)),
    };
  } catch {
    return null;
  }
}

export function readTapeFromUrl(options) {
  const { hash } = window.location;
  return hash.startsWith(HASH_KEY) ? decodeTape(hash.slice(HASH_KEY.length), options) : null;
}

export function tapeUrl(tape) {
  return `${window.location.origin}${window.location.pathname}${HASH_KEY}${encodeTape(tape)}`;
}
