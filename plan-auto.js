/* Panel Álex: plan de entrenamientos automático (plan-auto.js)
   Se carga con una línea en index.html, después del script principal:
     <script src="plan-auto.js"></script>
   Lee tu calendario de Lyados (S.cal.ev, quien 'yo') y rellena el calendario de actividad
   (S.act.plan.dias) con carrera, fuerza y meditación. Cada vez que cambia el calendario
   (por ejemplo una guardia) recalcula todo lo que queda por delante.
   Lo que marques o cambies a mano nunca se toca. */
(function (root) {
'use strict';

/* ---------- utilidades (locales: no chocan con las de la app) ---------- */
const pad = n => String(n).padStart(2, '0');
const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const pY = s => { const a = s.split('-').map(Number); return new Date(a[0], a[1] - 1, a[2]); };
const add = (d, n) => { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); x.setDate(x.getDate() + n); return x; };
const mon = d => add(d, -((d.getDay() + 6) % 7));
const dow = d => (d.getDay() + 6) % 7;
const fnv = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0).toString(16); };

const CFG0 = { fc: 147, hasta: '2027-06-30' };
const HORA = { saliente: '17:30', estr: '09:30', libre: '10:00', tarde: '19:00' };

/* ---------- clasificación de un día a partir de los eventos ---------- */
function clasif(evs, k) {
  const hoy = evs.filter(e => !e.h1 && e.d1 <= k && e.d2 >= k);
  const t = hoy.map(e => String(e.titulo || '').toLowerCase());
  const tit = [];
  hoy.forEach(e => {
    let x = String(e.titulo || '').trim();
    if (!x || x.toLowerCase() === 'l') return;
    if (/guardia/i.test(x)) x = 'Guardia';
    if (!tit.includes(x)) tit.push(x);
  });
  return {
    guardia: t.some(x => /guardia/.test(x)),
    conc: t.some(x => /autoconcierto/.test(x)),
    estr: t.some(x => /estruc/.test(x)),
    L: t.some(x => x.trim() === 'l'),
    fest: t.some(x => /festivo/.test(x)),
    vac: t.some(x => /vacaciones|asuntos propios|permiso|solicitud/.test(x)),
    etiq: tit.join(' + ')
  };
}
function dayInfo(evs, k, d) {
  const f = clasif(evs, k), ay = clasif(evs, ymd(add(d, -1)));
  f.sal = ay.guardia && !f.guardia;                 // saliente: día siguiente a una guardia
  const fin = dow(d) >= 5;
  f.libre = !f.guardia && !f.sal && (f.vac || f.fest || f.L || fin);
  f.turno = f.guardia ? 'Guardia' : f.sal ? 'Saliente' + (f.etiq ? ' · ' + f.etiq : '') : (f.etiq || (fin ? 'Fin de semana' : 'Sin turno marcado'));
  if (f.sal) { f.hora = HORA.saliente; f.fr = 'tarde'; }
  else if (f.estr) { f.hora = HORA.estr; f.fr = 'mañana'; }
  else if (f.libre) { f.hora = HORA.libre; f.fr = 'mañana'; }
  else { f.hora = HORA.tarde; f.fr = 'tarde'; }
  return f;
}

