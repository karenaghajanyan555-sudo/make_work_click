// Production Control Center — vanilla JS, no build step. Every value from the API is set
// with textContent (never innerHTML), so idea titles or logs cannot inject markup.

const $view = document.getElementById('view');
const $runner = document.getElementById('runner');
let state = { overview: null, job: null, tab: 'video', openLog: null, logText: '', busyForm: false };

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
  for (const c of kids.flat()) if (c !== null && c !== undefined && c !== false) el.append(c instanceof Node ? c : document.createTextNode(String(c)));
  return el;
}
async function api(method, url, body) {
  const r = await fetch(url, { method, headers: body ? { 'content-type': 'application/json' } : {}, body: body ? JSON.stringify(body) : undefined });
  const text = await r.text();
  const data = text && r.headers.get('content-type')?.includes('json') ? JSON.parse(text) : text;
  if (!r.ok) throw new Error((data && data.error) || `${r.status}`);
  return data;
}
function toast(msg, err = false) {
  const t = h('div', { class: `toast${err ? ' err' : ''}` }, msg);
  document.body.append(t);
  setTimeout(() => t.remove(), err ? 7000 : 3000);
}
async function act(fn, ok) {
  try {
    const r = await fn();
    if (ok) toast(ok);
    await refresh(true);
    return r;
  } catch (e) {
    toast(e.message, true);
  }
}
const fmtS = (s) => (s == null ? '' : s < 60 ? `${s.toFixed(1)} s` : `${Math.floor(s / 60)} m ${Math.round(s % 60)} s`);
const ago = (iso) => (iso ? new Date(iso).toLocaleString() : '');
const STATUS_CLASS = { done: 'sys', awaiting_approval: 'wait', awaiting_review: 'wait', revision: 'wait', failed: 'bad', interrupted: 'bad', cancelled: '', rejected: 'bad', running: 'wait', queued: '' };
const badge = (text, cls = '') => h('span', { class: `badge ${cls}` }, text);
const strip = (stages, order) => h('div', { class: 'strip', title: order.map((s) => `${s}: ${stages[s]}`).join('\n') }, order.map((s) => h('i', { class: stages[s] })));
const fileUrl = (rel) => (rel && rel.startsWith('out/') ? `/files/${rel.slice(4)}` : null);
// The view re-renders every 2.5 s: reuse each <video> element (keyed by src), otherwise the
// player is replaced mid-load and playback restarts.
const videos = new Map();
function videoEl(src) {
  if (!videos.has(src)) videos.set(src, h('video', { src, controls: true, playsinline: true, preload: 'metadata' }));
  return videos.get(src);
}

// ---------- data ----------
async function refresh(force = false) {
  if (!force && (state.busyForm || document.activeElement?.closest?.('form, textarea, input, select'))) return;
  state.overview = await api('GET', '/api/overview');
  const [, route, id] = location.hash.split('/');
  if (route === 'job' && id) state.job = await api('GET', `/api/jobs/${id}`);
  if (state.openLog && state.job) state.logText = await api('GET', `/api/jobs/${state.job.job.id}/log/${state.openLog}`);
  render();
}
function renderRunner() {
  const r = state.overview?.runner;
  $runner.replaceChildren(
    h('div', {}, h('b', {}, 'Runner '), r?.mine ? (r.busy ? `working ${r.current}` : 'idle') : r?.lease ? `held by ${r.lease.label}` : 'starting'),
    h('div', {}, 'Sequential · one job at a time'),
  );
}

