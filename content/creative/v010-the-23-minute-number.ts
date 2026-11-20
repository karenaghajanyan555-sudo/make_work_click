import type { CreativeRecord } from '../../src/creative/diversity.ts';

/**
 * N° 010 — "Where “23 minutes” comes from": creative record (D46). Storyboard:
 * docs/storyboards/v010-the-23-minute-number.md (§ 11 E2 "The other half" is the approved
 * execution). PLANNED — concept + storytelling approved; the visual execution (look test) is not
 * yet approved; no production scene type, spec, voice or render exists.
 */
export const record: CreativeRecord = {
  id: 'v010-the-23-minute-number',
  seq: 7,
  title: 'Where “23 minutes” comes from',
  status: 'planned',
  subject: {
    basis: 'planned',
    value: 'The quoted "23 minutes to refocus after an interruption": where it comes from, what it measured, the real cost, and a one-minute fix from a 2018 study',
    source: 'Gallup Business Journal Q&A with Gloria Mark (2006-06-08); Mark, González & Harris, CHI 2005; Leroy & Glomb, Organization Science 2018',
  },
  opening: { basis: 'planned', value: { kind: 'evidence-close-up', description: 'Extreme macro of a torn paper strip on the ink ground printed only “on average, in 23 minutes and 15 seconds,”, torn off right after the comma; fibres catch a moving key light; a draught lifts its end. No headline, no music.' } },
  hook: { basis: 'planned', value: { kind: 'myth', description: 'States the number the way people repeat it over the scrap of its real source; the torn edge and the piece counter (1 / 5) open the question of the missing half.', text: 'You’ve seen this number: twenty-three minutes to refocus after an interruption.' } },
  structure: { basis: 'planned', value: { kind: 'investigation', description: 'Reconstruction in five pieces, each a new fact: the scrap → the other half (“not so long”) → the question and “the good news” → the bad news (the page is buried) → the blank fifth piece, which is the viewer’s note.' } },
  visual: { basis: 'planned', value: { kind: 'paper-trail', description: 'A torn printed page reassembled piece by piece on the ink ground, macro editorial photography: fibres, torn edges, layered shadows, one soft key light; at the good→bad turn the page is knocked askew and buried by other papers.' } },
  demonstration: { basis: 'planned', value: { kind: 'document-evidence', description: 'Her 2006 answer typeset verbatim (our type, no logo, no screenshot) as the pieces of the page; the 2018 study cited on the note.' } },
  ending: { basis: 'planned', value: { kind: 'save-artifact', description: 'The fifth piece — a ready-to-resume slip (stopped at · still open · next) — tears off its perforation and lifts toward the camera, held for a screenshot; the MAKE WORK CLICK mark is its small signature, the switch the only lime.' } },
  intent: { basis: 'planned', value: 'The number travels without its sentence; her bad news is that “it’s harder to reconstruct where you were”. Reconstructing the page makes the viewer do exactly that, reveals that the famous number was her good news, and ends on the piece that prevents it.' },
  directions: {
    basis: 'planned',
    value: [
      {
        name: 'A · The paper trail (investigative documentary)',
        summary: 'Start on the number, pull back to its 2006 source, read her actual words, show what was measured and the real cost, end on the one-minute note. Executed as E2 “The other half” (storyboard § 11).',
        opening: 'evidence-close-up',
        structure: 'investigation',
        visual: 'paper-trail',
        demonstration: 'document-evidence',
        scores: { subjectFit: 5, hookStrength: 4, demonstration: 4, feasibility: 3 },
        chosen: true,
        suitability: 'The subject is a widely repeated number whose source says something different; showing the source is the payoff, it builds trust in what we recommend, and it needs no product we would have to fake or capture.',
      },
      {
        name: 'B · The 23-minute race (timed experiment)',
        summary: 'Two timelines run side by side — interrupted vs uninterrupted — re-enacting the 2008 finding that interrupted people work faster but more stressed.',
        opening: 'timer-running',
        structure: 'experiment',
        visual: 'race-lanes',
        demonstration: 'data-visual',
        scores: { subjectFit: 3, hookStrength: 4, demonstration: 3, feasibility: 2 },
        rejectedBecause: 'We did not run the experiment: an enacted race risks reading as our own result; it corrects the myth less directly and needs a split-race capability we do not have.',
      },
      {
        name: 'C · The cursor waits (first-person)',
        summary: 'The abandoned report narrates its own afternoon while you open two other things; it ends with the note that lets it go.',
        opening: 'object-pov',
        structure: 'first-person',
        visual: 'waiting-object',
        demonstration: 'enacted-scenario',
        scores: { subjectFit: 4, hookStrength: 3, demonstration: 3, feasibility: 3 },
        rejectedBecause: 'Memorable but the correction (where the number comes from) gets lost inside the character; less trustworthy for a claim-checking video.',
      },
    ],
  },
  review: {
    basis: 'planned',
    value: {
      'What makes this video visually different from our last five videos?': 'No to-dos, no product UI, no switch climax, no end card: macro photography of a torn printed page being reassembled on the ink ground, lit by one soft key light.',
      'What makes its opening different?': 'It opens on a physical object — a torn strip with a number, fibres catching moving light, in near-silence — instead of a headline typing in over scattered to-dos.',
      'Why is this the right storytelling structure for this subject?': 'The number circulates without its context; reassembling its page piece by piece is the correction, and her own bad news (“harder to reconstruct where you were”) is what the viewer is doing.',
      'What is the strongest moment?': 'The turn from good to bad news: the page the viewer just rebuilt is knocked askew and buried by other papers, the light drops and the music cuts dead.',
      'What will viewers learn?': '23:15 is how long people took to get back to an interrupted task, and she called it the good news; the cost is about two other tasks first and a harder time reconstructing where you were; a one-minute ready-to-resume note helps you let go of the old task.',
      'What would make someone share or save it?': 'Send: to whoever quotes “23 minutes” — in her words it was the good news. Save: the ready-to-resume slip, held still at the end.',
      'Is any scene unnecessary?': 'Each piece is one new fact; line 7 (the 2018 result) is the most cuttable and moves to the slip’s footer if the voice runs long.',
      'Is the ending integrated into the story rather than another generic logo screen?': 'Yes: the fifth piece is the ending; the mark is a small signature on the slip.',
    },
  },
  hypothesis: {
    basis: 'planned',
    value: 'A physical, near-silent evidence close-up with an open question (the missing piece, the 1 / 5 counter) lowers skip rate vs our headline openings; the five-piece structure raises average watch time; the slip raises saves and the “good news” correction raises sends per reach above the (first) baseline.',
  },
  plan: {
    basis: 'planned',
    value: { scenes: ['paper', 'paper', 'paper', 'paper', 'paper', 'paper'], preset: 'cinematic', transitions: ['cut'], camera: ['smooth'], harmony: 'focus', sections: ['hold', 'intro', 'pulse', 'hold', 'lift', 'home'], seconds: 43, words: 88 },
    note: '`paper` is the proposed new scene type (storyboard § 11/§ 12); a look test comes first (lab/paper-look/), production only after the owner approves the visual execution.',
  },
  approved: {
    date: '2026-11-18',
    note: 'Owner: “Choose E2 — The Other Half. I approve the creative concept and storytelling direction.” The visual execution is approved separately after the look test (lab/paper-look/); no production scene type before that.',
  },
  notes: [
    'Owner, 2026-11-18: Direction A approved; round 2 executions in storyboard § 11; E2 “The other half” chosen.',
    'F8 (verified 2026-11-18): in the 2006 Q&A, 23:15 is her “good news”; the bad news is “about two intervening tasks” and “it’s harder to reconstruct where you were”.',
    'Engineering condition (owner): no unnecessary global cache invalidation; investigate scoped keys first (storyboard § 12).',
  ],
};