/* ---------- contenido de las sesiones ---------- */
const MIN_C1 = [30, 30, 35, 30], MIN_C2 = [35, 40, 40, 35];
const PATRON = ["4' trote / 1' andar", "5' trote / 1' andar", "6' trote / 1' andar", "8' trote / 1' andar", "10' trote / 1' andar", 'continuo'];
function contenido(t, k, test, cfg) {
  const fc = cfg.fc, kk = Math.max(0, k);
  if (t === 'C1' || t === 'C2') {
    const largo = t === 'C2', blk = Math.floor(kk / 4), w = kk % 4;
    if (test) return { tipo: 'Carrera', min: 60, titulo: "Carrera · TEST 30' FCUL",
      corto: "Test 30' FCUL · FC media de los últimos 20' = FCUL · descansado, sin cafeína",
      largo: "TEST FCUL: 10-15' calentando, 30' sostenido y constante en llano (lap en el min 10), 10' vuelta a la calma. FCUL = FC media de los últimos 20'. La víspera, fuerza sin llegar al fallo." };
    const m = largo ? Math.min(60, MIN_C2[w] + 5 * blk) : Math.min(45, MIN_C1[w] + 5 * blk);
    const p = PATRON[Math.min(5, Math.floor(kk / 2) + (largo ? 1 : 0))];
    return { tipo: 'Carrera', min: m, titulo: 'Carrera suave (Z1-Z2)', corto: m + ' min · ' + p + ' · FC ≤ ' + fc,
      largo: m + " min: 5' andar rápido, trote/andar (" + p + "), 5' andar. FC techo " + fc + " lpm; si lo superas, andar hasta bajar de 135." };
  }
  if (t === 'FA') return { tipo: 'Fuerza', min: 40, titulo: 'Fuerza A (mancuernas 2×10 kg)', corto: 'Sentadilla, peso muerto rumano, press suelo, remo, plancha',
    largo: "Fuerza A: sentadilla goblet 3×12 · peso muerto rumano 2 mancuernas 3×10 · press de suelo 3×10 · remo a un brazo 3×10/lado · plancha 3×30''. Descanso 60-90''." };
  if (t === 'FB') return { tipo: 'Fuerza', min: 40, titulo: 'Fuerza B (mancuernas 2×10 kg)', corto: 'Zancada, hip thrust, press hombro, remo inclinado, dead bug',
    largo: "Fuerza B: zancada atrás 3×8/lado · hip thrust con 1 mancuerna 3×12 · press de hombro 3×10 · remo inclinado 3×10 · dead bug 3×8/lado. Descanso 60-90''." };
  if (t === 'MED') return { tipo: 'Meditación', min: 30, titulo: 'Meditación / Yoga', corto: 'Yoga suave + meditación 20-30 min', largo: 'Yoga suave y meditación guiada 20-30 min, sin esfuerzo.' };
  return { tipo: 'Meditación', min: 20, titulo: 'Meditación / Yoga (opcional)', corto: 'Opcional · 15-20 min en casa', largo: 'Opcional, 15-20 min en casa. Se omite si el día del autoconcierto no lo permite.' };
}

/* ---------- reparto ---------- */
function perm(a) { if (a.length <= 1) return [a]; const o = []; a.forEach((x, i) => perm(a.slice(0, i).concat(a.slice(i + 1))).forEach(p => o.push([x].concat(p)))); return o; }
function comb(a, n) { if (n === 0) return [[]]; if (a.length < n) return []; const o = []; a.forEach((x, i) => comb(a.slice(i + 1), n - 1).forEach(c => o.push([x].concat(c)))); return o; }
function puntuar(asig, prev, info) {
  let s = 0;
  const seq = (prev ? [prev] : []).concat(asig.slice().sort((a, b) => a.k < b.k ? -1 : 1));
  for (let i = 1; i < seq.length; i++) {
    const gap = Math.round((pY(seq[i].k) - pY(seq[i - 1].k)) / 86400000);
    if (gap === 1) { s -= 2; if (seq[i].t[0] === seq[i - 1].t[0]) s -= 8; } else if (gap >= 2) s += 1;
  }
  const f = {}; asig.forEach(a => f[a.t] = a.k);
  if (f.C1 && f.C2 && f.C1 < f.C2) s += 3;
  if (f.FA && f.FB && f.FA < f.FB) s += 3;
  asig.forEach(a => { if (a.t[0] === 'C' && info[a.k].fr === 'mañana') s += 1; });
  return s;
}
const tipoDe = t => /carrera|correr/i.test(t || '') ? 'C' : /fuerza/i.test(t || '') ? 'F' : /yoga|medit/i.test(t || '') ? 'M' : '';

/* Calcula las entradas nuevas. evs: eventos de 'yo'; hoyD: Date; P: {dias,hecho,auto}.
   Devuelve { dias: {fecha: entrada}, info } sin tocar P. */