// ---------- views ----------
function viewIdeas() {
  const o = state.overview;
  const form = h('form', { class: 'card', style: 'display:none', onsubmit: submitIdea, id: 'idea-form' },
    h('h3', {}, 'New idea'),
    h('div', { class: 'grid2' },
      h('label', { class: 'f' }, 'Title', h('input', { name: 'title', required: true, maxlength: 100 })),
      h('label', { class: 'f' }, 'Category (story kit)', h('select', { name: 'category' }, o.kits.map((k) => h('option', { value: k.id }, `${k.label} · ${k.arc}`)))),
      h('label', { class: 'f' }, 'Topic', h('input', { name: 'topic', required: true })),
      h('label', { class: 'f' }, 'Target audience', h('input', { name: 'audience', required: true })),
      h('label', { class: 'f' }, 'Hook concept (≤ 10 words is spoken as the hook)', h('input', { name: 'hook' })),
      h('label', { class: 'f' }, 'Audience value (post copy opener)', h('input', { name: 'valueNote' })),
    ),
    h('div', { class: 'grid3', style: 'margin-top:12px' },
      ...[['audienceValue', 'Audience value'], ['engagement', 'Engagement potential'], ['commercial', 'Commercial relevance']].map(([n, l]) =>
        h('label', { class: 'f' }, `${l} (1–5)`, h('select', { name: n }, [5, 4, 3, 2, 1].map((v) => h('option', { value: v, selected: v === 3 }, v))))),
    ),
    h('div', { class: 'grid2', style: 'margin-top:12px' },
      h('label', { class: 'f' }, 'Preset (blank: the kit’s)', h('select', { name: 'preset' }, h('option', { value: '' }, '—'), o.presets.map((p) => h('option', { value: p }, p)))),
      h('label', { class: 'f' }, 'Notes', h('input', { name: 'notes' })),
    ),
    h('label', { class: 'f', style: 'margin-top:12px' }, 'Sources, one per line: URL | claim it supports | exact quote from the page', h('textarea', { name: 'sources', placeholder: 'https://… | Invoicing tools can send reminders automatically | Automatic email reminders for unpaid invoices' })),
    h('div', { class: 'row', style: 'margin-top:14px' }, h('button', { class: 'primary', type: 'submit' }, 'Add idea'), h('button', { type: 'button', onclick: () => toggleForm(false) }, 'Cancel')),
  );
  const ideas = o.ideas;
  return [
    h('div', { class: 'row spread' },
      h('div', {}, h('h1', {}, 'Ideas'), h('p', { class: 'sub' }, 'Scored by audience value, engagement and commercial relevance; pin a priority to override.')),
      h('div', { class: 'row' }, h('button', { onclick: () => act(() => api('POST', '/api/discover', { provider: 'playbooks' }), 'Discovery done') }, 'Discover from kits'), h('button', { class: 'primary', onclick: () => toggleForm(true) }, 'Add idea')),
    ),
    form,
    ideas.length
      ? h('div', { class: 'list', style: 'margin-top:14px' }, ideas.map(ideaRow))
      : h('div', { class: 'empty' }, 'No ideas yet. Add one, or discover the seed ideas shipped with the story kits.'),
  ];
}
function toggleForm(show) {
  state.busyForm = show;
  document.getElementById('idea-form').style.display = show ? 'block' : 'none';
}
async function submitIdea(e) {
  e.preventDefault();
  const f = new FormData(e.target);
  const v = Object.fromEntries(f.entries());
  const sources = String(v.sources || '')
    .split('\n')
    .map((l) => l.split('|').map((x) => x.trim()))
    .filter((p) => p[0])
    .map(([url, claim, quote]) => ({ url, claim, quote: quote || null }));
  const body = { title: v.title, topic: v.topic, audience: v.audience, category: v.category, hook: v.hook || undefined, valueNote: v.valueNote || undefined, audienceValue: Number(v.audienceValue), engagement: Number(v.engagement), commercial: Number(v.commercial), preset: v.preset || undefined, notes: v.notes || undefined, sources };
  state.busyForm = false;
  await act(() => api('POST', '/api/ideas', body), 'Idea added');
}
function ideaRow(i) {
  const job = state.overview.jobs.find((j) => j.idea_id === i.id && !['done', 'cancelled', 'rejected'].includes(j.status));
  const prio = i.priority_override ?? i.priority;
  return h('div', { class: 'card item' },
    h('div', { class: 'prio' }, prio ?? '—', h('small', {}, i.priority_override != null ? 'pinned' : i.priority != null ? 'score' : 'unscored')),
    h('div', {},
      h('div', { class: 'title' }, i.title),
      h('div', { class: 'meta' }, `${i.id} · ${i.category} · ${i.audience}`),
      h('div', { class: 'row', style: 'margin-top:8px' }, badge(i.status.replace('_', ' ')), badge(`research ${i.research_status}`, ['supported', 'verified'].includes(i.research_status) ? 'sys' : i.research_status === 'flagged' ? 'bad' : ''), i.origin !== 'manual' ? badge(i.origin) : null),
    ),
    h('div', { class: 'row' },
      h('input', { type: 'number', style: 'width:76px', placeholder: 'pin', value: i.priority_override ?? '', title: 'Pin a priority (blank: use the score)', onchange: (e) => act(() => api('PATCH', `/api/ideas/${i.id}`, { priorityOverride: e.target.value === '' ? null : Number(e.target.value) }), 'Priority saved') }),
      job
        ? h('a', { class: 'btn', href: `#/job/${job.id}` }, `${job.label} →`)
        : h('button', { class: 'primary', onclick: () => act(() => api('POST', `/api/ideas/${i.id}/start`, {}), 'Production queued') }, 'Start production'),
    ),
  );
}

