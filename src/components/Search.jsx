import { useEffect, useState } from 'react';
import { searchTracks } from '../api/itunes';
import { useDebounce } from '../hooks/useDebounce';

export default function Search({ onAdd, isAdded, full }) {
  const [term, setTerm] = useState('');
  // Última respuesta recibida y para qué búsqueda era
  const [answer, setAnswer] = useState({ query: '', tracks: [], error: '' });
  const query = useDebounce(term.trim());
  const active = query.length >= 2;

  useEffect(() => {
    if (!active) return undefined;
    const controller = new AbortController();
    searchTracks(query, controller.signal)
      .then((tracks) => setAnswer({ query, tracks, error: '' }))
      .catch((e) => {
        if (e.name !== 'AbortError') setAnswer({ query, tracks: [], error: e.message });
      });
    return () => controller.abort();
  }, [query, active]);

  // Todo lo demás se calcula a partir de la respuesta, sin más estado
  const loading = active && answer.query !== query;
  const results = active ? answer.tracks : [];
  const error = active && !loading ? answer.error : '';
  const searched = active && !loading && !error;

  return (
    <section className="search">
      <input
        className="search__input"
        type="search"
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Busca una canción o un artista"
        aria-label="Buscar canciones"
      />
      <p className="search__status" role="status">
        {loading && 'Buscando…'}
        {full && !loading && 'La cinta está llena. Quita una canción para añadir otra.'}
        {searched && !results.length && `No hay canciones para «${query}».`}
      </p>
      {error && <p className="search__error" role="alert">{error}</p>}
      {results.length > 0 && (
        <ul className="rows">
          {results.map((t) => (
            <li className="row" key={t.id}>
              <img className="row__art" src={t.artwork} alt="" width={44} height={44} loading="lazy" />
              <span className="row__text">
                <span className="row__title">{t.title}</span>
                <span className="row__artist">{t.artist}</span>
              </span>
              <button className="btn" onClick={() => onAdd(t)} disabled={isAdded(t.id) || full}>
                {isAdded(t.id) ? 'En la cinta' : 'Añadir'}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