function planificar(evs, hoyD, P, cfgIn) {
  const cfg = Object.assign({}, CFG0, cfgIn || {});
  const desde = add(hoyD, 1), hk = ymd(desde), hasta = pY(cfg.hasta), start = mon(hoyD);   // se planifica desde mañana
  const dias = P.dias || {}, hecho = P.hecho || {};
  const inicio = cfg.inicio ? mon(pY(cfg.inicio)) : add(start, 7);
  const info = {};
  for (let d = start; d <= hasta; d = add(d, 1)) info[ymd(d)] = dayInfo(evs, ymd(d), d);
  const bloq = k => k < hk || (dias[k] && !dias[k].auto) || (dias[k] && dias[k].auto && hecho[k] != null);
  const out = {}, sess = [];
  let prev = null;
  Object.keys(dias).forEach(k => { const t = tipoDe(dias[k].tipo); if (k < ymd(start) && (t === 'C' || t === 'F') && (!prev || k > prev.k)) prev = { k, t: t + 'x' }; });
  for (let w = start; w <= hasta; w = add(w, 7)) {
    const ds = []; for (let i = 0; i < 7; i++) ds.push(add(w, i));
    const ks = ds.map(ymd), kw = Math.max(0, Math.round((w - inicio) / 604800000));
    const cnt = { C: 0, F: 0, M: 0 };
    ks.forEach(k => { const e = dias[k]; if (!e || !e.tipo || !bloq(k)) return; if (k < hk && hecho[k] === 0) return; const t = tipoDe(e.tipo); if (t) cnt[t]++; });
    const cand = ks.filter((k, i) => k >= hk && k <= cfg.hasta && !bloq(k) && dow(ds[i]) !== 6 && !info[k].guardia && !info[k].conc && !info[k].sal);
    const nC = Math.max(0, 2 - cnt.C), nF = Math.max(0, 2 - cnt.F), nM = Math.max(0, 1 - cnt.M);
    let tipos = [];
    if (nC === 2) tipos.push('C1', 'C2'); else if (nC === 1) tipos.push(cnt.C > 0 ? 'C2' : 'C1');
    if (nF === 2) tipos.push('FA', 'FB'); else if (nF === 1) tipos.push(cnt.F > 0 ? 'FB' : 'FA');
    while (tipos.length > cand.length) { for (const q of ['FB', 'C2', 'FA', 'C1']) { const i = tipos.indexOf(q); if (i >= 0) { tipos.splice(i, 1); break; } } }
    let mejor = null, ms = -1e9;
    if (tipos.length) comb(cand, tipos.length).forEach(c => perm(tipos).forEach(p => {
      const asig = c.map((k, i) => ({ k, t: p[i] })), s = puntuar(asig, prev, info);
      if (s > ms) { ms = s; mejor = asig; }
    }));
    mejor = mejor || [];
    const usados = {};
    mejor.slice().sort((a, b) => a.k < b.k ? -1 : 1).forEach(a => { usados[a.k] = 1; sess.push({ k: a.k, t: a.t, kw }); });
    if (mejor.length) prev = mejor.reduce((a, b) => a.k > b.k ? a : b);
    if (nM) {
      const sal = ks.find((k, i) => k >= hk && k <= cfg.hasta && !bloq(k) && !usados[k] && info[k].sal);
      const libre = cand.find(k => !usados[k]);
      const conc = ks.find((k, i) => k >= hk && k <= cfg.hasta && !bloq(k) && !usados[k] && info[k].conc && dow(ds[i]) !== 6);
      if (sal) sess.push({ k: sal, t: 'MED', kw }), usados[sal] = 1;
      else if (libre) sess.push({ k: libre, t: 'MED', kw }), usados[libre] = 1;
      else if (conc) sess.push({ k: conc, t: 'MEDopc', kw }), usados[conc] = 1;
    }
  }
  /* test de 30' para la FCUL: primera carrera de mañana sin guardia en los 2 días previos; se repite cada 10 semanas */
  let ult = null; Object.keys(dias).forEach(k => { if (dias[k].test && (!ult || k > ult)) ult = k; });
  let cur = ult ? add(pY(ult), 70) : (add(inicio, 0) > desde ? add(inicio, 0) : desde);
  const runs = sess.filter(s => s.t[0] === 'C').sort((a, b) => a.k < b.k ? -1 : 1);
  const elig = r => !clasif(evs, ymd(add(pY(r.k), -1))).guardia && !clasif(evs, ymd(add(pY(r.k), -2))).guardia;
  for (let g = 0; g < 10; g++) {
    const win = runs.filter(r => pY(r.k) >= cur && elig(r)); if (!win.length) break;
    const lim = add(pY(win[0].k), 14), pick = win.find(r => pY(r.k) <= lim && info[r.k].fr === 'mañana' && r.t === 'C2') || win.find(r => pY(r.k) <= lim && info[r.k].fr === 'mañana') || win[0];
    pick.test = true; cur = add(pY(pick.k), 70);
  }
  const res = {};
  sess.forEach(s => {
    const c = contenido(s.t, s.kw, s.test, cfg), i = info[s.k];
    res[s.k] = { tipo: c.tipo, min: c.min, nota: i.hora + ' · ' + c.largo, auto: 1, hora: i.hora, ses: s.t, turno: i.turno, titulo: c.titulo, corto: c.corto };
    if (s.test) res[s.k].test = 1;
  });
  for (let d = start; d <= hasta; d = add(d, 1)) { const k = ymd(d); if (k >= hk && !bloq(k) && !res[k]) res[k] = { tipo: '', auto: 1, turno: info[k].turno }; }
  return { dias: res, info };
}

