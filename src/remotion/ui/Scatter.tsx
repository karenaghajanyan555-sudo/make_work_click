import { SCATTER } from '../../video/scenes/scatter.ts';
import { ease, progress } from '../lib/anim.ts';
import { useLayout, useTime } from '../lib/hooks.ts';
import { DEPTH } from '../motion/Camera.tsx';
import { MEMO, MemoContent, memoSurface, memoWidth, type MemoData } from './Memo.tsx';

/**
 * A to-do card adrift on its depth plane (SCATTER slot `index`), dismissed outward at
 * `leaveAt`. The problem's visual signature: shared by chaosToSystem and hook.
 */
export const ScatterMemo: React.FC<{ frag: MemoData; index: number; leaveAt: number }> = ({ frag, index, leaveAt }) => {
  const { frame, f, t } = useTime();
  const layout = useLayout();
  const { u } = layout;
  const slot = SCATTER[index]!;
  const plane = DEPTH[slot.plane];
  const exit = progress(frame, f(leaveAt + index * 0.03), f(0.55), ease.in);
  const w = memoWidth(frag) * u;
  const h = MEMO.height * u;
  const x = slot.x * u + Math.sin((frame + index * 40) / 45) * 6 * plane.drift;
  const y = slot.y * u - t * 30 * plane.drift;
  const away = { x: (x + w / 2 - layout.width / 2) * 0.4 * exit, y: (y + h / 2 - layout.safe.cy) * 0.4 * exit };
  if (exit >= 1) return null;
  return (
    <div
      style={{
        position: 'absolute',
        left: x + away.x,
        top: y + away.y,
        width: w,
        height: h,
        transform: `rotate(${slot.rotate}deg) scale(${plane.scale * (1 + exit * 0.1)})`,
        transformOrigin: 'left top',
        opacity: plane.opacity * (1 - exit),
        filter: `blur(${plane.blur + exit * 14}px)`,
        ...memoSurface(u),
      }}
    >
      <MemoContent memo={frag} u={u} />
    </div>
  );
};
