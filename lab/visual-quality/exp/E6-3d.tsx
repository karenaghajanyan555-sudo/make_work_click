/**
 * LAB ONLY — E6 3D. One subject, two renderers, the same pure choreography:
 * five to-dos lie in a stack; the camera orbits as they fan out; each card flips to show what the
 * system did (lime back). Only the renderer differs.
 *   e6-stack-css    CSS 3D (preserve-3d, backface hidden), shading from the face normal (pure)
 *   e6-stack-three  @remotion/three + three 0.187.0 + R3F 9.8.2 under swangle: real slabs,
 *                   MeshStandardMaterial, a key light with soft shadow maps, canvas-texture faces
 * Pose functions are shared, so the two clips are frame-for-frame the same motion.
 */
import { useMemo } from 'react';
import { ThreeCanvas } from '@remotion/three';
import { useCurrentFrame, useVideoConfig } from 'remotion';
import * as THREE from 'three';
import { fonts, palette, radius, type } from '../../../src/brand/tokens.ts';
import { ease, lerp, progress, withAlpha } from '../../../src/remotion/lib/anim.ts';
import { useFontsReady } from '../../../src/remotion/lib/fonts.ts';
import { useLayout, useTime } from '../../../src/remotion/lib/hooks.ts';
import { Stage } from '../shared.tsx';

const ITEMS = ['Did Maya’s payment clear?', 'Send Maya her login', 'Add Maya to my customers', 'Check in with Maya Friday', 'Update the sales sheet'];
const DONE = ['Payment confirmed 9:12', 'Login sent 9:12', 'Added to customers', 'Check-in booked Fri', 'Sheet updated'];
export const CARD3 = { w: 640, h: 150, d: 8 };
export const PERSPECTIVE3 = 1700;

// ---------------------------------------------------------------------------------------------
// Pure choreography (base units, degrees; CSS axes: x right, y down, z toward the viewer)

export function camera3(frame: number, fps: number) {
  const k = progress(frame, 0, 3.6 * fps, ease.inOut);
  return { orbit: lerp(-28, 14, k), tilt: lerp(18, 8, k) };
}
export function card3(i: number, frame: number, fps: number) {
  const fan = progress(frame, 0.15 * fps + i * 2, 1.3 * fps, ease.glide);
  const flip = progress(frame, (1.7 + i * 0.22) * fps, 0.55 * fps, ease.snap);
  const n = ITEMS.length;
  const c = i - (n - 1) / 2;
  return {
    x: lerp(c * 6, c * 18, fan),
    y: lerp(c * -10, c * 178, fan),
    z: lerp(c * -14, -Math.abs(c) * 60, fan),
    ry: lerp(c * 2, c * -7, fan),
    rx: flip * 180,
    rz: lerp(c * 3, 0, fan),
    flip,
  };
}
/** Lambert-like shade 0..1 for a face normal after the card + world rotations (light from the top left, toward the viewer). */
export function shade3(rx: number, ry: number, orbit: number, tilt: number): number {
  const d = Math.PI / 180;
  // Normal of the visible face: front (0,0,1) or back (0,0,-1) after rx; then ry + orbit about y; then tilt about x.
  let nx = 0;
  let ny = Math.sin(rx * d);
  let nz = Math.cos(rx * d);
  if (nz < 0) {
    ny = -ny;
    nz = -nz;
  }
  const a = (ry + orbit) * d;
  [nx, nz] = [nx * Math.cos(a) + nz * Math.sin(a), -nx * Math.sin(a) + nz * Math.cos(a)];
  const b = tilt * d;
  [ny, nz] = [ny * Math.cos(b) - nz * Math.sin(b), ny * Math.sin(b) + nz * Math.cos(b)];
  const L = [-0.35, -0.5, 0.79];
  return Math.max(0, nx * L[0]! + ny * L[1]! + nz * L[2]!);
}

// ---------------------------------------------------------------------------------------------
// CSS 3D

