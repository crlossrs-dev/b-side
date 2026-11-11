// Sonido de rebobinado hecho con Web Audio: no hace falta ningún archivo de sonido.
let ctx;

export function playRewind(seconds = 0.5) {
  try {
    ctx ??= new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
    const t = ctx.currentTime;
    const end = t + seconds;

    const out = ctx.createGain();
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(0.14, t + 0.04);
    out.gain.setValueAtTime(0.14, end - 0.08);
    out.gain.linearRampToValueAtTime(0, end);
    out.connect(ctx.destination);

    // Chirrido de la cinta pasando deprisa: un tono que sube, troceado cada vez más rápido
    const tone = ctx.createOscillator();
    tone.type = 'sawtooth';
    tone.frequency.setValueAtTime(420, t);
    tone.frequency.exponentialRampToValueAtTime(2400, end);
    const chop = ctx.createGain();
    chop.gain.value = 0.5;
    const flutter = ctx.createOscillator();
    flutter.type = 'square';
    flutter.frequency.setValueAtTime(16, t);
    flutter.frequency.linearRampToValueAtTime(44, end);
    const depth = ctx.createGain();
    depth.gain.value = 0.5;
    flutter.connect(depth).connect(chop.gain);
    const band = ctx.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = 1700;
    band.Q.value = 0.7;
    tone.connect(chop).connect(band).connect(out);

    // Soplido del motor
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const high = ctx.createBiquadFilter();
    high.type = 'highpass';
    high.frequency.value = 2800;
    const hiss = ctx.createGain();
    hiss.gain.value = 0.45;
    noise.connect(high).connect(hiss).connect(out);

    [tone, flutter, noise].forEach((node) => { node.start(t); node.stop(end); });
  } catch { /* sin Web Audio no hay efecto, pero la cinta sigue funcionando */ }
}
