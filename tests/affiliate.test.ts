import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VIDEOS } from '../content/index.ts';
import { libraryAffiliate } from '../content/videos/library-affiliate.ts';
import { computeLayout, isInsideSafe } from '../src/brand/format.ts';
import { PARTNERS } from '../src/brand/partners.ts';
import { type } from '../src/brand/tokens.ts';
import { applyAffiliate, disclosureFor, names } from '../src/video/affiliate.ts';
import { defineVideo } from '../src/video/define.ts';
import { postText, validatePublish } from '../src/video/publish.ts';
import { DISCLOSURE_READ_SECONDS, disclosureAt, END_CARD_LAYOUT, endCardBeats } from '../src/video/scenes/endCard.ts';
import { validateSpec, type SceneSpec, type VideoSpec } from '../src/video/spec.ts';

const sio = PARTNERS['systeme-io'];
const endCard = (cta = 'Follow for more *systems* like this.'): SceneSpec => ({ id: 'outro', type: 'endCard', duration: 3, props: { cta } });
const statement = (text: string): SceneSpec => ({ id: 'idea', type: 'statement', duration: 3, props: { text } });
const video = (over: Partial<VideoSpec> = {}): VideoSpec => ({
  id: 'aff-test',
  title: 'Affiliate test',
  series: 'Test',
  format: 'vertical',
  theme: 'ink',
  status: 'prototype',
  captions: { enabled: false },
  scenes: [statement('One booking page that takes the deposit.'), endCard()],
  ...over,
});
const affiliate = (over: Partial<VideoSpec> = {}) => applyAffiliate(video({ affiliate: { partner: 'systeme-io' }, scenes: [statement('One booking page that takes the deposit.'), endCard('The tool I’d use: *systeme.io*')], ...over }));
const has = (errors: string[], part: string) => assert.ok(errors.some((e) => e.includes(part)), `expected an error containing "${part}", got:\n${errors.join('\n')}`);

test('affiliate: knowledge videos are untouched (no field, no tag, same object)', () => {
  for (const spec of VIDEOS.filter((v) => !v.affiliate)) {
    assert.equal(applyAffiliate(spec), spec, spec.id);
    for (const s of spec.scenes) if (s.type === 'endCard') assert.equal(s.props.disclosure, undefined, spec.id);
  }
});

test('affiliate: the library example is valid and carries the tag long enough to read', () => {
  assert.deepEqual(validateSpec(libraryAffiliate), []);
  const last = libraryAffiliate.scenes.at(-1)!;
  assert.equal(last.type, 'endCard');
  if (last.type !== 'endCard') return;
  assert.deepEqual(last.props.disclosure, { label: 'Ad', text: 'I earn a commission from systeme.io through the link in my bio.' });
  assert.ok(last.duration >= disclosureAt(endCardBeats(last.props)) + DISCLOSURE_READ_SECONDS - 1e-9, `end card ${last.duration}s`);
  assert.ok(Number.isInteger(Math.round(last.duration * 30 * 1e6) / 1e6), 'whole frames');
});

test('affiliate: defineVideo adds the disclosure; a raw spec without it is refused', () => {
  const authored = { ...video({ affiliate: { partner: 'systeme-io' } }), scenes: [statement('One page takes the deposit.'), endCard('The tool I’d use: *systeme.io*')] };
  const defined = defineVideo(authored);
  const last = defined.scenes.at(-1)!;
  assert.ok(last.type === 'endCard' && last.props.disclosure?.label === 'Ad');
  has(validateSpec(authored), 'must carry the disclosure');
});

test('affiliate: a partner can never be named without the disclosure', () => {
  has(validateSpec(video({ scenes: [statement('Try systeme.io for this.'), endCard()] })), 'names systeme.io, a paid partner');
  has(validateSpec(video({ scenes: [statement('A booking page.'), endCard('Built on *Systeme IO*.')] })), 'names systeme.io');
  has(validateSpec(video({ narration: { lines: [{ id: 'l1', text: 'I set this up in Systeme.', at: 0 }] } })), 'narration "l1"');
  has(validateSpec(video({ publish: { coverAt: 1, title: 'Bookings that pay', caption: 'Made with systeme.io', hashtags: [] } })), 'publish copy names systeme.io');
  const manual = video({ scenes: [statement('A booking page.'), { id: 'outro', type: 'endCard', duration: 4, props: { cta: 'Follow.', disclosure: { label: 'Ad', text: 'x' } } }] });
  has(validateSpec(manual), 'an ad disclosure on a video without affiliate');
});

