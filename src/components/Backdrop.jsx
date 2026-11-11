import { useEffect, useState } from 'react';
import { fetchCovers } from '../api/itunes';

const ARTISTS = [
  'ROSALÍA', 'Bad Bunny', 'Travis Scott', 'Kanye West',
  'Tainy', 'Frank Ocean', 'C. Tangana', 'Tyler, The Creator',
];
const COLUMNS = 6;
const PER_COLUMN = 5;

function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Fondo de portadas: columnas que suben y bajan muy despacio, desenfocadas y
 * bajo un velo claro. Cada pocos segundos una portada al azar cambia por otra.
 */
export default function Backdrop() {
  const [covers, setCovers] = useState([]);
  const [tiles, setTiles] = useState([]);

  useEffect(() => {
    let alive = true;
    fetchCovers(ARTISTS).then((urls) => {
      if (!alive || urls.length < COLUMNS) return;
      const mixed = shuffle(urls);
      setCovers(mixed);
      setTiles(Array.from({ length: COLUMNS * PER_COLUMN }, (_, i) => mixed[i % mixed.length]));
    }).catch(() => { /* sin portadas, el fondo se queda liso */ });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    if (!covers.length) return undefined;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const timer = setInterval(() => {
      setTiles((prev) => {
        const unused = covers.filter((c) => !prev.includes(c));
        if (!unused.length) return prev;
        const copy = [...prev];
        copy[Math.floor(Math.random() * copy.length)] = unused[Math.floor(Math.random() * unused.length)];
        return copy;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [covers]);

  if (!tiles.length) return <div className="backdrop" aria-hidden="true" />;

  return (
    <div className="backdrop is-ready" aria-hidden="true">
      {Array.from({ length: COLUMNS }, (_, c) => {
        const column = tiles.slice(c * PER_COLUMN, (c + 1) * PER_COLUMN);
        return (
          <div className="backdrop__col" key={c} style={{ '--speed': `${110 + ((c * 37) % 70)}s` }}>
            {/* la lista va dos veces para que el bucle no tenga corte */}
            {[...column, ...column].map((url, i) => (
              <img key={`${i}-${url}`} src={url} alt="" loading="lazy" decoding="async" />
            ))}
          </div>
        );
      })}
    </div>
  );
}