const API = { planificar, contenido, clasif, dayInfo, CFG0 };
if (typeof module !== 'undefined' && module.exports) module.exports = API;
root.PlanAuto = API;

/* ================= integración con la app ================= */
let enApp = false;
try { enApp = typeof S !== 'undefined' && typeof render === 'function' && typeof V !== 'undefined' && typeof A !== 'undefined'; } catch (e) { }
if (!enApp) return;

const DIAS = ['lun', 'mar', 'mié', 'jue', 'vie', 'sáb', 'dom'];
const MESC = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
function hoyD() { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }
function ensure() {
  const P = S.act.plan;
  if (!P.auto || typeof P.auto !== 'object') P.auto = { on: true, fc: CFG0.fc, hasta: CFG0.hasta, inicio: ymd(add(mon(hoyD()), 7)) };
  if (!P.auto.fc) P.auto.fc = CFG0.fc;
  if (!P.auto.hasta) P.auto.hasta = CFG0.hasta;
  if (!P.auto.inicio) P.auto.inicio = ymd(add(mon(hoyD()), 7));
  return P;
}
const evsYo = () => S.cal.ev.filter(e => e.quien === 'yo');
function huella(P) {
  const hk = ymd(mon(hoyD())), A_ = P.auto;
  const ev = evsYo().filter(e => !e.h1 && e.d2 >= hk && e.d1 <= A_.hasta).map(e => e.d1 + '|' + e.d2 + '|' + e.titulo).sort();
  const man = Object.keys(P.dias).filter(k => k >= hk && !P.dias[k].auto).map(k => k + P.dias[k].tipo).sort();
  const hec = Object.keys(P.hecho).filter(k => k >= hk).sort().map(k => k + P.hecho[k]);
  return fnv(JSON.stringify([A_.fc, A_.hasta, A_.inicio, ev, man, hec]));
}
const manana = () => ymd(add(hoyD(), 1));
function limpia(P, hk) { Object.keys(P.dias).forEach(k => { const e = P.dias[k]; if (e && e.auto && k >= hk && P.hecho[k] == null) delete P.dias[k]; }); }
function regen(P) {
  limpia(P, manana());
  const r = planificar(evsYo(), hoyD(), P, P.auto);
  Object.keys(r.dias).forEach(k => { const e = r.dias[k]; delete e.ses; delete e.turno; delete e.titulo; delete e.corto; P.dias[k] = e; });
  try { if (typeof nuevoTipo === 'function') nuevoTipo('Meditación'); } catch (e) { }
  P.auto.fp = huella(P); P.auto.ts = Date.now();
  guardar();
}
function comprueba() {
  try {
    const P = ensure();
    if (!P.auto.on || !evsYo().length) return;
    if (P.auto.fp !== huella(P)) regen(P);
  } catch (e) { console.log('plan-auto', e && e.message); }
}
const render0 = render;
render = function () { comprueba(); return render0.apply(this, arguments); };

