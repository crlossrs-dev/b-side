/**
 * Track represents a song in the iTunes API.
 * @typedef {{ id: number, title: string, artist: string, album: string,
 *   artwork: string, previewUrl: string, durationMs: number, appleUrl: string }} Track
 */

function toTrack(s) {
    return {
        id: s.trackId,
        title: s.trackName,
        artist: s.artistName,
        album: s.collectionName,
        artwork: s.artworkUrl100.replace('100x100bb', '600x600bb'),
        previewUrl: s.previewUrl ?? '',
        durationMs: s.trackTimeMillis,
        appleUrl: s.trackViewUrl
    };
}
    /**@returns{Promise<Track[]>} */
    export async function searchTracks(term, signal) {
        // Query Building
        const params = new URLSearchParams({
            term, entity: 'song',country: 'ES', limit: 15 });
            const res = await fetch(`/api/itunes/search?${params}`, {signal});
        // 429 Too Many Requests
            if(res.status === 429) throw new Error('Muchas búsquedas seguidas. Espera un momento.')
        // 500 Internal Server Error
                if(!res.ok) throw new Error('Error al buscar canciones. Inténtalo de nuevo.');
            const data = await res.json();
            return data.results.filter((s) => s.previewUrl).map(toTrack);
}