test('affiliate: teach first — the partner appears on the end card only, unless the voice disclosed it', () => {
  assert.deepEqual(validateSpec(affiliate()), []);
  has(validateSpec(affiliate({ scenes: [statement('Open systeme.io and add a calendar.'), endCard('Link in bio.')] })), 'shows systeme.io before the end card');
  // Named out loud: the first line that names it must say the disclosure.
  const said = (text: string): Partial<VideoSpec> => ({ narration: { lines: [{ id: 'l1', text, at: 0.2 }] }, scenes: [statement('Open systeme.io and add a calendar.'), endCard('Link in bio.')] });
  has(validateSpec(affiliate(said('Open systeme.io and add a calendar.'))), 'without the spoken disclosure');
  assert.deepEqual(validateSpec(affiliate(said('Full disclosure: I earn a commission from systeme.io.'))), []);
});

test('affiliate: the end card must be last and hold the tag ≥ the reading time', () => {
  has(validateSpec(applyAffiliate(video({ affiliate: { partner: 'systeme-io' }, scenes: [endCard('*systeme.io*'), statement('After.')] }))), 'ends on an endCard');
  const short = affiliate();
  const last = short.scenes.at(-1)!;
  if (last.type !== 'endCard') throw new Error('fixture');
  has(validateSpec({ ...short, scenes: [short.scenes[0]!, { ...last, duration: 2 }] }), `needs ≥ ${DISCLOSURE_READ_SECONDS} s`);
});

test('affiliate: unknown partner and bad deep links are refused; deep links build', () => {
  has(validateSpec(video({ affiliate: { partner: 'acme' as never } })), 'is not a partner');
  has(validateSpec(affiliate({ affiliate: { partner: 'systeme-io', page: 'https://x' } })), 'must be a page path');
  assert.equal(disclosureFor({ partner: 'systeme-io', page: 'booking-calendar' }).link, 'https://systeme.io/booking-calendar?sa=sa0286549007496fe803218a3f1a238a9bf66cc091');
  assert.equal(disclosureFor({ partner: 'systeme-io' }).link, sio.link);
});

test('affiliate: naming matches the brand, not ordinary words', () => {
  for (const t of ['systeme.io', 'Systeme.io', 'SYSTEME IO', 'on systeme today', '(systeme.io)']) assert.ok(names(t, sio), t);
  for (const t of ['system', 'systems', 'ecosystem', 'Your system remembers.', 'systemic']) assert.ok(!names(t, sio), t);
});

test('affiliate: the caption leads with the disclosure; links stay out, the name is allowed', () => {
  const d = disclosureFor({ partner: 'systeme-io' });
  const pub = { coverAt: 1, title: 'Bookings that pay first', caption: 'The deposit comes before the call.', hashtags: ['#bookings'] };
  const text = postText(pub, d.caption);
  assert.ok(text.startsWith('Ad: I earn a commission from systeme.io'), text);
  assert.equal(postText({ ...pub, caption: `${d.caption}\n\nBody.` }, d.caption).split('Ad:').length, 2, 'not duplicated');
  assert.equal(postText(pub), 'The deposit comes before the call.\n\n#bookings', 'knowledge videos unchanged');
  assert.deepEqual(validatePublish({ ...pub, caption: 'Built on systeme.io.' }, 10, ['systeme.io']), []);
  has(validatePublish({ ...pub, caption: 'Built on systeme.io.' }, 10), 'no links');
  has(validatePublish({ ...pub, caption: `Try ${sio.link}` }, 10, ['systeme.io']), 'no links');
});

test('affiliate: the tag sits inside the safe zone, below the CTA', () => {
  const layout = computeLayout(1080, 1920);
  const L = END_CARD_LAYOUT;
  const t = type.disclosure;
  const box = { x: layout.gutter, y: L.disclosureTop, width: 1080 - 2 * layout.gutter, height: L.disclosureLines * t.size * t.leading };
  assert.ok(isInsideSafe(layout, box), JSON.stringify(box));
  assert.ok(L.ctaTop + L.ctaLines * type.lead.size * type.lead.leading < L.disclosureTop, 'clear of a two-line CTA');
  assert.ok(t.size < type.lead.size, 'never competes with the CTA');
});