function seccion() {
  const P = ensure(), a = P.auto, hk = ymd(hoyD());
  let s = '<section><div class="sh"><h2>Plan automático</h2><a href="#" data-a="planAjustes">Ajustes</a></div><div class="card">';
  if (!a.on) return s + '<div class="muted small">Desactivado.</div><div class="btns"><button class="btn s pri" data-a="planOn">Activar</button></div></div></section>';
  if (!evsYo().length) return s + '<div class="muted small">Falta cargar tu calendario de Lyados en Agenda. El plan se genera solo cuando esté.</div></div></section>';
  const prox = Object.keys(P.dias).filter(k => k >= hk && P.dias[k].auto && P.dias[k].tipo && P.hecho[k] == null).sort()[0];
  const h = pY(a.hasta);
  s += '<div class="kv" style="padding-top:0"><span>Estado</span><b>Activo hasta ' + MESC[h.getMonth()] + ' ' + h.getFullYear() + '</b></div>';
  if (prox) { const d = pY(prox), e = P.dias[prox]; s += '<div class="kv"><span>Próxima sesión</span><b>' + DIAS[dow(d)] + ' ' + d.getDate() + ' ' + MESC[d.getMonth()] + ' · ' + esc(e.tipo) + (e.hora ? ' · ' + e.hora : '') + '</b></div>'; }
  s += '<div class="kv"><span>Techo de FC en carrera</span><b>' + a.fc + ' lpm</b></div>';
  if (a.ts) s += '<div class="kv small"><span class="muted">Última actualización</span><span class="muted">' + new Date(a.ts).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ' ' + new Date(a.ts).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) + '</span></div>';
  s += '<p class="muted small" style="margin:8px 0 0">Se recalcula solo cuando cambia tu calendario (guardias, vacaciones, turnos). Lo que marques o cambies a mano no se toca.</p>';
  return s + '<div class="btns"><button class="btn s" data-a="planRegen">Recalcular ahora</button><button class="btn s pel" data-a="planOff">Desactivar</button></div></div></section>';
}
const act0 = V.act;
V.act = function () { const h = act0.apply(this, arguments), m = '<div class="cols"><div>', i = h.indexOf(m); return i < 0 ? h : h.slice(0, i + m.length) + seccion() + h.slice(i + m.length); };
Object.assign(A, {
  planOn: () => { const P = ensure(); P.auto.on = true; P.auto.fp = null; cambio(); toast('Plan automático activado'); },
  planOff: () => { const P = ensure(); limpia(P, manana()); P.auto.on = false; P.auto.fp = null; cambio(); toast('Plan automático desactivado'); },
  planRegen: () => { const P = ensure(); P.auto.fp = null; cambio(); toast('Plan recalculado'); },
  planAjustes: () => { const P = ensure(); sheet({ titulo: 'Plan automático', val: { fc: P.auto.fc, hasta: P.auto.hasta },
    intro: 'El techo de frecuencia cardiaca se aplica a las carreras. Cuando midas tu FCUL con el test, ajústalo aquí.',
    campos: [{ k: 'fc', l: 'Techo de FC en carrera (lpm)', tipo: 'num', req: 1 }, { k: 'hasta', l: 'Planificar hasta', tipo: 'date', req: 1 }],
    guardar: v => { if (!(v.fc > 100 && v.fc < 200) || !v.hasta) { toast('Revisa los datos'); return false; } P.auto.fc = Math.round(v.fc); P.auto.hasta = v.hasta; P.auto.fp = null; } }); }
});
comprueba();
render();
})(typeof window !== 'undefined' ? window : globalThis);
