"""Narration engine: Kokoro-82M, local, offline, seeded.

Called by src/pipeline/narration.ts (never by hand except --selftest).

    .venv/bin/python -I scripts/tts/narrate.py --request req.json
    .venv/bin/python -I scripts/tts/narrate.py --selftest

Request (JSON) — several takes share one model load:
    {"modelDir": ".cache/kokoro/<rev>" (optional), "lines": [{"id": "hook", "text": "..."}],
     "takes": [{"voice": "am_michael" | {"mix": [["am_michael", 0.6], ...]},
                "speed": 0.95, "seed": 7, "outDir": "..."}]}

The whole script is synthesised as ONE utterance (sentence-to-sentence prosody is much more
natural than isolated lines; Kokoro is weakest on very short inputs — VOICES.md), then cut
into lines in the pauses between them using Kokoro's word timestamps. Output per line:
<outDir>/<id>.wav (24 kHz mono PCM16) + <outDir>/take.json with word timings and measured
voice statistics.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
from pathlib import Path

os.environ.setdefault("HF_HUB_OFFLINE", "1")  # never download at narration time
os.environ.setdefault("TOKENIZERS_PARALLELISM", "false")

import warnings

warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", message="dropout option adds dropout")

import numpy as np
import soundfile as sf
import torch

SR = 24000
ROOT = Path(__file__).resolve().parents[2]
REPO_ID = "hexgrad/Kokoro-82M"


def model_dir_default() -> Path:
    manifest = json.loads((ROOT / "scripts/tts/model.json").read_text())
    return ROOT / ".cache" / "kokoro" / manifest["revision"]


def load_pipeline(model_dir: Path):
    from loguru import logger

    logger.remove()  # kokoro logs every chunk at DEBUG; keep stdout clean (JSON consumers)
    logger.add(sys.stderr, level="WARNING")
    from kokoro import KModel, KPipeline

    model = KModel(repo_id=REPO_ID, config=str(model_dir / "config.json"),
                   model=str(model_dir / "kokoro-v1_0.pth")).to("cpu").eval()
    return KPipeline(lang_code="a", repo_id=REPO_ID, model=model)


def load_voice(model_dir: Path, voice) -> torch.Tensor:
    """A voice id, or a weighted mix {"mix": [[id, weight], ...]} (weights normalised)."""
    parts = [[voice, 1.0]] if isinstance(voice, str) else voice["mix"]
    total = sum(w for _, w in parts)
    pack = None
    for vid, w in parts:
        p = torch.load(model_dir / "voices" / f"{vid}.pt", weights_only=True) * (w / total)
        pack = p if pack is None else pack + p
    return pack


def alnum(s: str) -> int:
    return len(re.sub(r"[^0-9A-Za-z]", "", s))


def synthesize(pipeline, pack: torch.Tensor, text: str, speed: float, seed: int):
    """One utterance → (audio float32, word list with absolute timestamps)."""
    torch.manual_seed(seed)
    audio_parts, words, offset = [], [], 0.0
    with torch.inference_mode():
        for result in pipeline(text, voice=pack, speed=speed, split_pattern=None):
            a = result.audio.numpy().astype(np.float32)
            for t in result.tokens or []:
                if t.start_ts is None or t.end_ts is None:
                    continue
                words.append({"text": t.text, "start": offset + t.start_ts, "end": offset + t.end_ts,
                              "word": alnum(t.text) > 0})
            audio_parts.append(a)
            offset += len(a) / SR
    return np.concatenate(audio_parts), words


def quietest(audio: np.ndarray, t0: float, t1: float) -> float:
    """Time of the lowest 10 ms RMS window in [t0, t1] (cut point between lines)."""
    i0, i1 = int(t0 * SR), int(t1 * SR)
    win = int(0.010 * SR)
    if i1 - i0 <= win:
        return (t0 + t1) / 2
    seg = audio[i0:i1] ** 2
    rms = np.convolve(seg, np.ones(win) / win, mode="valid")
    return (i0 + int(np.argmin(rms)) + win // 2) / SR


def split_lines(audio: np.ndarray, words: list, lines: list):
    """Assign words to lines by cumulative alphanumeric count; cut in the pause between."""
    targets = np.cumsum([alnum(l["text"]) for l in lines])
    spoken = [w for w in words if w["word"]]
    groups, count, k = [[] for _ in lines], 0, 0
    for w in spoken:
        while k < len(lines) - 1 and count >= targets[k]:
            k += 1
        groups[k].append(w)
        count += alnum(w["text"])
    if count != targets[-1] or any(not g for g in groups):
        raise RuntimeError(f"word alignment failed: spoken {count} chars vs script {targets[-1]}")
    dur = len(audio) / SR
    cuts = [0.0]
    for a, b in zip(groups, groups[1:]):
        cuts.append(quietest(audio, a[-1]["end"], b[0]["start"]))
    cuts.append(dur)
    out = []
    for i, line in enumerate(lines):
        g = groups[i]
        # Trim to speech + natural tails, never past the neighbouring cut.
        s = max(cuts[i], g[0]["start"] - 0.06)
        e = min(cuts[i + 1], g[-1]["end"] + 0.22)
        seg = audio[int(s * SR):int(e * SR)].copy()
        fade = int(0.008 * SR)
        ramp = np.linspace(0.0, 1.0, fade, dtype=np.float32)
        seg[:fade] *= ramp
        seg[-fade:] *= ramp[::-1]
        out.append({
            "id": line["id"], "text": line["text"], "audio": seg, "sourceStart": s,
            "words": [{"text": w["text"], "start": round(w["start"] - s, 3), "end": round(w["end"] - s, 3)} for w in g],
        })
    return out


def yin_f0(x: np.ndarray, fmin=55.0, fmax=320.0, frame=0.040, hop=0.010, thresh=0.15):
    """Compact YIN pitch tracker → F0 (Hz) for voiced frames only."""
    n, h = int(frame * SR), int(hop * SR)
    tmin, tmax = int(SR / fmax), int(SR / fmin)
    energy_floor = 0.02 * np.sqrt(np.mean(x ** 2) + 1e-12)
    f0 = []
    for i in range(0, len(x) - n - tmax, h):
        w = x[i:i + n + tmax]
        if np.sqrt(np.mean(w[:n] ** 2)) < energy_floor:
            continue
        d = np.array([np.sum((w[:n] - w[tau:tau + n]) ** 2) for tau in range(tmax + 1)])
        cmnd = d[1:] * np.arange(1, tmax + 1) / (np.cumsum(d[1:]) + 1e-12)
        cand = np.where(cmnd[tmin - 1:] < thresh)[0]
        if len(cand) == 0:
            continue
        tau = cand[0] + tmin
        while tau + 1 < tmax and cmnd[tau] < cmnd[tau - 1]:
            tau += 1  # descend to the local minimum
        f0.append(SR / tau)
    return np.array(f0)


def voice_stats(audio: np.ndarray, words: list) -> dict:
    f0 = yin_f0(audio)
    spoken = [w for w in words if w["word"]]
    speech_time = sum(w["end"] - w["start"] for w in spoken)
    spec = np.abs(np.fft.rfft(audio * np.hanning(len(audio))))
    freqs = np.fft.rfftfreq(len(audio), 1 / SR)
    return {
        "f0MedianHz": round(float(np.median(f0)), 1) if len(f0) else None,
        "f0P10Hz": round(float(np.percentile(f0, 10)), 1) if len(f0) else None,
        "f0P90Hz": round(float(np.percentile(f0, 90)), 1) if len(f0) else None,
        "spectralCentroidHz": round(float(np.sum(freqs * spec) / np.sum(spec)), 0),
        "wordsPerSecondSpeaking": round(len(spoken) / speech_time, 2) if speech_time else None,
        "peak": round(float(np.max(np.abs(audio))), 3),
    }


def run(req: dict) -> list:
    model_dir = Path(req.get("modelDir") or model_dir_default())
    t0 = time.time()
    pipeline = load_pipeline(model_dir)
    t_load = time.time() - t0
    import kokoro, misaki
    text = " ".join(l["text"].strip() for l in req["lines"])
    takes = []
    for spec in req["takes"]:
        out_dir = Path(spec["outDir"])
        out_dir.mkdir(parents=True, exist_ok=True)
        pack = load_voice(model_dir, spec["voice"])
        t1 = time.time()
        audio, words = synthesize(pipeline, pack, text, float(spec.get("speed", 1.0)), int(spec.get("seed", 0)))
        t_synth = time.time() - t1
        lines = split_lines(audio, words, req["lines"])
        sf.write(out_dir / "take.wav", audio, SR, subtype="PCM_16")
        manifest_lines = []
        for l in lines:
            f = out_dir / f"{l['id']}.wav"
            sf.write(f, l["audio"], SR, subtype="PCM_16")
            manifest_lines.append({"id": l["id"], "text": l["text"], "file": f.name,
                                   "duration": round(len(l["audio"]) / SR, 3),
                                   "sourceStart": round(l["sourceStart"], 3), "words": l["words"]})
        take = {
            "sampleRate": SR, "voice": spec["voice"], "speed": spec.get("speed", 1.0), "seed": spec.get("seed", 0),
            "engine": {"kokoro": kokoro.__version__, "misaki": misaki.__version__, "torch": torch.__version__,
                       "modelRevision": model_dir.name},
            "takeDuration": round(len(audio) / SR, 3), "lines": manifest_lines,
            "stats": voice_stats(audio, words),
            "timing": {"loadSeconds": round(t_load, 2), "synthSeconds": round(t_synth, 2)},
        }
        (out_dir / "take.json").write_text(json.dumps(take, indent=2))
        takes.append(take)
    return takes


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--request")
    ap.add_argument("--selftest", action="store_true")
    args = ap.parse_args()
    torch.set_num_threads(max(1, min(4, os.cpu_count() or 1)))
    if args.selftest:
        import tempfile
        with tempfile.TemporaryDirectory() as d:
            [take] = run({"takes": [{"voice": "am_michael", "speed": 1.0, "seed": 1, "outDir": d}],
                          "lines": [{"id": "a", "text": "Make work click."}, {"id": "b", "text": "Let the system remember."}]})
        ok = take["takeDuration"] > 1.0 and len(take["lines"]) == 2 and take["stats"]["peak"] > 0.05
        print(f"selftest {'ok' if ok else 'FAILED'}: {take['takeDuration']} s audio, "
              f"load {take['timing']['loadSeconds']} s, synth {take['timing']['synthSeconds']} s")
        return 0 if ok else 1
    req = json.loads(Path(args.request).read_text())
    takes = run(req)
    print(json.dumps({"ok": True, "takes": [t["takeDuration"] for t in takes]}))
    return 0


if __name__ == "__main__":
    sys.exit(main())