function jobCard(j) {
  const o = state.overview;
  return h('a', { class: 'card', href: `#/job/${j.id}`, style: 'text-decoration:none;display:block' },
    h('div', { class: 'row spread' },
      h('div', {}, h('div', { class: 'title' }, o.ideas.find((i) => i.id === j.idea_id)?.title ?? j.video_id), h('div', { class: 'meta' }, `${j.id} · ${j.video_id} · ${j.current_stage ?? '—'} · updated ${ago(j.updated_at)}`)),
      badge(j.label, STATUS_CLASS[j.status]),
    ),
    strip(j.stages, o.stages),
  );
}
function viewQueue() {
  const jobs = state.overview.jobs.filter((j) => !['done', 'cancelled', 'rejected'].includes(j.status));
  return [h('h1', {}, 'Queue'), h('p', { class: 'sub' }, 'Jobs run one at a time, stage by stage. Waiting jobs need you.'), jobs.length ? h('div', { class: 'list' }, jobs.map(jobCard)) : h('div', { class: 'empty' }, 'Nothing in production. Start one from Ideas.')];
}
function viewHistory() {
  const jobs = state.overview.jobs.filter((j) => ['done', 'cancelled', 'rejected'].includes(j.status));
  return [
    h('h1', {}, 'History'),
    h('p', { class: 'sub' }, 'Packaged, rejected and cancelled productions.'),
    jobs.length ? h('div', { class: 'list' }, jobs.map(jobCard)) : h('div', { class: 'empty' }, 'No finished productions yet.'),
    h('h2', {}, 'Recent events'),
    h('table', {}, h('tbody', {}, state.overview.events.map((e) => h('tr', {}, h('td', { class: 'mono' }, ago(e.at)), h('td', { class: 'mono' }, e.job_id ?? ''), h('td', {}, e.message))))),
  ];
}