const FaceFront: React.FC<{ text: string; u: number }> = ({ text, u }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: radius.memo * u, background: palette.memoryCard, border: `${1.5 * u}px solid ${palette.hairline}`, display: 'flex', alignItems: 'center', gap: 22 * u, padding: `0 ${34 * u}px`, backfaceVisibility: 'hidden', fontFamily: fonts.sans, fontSize: type.memo.size * 1.15 * u, fontWeight: type.memo.weight, letterSpacing: type.memo.tracking, color: palette.memoryText, whiteSpace: 'nowrap' }}>
    <div style={{ width: 32 * u, height: 32 * u, borderRadius: 8 * u, border: `${2.5 * u}px solid ${palette.fog}` }} />
    {text}
  </div>
);
const FaceBack: React.FC<{ text: string; u: number }> = ({ text, u }) => (
  <div style={{ position: 'absolute', inset: 0, borderRadius: radius.memo * u, background: palette.signal, display: 'flex', alignItems: 'center', gap: 22 * u, padding: `0 ${34 * u}px`, backfaceVisibility: 'hidden', transform: 'rotateX(180deg)', fontFamily: fonts.sans, fontSize: type.memo.size * 1.15 * u, fontWeight: 620, letterSpacing: type.memo.tracking, color: palette.signalInk, whiteSpace: 'nowrap' }}>
    <svg width={32 * u} height={32 * u} viewBox="0 0 24 24" fill="none" stroke={palette.signalInk} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5" />
    </svg>
    {text}
  </div>
);

export const StackCss: React.FC = () => {
  const { frame, fps } = useTime();
  const { u, safe, width } = useLayout();
  const cam = camera3(frame, fps);
  return (
    <Stage tag="E6 · A · CSS 3D (preserve-3d), normal shading">
      <div style={{ position: 'absolute', inset: 0, perspective: PERSPECTIVE3 * u, perspectiveOrigin: `${width / 2}px ${safe.cy}px` }}>
        <div style={{ position: 'absolute', left: width / 2, top: safe.cy, transformStyle: 'preserve-3d', transform: `rotateX(${-cam.tilt}deg) rotateY(${cam.orbit}deg)` }}>
          {ITEMS.map((text, i) => {
            const p = card3(i, frame, fps);
            const s = shade3(p.rx, p.ry, cam.orbit, cam.tilt);
            return (
              <div
                key={i}
                style={{ position: 'absolute', left: (-CARD3.w / 2) * u, top: (-CARD3.h / 2) * u, width: CARD3.w * u, height: CARD3.h * u, transformStyle: 'preserve-3d', transform: `translate3d(${p.x * u}px, ${p.y * u}px, ${p.z * u}px) rotateZ(${p.rz}deg) rotateY(${p.ry}deg) rotateX(${p.rx}deg)` }}
              >
                <FaceFront text={text} u={u} />
                <FaceBack text={DONE[i]!} u={u} />
                {/* Shading: a darkening veil on whichever face is visible (pure, no light model in CSS). */}
                <div style={{ position: 'absolute', inset: 0, borderRadius: radius.memo * u, background: withAlpha(palette.ink, (1 - s) * 0.55), transform: p.rx > 90 ? 'rotateX(180deg) translateZ(0.5px)' : 'translateZ(0.5px)', backfaceVisibility: 'hidden', pointerEvents: 'none' }} />
              </div>
            );
          })}
        </div>
      </div>
    </Stage>
  );
};

// ---------------------------------------------------------------------------------------------
// three.js

