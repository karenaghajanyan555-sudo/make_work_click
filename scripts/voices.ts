/**
 * Narrator audition: synthesise a video's narration with every candidate voice
 * (src/brand/voice.ts), lay the lines on the planned timeline, level-match, encode.
 *
 *   npm run voices -- <videoId>      → out/<id>/voices/{<label>.m4a, report.md, report.json}
 *
 * Level-matched to the same loudness so the comparison is about the voice, not volume.
 */
import { rmSync } from 'node:fs';
import path from 'node:path';
import { writeFileSync } from 'node:fs';
import { getVideo } from '../content/index.ts';
import { NARRATOR, NARRATOR_CANDIDATES, type VoiceSpec } from '../src/brand/voice.ts';
import { encodeAac, masterVoice, measureLoudness, placeSegments, readWav, writeWav } from '../src/pipeline/audio.ts';
import { probe } from '../src/pipeline/ffmpeg.ts';
import { synthesizeTakes } from '../src/pipeline/narration.ts';
import { videoOut } from '../src/pipeline/paths.ts';
import { placeNarration } from '../src/video/narration.ts';

const AUDITION = { targetLufs: -16, maxTruePeakDbtp: -1.0, bitrateK: 192, tailSeconds: 0.8 } as const;

const id = process.argv[2];
if (!id || id.startsWith('--')) {
  console.error('Usage: npm run voices -- <videoId>');
  process.exit(2);
}
const spec = getVideo(id);
if (!spec.narration) {
  console.error(`${id} has no narration block`);
  process.exit(2);
}
const narration = spec.narration;
// The approved narrator is always the reference; challengers come from NARRATOR_CANDIDATES.
const voices: VoiceSpec[] = [...(NARRATOR ? [NARRATOR] : []), ...NARRATOR_CANDIDATES];
const outRoot = path.join(videoOut(id), 'voices');
rmSync(outRoot, { recursive: true, force: true });

const started = performance.now();
const takes = await synthesizeTakes(voices, narration.lines.map(({ id, text }) => ({ id, text })), path.join(outRoot, 'takes'));
const synthSeconds = (performance.now() - started) / 1000;

type Row = { candidate: VoiceSpec; file: string; duration: number; loudness: { after: number; truePeak: number; iterations: number }; problems: string[]; stats: unknown; audio: string };
const rows: Row[] = [];
for (const c of voices) {
  const take = takes.get(c.label)!;
  const pcms = new Map(take.lines.map((l) => [l.id, readWav(path.join(take.dir, l.file))]));
  const durations = Object.fromEntries(take.lines.map((l) => [l.id, l.duration]));
  const lastAt = Math.max(...narration.lines.map((l) => l.at));
  const { placed, problems } = placeNarration(narration, durations, Infinity, { shift: true });
  const total = Math.max(lastAt, placed.at(-1)!.end) + AUDITION.tailSeconds;
  const track = placeSegments(placed.map((p) => ({ pcm: pcms.get(p.id)!, at: p.start })), take.sampleRate, total);
  const wav = path.join(outRoot, `${c.label}.wav`);
  const mastered = await masterVoice(track, AUDITION.targetLufs, path.join(outRoot, 'takes', `${c.label}.work.wav`));
  writeWav(wav, mastered.pcm);
  const m4a = path.join(outRoot, `${c.label}.m4a`);
  await encodeAac(wav, m4a, { bitrateK: AUDITION.bitrateK });
  const after = await measureLoudness(m4a);
  if (Math.abs(after.integratedLufs - AUDITION.targetLufs) > 0.5) problems.push(`loudness ${after.integratedLufs} LUFS misses ${AUDITION.targetLufs}`);
  if (after.truePeakDbtp > AUDITION.maxTruePeakDbtp) problems.push(`true peak ${after.truePeakDbtp} dBTP > ${AUDITION.maxTruePeakDbtp}`);
  const p = await probe(m4a);
  const a = p.streams.find((s) => s.codec_type === 'audio');
  const audio = `${a?.codec_name} ${a?.sample_rate} Hz ${a?.channels} ch, ${Number(p.format.duration).toFixed(2)} s`;
  rows.push({ candidate: c, file: path.relative(videoOut(id), m4a), duration: total, loudness: { after: after.integratedLufs, truePeak: after.truePeakDbtp, iterations: mastered.iterations }, problems, stats: take.stats, audio });
  console.log(`  ✓ ${c.label}: ${audio}, ${after.integratedLufs} LUFS, TP ${after.truePeakDbtp} dBTP${problems.length ? ` — ${problems.join('; ')}` : ''}`);
}

const voiceName = (v: VoiceSpec['voice']) => (typeof v === 'string' ? v : v.mix.map(([n, w]) => `${n} ${Math.round(w * 100)}%`).join(' + '));
const md = [
  `# Narrator audition — ${id}`,
  '',
  `Narration bus (high-pass, compressor, limiter — src/pipeline/audio.ts VOICE_CHAIN), level-matched to ${AUDITION.targetLufs} LUFS, AAC ${AUDITION.bitrateK} kb/s 48 kHz stereo.`,
  `Lines placed at the storyboard's planned times. Synthesis wall time ${synthSeconds.toFixed(1)} s for ${rows.length} takes.`,
  '',
  '| File | Voice | Speed | Median pitch (p10–p90) | Speaking rate | Loudness / TP | Timing |',
  '|---|---|---|---|---|---|---|',
  ...rows.map((r) => {
    const s = r.stats as { f0MedianHz: number; f0P10Hz: number; f0P90Hz: number; wordsPerSecondSpeaking: number };
    return `| ${r.file} | ${voiceName(r.candidate.voice)} | ${r.candidate.speed} | ${s.f0MedianHz} Hz (${s.f0P10Hz}–${s.f0P90Hz}) | ${s.wordsPerSecondSpeaking} words/s | ${r.loudness.after} LUFS / ${r.loudness.truePeak} dBTP | ${r.problems.length ? r.problems.join('; ') : 'fits plan'} |`;
  }),
  '',
  'Pitch and rate are measured (YIN pitch tracker; words ÷ time spent speaking). "Warm" and',
  '"natural" are judged by listening — the numbers do not measure them.',
  '',
].join('\n');
writeFileSync(path.join(outRoot, 'report.md'), md);
writeFileSync(path.join(outRoot, 'report.json'), JSON.stringify({ id, synthSeconds, rows }, null, 2));
console.log(`\n${path.join(outRoot, 'report.md')}`);