// ---------- job ----------
function viewJob() {
  const v = state.job;
  if (!v) return h('div', { class: 'empty' }, 'Loading…');
  const j = v.job;
  const stopped = ['failed', 'interrupted', 'cancelled', 'revision'].includes(j.status);
  const header = h('div', { class: 'row spread' },
    h('div', {}, h('h1', {}, v.idea.title), h('p', { class: 'sub' }, `${j.id} · ${j.video_id} · idea ${v.idea.id}`)),
    h('div', { class: 'row' },
      badge(j.label, STATUS_CLASS[j.status]),
      stopped ? h('button', { class: 'primary', onclick: () => act(() => api('POST', `/api/jobs/${j.id}/${j.status === 'failed' ? 'retry' : 'resume'}`), 'Queued') }, j.status === 'failed' ? 'Retry' : j.status === 'revision' ? 'Re-run with edits' : 'Resume') : null,
      ['done', 'rejected'].includes(j.status) ? h('button', { onclick: () => act(() => api('POST', `/api/jobs/${j.id}/rerun`), 'Re-run queued: unchanged stages are reused') }, 'Re-run') : null,
      ['queued', 'running', 'awaiting_review', 'awaiting_approval', 'failed', 'interrupted', 'revision'].includes(j.status) ? h('button', { class: 'danger', onclick: () => act(() => api('POST', `/api/jobs/${j.id}/cancel`), 'Cancel requested') }, 'Cancel') : null,
    ),
  );
  const notes = j.notes ? h('div', { class: 'card note', style: 'margin-bottom:14px' }, j.notes) : null;
  const stages = h('div', { class: 'stages' }, v.stages.map((s) => stageRow(j, s)));
  const tabs = ['video', 'editorial', 'script', 'storyboard', 'research', 'brief', 'package', 'history'];
  return [
    header,
    notes,
    stages,
    h('div', { class: 'tabs' }, tabs.map((t) => h('button', { class: state.tab === t ? 'on' : '', onclick: () => ((state.tab = t), render()) }, t[0].toUpperCase() + t.slice(1)))),
    ({ video: tabVideo, editorial: tabEditorial, script: tabScript, storyboard: tabStoryboard, research: tabResearch, brief: tabBrief, package: tabPackage, history: tabHistory })[state.tab](v),
  ];
}
function stageRow(j, s) {
  const cls = { succeeded: 'sys', reused: 'sys', failed: 'bad', interrupted: 'bad', cancelled: 'bad', waiting: 'wait', running: 'wait' }[s.status] ?? '';
  const open = state.openLog === s.stage;
  return h('div', { class: 'stage' },
    h('span', { class: 'n' }, s.stage),
    badge(s.status, cls),
    h('span', { class: 'meta' }, [s.seconds != null ? fmtS(s.seconds) : '', s.attempts > 1 ? `attempt ${s.attempts}` : '', s.finishedAt ? `· ${ago(s.finishedAt)}` : ''].filter(Boolean).join('  ')),
    h('span', { class: 'row' },
      h('button', { onclick: async () => { state.openLog = open ? null : s.stage; await refresh(true); } }, open ? 'Hide log' : 'Log'),
      ['failed', 'interrupted'].includes(s.status) && ['failed', 'interrupted'].includes(j.status)
        ? h('button', { class: 'primary', title: 'Re-queue the job: finished stages are reused, this one runs again', onclick: () => act(() => api('POST', `/api/jobs/${j.id}/${j.status === 'failed' ? 'retry' : 'resume'}`), 'Queued') }, j.status === 'failed' ? 'Retry' : 'Resume')
        : null,
      h('button', { title: 'Run only this stage again (upstream outputs kept)', onclick: () => act(() => api('POST', `/api/jobs/${j.id}/stage/${s.stage}`, { force: true }), `Running ${s.stage}`) }, 'Run'),
    ),
    s.error && ['failed', 'interrupted', 'cancelled'].includes(s.status) ? h('pre', { class: 'err' }, s.error) : null,
    s.error && s.status === 'waiting' ? h('p', { class: 'note', style: 'grid-column:1/-1;margin:2px 0 0' }, s.error) : null,
    open ? h('pre', { class: 'log' }, state.logText) : null,
  );
}
function tabVideo(v) {
  const render = v.renders[0];
  const qa = v.qa[0];
  const src = render ? fileUrl(render.upload_path) : null;
  const j = v.job;
  const decisionBox = j.status === 'awaiting_approval'
    ? h('form', { class: 'card', onsubmit: (e) => e.preventDefault() },
        h('h3', {}, 'Your decision on this exact file'),
        h('p', { class: 'note' }, `sha256 ${render?.upload_sha256.slice(0, 16)}… · QA ${qa?.pass ? 'PASS' : 'FAIL'}. Approving freezes the narration take and builds the publishing package. Nothing is posted.`),
        h('textarea', { id: 'decision-notes', placeholder: 'Notes (what to change, or why)' }),
        h('div', { class: 'row', style: 'margin-top:10px' },
          h('button', { class: 'primary', disabled: !qa?.pass, onclick: () => decideVideo(j.id, 'approved') }, 'Approve'),
          h('button', { onclick: () => decideVideo(j.id, 'revise') }, 'Request revision'),
          h('button', { class: 'danger', onclick: () => decideVideo(j.id, 'rejected') }, 'Reject'),
        ))
    : null;
  if (!render) return h('div', { class: 'empty' }, 'No render yet.');
  const failed = qa ? qa.data.checks.filter((c) => c.status !== 'pass') : [];
  return h('div', { class: 'video' },
    h('div', {}, videoEl(src), h('div', { class: 'meta', style: 'margin-top:8px' }, `${(render.bytes / 1e6).toFixed(1)} MB · ${render.video_seconds.toFixed(2)} s · ${render.segments_rendered}/${render.segments_total} segments rendered`)),
    h('div', {},
      decisionBox,
      qa
        ? h('div', { class: 'card', style: 'margin-top:12px' },
            h('div', { class: 'row spread' }, h('h3', {}, `QA ${qa.pass ? 'PASS' : 'FAIL'} · ${qa.checks_total - qa.checks_failed}/${qa.checks_total} checks`), badge(qa.pass ? 'pass' : 'fail', qa.pass ? 'sys' : 'bad')),
            failed.length ? h('ul', {}, failed.map((c) => h('li', { class: c.status === 'fail' ? 'flag' : 'muted' }, `${c.id} (${c.status}): ${c.detail}`))) : h('p', { class: 'note' }, 'Every technical, audio and visual check passed.'),
            h('table', {}, h('tbody', {}, qa.data.checks.map((c) => h('tr', {}, h('td', { class: 'mono' }, c.id), h('td', {}, badge(c.status, c.status === 'pass' ? 'sys' : c.status === 'fail' ? 'bad' : '')), h('td', { class: 'note' }, c.detail))))),
          )
        : h('div', { class: 'empty' }, 'QA has not run yet.'),
      v.editorial
        ? h('div', { class: 'card', style: 'margin-top:12px' },
            h('div', { class: 'row spread' }, h('h3', {}, 'Editorial QA'), badge(v.editorial.data.problems ? `${v.editorial.data.problems} problem(s)` : v.editorial.data.attention ? `${v.editorial.data.attention} to look at` : 'nothing flagged', v.editorial.data.problems ? 'bad' : v.editorial.data.attention ? 'wait' : 'sys')),
            h('p', { class: 'note' }, v.editorial.data.summary),
            h('button', { onclick: () => ((state.tab = 'editorial'), render()) }, 'Open the editorial report'))
        : null,
      v.approvals.length
        ? h('div', { class: 'card', style: 'margin-top:12px' }, h('h3', {}, 'Decisions on this job'),
            h('table', {}, h('tbody', {}, [...v.approvals].reverse().map((a) => h('tr', {}, h('td', { class: 'mono' }, ago(a.decided_at)), h('td', { class: 'mono' }, a.target), h('td', {}, badge(a.decision, a.decision === 'approved' ? 'sys' : 'bad')), h('td', {}, a.notes ?? ''), h('td', { class: 'mono' }, `${a.decided_by} · ${a.target_hash.slice(0, 12)}`))))))
        : null,
      qa ? h('div', { class: 'sheets', style: 'margin-top:12px' }, ['sheet.png', 'sheet-cues.png'].map((s) => h('img', { src: `/files/${j.video_id}/qa/${s}?t=${qa.id}`, alt: s, loading: 'lazy' }))) : null,
      qa ? h('p', { class: 'note' }, h('a', { href: fileUrl(qa.report_path), target: '_blank' }, 'Technical QA report'), ' · ', h('a', { href: `/files/${j.video_id}/qa/sheet-safezone.png`, target: '_blank' }, 'safe-zone sheet')) : null,
    ),
  );
}
function tabEditorial(v) {
  const e = v.editorial;
  if (!e) return h('div', { class: 'empty' }, 'Editorial QA runs after technical QA passes.');
  const r = e.data;
  const order = { problem: 0, look: 1, ok: 2 };
  const items = [...r.items].sort((a, b) => order[a.status] - order[b.status]);
  return [
    h('div', { class: 'card note', style: 'margin-bottom:12px' }, `${r.summary} Story checks are measured against the studio rules (docs/STORY.md); technical file checks are in the Video tab. This report never approves or blocks.`),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Area', 'Check', 'Status', 'Measured', 'Rule'].map((x) => h('th', {}, x)))),
      h('tbody', {}, items.map((i) => h('tr', {},
        h('td', { class: 'mono' }, i.area),
        h('td', { class: 'mono' }, i.id),
        h('td', {}, badge(i.status, i.status === 'ok' ? 'sys' : i.status === 'problem' ? 'bad' : 'wait')),
        h('td', {}, i.measure),
        h('td', { class: 'note' }, i.rule),
      ))),
    ),
    h('p', { class: 'note' }, `Report ${ago(e.created_at)} for file ${e.upload_sha256.slice(0, 12)} · `, h('a', { href: fileUrl(`out/${v.job.video_id}/qa/editorial.md`), target: '_blank' }, 'editorial.md')),
  ];
}
function decideVideo(jobId, decision) {
  const notes = document.getElementById('decision-notes')?.value ?? '';
  act(() => api('POST', `/api/jobs/${jobId}/decision`, { target: 'video', decision, notes }), { approved: 'Approved: packaging', revise: 'Revision requested', rejected: 'Rejected' }[decision]);
}
function tabScript(v) {
  const s = v.script;
  if (!s) return h('div', { class: 'empty' }, 'No script yet.');
  const j = v.job;
  const form = h('form', { onsubmit: async (e) => {
    e.preventDefault();
    const lines = {};
    for (const l of s.lines) {
      const t = e.target.elements[`t-${l.id}`].value.trim();
      const c = e.target.elements[`c-${l.id}`]?.value;
      const p = e.target.elements[`p-${l.id}`].value;
      const edit = {};
      if (t !== l.text) edit.text = t;
      if (c !== undefined && c !== (l.caption ?? '')) edit.caption = c === '' ? null : c;
      if (p !== '' && Number(p) !== (l.pause ?? 0)) edit.pause = Number(p);
      if (Object.keys(edit).length) lines[l.id] = edit;
    }
    if (!Object.keys(lines).length) return toast('No changes');
    await act(() => api('POST', `/api/jobs/${j.id}/edit-script`, { lines }), 'Script edit saved: re-run the job to apply');
  } },
    h('table', {},
      h('thead', {}, h('tr', {}, ['Section', 'Line', 'Spoken text', 'Caption (markup)', 'Pause', 'Claims'].map((x) => h('th', {}, x)))),
      h('tbody', {}, s.lines.map((l) => h('tr', {},
        h('td', { class: 'mono' }, l.section),
        h('td', { class: 'mono' }, l.id, h('div', { class: 'meta' }, l.origin)),
        h('td', {}, h('textarea', { name: `t-${l.id}`, value: l.text, rows: 2 })),
        h('td', {}, l.caption !== undefined ? h('textarea', { name: `c-${l.id}`, value: l.caption, rows: 2 }) : h('span', { class: 'note' }, 'shown by the scene')),
        h('td', {}, h('input', { name: `p-${l.id}`, value: l.pause ?? '', style: 'width:64px' })),
        h('td', { class: 'mono' }, l.claims.join(', ')),
      ))),
    ),
    h('div', { class: 'row', style: 'margin-top:12px' }, h('button', { class: 'primary', type: 'submit' }, 'Save edits')),
  );
  return [
    h('p', { class: 'note' }, `${s.words} words · about ${s.estimatedSeconds} s · ${s.arc} arc · kit ${s.kit}`),
    s.flags.length ? h('div', { class: 'card flag', style: 'margin-bottom:12px' }, s.flags.map((f) => h('div', {}, f))) : null,
    j.status === 'awaiting_review'
      ? h('div', { class: 'card', style: 'margin-bottom:12px' }, h('h3', {}, 'Script review'), h('div', { class: 'row' },
          h('button', { class: 'primary', onclick: () => act(() => api('POST', `/api/jobs/${j.id}/decision`, { target: 'script', decision: 'approved' }), 'Script approved: production continues') }, 'Approve script + storyboard'),
          h('button', { onclick: () => act(() => api('POST', `/api/jobs/${j.id}/decision`, { target: 'script', decision: 'revise' }), 'Marked for revision') }, 'Needs changes')))
      : null,
    form,
  ];
}
function tabStoryboard(v) {
  const sb = v.storyboard;
  if (!sb) return h('div', { class: 'empty' }, 'No storyboard yet.');
  const spec = v.stages.find((s) => s.stage === 'spec')?.output;
  return [
    h('div', { class: 'row', style: 'margin-bottom:12px' },
      h('span', { class: 'note' }, `${sb.arc} arc · preset`),
      h('select', { style: 'width:160px', onchange: (e) => act(() => api('POST', `/api/jobs/${v.job.id}/edit-storyboard`, { preset: e.target.value }), 'Preset saved: re-run to apply') }, state.overview.presets.map((p) => h('option', { value: p, selected: p === sb.preset }, p))),
      h('span', { class: 'note' }, `music: ${sb.harmony}`),
    ),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Scene', 'Type', 'Says', 'Purpose', 'Seconds'].map((x) => h('th', {}, x)))),
      h('tbody', {}, sb.scenes.map((s) => h('tr', {}, h('td', { class: 'mono' }, s.id), h('td', { class: 'mono' }, s.type), h('td', { class: 'mono' }, s.say.join(', ')), h('td', {}, s.purpose), h('td', { class: 'mono' }, spec?.scenes?.find((x) => x.id === s.id)?.duration?.toFixed(2) ?? '—'))))),
    spec?.adjustments?.length ? h('p', { class: 'note' }, `Timing fit: ${spec.adjustments.join(' · ')}`) : null,
    spec ? h('p', { class: 'note' }, `Spec: ${spec.file} · ${spec.durationSeconds} s · cover at ${spec.coverAt} s`) : null,
  ];
}
function tabResearch(v) {
  const r = v.research;
  if (!r) return h('div', { class: 'empty' }, 'No research yet.');
  // 'verified' / 'uncertain' are statuses of research run before the support levels existed.
  const cls = { supported: 'sys', verified: 'sys', partial: 'wait', unverified: 'bad', uncertain: 'bad', contradicted: 'bad', assumption: '', illustrative: '', suggestion: '' };
  const facts = r.claims.filter((c) => c.kind === 'fact');
  const doubtful = facts.filter((c) => !['supported', 'verified'].includes(c.status));
  const lim = (c) => { try { return JSON.parse(c.limitations ?? '[]'); } catch { return []; } };
  return [
    h('p', { class: 'note' }, `${r.summary} · provider ${r.provider}. Supported = the exact quote is on the cited page and the passage around it contains the claim's key terms. It is an automatic word-overlap check, not a reading.`),
    doubtful.length ? h('div', { class: 'card', style: 'margin-bottom:12px' }, h('h3', {}, `${doubtful.length} claim(s) need your look`), h('ul', {}, doubtful.map((c) => h('li', { class: 'flag' }, `${c.ref}: ${c.status}: ${c.note ?? ''}`))), h('p', { class: 'note' }, 'A line that relies on one of these pauses the job at script review: read the page\'s words below before approving the script.')) : null,
    h('h2', {}, 'Facts'),
    h('table', {},
      h('thead', {}, h('tr', {}, ['Claim', 'Support', 'Confidence', 'Source · retrieved', "The page's words", 'Limitations'].map((x) => h('th', {}, x)))),
      h('tbody', {}, facts.map((c) => h('tr', {},
        h('td', {}, c.text, h('div', { class: 'meta' }, c.ref + (c.required ? ' · required' : '') + (c.coverage != null ? ` · ${Math.round(c.coverage * 100)} % of terms` : ''))),
        h('td', {}, badge(c.status, cls[c.status])),
        h('td', { class: 'mono' }, c.confidence ?? '—'),
        h('td', { class: 'mono' }, c.url ? h('a', { href: c.url, target: '_blank', rel: 'noreferrer' }, new URL(c.url).hostname) : '—', h('div', { class: 'meta' }, c.retrieved_at ? ago(c.retrieved_at) : '')),
        h('td', { class: 'note' }, c.evidence ? `“${c.evidence}”` : (c.note ?? ''), c.quote ? h('div', { class: 'meta' }, `quote: “${c.quote}” (${c.quote_match ?? 'match not recorded'})`) : null),
        h('td', { class: 'note' }, lim(c).map((x) => h('div', {}, x))),
      ))),
    ),
    h('h2', {}, 'Assumptions, illustrative and creative (not facts)'),
    h('table', {}, h('tbody', {}, r.claims.filter((c) => c.kind !== 'fact').map((c) => h('tr', {}, h('td', { class: 'mono' }, c.kind), h('td', {}, c.text), h('td', { class: 'note' }, c.note ?? ''))))),
    h('h2', {}, 'Sources'),
    h('table', {}, h('tbody', {}, r.sources.map((s) => h('tr', {}, h('td', { class: 'mono' }, h('a', { href: s.url, target: '_blank', rel: 'noreferrer' }, s.url)), h('td', {}, s.title ?? ''), h('td', {}, badge(s.ok ? `HTTP ${s.http_status}` : 'failed', s.ok ? 'sys' : 'bad')), h('td', { class: 'mono' }, ago(s.fetched_at)), h('td', { class: 'mono' }, s.content_sha256 ? s.content_sha256.slice(0, 12) : s.error ?? ''))))),
  ];
}
function tabBrief(v) {
  const b = v.brief;
  if (!b) return h('div', { class: 'empty' }, 'No brief yet.');
  const rows = [['Title', b.title], ['Topic', b.topic], ['Audience', b.audience], ['Angle', b.angle], ['Promise', b.promise], ['Hook concept', b.hookConcept ?? '—'], ['Spoken hook', b.hookLine ?? 'kit hook'], ['Arc · preset · music', `${b.arc} · ${b.preset} · ${b.harmony}`], ['CTA', b.cta], ['Claims policy', b.claimsPolicy], ['Post title', b.publish.title], ['Post caption', b.publish.caption], ['Hashtags', b.publish.hashtags.join(' ')]];
  return [b.notes?.length ? h('div', { class: 'card note', style: 'margin-bottom:12px' }, b.notes.map((n) => h('div', {}, n))) : null, h('table', {}, h('tbody', {}, rows.map(([k, x]) => h('tr', {}, h('th', {}, k), h('td', { style: 'white-space:pre-wrap' }, x)))))];
}
function tabPackage(v) {
  const p = v.packages[0];
  if (!p) return h('div', { class: 'empty' }, v.job.status === 'awaiting_approval' ? 'Approve the video to build its publishing package.' : 'No package yet.');
  const files = JSON.parse(p.manifest);
  const base = fileUrl(p.dir);
  return [
    h('p', { class: 'note' }, `${p.dir} · approval #${p.approval_id} · built ${ago(p.created_at)}. Nothing has been posted: upload by hand (post.md has the steps).`),
    h('table', {}, h('tbody', {}, files.map((f) => h('tr', {}, h('td', { class: 'mono' }, h('a', { href: `${base}/${f.file}`, target: '_blank' }, f.file)), h('td', { class: 'mono' }, `${(f.bytes / 1024).toFixed(0)} KB`), h('td', { class: 'mono' }, f.sha256.slice(0, 16)))))),
    h('div', { class: 'row', style: 'margin-top:14px' }, h('img', { src: `${base}/cover.jpg`, alt: 'cover', style: 'width:180px;border-radius:12px;border:1px solid var(--hairline)' })),
    (() => {
      // Packages of earlier approvals were moved aside, never deleted (approved = gold).
      const earlier = v.packages.filter((x) => x.approval_id !== p.approval_id);
      return earlier.length ? [h('h2', {}, 'Earlier approved packages (kept)'), h('table', {}, h('tbody', {}, earlier.map((x) => h('tr', {}, h('td', { class: 'mono' }, `approval #${x.approval_id}`), h('td', { class: 'mono' }, ago(x.created_at)), h('td', { class: 'mono' }, `out/${v.job.video_id}/packages/approval-${x.approval_id}/`)))))] : null;
    })(),
  ];
}
function tabHistory(v) {
  return [
    h('table', {}, h('thead', {}, h('tr', {}, ['Run', 'Stage', 'Attempt', 'Status', 'Started', 'Seconds', 'Input'].map((x) => h('th', {}, x)))),
      h('tbody', {}, [...v.runs].reverse().map((r) => h('tr', {}, h('td', { class: 'mono' }, r.id), h('td', { class: 'mono' }, r.stage), h('td', { class: 'mono' }, r.attempt), h('td', {}, badge(r.status, { succeeded: 'sys', reused: 'sys', failed: 'bad', interrupted: 'bad' }[r.status] ?? '')), h('td', { class: 'mono' }, ago(r.started_at)), h('td', { class: 'mono' }, r.seconds?.toFixed(1) ?? ''), h('td', { class: 'mono' }, r.input_hash.slice(0, 10)))))),
    h('h2', {}, 'Events'),
    h('table', {}, h('tbody', {}, v.events.map((e) => h('tr', {}, h('td', { class: 'mono' }, ago(e.at)), h('td', { class: 'mono' }, e.kind), h('td', {}, e.message))))),
    v.approvals.length ? [h('h2', {}, 'Decisions'), h('table', {}, h('tbody', {}, v.approvals.map((a) => h('tr', {}, h('td', { class: 'mono' }, ago(a.decided_at)), h('td', { class: 'mono' }, a.target), h('td', {}, badge(a.decision, a.decision === 'approved' ? 'sys' : 'bad')), h('td', {}, a.notes ?? ''), h('td', { class: 'mono' }, a.target_hash.slice(0, 12))))))] : null,
  ];
}

