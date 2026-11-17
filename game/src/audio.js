// All of Emberwake's sound, synthesised with the Web Audio API: no audio files. Each cue is
// a tiny recipe of oscillators and noise; the night music is a slow pentatonic arpeggio over
// a soft drone. The context starts on the first key or click, as browsers require.

const CUES = {
  shoot: { wave: 'triangle', from: 880, to: 1320, time: 0.06, gain: 0.05 },
  hit: { wave: 'square', from: 300, to: 180, time: 0.05, gain: 0.04 },
  kill: { wave: 'triangle', from: 660, to: 220, time: 0.16, gain: 0.09, noise: 0.05 },
  hurt: { wave: 'sawtooth', from: 220, to: 70, time: 0.3, gain: 0.14, noise: 0.08 },
  bloomhit: { wave: 'sine', from: 420, to: 260, time: 0.22, gain: 0.1 },
  nectar: { wave: 'sine', from: 990, to: 1480, time: 0.12, gain: 0.08 },
  dash: { wave: 'sine', from: 240, to: 720, time: 0.15, gain: 0.08, noise: 0.04 },
  lunge: { wave: 'sawtooth', from: 160, to: 420, time: 0.18, gain: 0.05 },
  roar: { wave: 'sawtooth', from: 90, to: 50, time: 0.6, gain: 0.14, noise: 0.1 },
  boon: { notes: [523, 659, 784, 1047], step: 0.07, wave: 'triangle', gain: 0.09 },
  clear: { notes: [392, 523, 659, 784], step: 0.1, wave: 'triangle', gain: 0.1 },
  win: { notes: [523, 659, 784, 1047, 1319, 1568], step: 0.14, wave: 'triangle', gain: 0.12 },
  lose: { notes: [392, 330, 262, 196], step: 0.22, wave: 'sine', gain: 0.12 },
  bosskill: { notes: [262, 392, 523, 784, 1047], step: 0.09, wave: 'square', gain: 0.07, noise: 0.2 },
  select: { wave: 'triangle', from: 600, to: 900, time: 0.08, gain: 0.07 },
};

/** The pentatonic notes the night music walks over. */
const SCALE = [220, 247, 294, 330, 370, 440, 494, 588];

export function createAudio() {
  let context = null;
  let master = null;
  let muted = false;
  let musicTimer = null;
  let beat = 0;

  function ensure() {
    if (context) return context.state === 'running';
    const Context = window.AudioContext || window.webkitAudioContext;
    if (!Context) return false;
    context = new Context();
    master = context.createGain();
    master.gain.value = 0.8;
    master.connect(context.destination);
    startMusic();
    return true;
  }

  function tone(wave, from, to, start, length, gain) {
    const osc = context.createOscillator();
    const amp = context.createGain();
    osc.type = wave;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, to), start + length);
    amp.gain.setValueAtTime(gain, start);
    amp.gain.exponentialRampToValueAtTime(0.0001, start + length);
    osc.connect(amp).connect(master);
    osc.start(start);
    osc.stop(start + length + 0.02);
  }

  function noise(start, length, gain) {
    const buffer = context.createBuffer(1, Math.ceil(context.sampleRate * length), context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const source = context.createBufferSource();
    const amp = context.createGain();
    amp.gain.value = gain;
    source.buffer = buffer;
    source.connect(amp).connect(master);
    source.start(start);
  }

  /** Play the named cue now (ignored while muted or before the first gesture). */
  function play(name) {
    if (muted || !context || context.state !== 'running') return;
    const cue = CUES[name];
    if (!cue) return;
    const now = context.currentTime;
    if (cue.notes) {
      cue.notes.forEach((note, i) => tone(cue.wave, note, note * 1.01, now + i * cue.step, cue.step * 2.2, cue.gain));
    } else {
      tone(cue.wave, cue.from, cue.to, now, cue.time, cue.gain);
    }
    if (cue.noise) noise(now, 0.25, cue.noise);
  }

  function startMusic() {
    const drone = context.createOscillator();
    const droneGain = context.createGain();
    drone.type = 'sine';
    drone.frequency.value = 55;
    droneGain.gain.value = 0.035;
    drone.connect(droneGain).connect(master);
    drone.start();
    musicTimer = window.setInterval(() => {
      if (muted || context.state !== 'running') return;
      const now = context.currentTime;
      const index = (beat * 3 + (beat >> 2)) % SCALE.length;
      tone('sine', SCALE[index], SCALE[index], now, 0.9, 0.025);
      if (beat % 4 === 0) tone('triangle', SCALE[index] / 2, SCALE[index] / 2, now, 1.6, 0.02);
      beat += 1;
    }, 360);
  }

  function toggleMute() {
    muted = !muted;
    if (master) master.gain.value = muted ? 0 : 0.8;
    return muted;
  }

  return { ensure, play, toggleMute, isMuted: () => muted, stop: () => window.clearInterval(musicTimer) };
}