/** A face texture drawn with Canvas 2D in the brand fonts (2× for crispness). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function faceTexture(text: string, back: boolean, u: number): any {
  const S = 2;
  const w = Math.round(CARD3.w * u * S);
  const h = Math.round(CARD3.h * u * S);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const r = radius.memo * u * S;
  g.fillStyle = back ? palette.signal : '#1A1D23';
  g.beginPath();
  g.roundRect(0, 0, w, h, r);
  g.fill();
  if (!back) {
    g.strokeStyle = palette.hairline;
    g.lineWidth = 1.5 * u * S;
    g.stroke();
  }
  const fs = type.memo.size * 1.15 * u * S;
  const x0 = 34 * u * S;
  const box = 32 * u * S;
  if (back) {
    g.strokeStyle = palette.signalInk;
    g.lineWidth = 2.6 * (box / 24);
    g.lineCap = 'round';
    g.lineJoin = 'round';
    g.beginPath();
    g.moveTo(x0 + (5 / 24) * box, h / 2 + (0.5 / 24) * box);
    g.lineTo(x0 + (9.5 / 24) * box, h / 2 + (5 / 24) * box);
    g.lineTo(x0 + (19 / 24) * box, h / 2 - (4.5 / 24) * box);
    g.stroke();
  } else {
    g.strokeStyle = palette.fog;
    g.lineWidth = 2.5 * u * S;
    g.beginPath();
    g.roundRect(x0, h / 2 - box / 2, box, box, 8 * u * S);
    g.stroke();
  }
  g.fillStyle = back ? palette.signalInk : palette.memoryText;
  g.font = `${back ? 620 : type.memo.weight} ${fs}px Geist`;
  g.letterSpacing = `${-0.015 * fs}px`;
  g.textBaseline = 'middle';
  g.fillText(text, x0 + box + 22 * u * S, h / 2 + fs * 0.04);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const Slab: React.FC<{ i: number; u: number; frame: number; fps: number }> = ({ i, u, frame, fps }) => {
  const front = useMemo(() => faceTexture(ITEMS[i]!, false, u), [i, u]);
  const back = useMemo(() => faceTexture(DONE[i]!, true, u), [i, u]);
  const p = card3(i, frame, fps);
  const d = Math.PI / 180;
  // Box material order: +x, −x, +y, −y, +z (front), −z (back). The back texture is mapped on the −z face,
  // which three draws mirrored horizontally: flip it with repeat.x = −1.
  const backMap = useMemo(() => {
    const t = back.clone();
    t.wrapS = THREE.RepeatWrapping;
    t.repeat.x = -1;
    t.repeat.y = -1;
    t.wrapT = THREE.RepeatWrapping;
    t.needsUpdate = true;
    return t;
  }, [back]);
  const edge = i % 2 ? '#22262D' : '#1F2329';
  return (
    <mesh castShadow receiveShadow position={[p.x * u, -p.y * u, p.z * u]} rotation={new THREE.Euler(-p.rx * d, p.ry * d, -p.rz * d, 'ZYX')}>
      <boxGeometry args={[CARD3.w * u, CARD3.h * u, CARD3.d * u]} />
      <meshStandardMaterial attach="material-0" color={edge} roughness={0.7} />
      <meshStandardMaterial attach="material-1" color={edge} roughness={0.7} />
      <meshStandardMaterial attach="material-2" color={edge} roughness={0.7} />
      <meshStandardMaterial attach="material-3" color={edge} roughness={0.7} />
      <meshStandardMaterial attach="material-4" map={front} roughness={0.55} transparent />
      <meshStandardMaterial attach="material-5" map={backMap} roughness={0.45} transparent />
    </mesh>
  );
};

const Scene3: React.FC<{ u: number }> = ({ u }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const cam = camera3(frame, fps);
  const d = Math.PI / 180;
  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[-700 * u, 1000 * u, 1500 * u]} intensity={2.1} castShadow shadow-mapSize-width={1024} shadow-mapSize-height={1024} shadow-camera-left={-900} shadow-camera-right={900} shadow-camera-top={900} shadow-camera-bottom={-900} shadow-camera-near={100} shadow-camera-far={4000} shadow-bias={-0.0004} shadow-radius={6} />
      <group rotation={new THREE.Euler(cam.tilt * d, cam.orbit * d, 0, 'XYZ')}>
        {ITEMS.map((_, i) => (
          <Slab key={i} i={i} u={u} frame={frame} fps={fps} />
        ))}
      </group>
    </>
  );
};

export const StackThree: React.FC = () => {
  const { u, safe, width, height } = useLayout();
  const ready = useFontsReady();
  const fov = (2 * Math.atan(height / 2 / (PERSPECTIVE3 * u)) * 180) / Math.PI;
  return (
    <Stage tag="E6 · B · three.js (R3F) slabs, key light, soft shadows">
      {ready ? (
        <ThreeCanvas
          width={width}
          height={height}
          // The perspective origin sits on the live-area centre, like the CSS version.
          style={{ position: 'absolute', left: 0, top: safe.cy - height / 2 }}
          camera={{ fov, position: [0, 0, PERSPECTIVE3 * u], near: 10, far: 6000 }}
          shadows="soft"
          gl={{ antialias: true, alpha: true, toneMapping: THREE.NoToneMapping }}
        >
          <Scene3 u={u} />
        </ThreeCanvas>
      ) : null}
    </Stage>
  );
};