// ---------- metrics ----------
let insightsCache = null;
async function viewMetrics() {
  insightsCache = await api('GET', '/api/insights');
  const done = state.overview.jobs.filter((j) => j.status === 'done');
  const pubForm = h('form', { class: 'card', onsubmit: (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target).entries());
    act(() => api('POST', '/api/publications', { jobId: v.jobId, platform: v.platform, publishedAt: v.publishedAt, url: v.url || undefined, platformVideoId: v.platformVideoId || undefined }), 'Publication recorded');
  } },
    h('h3', {}, 'Record a post you made by hand'),
    h('div', { class: 'grid3' },
      h('label', { class: 'f' }, 'Video', h('select', { name: 'jobId' }, done.map((j) => h('option', { value: j.id }, `${j.video_id}`)))),
      h('label', { class: 'f' }, 'Platform', h('select', { name: 'platform' }, ['youtube', 'instagram', 'tiktok', 'facebook'].map((p) => h('option', { value: p }, p)))),
      h('label', { class: 'f' }, 'Posted at', h('input', { name: 'publishedAt', type: 'datetime-local', required: true })),
      h('label', { class: 'f' }, 'URL', h('input', { name: 'url' })),
      h('label', { class: 'f' }, 'Platform video id', h('input', { name: 'platformVideoId' })),
    ),
    h('div', { style: 'margin-top:12px' }, h('button', { class: 'primary', type: 'submit', disabled: !done.length }, 'Record publication')),
  );
  const fields = [['views', 'Views'], ['avgWatchSeconds', 'Avg watch (s)'], ['completionRate', 'Completion (0–1)'], ['saves', 'Saves'], ['shares', 'Shares'], ['comments', 'Comments'], ['profileVisits', 'Profile visits'], ['linkClicks', 'Link clicks'], ['affiliateConversions', 'Affiliate conversions']];
  const metForm = h('form', { class: 'card', style: 'margin-top:12px', onsubmit: (e) => {
    e.preventDefault();
    const v = Object.fromEntries(new FormData(e.target).entries());
    const body = { publicationId: Number(v.publicationId) };
    for (const [k] of fields) if (v[k] !== '') body[k] = Number(v[k]);
    act(() => api('POST', '/api/metrics', body), 'Metrics recorded');
  } },
    h('h3', {}, 'Add metrics (manual entry)'),
    h('label', { class: 'f' }, 'Publication', h('select', { name: 'publicationId' }, insightsCache.publications.map((p) => h('option', { value: p.id }, `${p.id} · ${p.video_id} · ${p.platform}`)))),
    h('div', { class: 'grid3', style: 'margin-top:10px' }, fields.map(([k, l]) => h('label', { class: 'f' }, l, h('input', { name: k, inputmode: 'decimal' })))),
    h('div', { style: 'margin-top:12px' }, h('button', { class: 'primary', type: 'submit', disabled: !insightsCache.publications.length }, 'Save metrics')),
  );
  return [
    h('h1', {}, 'Metrics'),
    h('p', { class: 'sub' }, 'Manual entry for now. Category completion rates feed idea scoring once there are ≥ 3 measured posts in a category (≥ 5 overall).'),
    pubForm,
    metForm,
    h('h2', {}, 'Posts'),
    insightsCache.posts.length
      ? h('table', {}, h('thead', {}, h('tr', {}, ['Video', 'Platform', 'Category', 'Arc', 'Hook', 'Views', 'Completion'].map((x) => h('th', {}, x)))), h('tbody', {}, insightsCache.posts.map((p) => h('tr', {}, h('td', { class: 'mono' }, p.video_id), h('td', {}, p.platform), h('td', {}, p.category), h('td', {}, p.arc ?? ''), h('td', {}, p.hook ?? ''), h('td', { class: 'mono' }, p.views ?? '—'), h('td', { class: 'mono' }, p.completion_rate ?? '—')))))
      : h('div', { class: 'empty' }, 'No posts recorded yet.'),
    h('p', { class: 'note' }, `Scoring multipliers: ${Object.entries(insightsCache.categoryMultiplier).map(([k, x]) => `${k} ×${x}`).join(', ') || 'none yet'}`),
  ];
}

// ---------- router ----------
async function render() {
  if (!state.overview) return;
  renderRunner();
  const [, route = 'ideas'] = location.hash.split('/');
  for (const a of document.querySelectorAll('[data-nav]')) a.classList.toggle('on', a.dataset.nav === route || (route === 'job' && a.dataset.nav === 'queue'));
  const scroll = window.scrollY;
  const content = route === 'queue' ? viewQueue() : route === 'history' ? viewHistory() : route === 'metrics' ? await viewMetrics() : route === 'job' ? viewJob() : viewIdeas();
  $view.replaceChildren(...[content].flat(3).filter(Boolean));
  window.scrollTo(0, scroll);
}
window.addEventListener('hashchange', () => {
  state.tab = 'video';
  state.openLog = null;
  state.job = null;
  refresh(true);
});
if (!location.hash) location.hash = '#/ideas';
refresh(true);
setInterval(() => {
  const [, route] = location.hash.split('/');
  if (route !== 'metrics') refresh(false).catch(() => {});
}, 2500);
