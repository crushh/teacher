import { writeFileSync } from 'node:fs';

// Original, softly voiced cartoon meow. No downloaded recording or dependency.
const rate = 44100;
const duration = 0.64;
const samples = new Float64Array(Math.round(rate * duration));
let phase = 0;
let smooth = 0;
let smooth2 = 0;
const lowPass = 1 - Math.exp(-2 * Math.PI * 2300 / rate);
for (let i = 0; i < samples.length; i += 1) {
  const t = i / rate;
  const vowel = Math.min(1, Math.max(0, (t - 0.09) / 0.43));
  // A short upward complaint followed by a rounded descending "ow".
  const pitch = t < 0.09 ? 390 + 230 * Math.sin(t / 0.09 * Math.PI / 2)
    : 620 - 290 * Math.pow((t - 0.09) / (duration - 0.09), 0.7);
  phase += 2 * Math.PI * pitch * (1 + 0.009 * Math.sin(2 * Math.PI * 26 * t)) / rate;
  const f1 = 1000 - 480 * vowel;
  const f2 = 1950 - 920 * vowel;
  let voice = 0;
  for (let harmonic = 1; harmonic <= 9; harmonic += 1) {
    const hz = pitch * harmonic;
    const formants = 0.2 + 1.25 * Math.exp(-(((hz - f1) / 330) ** 2))
      + 0.45 * Math.exp(-(((hz - f2) / 450) ** 2));
    voice += Math.sin(phase * harmonic) * formants / harmonic ** 1.45;
  }
  const attack = Math.sin(Math.min(1, t / 0.035) * Math.PI / 2) ** 2;
  const release = Math.sin(Math.min(1, (duration - t) / 0.19) * Math.PI / 2) ** 2;
  const rasp = 1 - 0.075 * Math.sin(2 * Math.PI * 34 * t) ** 2;
  smooth += lowPass * (voice - smooth);
  smooth2 += lowPass * (smooth - smooth2);
  samples[i] = smooth2 * attack * release * rasp;
}
const peak = samples.reduce((max, sample) => Math.max(max, Math.abs(sample)), 0);
const wav = Buffer.alloc(44 + samples.length * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22);
wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28);
wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34);
wav.write('data', 36); wav.writeUInt32LE(samples.length * 2, 40);
samples.forEach((sample, i) => wav.writeInt16LE(Math.round(sample / peak * 0.62 * 32767), 44 + i * 2));
writeFileSync(new URL('../src/assets/audio/cat-meow.wav', import.meta.url), wav);
console.log(`cat-meow.wav: ${duration}s, ${rate}Hz mono, peak -4.2 dBFS before channel volume`);
