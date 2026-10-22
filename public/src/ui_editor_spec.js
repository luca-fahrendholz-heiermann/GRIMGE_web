// GRIMGE UI editor — the layout spec (pure, no DOM: the editor page and the tests use it).
// The user lays out the real game screens in /editor.html; the spec is saved to
// docs/ui_spec/ui_editor_spec.json (+ a readable UI_EDITOR_SPEC.md) so the changes can be
// carried into the game code exactly.
//
// Spec shape:
//   { version, viewport: { w, h, preset }, updatedAt, screens: [Screen] }
//   Screen  = { id, name, builtin, description, base (custom screens: builtin screen shown behind, or null),
//               changes: [Change], added: [Added] }
//   Change  = { target (CSS selector), label, fn (the element's current function key),
//               move: { dx, dy } (fractions of the viewport), size: { w, h } | null (fractions),
//               hidden, function: Fn | null, comment }
//   Added   = { id, kind: 'button' | 'text' | 'panel' | 'icon', text, rect: { x, y, w, h } (fractions),
//               style: { bg, color }, function: Fn | null, comment }
//   Fn      = { type: 'keep' } | { type: 'none' } | { type: 'from', key, label, screen }
//           | { type: 'navigate', screen } | { type: 'custom' }   (custom: the comment says what it does)

export const SPEC_VERSION = 1;
export const VIEWPORTS = Object.freeze({
  desktop: { w: 1280, h: 720, label: 'Desktop 1280×720' },
  phone: { w: 844, h: 390, label: 'Handy quer 844×390' },
  tablet: { w: 1180, h: 820, label: 'Tablet 1180×820' }
});

export function emptySpec(preset = 'desktop') {
  const vp = VIEWPORTS[preset] ?? VIEWPORTS.desktop;
  return { version: SPEC_VERSION, viewport: { w: vp.w, h: vp.h, preset }, updatedAt: null, screens: [] };
}

export function screenOf(spec, id) { return spec.screens.find((s) => s.id === id) ?? null; }

// A builtin screen gets its spec entry on first edit.
export function ensureScreen(spec, id, { name = id, builtin = true, description = '', base = null } = {}) {
  let s = screenOf(spec, id);
  if (!s) { s = { id, name, builtin, description, base, changes: [], added: [] }; spec.screens.push(s); }
  return s;
}

// New custom screen: the id is created right away (screen_1, screen_2 …) so functions can point at it.
export function nextScreenId(spec) {
  const used = new Set(spec.screens.map((s) => s.id)); let n = 1;
  while (used.has(`screen_${n}`)) n++;
  return `screen_${n}`;
}
export function addCustomScreen(spec, { name = null, description = '', base = null } = {}) {
  const id = nextScreenId(spec);
  return ensureScreen(spec, id, { name: name || `Neuer Screen ${id.split('_')[1]}`, builtin: false, description, base });
}
export function removeScreen(spec, id) {
  const s = screenOf(spec, id); if (!s || s.builtin) return false;
  spec.screens = spec.screens.filter((x) => x !== s);
  // Links that pointed at it become comments.
  for (const sc of spec.screens) for (const el of [...sc.changes, ...sc.added]) if (el.function?.type === 'navigate' && el.function.screen === id) { el.function = { type: 'custom' }; el.comment = `${el.comment ? el.comment + ' · ' : ''}(Ziel-Screen ${id} wurde gelöscht)`; }
  return true;
}

export function changeOf(screen, target) { return screen.changes.find((c) => c.target === target) ?? null; }
export function ensureChange(screen, target, { label = '', fn = null } = {}) {
  let c = changeOf(screen, target);
  if (!c) { c = { target, label, fn, move: { dx: 0, dy: 0 }, size: null, hidden: false, function: null, comment: '' }; screen.changes.push(c); }
  return c;
}
// A change that changes nothing is dropped (keeps the spec readable).
export function isEmptyChange(c) {
  return !c.hidden && !c.size && !c.comment && (!c.function || c.function.type === 'keep') && Math.abs(c.move?.dx ?? 0) < 1e-6 && Math.abs(c.move?.dy ?? 0) < 1e-6;
}
export function pruneScreen(screen) { screen.changes = screen.changes.filter((c) => !isEmptyChange(c)); return screen; }

export function nextElementId(screen) {
  const used = new Set(screen.added.map((a) => a.id)); let n = 1;
  while (used.has(`${screen.id}_el${n}`)) n++;
  return `${screen.id}_el${n}`;
}
export function addElement(screen, kind = 'button', rect = { x: .42, y: .42, w: .16, h: .08 }) {
  const el = { id: nextElementId(screen), kind, text: kind === 'button' ? 'NEUER BUTTON' : kind === 'text' ? 'Text' : kind === 'icon' ? '★' : '', rect: { ...rect }, style: { bg: kind === 'text' ? 'transparent' : '#2a1f4a', color: '#ffe9a8' }, function: kind === 'button' || kind === 'icon' ? { type: 'custom' } : null, comment: '' };
  screen.added.push(el); return el;
}

