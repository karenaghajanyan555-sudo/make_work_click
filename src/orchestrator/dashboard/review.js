// Review — the Control Center's home: the videos and scripts waiting for the owner, nothing
// else. Vanilla JS, no build step. Values from the API are set with textContent only.
// The page polls, but re-renders only when the data changed, keeps each <video> element
// (so a player never restarts mid-load) and never re-renders under a focused text box.

const $view = document.getElementById('view');
const videos = new Map(); // src → <video>, reused across renders
const notes = new Map(); // card id → unsent text
let data = null;
let lastJson = '';
let pending = false;
const busy = new Set(); // card ids with a request in flight

// ---------- helpers ----------
function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v === undefined || v === null || v === false) continue;
    if (k === 'class') el.className = v;
    else if (k.startsWith('on')) el.addEventListener(k.slice(2), v);
    else if (k === 'value') el.value = v;
    else el.setAttribute(k, v === true ? '' : String(v));
  }
  for (const c of kids.flat(3)) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  const out = text && r.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;
  if (!r.ok) throw new Error((out && out.error) || `${r.status}`);
  return out;
}
function toast(msg, err = false) {
  document.querySelector('.toast')?.remove();
  const t = h('div', { class: `toast${err ? ' err' : ''}`, role: 'status' }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), err ? 8000 : 4500);
}
const NUM = ['No', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten'];
const count = (n, one, many) => `${NUM[n] ?? n} ${n === 1 ? one : many}`;
const lower = (s) => s.charAt(0).toLowerCase() + s.slice(1);

function player(src, preload = 'metadata') {
  if (!src) return h('div', { class: 'missing' }, 'Video file not found');
  if (!videos.has(src)) videos.set(src, h('video', { src, controls: true, playsinline: true, preload }));
  return videos.get(src);
}
function checksLine(qa) {
  if (!qa) return h('div', { class: 'check' }, h('span', { class: 'dot look' }), 'Quality checks have not run');
  if (!qa.failed.length) return h('div', { class: 'check' }, h('span', { class: 'dot' }), `All ${qa.total} quality checks passed`);
  return [
    h('div', { class: 'check' }, h('span', { class: `dot ${qa.pass ? 'look' : 'bad'}` }), qa.pass ? `${qa.total - qa.failed.length} of ${qa.total} checks passed, ${qa.failed.length} to look at` : `${qa.failed.length} quality check${qa.failed.length > 1 ? 's' : ''} failed`),
    qa.failed.map((f) => h('div', { class: 'check' }, h('span', { class: 'dot look', style: 'visibility:hidden' }), h('span', { class: 'sm' }, f))),
  ];
}
function notesBox(id, placeholder) {
  return h('textarea', {
    id: `notes-${id}`,
    placeholder,
    value: notes.get(id) ?? '',
    oninput: (e) => {
      notes.set(id, e.target.value);
      e.target.classList.remove('need');
    },
  });
}
/** A button that needs a second click within 4 s (approve and reject are not undoable here). */
function confirmButton(label, armedLabel, cls, run) {
  let timer = null;
  const b = h('button', { class: cls, type: 'button' }, label);
  b.addEventListener('click', () => {
    if (!b.classList.contains('armed')) {
      b.classList.add('armed');
      b.textContent = armedLabel;
      timer = setTimeout(() => {
        b.classList.remove('armed');
        b.textContent = label;
      }, 4000);
      return;
    }
    clearTimeout(timer);
    run();
  });
  return b;
}
async function send(id, fn, ok) {
  if (busy.has(id)) return;
  busy.add(id);
  render();
  try {
    await fn();
    notes.delete(id);
    toast(ok);
  } catch (e) {
    toast(e.message, true);
  } finally {
    busy.delete(id);
    await refresh(true);
  }
}
function needNotes(id, msg) {
  const box = document.getElementById(`notes-${id}`);
  if ((notes.get(id) ?? '').trim()) return false;
  box?.classList.add('need');
  box?.focus();
  toast(msg, true);
  return true;
}

// ---------- cards ----------
function decideCard(v) {
  const id = v.jobId;
  const dis = busy.has(id);
  const decide = (decision, ok) => send(id, () => api('POST', `/api/jobs/${id}/decision`, { target: 'video', decision, notes: notes.get(id) ?? '' }), ok);
  return h('article', { class: 'decide' },
    player(v.src, 'auto'),
    h('div', { class: 'info' },
      h('div', { class: 'meta' }, h('span', {}, v.video.split('-')[0]), h('span', {}, `${v.seconds} s`), v.mb ? h('span', {}, `${v.mb} MB`) : null, h('a', { href: `/details#/job/${id}` }, 'Details')),
      h('h2', { class: 'title' }, v.title),
      h('div', { class: 'checks' }, checksLine(v.qa), v.notes.map((n) => h('div', { class: 'check' }, h('span', { class: 'dot look' }), h('span', { class: 'sm' }, n)))),
      v.say.length ? h('div', { class: 'say' }, h('div', { class: 'sec' }, 'Narration'), v.say.map((t) => h('p', {}, t))) : null,
      h('div', { class: 'act' },
        notesBox(id, 'Notes: what should change? (optional when approving)'),
        h('div', { class: 'buttons' },
          v.qa?.pass
            ? confirmButton('Approve', 'Click again to approve', 'primary', () => decide('approved', 'Approved. Re-checking the file, then building the post package (about 3 minutes).'))
            : h('button', { class: 'primary', disabled: true, title: 'A video that failed QA cannot be approved' }, 'Approve'),
          h('button', { type: 'button', disabled: dis, onclick: () => !needNotes(id, 'Write what should change first.') && decide('revise', 'Changes requested. Tell Claude, or edit the script in Details.') }, 'Request changes'),
          confirmButton('Reject', 'Click again to reject', 'ghost', () => decide('rejected', 'Rejected.')),
        ),
        h('p', { class: 'fine' }, 'Approving locks this voice take and builds the post package. Nothing is posted.'),
      ),
    ),
  );
}
function scriptCard(s) {
  const id = s.jobId;
  const dis = busy.has(id);
  const decide = (decision, ok) => send(id, () => api('POST', `/api/jobs/${id}/decision`, { target: 'script', decision, notes: notes.get(id) ?? '' }), ok);
  return h('article', { class: 'script' },
    h('div', { class: 'meta' }, h('span', {}, `${s.words} words`), h('span', {}, `about ${s.seconds} s`), h('a', { href: `/details#/job/${id}` }, 'Details')),
    h('h2', { class: 'title' }, s.title),
    s.repeats ? h('div', { class: 'warn' }, h('span', { class: 'dot bad' }), `${s.repeats.same} of ${s.repeats.of} lines are the same as “${s.repeats.title}” (${s.repeats.video.split('-')[0]}). Approving would make a near-copy.`) : null,
    s.flags.map((f) => h('div', { class: 'warn' }, h('span', { class: 'dot bad' }), f)),
    h('div', { class: 'lines' }, s.lines.map((l) => h('div', { class: 'line' }, h('span', { class: 'sec' }, l.section), h('span', { class: 'say' }, l.text)))),
    h('div', { class: 'act' },
      notesBox(id, 'Notes: what should change?'),
      h('div', { class: 'buttons' },
        confirmButton('Approve script', 'Click again: start the render', 'primary', () => decide('approved', 'Script approved. The video renders next (about 10 minutes).')),
        h('button', { type: 'button', disabled: dis, onclick: () => !needNotes(id, 'Write what should change first.') && decide('revise', 'Changes requested.') }, 'Needs changes'),
      ),
      h('p', { class: 'fine' }, 'Approving starts voice, render and checks (about 10 minutes; close heavy apps first).'),
    ),
  );
}
function earlierTile(v) {
  return h('article', { class: 'tile' },
    player(v.src),
    v.version ? h('div', { class: 'version' }, v.version) : null,
    h('div', { class: 'name' }, v.title),
    h('div', { class: 'meta' }, h('span', {}, v.video), v.seconds ? h('span', {}, `${v.seconds} s`) : null),
    h('div', { class: 'checks' },
      checksLine(v.qa),
      // Lime is only for what the system did; a voice is approved (or not) by a person.
      v.voice ? h('div', { class: 'check' }, h('span', { class: `dot ${v.voice.startsWith('Draft') ? 'open' : 'ok'}` }), v.voice) : null,
    ),
  );
}
function workRow(w) {
  const stopped = ['failed', 'interrupted'].includes(w.status);
  const label = { queued: 'Queued', running: w.step, failed: `Stopped at: ${lower(w.step)}`, interrupted: `Interrupted at: ${lower(w.step)}`, revision: 'Changes requested: waiting for edits' }[w.status] ?? w.step;
  return h('article', { class: 'work' },
    h('div', {}, h('div', { class: 'name' }, w.title), h('div', { class: `step${stopped ? ' bad' : ''}` }, label, w.error && stopped ? ` · ${w.error}` : '')),
    stopped
      ? h('button', { type: 'button', disabled: busy.has(w.jobId), onclick: () => send(w.jobId, () => api('POST', `/api/jobs/${w.jobId}/${w.status === 'failed' ? 'retry' : 'resume'}`), 'Queued again: finished steps are kept.') }, w.status === 'failed' ? 'Retry' : 'Resume')
      : w.status === 'revision'
        ? h('a', { class: 'quiet', href: `/details#/job/${w.jobId}` }, 'Edit in details')
        : h('span', { class: 'meta' }, `${Math.round(w.progress * 100)} %`),
    h('div', { class: `bar${w.status === 'running' ? ' run' : ''}` }, h('i', { style: `width:${Math.max(3, w.progress * 100)}%` })),
  );
}
function approvedTile(a) {
  return h('article', { class: 'tile' },
    player(a.src),
    h('div', { class: 'name' }, a.title),
    h('div', { class: 'checks' }, h('div', { class: 'check' }, h('span', { class: 'dot' }), a.packagedAt ? `Packaged ${new Date(a.packagedAt).toLocaleDateString()}` : 'Approved')),
    a.post ? h('a', { class: 'btnlink', href: a.post, target: '_blank' }, 'Open the post sheet →') : null,
    a.folder ? h('div', { class: 'meta', style: 'margin-top:6px' }, a.folder) : null,
  );
}

// ---------- page ----------
function hero(d) {
  const vids = d.decide.length + d.earlier.filter((e) => !e.final).length;
  const scripts = d.scripts.length;
  if (!vids && !scripts) return h('div', { class: 'hero' }, h('h1', {}, 'Nothing needs ', h('em', {}, 'you'), ' right now.'), h('p', {}, d.working.length ? 'Production is running. This page updates on its own.' : 'Start a new video from Production details.'));
  const parts = [vids ? count(vids, 'video', 'videos') : null, scripts ? count(scripts, 'script', 'scripts').toLowerCase() : null].filter(Boolean);
  return h('div', { class: 'hero' },
    h('h1', {}, `${parts.join(' and ')} ${vids + scripts === 1 ? 'is' : 'are'} waiting `, h('em', {}, 'for you.')),
    h('p', {}, 'Watch each one, then approve, ask for changes or reject. Nothing is ever posted from here.'),
  );
}
function section(label, n, ...kids) {
  return h('section', {}, h('div', { class: 'label' }, label, h('b', {}, n)), ...kids);
}
function render() {
  if (!data) return;
  const d = data;
  const scroll = window.scrollY;
  $view.replaceChildren(...[
    hero(d),
    d.decide.length ? section('Your decision', d.decide.length, h('div', { class: 'stack' }, d.decide.map(decideCard))) : null,
    d.working.length ? section('In production', d.working.length, h('div', { class: 'stack' }, d.working.map(workRow))) : null,
    d.scripts.length ? section('Scripts to read', d.scripts.length, h('p', { class: 'lede' }, 'These are not videos yet. Approving a script records the voice and renders it.'), h('div', { class: 'stack' }, d.scripts.map(scriptCard))) : null,
    d.earlier.length
      ? section('Earlier videos', d.earlier.length, h('p', { class: 'lede' }, 'Made before the production system, so there are no buttons here: tell Claude what you decide (approve, which v001 to keep, what to change).'), h('div', { class: 'grid' }, d.earlier.map(earlierTile)))
      : null,
    d.approved.length ? section('Approved', d.approved.length, h('div', { class: 'grid' }, d.approved.map(approvedTile))) : null,
    h('footer', {}, 'Runs on this computer only. Every decision is recorded with the exact file it applies to.'),
  ].flat().filter(Boolean));
  window.scrollTo(0, scroll);
}
async function refresh(force = false) {
  let next;
  try {
    next = await api('GET', '/api/review');
  } catch (e) {
    if (!data) $view.replaceChildren(h('div', { class: 'hero' }, h('h1', {}, 'Cannot reach the Control Center.'), h('p', {}, `Is npm run control still running? (${e.message})`)));
    return;
  }
  const json = JSON.stringify(next);
  if (!force && json === lastJson) return;
  lastJson = json;
  data = next;
  if (document.activeElement?.tagName === 'TEXTAREA') {
    pending = true; // typing: render when the box loses focus
    return;
  }
  render();
}
document.addEventListener('focusout', () => {
  if (!pending) return;
  setTimeout(() => {
    if (document.activeElement?.tagName === 'TEXTAREA') return;
    pending = false;
    render();
  }, 0);
});
refresh(true);
setInterval(() => refresh(false), 3000);
