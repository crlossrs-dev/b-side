import { useCallback, useEffect, useRef, useState } from 'react';
import { playRewind } from '../audio/rewind';

const REWIND_MS = 520;

/**
 * Reproduce los fragmentos de la cinta uno detrás de otro.
 * Cada canción suena solo entre su `from` y su `to` (en segundos), y al cambiar
 * de una canción a otra suena un rebobinado antes de que empiece la siguiente.
 */
export function usePlayer(tracks) {
  const audioRef = useRef(null);
  const tracksRef = useRef(tracks);
  const currentRef = useRef(null); // id de la canción cargada, para usarlo dentro de los eventos
  const timerRef = useRef(null);
  const [currentId, setCurrentId] = useState(null);
  const [playing, setPlaying] = useState(false);
  const [rewinding, setRewinding] = useState(false);
  const [fraction, setFraction] = useState(0); // avance dentro del fragmento actual
  const [error, setError] = useState('');

  useEffect(() => { tracksRef.current = tracks; }, [tracks]);
  const index = tracks.findIndex((t) => t.id === currentId);

  const audio = () => {
    if (!audioRef.current) audioRef.current = new Audio();
    return audioRef.current;
  };
  const loaded = () => tracksRef.current.find((t) => t.id === currentRef.current);

  // Si el navegador no deja sonar o el fragmento no carga, se dice en pantalla en vez de callarlo
  const start = useCallback((a) => {
    setError('');
    a.play().catch((e) => {
      if (e.name === 'AbortError') return; // se ha cambiado de canción antes de empezar
      setPlaying(false);
      setError(e.name === 'NotAllowedError'
        ? 'El navegador ha bloqueado el sonido. Pulsa play otra vez.'
        : 'No se ha podido cargar el fragmento de esta canción.');
    });
  }, []);

  const load = useCallback((track) => {
    const a = audio();
    a.src = track.previewUrl;
    a.currentTime = track.from;
    setFraction(0);
    start(a);
  }, [start]);

  const play = useCallback((track) => {
    const a = audio();
    const previous = currentRef.current;
    clearTimeout(timerRef.current);
    currentRef.current = track.id;
    setCurrentId(track.id);

    if (previous === track.id && a.src) { setRewinding(false); start(a); return; }
    if (previous === null || !a.src) { setRewinding(false); load(track); return; }

    // salto de una canción a otra: se para, suena el rebobinado y luego entra la nueva
    a.pause();
    setFraction(0);
    setError('');
    setRewinding(true);
    playRewind(REWIND_MS / 1000);
    timerRef.current = setTimeout(() => {
      setRewinding(false);
      load(track);
    }, REWIND_MS);
  }, [load, start]);

  const step = useCallback((delta) => {
    const list = tracksRef.current;
    const i = list.findIndex((t) => t.id === currentRef.current);
    const next = i === -1 ? undefined : list[i + delta];
    if (next) play(next);
    return Boolean(next);
  }, [play]);

  const toggle = useCallback(() => {
    const a = audio();
    const list = tracksRef.current;
    if (!list.length) return;
    const track = loaded();
    if (!track || !a.src) { play(list[0]); return; }
    if (!a.paused) { a.pause(); return; }
    // si el fragmento ya había acabado, vuelve a su principio
    if (a.currentTime >= track.to - 0.1 || a.currentTime < track.from) a.currentTime = track.from;
    start(a);
  }, [play, start]);

  /** Mueve la reproducción a un segundo concreto de la canción cargada. */
  const seek = useCallback((seconds) => {
    const a = audio();
    if (a.src) a.currentTime = seconds;
  }, []);

  useEffect(() => {
    const a = audio();
    const advance = () => {
      if (!step(1)) { a.pause(); setFraction(1); } // fin de la cinta
    };
    const onTime = () => {
      const track = loaded();
      if (!track) return;
      const to = Math.min(track.to, a.duration || track.to);
      const length = Math.max(to - track.from, 1);
      setFraction(Math.min(1, Math.max(0, (a.currentTime - track.from) / length)));
      if (!a.paused && a.currentTime >= to) advance();
    };
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    const onError = () => {
      if (!a.getAttribute('src')) return;
      setPlaying(false);
      setError('No se ha podido cargar el fragmento de esta canción.');
    };
    a.addEventListener('timeupdate', onTime);
    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('ended', advance);
    a.addEventListener('error', onError);
    return () => {
      clearTimeout(timerRef.current);
      a.pause();
      a.removeEventListener('timeupdate', onTime);
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('ended', advance);
      a.removeEventListener('error', onError);
    };
  }, [step]);

  // si se quita de la cinta la canción que suena, se para el audio
  const removed = currentId !== null && index === -1;
  useEffect(() => {
    if (!removed) return;
    clearTimeout(timerRef.current);
    const a = audio();
    a.pause();
    a.removeAttribute('src');
    currentRef.current = null;
  }, [removed]);

  const progress = index >= 0 && tracks.length ? (index + fraction) / tracks.length : 0;

  return {
    currentId: removed ? null : currentId,
    index,
    playing: playing && !removed,
    rewinding: rewinding && !removed,
    progress,
    error,
    play, toggle, seek,
    next: () => step(1),
    prev: () => step(-1),
  };
}
