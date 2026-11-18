// Original WebAudio sound: engine hum, siren, gunshot, punch, chime and a
// small synthwave bass loop. No audio files, no network.
export function createAudio() {
  let ctx = null;
  let muted = false;
  let musicTimer = null;
  let engineOsc = null;
  let engineGain = null;
  let sirenOsc = null;
  let sirenGain = null;
  let step = 0;

  function ensure() {
    if (ctx) return ctx;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
    } catch { ctx = null; }
    return ctx;
  }

  function tone(freq, dur, type = 'sine', vol = 0.12, when = 0) {
    if (!ctx || muted) return;
    const t = ctx.currentTime + when;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);
    gain.gain.setValueAtTime(vol, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
    osc.connect(gain).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + dur + 0.02);
  }

  function noise(dur, vol = 0.2) {
    if (!ctx || muted) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const gain = ctx.createGain();
    gain.gain.value = vol;
    src.connect(gain).connect(ctx.destination);
    src.start();
  }

  const BASS = [55, 55, 65.4, 49, 55, 55, 73.4, 65.4]; // A1 A1 C2 G1 ...
  function startMusic() {
    if (!ensure() || musicTimer) return;
    musicTimer = window.setInterval(() => {
      if (muted || !ctx) return;
      const note = BASS[step % BASS.length];
      tone(note, 0.42, 'triangle', 0.07);
      if (step % 2 === 0) tone(note * 2, 0.18, 'square', 0.03);
      if (step % 4 === 3) noise(0.05, 0.04);
      step += 1;
    }, 240);
  }

  function startEngine() {
    if (!ensure() || engineOsc) return;
    engineOsc = ctx.createOscillator();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.value = 60;
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.0;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 420;
    engineOsc.connect(filter).connect(engineGain).connect(ctx.destination);
    engineOsc.start();
  }

  function setEngine(speed01, driving) {
    if (!engineOsc || !ctx || muted) { if (engineGain) engineGain.gain.value = 0; return; }
    engineOsc.frequency.setTargetAtTime(55 + speed01 * 130, ctx.currentTime, 0.08);
    engineGain.gain.setTargetAtTime(driving ? 0.035 + speed01 * 0.03 : 0.0, ctx.currentTime, 0.1);
  }

  function setSiren(on) {
    if (!ensure()) return;
    if (on && !sirenOsc) {
      sirenOsc = ctx.createOscillator();
      sirenOsc.type = 'sine';
      sirenGain = ctx.createGain();
      sirenGain.gain.value = muted ? 0 : 0.035;
      sirenOsc.connect(sirenGain).connect(ctx.destination);
      sirenOsc.start();
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.7;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 320;
      lfo.connect(lfoGain).connect(sirenOsc.frequency);
      sirenOsc.frequency.value = 880;
      lfo.start();
      sirenOsc._lfo = lfo;
    } else if (!on && sirenOsc) {
      try { sirenOsc._lfo.stop(); sirenOsc.stop(); } catch { /* already stopped */ }
      sirenOsc = null;
    }
  }

  return {
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); startMusic(); startEngine(); },
    setMuted(m) { muted = m; if (engineGain) engineGain.gain.value = 0; if (sirenGain) sirenGain.gain.value = 0; },
    isMuted() { return muted; },
    setEngine, setSiren,
    shot() { noise(0.12, 0.25); tone(180, 0.08, 'square', 0.1); },
    punch() { noise(0.08, 0.18); tone(90, 0.1, 'sine', 0.14); },
    chime() { tone(660, 0.12, 'sine', 0.1); tone(880, 0.18, 'sine', 0.1, 0.1); },
    crash() { noise(0.25, 0.2); tone(70, 0.25, 'sawtooth', 0.1); },
    busted() { tone(440, 0.3, 'square', 0.08); tone(330, 0.4, 'square', 0.08, 0.25); },
  };
}
