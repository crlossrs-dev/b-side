export const DEFAULT_COUNTRY = 'ES';

/**
 * Canción tal como la usa la app.
 * @typedef {{ id: number, title: string, artist: string, album: string,
 *   artwork: string, previewUrl: string, durationMs: number, appleUrl: string }} Track
 */

function toTrack(s) {
  return {
    id: s.trackId,
    title: s.trackName,
    artist: s.artistName,
    album: s.collectionName,
    // la API da la portada a 100px; cambiando el tamaño en la URL se pide más grande
    artwork: s.artworkUrl100.replace('100x100bb', '600x600bb'),
    previewUrl: s.previewUrl ?? '',
    durationMs: s.trackTimeMillis,
    appleUrl: s.trackViewUrl,
  };
}

/** @returns {Promise<Track[]>} */
export async function searchTracks(term, signal) {
  const params = new URLSearchParams({ term, entity: 'song', country: DEFAULT_COUNTRY, limit: '15' });
  const res = await fetch(`/api/itunes/search?${params}`, { signal });
  if (res.status === 429) throw new Error('Demasiadas búsquedas seguidas. Espera un momento.');
  if (!res.ok) throw new Error('No se ha podido buscar. Inténtalo de nuevo.');
  const data = await res.json();
  // sin fragmento no se puede reproducir, así que se descartan
  return data.results.filter((s) => s.previewUrl).map(toTrack);
}

/**
 * Recupera canciones por su id (para abrir una cinta compartida).
 * @returns {Promise<Track[]>}
 */
export async function lookupTracks(ids) {
  const params = new URLSearchParams({ id: ids.join(','), country: DEFAULT_COUNTRY });
  const res = await fetch(`/api/itunes/lookup?${params}`);
  if (!res.ok) throw new Error('No se ha podido cargar la cinta. Recarga la página en un momento.');
  const data = await res.json();
  return data.results.filter((s) => s.trackId && s.previewUrl).map(toTrack);
}

const COVERS_KEY = 'cara-b:covers';
const WEEK = 7 * 24 * 60 * 60 * 1000;

/**
 * Portadas de álbumes de varios artistas para el fondo.
 * Se guardan una semana en el navegador para no gastar el límite de la API en cada visita.
 * @returns {Promise<string[]>} URLs de portadas a 300px
 */
export async function fetchCovers(artists) {
  try {
    const cached = JSON.parse(localStorage.getItem(COVERS_KEY));
    if (cached && Date.now() - cached.at < WEEK && cached.urls.length) return cached.urls;
  } catch { /* sin caché: se piden */ }

  const answers = await Promise.allSettled(
    artists.map(async (artist) => {
      const params = new URLSearchParams({
        term: artist, entity: 'album', attribute: 'artistTerm', country: DEFAULT_COUNTRY, limit: '5',
      });
      const res = await fetch(`/api/itunes/search?${params}`);
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      return data.results.map((a) => a.artworkUrl100.replace('100x100bb', '300x300bb'));
    }),
  );
  const urls = [...new Set(answers.flatMap((a) => (a.status === 'fulfilled' ? a.value : [])))];
  try {
    if (urls.length) localStorage.setItem(COVERS_KEY, JSON.stringify({ at: Date.now(), urls }));
  } catch { /* almacenamiento lleno o bloqueado: no pasa nada */ }
  return urls;
}
