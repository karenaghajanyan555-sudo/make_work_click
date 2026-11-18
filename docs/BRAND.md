# Brand — art direction and motion language

**Idea.** Work should click into place. Every video shows a messy, manual way of working
turning into a quiet, precise system. The look is *editorial technology*: a studio's
technical plate (dark, printed, annotated) that a clean piece of software comes alive in.

## Two worlds
| | Brand world | Product world |
|---|---|---|
| Role | The story: problem, emotion, claims | The proof: the system working |
| Ground | Ink `#0A0B0D`, drifting key light, vignette, film grain | Light UI: canvas `#F4F3EF`, white surfaces |
| Type | Geist display + Instrument Serif italic emphasis + Geist Mono labels | Geist UI sizes |
| Feel | Cinematic, quiet, editorial | Real, crisp, legible software |

The product world appears *inside* the brand world, lit by it. Transitions between them
are physical (cards flip, windows build), never a light surface fading over the dark ground
(it passes through muddy grey — forbidden).

## Signature (what makes a frame recognisably ours)
1. **Spec frame** — registration marks at the live-area corners, `MAKE WORK CLICK N° 00x`
   series mark, running timecode, chapter label (`01 — By memory` → `02 — By system`).
   On every video, always.
2. **The click** — a switch turning on. It is the brand mark (`ToggleMark`), the app's
   automation switch, and the moment the story turns. Accompanied by `ClickRipple`, a light
   sweep and the shift of light to signal. The spec frame's mini switch turns on with it.
3. **Serif italic emphasis** — one emotionally loaded word per headline in Instrument Serif
   italic (`*memory.*`). When that word is the system's doing, it is also signal lime
   (`**remember**`).
4. **One accent** — signal lime `#C9F25D`, which only ever means "the system did this".

## Colour
- Ink, graphite, paper, fog, smoke — neutrals (tokens in `src/brand/tokens.ts`).
- Signal lime: automated states (Sent, Live, ripples, connector fill, light after the click,
  signal words). Never decoration, never on the "before" side of a story.
- Friction coral `#FF8A65`: only on "before" items (Overdue, Forgot). Small, sparing.
- No other hues except the fictional workspace avatar's muted tan.
- The ad disclosure (affiliate videos, D42) is neutral: paper text, a hairline pill around a
  mono "AD", type role `disclosure` (30 u, below the CTA's 46). Never lime (it is not the
  system's doing), never coral. Partners are named in our type, never with their logo.

## Typography
| Role | Spec | Use |
|---|---|---|
| display | Geist 620, 112u, tracking −0.045em, leading 1.0 | Hook headline (≤ 3 lines) |
| title | Geist 620, 88u, −0.042em | Captions/resolution lines (≤ 2 lines) |
| emphasis | Instrument Serif italic, ×1.12 | One word per phrase |
| label | Geist Mono 500, 19u, +0.10em, uppercase | Annotations, chapters, timecode |
| uiTitle / uiBody / uiChip | Geist 30 / 22 / 21u | Product UI |
Left-aligned editorial headlines on the gutter (88u); centred only for end cards.
Typographic quotes and apostrophes (’ “ ”) always.

## Composition
- Critical content in the live area (safe zone). The bottom 35% carries only atmosphere
  (light, depth, decorative items) because platform UI covers it.
- One focal point per moment. Headline and product never compete: one exits as the other
  takes over.
- Depth through three planes (far / mid / near) with real depth of field; foreground items
  may cross the frame edge out of focus.

## Light and texture
- Key light drifts slowly top-left; vignette ~0.6. Light tells the story: neutral and cool
  in the "before", signal bounce under the product after the click, a brief flash at it.
- Film grain always on, in the ground layer (normal blend, ~0.06 over a mean-128 tile, ground
  pre-darkened so perceived ink stays `#0A0B0D`). It dithers gradients against banding; text
  and UI stay crisp on top of it.
- **Wide light is neutral; lime light is tight** (D40). The grain dithers brightness only: a
  wide, faint lime glow breaks into hue rings after H.264 4:2:0 (measured, and seen by the
  owner as "pixels"). Use `SoftLight`: a key-light-coloured bloom with smoothstep falloff and a
  lime core ≤ ~320 units wide, where its gradient is steep enough not to band.

## Motion language
- **Character:** confident, precise, unhurried. Fast departure, long soft settle, no bounce,
  no overshoot (the one "pop" allowed is a chip resolving).
- **Easings** (`ease` in `src/remotion/lib/anim.ts`): `out` entrances, `in` exits, `inOut`
  camera/state, `snap` magnetic travel into place, `glide` premium reveals and travel (leaves
  from rest, long settle: no pop).
- **Durations** (tokens): micro 0.2s · quick 0.33s · base 0.55s · slow 0.8s · travel 0.95s.
  Word stagger 0.1s, item stagger 0.06–0.1s.
- **Entrances:** rise ~0.4em into focus from 12px blur. **Exits:** lift and defocus as one.
- **Camera:** slow push during a hold (≤ 3.5%), settle when the system assembles, gentle push
  while it runs. Never handheld shake, never fast zooms. Premium scenes (`smooth`, D40): one
  continuous path through the keys — no stop-start at every key, no speed jump at a cut, no
  leaning in and out on each step. Pushes on type run on the compositor-moved camera layer
  (D41): glyphs snap to whole pixels otherwise, and a slow push on text stutters. The reel
  opens already moving and the end card is still pushing on its last frame.
- **Transitions:** `focusPull` hand-off (outgoing defocuses over 10 frames, 4-frame overlap)
  or a hard `cut` on a beat; presets add push, wipe, zoom-through, blur and fade
  (src/video/timeline.ts `TRANSITIONS`). Inside scenes, prefer physical transformations
  (gather, flip, build) over crossfades.
- **Micro-interactions:** chips change state (Queued → spinner → Sent ✓ pop), connectors
  fill as a signal pulse travels, active steps get a signal focus ring.
- Every movement must answer "what does this tell the viewer?" Otherwise remove it.

## Presets (src/brand/presets.ts)
A preset varies how a video moves and is arranged — never what the brand is. Palette,
fonts, signal meaning, spec frame, grain and easing curves are identical in all five.
| Preset | Composition | Motion | Hand-off |
|---|---|---|---|
| `editorial` (v001) | left on the gutter, display type | camera 1×, word stagger 0.1 s | focus pull |
| `cinematic` | left, display | slower (tempo 1.15), camera 1.6×, more light, deeper vignette | blur |
| `minimal` | centred, display | camera 0.3×, quiet | fade (type-led scenes only) |
| `data` (v002) | centred, title | snappier (tempo 0.9), camera 0.6× | push (slide) |
| `product` | left, title | camera 1.25× | zoom-through |
Hand-offs that move light UI never cross-fade it over the dark ground (push, wipe, cut).

## Never
Emoji · stock photos · clip-art · fake real-product UIs or logos · rainbow gradients ·
glassmorphism blur panels · tilted phone/laptop mockups · bouncy springs · typewriter text ·
word-by-word karaoke captions · more than one accent colour.