// ── readable export ──
const pct = (v) => `${(v * 100).toFixed(1).replace('.', ',')} %`;
const px = (v, total) => `${Math.round(v * total)} px`;
const signed = (s) => (s.startsWith('-') ? '−' + s.slice(1) : '+' + s);
export function describeFunction(fn, spec) {
  if (!fn || fn.type === 'keep') return 'unverändert';
  if (fn.type === 'none') return 'keine Funktion';
  if (fn.type === 'from') return `übernimmt die Funktion von „${fn.label ?? fn.key}“ (\`${fn.key}\`${fn.screen ? `, aus Screen \`${fn.screen}\`` : ''})`;
  if (fn.type === 'navigate') { const s = screenOf(spec, fn.screen); return `wechselt zu Screen \`${fn.screen}\`${s?.name ? ` („${s.name}“)` : ''}`; }
  return 'eigene Funktion (siehe Kommentar)';
}
export function specToMarkdown(spec, screenNames = {}) {
  const { w, h } = spec.viewport; const out = [];
  out.push('# GRIMGE – UI-Editor-Spezifikation', '');
  out.push(`Erstellt im UI-Editor (\`/editor.html\`). Bezugsgröße: ${w}×${h} (${spec.viewport.preset}). Positionen und Größen stehen in Prozent dieser Fläche, damit sie auf jedes Format passen.${spec.updatedAt ? ` Stand: ${spec.updatedAt}.` : ''}`, '');
  const screens = spec.screens.filter((s) => !s.builtin || s.changes.length || s.added.length || s.description);
  if (!screens.length) { out.push('Noch keine Änderungen.'); return out.join('\n') + '\n'; }
  for (const s of screens) {
    out.push(`## ${s.name || screenNames[s.id] || s.id} (\`${s.id}\`)${s.builtin ? '' : ' · NEUER SCREEN'}`, '');
    if (s.description) out.push(`**Beschreibung:** ${s.description}`, '');
    if (!s.builtin) out.push(`**Hintergrund:** ${s.base ? `Screen \`${s.base}\`` : 'leer'}`, '');
    if (s.changes.length) {
      out.push('### Geänderte Elemente', '');
      for (const c of s.changes) {
        const parts = [];
        if (Math.abs(c.move.dx) > 1e-6 || Math.abs(c.move.dy) > 1e-6) parts.push(`verschoben um ${signed(px(c.move.dx, w))} / ${signed(px(c.move.dy, h))} (${signed(pct(c.move.dx))} / ${signed(pct(c.move.dy))})`);
        if (c.size) parts.push(`Größe ${pct(c.size.w)} × ${pct(c.size.h)} (${px(c.size.w, w)} × ${px(c.size.h, h)})`);
        if (c.hidden) parts.push('ausgeblendet');
        if (c.function && c.function.type !== 'keep') parts.push(`Funktion: ${describeFunction(c.function, spec)}`);
        out.push(`- \`${c.target}\` „${c.label || '—'}“${c.fn ? ` (bisher: \`${c.fn}\`)` : ''}: ${parts.join('; ') || 'nur Kommentar'}`);
        if (c.comment) out.push(`  - Kommentar: ${c.comment}`);
      }
      out.push('');
    }
    if (s.added.length) {
      out.push('### Neue Elemente', '');
      for (const a of s.added) {
        out.push(`- \`${a.id}\` ${a.kind === 'button' ? 'Button' : a.kind === 'text' ? 'Text' : a.kind === 'icon' ? 'Icon' : 'Panel'} „${a.text || '—'}“ bei x ${pct(a.rect.x)}, y ${pct(a.rect.y)}, Größe ${pct(a.rect.w)} × ${pct(a.rect.h)}; Farben ${a.style?.bg ?? '—'} / ${a.style?.color ?? '—'}; Funktion: ${a.function ? describeFunction(a.function, spec) : 'keine'}`);
        if (a.comment) out.push(`  - Kommentar: ${a.comment}`);
      }
      out.push('');
    }
  }
  return out.join('\n') + '\n';
}

// Accept a parsed spec from disk / an import; anything unknown is dropped.
export function sanitizeSpec(raw) {
  const spec = emptySpec(raw?.viewport?.preset in VIEWPORTS ? raw.viewport.preset : 'desktop');
  if (raw?.updatedAt) spec.updatedAt = String(raw.updatedAt);
  const num = (v, d = 0) => (Number.isFinite(+v) ? +v : d);
  const fn = (f) => (f && ['keep', 'none', 'from', 'navigate', 'custom'].includes(f.type) ? { type: f.type, ...(f.key ? { key: String(f.key) } : {}), ...(f.label ? { label: String(f.label) } : {}), ...(f.screen ? { screen: String(f.screen) } : {}) } : null);
  for (const s of Array.isArray(raw?.screens) ? raw.screens : []) {
    if (!s?.id) continue;
    const sc = ensureScreen(spec, String(s.id), { name: String(s.name ?? s.id), builtin: !!s.builtin, description: String(s.description ?? ''), base: s.base ? String(s.base) : null });
    for (const c of Array.isArray(s.changes) ? s.changes : []) if (c?.target) sc.changes.push({ target: String(c.target), label: String(c.label ?? ''), fn: c.fn ? String(c.fn) : null, move: { dx: num(c.move?.dx), dy: num(c.move?.dy) }, size: c.size ? { w: num(c.size.w), h: num(c.size.h) } : null, hidden: !!c.hidden, function: fn(c.function), comment: String(c.comment ?? '') });
    for (const a of Array.isArray(s.added) ? s.added : []) if (a?.id) sc.added.push({ id: String(a.id), kind: ['button', 'text', 'panel', 'icon'].includes(a.kind) ? a.kind : 'button', text: String(a.text ?? ''), rect: { x: num(a.rect?.x, .4), y: num(a.rect?.y, .4), w: num(a.rect?.w, .15), h: num(a.rect?.h, .08) }, style: { bg: String(a.style?.bg ?? '#2a1f4a'), color: String(a.style?.color ?? '#ffe9a8') }, function: fn(a.function), comment: String(a.comment ?? '') });
  }
  return spec;
}
