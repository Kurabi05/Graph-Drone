/* ===== 1. UTILITAS MILITER, AUDIO SYNTHESIZER, BGM MANAGER & LOCALSTORAGE ===== */
const $ = s => document.querySelector(s);
let user = { nama: '', kelas: '' };
let bintang = [0, 0, 0, 0, 0, 0];
let trainingPassed = {
  linear: [true, false, true, false, true, false],
  kedudukan: [true, false, true, false]
};
let radarAngle = 0;
let failedCurves = [];

/* ===== HELPER KATEX ENGINE (GAYA GEOGEBRA & MS WORD EQUATION) ===== */
function toLatexString(raw) {
  let clean = (raw || '').trim().replace(/^(y|f\(x\))\s*=\s*/i, '');
  if (!clean) return '';

  let tex = clean
    .replace(/\(\s*(-?\d+)\s*\/\s*(\d+)\s*\)/g, (_, n, d) => {
      const sign = n.startsWith('-') ? '-' : '';
      return `${sign}\\frac{${n.replace('-', '')}}{${d}}`;
    })
    .replace(/(^|[+\-*\s(])(-?\d+)\s*\/\s*(\d+)/g, (_, p, n, d) => {
      const sign = n.startsWith('-') ? '-' : '';
      return `${p}${sign}\\frac{${n.replace('-', '')}}{${d}}`;
    })
    .replace(/(^|[+\-*\s(])(-?\d+)\s*\/$/g, (_, p, n) => {
      const sign = n.startsWith('-') ? '-' : '';
      return `${p}${sign}\\frac{${n.replace('-', '')}}{\\square}`;
    })
    .replace(/\^\(([^)]+)\)/g, '^{$1}')
    .replace(/\^([0-9a-zA-Z+-]+)/g, '^{$1}')
    .replace(/\^$/g, '^{\\square}')
    .replace(/\*/g, ' \\cdot ');

  return tex;
}

function renderTex(el, texStr, displayMode = false) {
  if (!el) return;
  if (window.katex) {
    try {
      window.katex.render(texStr, el, { throwOnError: false, displayMode });
    } catch (e) {
      el.textContent = texStr;
    }
  } else {
    el.textContent = texStr;
  }
}

function texSpan(texStr) {
  return `<span class="k-tex" data-tex="${texStr.replace(/"/g, '&quot;')}"></span>`;
}

function hydrateAllKatex(root = document) {
  if (!window.katex) return;
  root.querySelectorAll('.k-tex[data-tex]').forEach(el => {
    renderTex(el, el.dataset.tex, false);
  });
}

function formatCoefLinearTex(m, c) {
  const fracMap = {
    '0.5': '\\frac{1}{2}',
    '-0.5': '-\\frac{1}{2}',
    '0.25': '\\frac{1}{4}',
    '-0.25': '-\\frac{1}{4}',
    '0.75': '\\frac{3}{4}',
    '-0.75': '-\\frac{3}{4}'
  };

  let mPart = '';
  if (m === 0) mPart = '';
  else if (m === 1) mPart = 'x';
  else if (m === -1) mPart = '-x';
  else if (fracMap[String(m)]) mPart = `${fracMap[String(m)]}x`;
  else mPart = `${m}x`;

  let cPart = '';
  if (m === 0) cPart = `${c}`;
  else if (c > 0) cPart = ` + ${c}`;
  else if (c < 0) cPart = ` - ${Math.abs(c)}`;

  return `y = ${mPart}${cPart}`;
}

/* Equation Editor Sinkronisasi Live (Input + Tombol Equation + Backspace) */
function bindEquationEditor(inputId, renderId, boxId) {
  const inp = $('#' + inputId);
  const out = $('#' + renderId);
  const box = $('#' + boxId);
  if (!inp || !out) return;

  const update = () => {
    const tex = toLatexString(inp.value);
    const fullTex = tex ? `y = ${tex}` : `y = \\square`;
    renderTex(out, fullTex, false);
    const cursor = document.createElement('span');
    cursor.className = 'eq-cursor';
    out.appendChild(cursor);
  };

  if (box) {
    box.addEventListener('click', e => {
      if (e.target.tagName !== 'BUTTON') inp.focus();
    });
  }

  inp.addEventListener('input', update);
  inp.addEventListener('keyup', update);
  inp.addEventListener('change', update);
  update();
  return update;
}

/* ===== MANAJEMEN BACKSOUND BGM DINAMIS ===== */
let currentBgm = null;
let bgmVolume = 0.3;
let isMuted = false;

const bgmMap = {
  mulai: 'bgm-audio-1',
  identitas: 'bgm-audio-1',
  pendahuluan: 'bgm-audio-1',
  menu: 'bgm-audio-2',
  materi: 'bgm-audio-3',
  'materi-view': 'bgm-audio-3',
  petunjuk: 'bgm-audio-4',
  game: 'bgm-audio-4',
  hasil: 'bgm-audio-4',
  bebas: 'bgm-audio-5',
  pengembang: 'bgm-audio-6',
  keluar: 'bgm-audio-1'
};

function playBgmForScreen(screenId) {
  const targetAudioId = bgmMap[screenId];
  if (!targetAudioId) return;

  const targetAudio = $('#' + targetAudioId);
  if (!targetAudio) return;

  if (currentBgm === targetAudio && !currentBgm.paused) return;

  if (currentBgm && currentBgm !== targetAudio) {
    currentBgm.pause();
    currentBgm.currentTime = 0;
  }

  currentBgm = targetAudio;
  currentBgm.volume = isMuted ? 0 : bgmVolume;

  const playPromise = currentBgm.play();
  if (playPromise !== undefined) {
    playPromise.catch(() => {});
  }
}

function initAudioControls() {
  const volInput = $('#bgm-volume');
  const volTxt = $('#vol-txt');
  const btnMute = $('#btn-mute');

  if (volInput) {
    volInput.oninput = e => {
      bgmVolume = parseFloat(e.target.value);
      volTxt.textContent = Math.round(bgmVolume * 100) + '%';
      if (!isMuted && currentBgm) currentBgm.volume = bgmVolume;
      if (bgmVolume === 0) btnMute.textContent = '🔇';
      else if (!isMuted) btnMute.textContent = '🔊';
    };
  }

  if (btnMute) {
    btnMute.onclick = () => {
      isMuted = !isMuted;
      btnMute.textContent = isMuted ? '🔇' : (bgmVolume === 0 ? '🔇' : '🔊');
      if (currentBgm) currentBgm.volume = isMuted ? 0 : bgmVolume;
    };
  }
}

/* Synthesizer Efek Suara SFX */
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
function playSound(type) {
  if (audioCtx.state === 'suspended') audioCtx.resume();
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain); gain.connect(audioCtx.destination);
  const now = audioCtx.currentTime;

  if (type === 'drone_launch') {
    osc.type = 'sawtooth'; osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(600, now + 0.35);
    gain.gain.setValueAtTime(0.2, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'target_reached') {
    osc.type = 'triangle'; osc.frequency.setValueAtTime(440, now);
    osc.frequency.setValueAtTime(880, now + 0.1);
    gain.gain.setValueAtTime(0.25, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
    osc.start(now); osc.stop(now + 0.4);
  } else if (type === 'radar_alarm') {
    osc.type = 'square'; osc.frequency.setValueAtTime(480, now);
    osc.frequency.setValueAtTime(240, now + 0.15);
    gain.gain.setValueAtTime(0.18, now); gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);
    osc.start(now); osc.stop(now + 0.35);
  } else if (type === 'click') {
    osc.type = 'sine'; osc.frequency.setValueAtTime(900, now);
    gain.gain.setValueAtTime(0.04, now); gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
    osc.start(now); osc.stop(now + 0.04);
  }
}

function saveProgress() {
  localStorage.setItem('misi_drone_pgl_v2', JSON.stringify({ user, bintang, trainingPassed }));
}
function loadProgress() {
  const d = localStorage.getItem('misi_drone_pgl_v2');
  if (d) {
    try {
      const p = JSON.parse(d);
      if (p.user) user = p.user;
      if (p.bintang) bintang = p.bintang;
      if (p.trainingPassed) trainingPassed = p.trainingPassed;
    } catch (e) { console.error(e); }
  }
}

/* Navigasi Layar SPA */
const hooks = {
  menu: updateSalam,
  materi: updateMateriBadges,
  bebas: () => {
    bebasCurves = [];
    $('#fb').value = '';
    $('#fb').dispatchEvent(new Event('input'));
    renderBebasLegend();
    drawBebas();
    $('#b-msg').textContent = '';
  },
  hasil: showHasil
};

function go(id) {
  playSound('click');
  document.querySelectorAll('.screen').forEach(e => e.classList.remove('active'));
  const target = $('#' + id);
  target.classList.add('active');
  hydrateAllKatex(target);
  playBgmForScreen(id);
  if (hooks[id]) hooks[id]();
}
document.querySelectorAll('[data-go]').forEach(b => b.onclick = () => go(b.dataset.go));

$('#btnId').onclick = () => {
  const n = $('#nama').value.trim();
  if (!n) { alert('Isi Nama Lengkap terlebih dahulu!'); return; }
  user.nama = n; user.kelas = $('#kelas').value.trim();
  saveProgress();
  go('pendahuluan');
};

$('#btnResetProgres').onclick = () => {
  if (confirm('Apakah Anda yakin ingin mereset seluruh progres misi dan ujian kamp pelatihan?')) {
    bintang = [0, 0, 0, 0, 0, 0];
    trainingPassed = {
      linear: [true, false, true, false, true, false],
      kedudukan: [true, false, true, false]
    };
    saveProgress(); updateSalam();
    alert('Seluruh progres telah dibersihkan.');
  }
};

function updateSalam() {
  loadProgress();
  const total = bintang.reduce((a, b) => a + b, 0);
  const callsignStr = user.nama ? `PILOT: ${user.nama} [${user.kelas || '8'}]` : 'PILOT: TIDAK DIKETAHUI';
  $('#hud-callsign').textContent = callsignStr;
  $('#salam').textContent = `SISWA: ${user.nama || 'ANONIM'} | ⭐ TOTAL SKOR MISI: ${total}/18 BINTANG`;
}

function updateMateriBadges() {
  loadProgress();
  const pass1 = trainingPassed.linear.every(Boolean);
  const pass2 = trainingPassed.kedudukan.every(Boolean);
  $('#m-linear').textContent = `FASE 1: GRADIEN & PERSAMAAN GARIS LURUS ${pass1 ? '✅' : ''}`;
  $('#m-kedudukan').textContent = `FASE 2: KEDUDUKAN DUA GARIS ${pass2 ? '✅' : ''}`;
}

/* ===== 2. PARSER FUNGSI MATEMATIKA & VALIDATOR PERSAMAAN GARIS LURUS ===== */
function compile(src) {
  let s = src.toLowerCase().replace(/\s+/g, '').replace(/,/g, '.').replace(/^(y|f\(x\))=/,'');
  if (!s || !/^[0-9x+\-*/^().]+$/.test(s)) throw Error('format');
  s = s.replace(/(\d|x|\))(?=[x(])/g, '$1*').replace(/(x|\))(?=\d)/g, '$1*');
  let i = 0; const p = () => s[i];
  
  function expr() {
    let f = term();
    while (p() == '+' || p() == '-') {
      const o = s[i++], a = f, g = term();
      f = o == '+' ? x => a(x) + g(x) : x => a(x) - g(x);
    }
    return f;
  }
  function term() {
    let f = unary();
    while (p() == '*' || p() == '/') {
      const o = s[i++], a = f, g = unary();
      f = o == '*' ? x => a(x) * g(x) : x => a(x) / g(x);
    }
    return f;
  }
  function unary() {
    if (p() == '-') { i++; const g = unary(); return x => -g(x); }
    if (p() == '+') { i++; return unary(); }
    return power();
  }
  function power() {
    const b = atom();
    if (p() == '^') { i++; const e = unary(); return x => Math.pow(b(x), e(x)); }
    return b;
  }
  function atom() {
    if (p() == '(') { i++; const f = expr(); if (p() != ')') throw Error('kurung'); i++; return f; }
    if (p() == 'x') { i++; return x => x; }
    const m = /^(\d+\.?\d*|\.\d+)/.exec(s.slice(i));
    if (!m) throw Error('angka');
    i += m[0].length; const n = parseFloat(m[0]); return () => n;
  }
  
  const f = expr(); if (i < s.length) throw Error('sisa'); return f;
}

function isLinearFunction(f) {
  const pts = [-4, -1, 0, 2, 5];
  for (let x of pts) {
    const y0 = f(x - 1), y1 = f(x), y2 = f(x + 1);
    if (!isFinite(y0) || !isFinite(y1) || !isFinite(y2)) return false;
    const diff2 = (y2 - y1) - (y1 - y0);
    if (Math.abs(diff2) > 1e-5) return false;
  }
  return true;
}

/* ===== 3. CUSTOM VECTOR CANVAS DRAWING + LABEL KOORDINAT ===== */
const XR = 12, YR = 8;

function drawCoordBadge(c, px, py, text, color) {
  c.save();
  c.font = 'bold 13px "Share Tech Mono", monospace';
  const w = c.measureText(text).width + 12;
  const h = 20;
  let lx = px + 14;
  let ly = py - 24;
  if (lx + w > c.canvas.width - 10) lx = px - w - 14;
  if (lx < 10) lx = 10;
  if (ly < 10) ly = py + 14;
  if (ly + h > c.canvas.height - 10) ly = c.canvas.height - h - 10;

  c.fillStyle = 'rgba(3, 10, 20, 0.88)';
  c.strokeStyle = color;
  c.lineWidth = 1.2;
  c.fillRect(lx, ly, w, h);
  c.strokeRect(lx, ly, w, h);

  c.fillStyle = color;
  c.textAlign = 'left';
  c.textBaseline = 'middle';
  c.fillText(text, lx + 6, ly + h / 2);
  c.restore();
}

function drawStealthDrone(c, x, y, coord) {
  c.save(); c.translate(x, y);
  c.strokeStyle = '#00f3ff'; c.lineWidth = 1.8;
  c.beginPath(); c.moveTo(-16, -16); c.lineTo(16, 16); c.moveTo(16, -16); c.lineTo(-16, 16); c.stroke();
  c.fillStyle = 'rgba(0,243,255,0.35)';
  [-16, 16].forEach(rx => {
    [-16, 16].forEach(ry => {
      c.beginPath(); c.arc(rx, ry, 6, 0, Math.PI * 2); c.fill();
    });
  });
  c.fillStyle = '#00f3ff';
  c.beginPath(); c.moveTo(0, -14); c.lineTo(12, 10); c.lineTo(0, 5); c.lineTo(-12, 10); c.closePath(); c.fill();
  c.fillStyle = '#00ff66'; c.beginPath(); c.arc(0, 0, 4, 0, Math.PI * 2); c.fill();
  c.restore();

  if (coord) drawCoordBadge(c, x, y, `Pangkalan (${coord[0]}, ${coord[1]})`, '#00f3ff');
}

function drawTargetLock(c, x, y, coord) {
  c.save(); c.translate(x, y);
  c.strokeStyle = '#ff0055'; c.lineWidth = 2.2; c.setLineDash([6, 6]);
  c.beginPath(); c.arc(0, 0, 20, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  c.beginPath();
  c.moveTo(-14, 0); c.lineTo(14, 0);
  c.moveTo(0, -14); c.lineTo(0, 14);
  c.stroke();
  c.fillStyle = '#ff0055'; c.beginPath(); c.arc(0, 0, 5, 0, Math.PI * 2); c.fill();
  c.restore();

  if (coord) drawCoordBadge(c, x, y, `Target (${coord[0]}, ${coord[1]})`, '#ff4d88');
}

function drawSAMRadar(c, x, y, rPx, coord) {
  c.save();
  const grad = c.createRadialGradient(x, y, 2, x, y, rPx);
  grad.addColorStop(0, 'rgba(255, 85, 0, 0.45)');
  grad.addColorStop(1, 'rgba(255, 0, 85, 0.1)');
  c.fillStyle = grad; c.beginPath(); c.arc(x, y, rPx, 0, Math.PI * 2); c.fill();
  
  c.strokeStyle = '#ff5500'; c.lineWidth = 1.8; c.setLineDash([4, 4]);
  c.beginPath(); c.arc(x, y, rPx, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);

  c.fillStyle = '#ff5500';
  c.beginPath(); c.arc(x, y, 7, 0, Math.PI * 2); c.fill();
  c.restore();

  if (coord) drawCoordBadge(c, x, y + rPx * 0.4, `Radar (${coord[0]}, ${coord[1]})`, '#ffaa00');
}

function draw(cv, o = {}) {
  const c = cv.getContext('2d'), W = cv.width, H = cv.height, u = W / (2 * XR);
  const X = x => W / 2 + x * u, Y = y => H / 2 - y * u;

  c.clearRect(0, 0, W, H);
  c.fillStyle = '#030a14'; c.fillRect(0, 0, W, H);

  c.strokeStyle = 'rgba(0, 243, 255, 0.12)'; c.lineWidth = 1;
  [3, 6, 9, 12].forEach(r => {
    c.beginPath(); c.arc(X(0), Y(0), r * u, 0, Math.PI * 2); c.stroke();
  });

  for (let i = -XR; i <= XR; i++) {
    c.strokeStyle = i === 0 ? '#00f3ff' : 'rgba(0, 243, 255, 0.13)';
    c.lineWidth = i === 0 ? 2.2 : 1;
    c.beginPath(); c.moveTo(X(i), 0); c.lineTo(X(i), H); c.stroke();

    if (i !== 0 && i > -XR && i < XR) {
      c.strokeStyle = '#00f3ff88';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(X(i), Y(0) - 4); c.lineTo(X(i), Y(0) + 4); c.stroke();
    }
  }

  for (let j = -YR; j <= YR; j++) {
    c.strokeStyle = j === 0 ? '#00f3ff' : 'rgba(0, 243, 255, 0.13)';
    c.lineWidth = j === 0 ? 2.2 : 1;
    c.beginPath(); c.moveTo(0, Y(j)); c.lineTo(W, Y(j)); c.stroke();

    if (j !== 0 && j > -YR && j < YR) {
      c.strokeStyle = '#00f3ff88';
      c.lineWidth = 1.5;
      c.beginPath(); c.moveTo(X(0) - 4, Y(j)); c.lineTo(X(0) + 4, Y(j)); c.stroke();
    }
  }

  // Angka Sumbu X & Y
  c.save();
  c.font = 'bold 18px "Share Tech Mono", monospace';
  c.fillStyle = '#8ceeff';

  c.textAlign = 'center';
  c.textBaseline = 'top';
  for (let i = -XR + 2; i <= XR - 2; i += 2) {
    if (i !== 0) c.fillText(i, X(i), Y(0) + 8);
  }

  c.textAlign = 'left';
  c.textBaseline = 'middle';
  for (let j = -YR + 2; j <= YR - 2; j += 2) {
    if (j !== 0) c.fillText(j, X(0) + 10, Y(j));
  }

  c.textAlign = 'right';
  c.textBaseline = 'top';
  c.fillText('0', X(0) - 8, Y(0) + 8);

  c.fillStyle = '#ffaa00';
  c.font = 'bold 19px "Orbitron", sans-serif';
  c.textAlign = 'right';
  c.textBaseline = 'bottom';
  c.fillText('X', W - 12, Y(0) - 10);

  c.textAlign = 'right';
  c.textBaseline = 'top';
  c.fillText('Y', X(0) - 12, 12);
  c.restore();

  // Radar Sweep
  const cx = X(0), cy = Y(0), rMax = Math.max(W, H);
  c.save();
  c.beginPath(); c.moveTo(cx, cy);
  c.arc(cx, cy, rMax, radarAngle - 0.4, radarAngle, false);
  c.closePath();
  const sweepGrad = c.createRadialGradient(cx, cy, 0, cx, cy, rMax / 1.5);
  sweepGrad.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
  sweepGrad.addColorStop(1, 'rgba(0, 243, 255, 0.01)');
  c.fillStyle = sweepGrad; c.fill();

  c.strokeStyle = '#00f3ff'; c.lineWidth = 1.5;
  c.beginPath(); c.moveTo(cx, cy);
  c.lineTo(cx + rMax * Math.cos(radarAngle), cy + rMax * Math.sin(radarAngle));
  c.stroke(); c.restore();

  // Garis Referensi
  (o.refLines || []).forEach((ref, idx) => {
    c.save();
    c.strokeStyle = ref.color || '#ffaa00';
    c.lineWidth = 2.5;
    c.setLineDash([8, 6]);
    c.beginPath();
    let on = false;
    for (let x = -XR; x <= XR; x += 0.1) {
      const y = ref.f(x);
      if (!isFinite(y) || Math.abs(y) > 30) { on = false; continue; }
      on ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y));
      on = true;
    }
    c.stroke();
    c.setLineDash([]);

    if (ref.label) {
      c.fillStyle = ref.color || '#ffaa00';
      c.font = 'bold 13px "Share Tech Mono", monospace';
      c.fillText(ref.label, 16, 26 + idx * 20);
    }
    c.restore();
  });

  if (o.previewCurve) {
    c.save();
    c.strokeStyle = '#00ff66';
    c.lineWidth = 2.5;
    c.setLineDash([10, 6]);
    c.shadowColor = '#00ff66';
    c.shadowBlur = 10;
    c.beginPath();
    let on = false;
    for (let x = -XR; x <= XR; x += 0.05) {
      const y = o.previewCurve(x);
      if (!isFinite(y) || Math.abs(y) > 30) { on = false; continue; }
      on ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y));
      on = true;
    }
    c.stroke();
    c.restore();
  }

  (o.waypoints || []).forEach(pt => {
    c.save();
    c.fillStyle = '#00ff66';
    c.beginPath(); c.arc(X(pt[0]), Y(pt[1]), 6, 0, Math.PI * 2); c.fill();
    drawCoordBadge(c, X(pt[0]), Y(pt[1]), `Titik (${pt[0]}, ${pt[1]})`, '#00ff66');
    c.restore();
  });

  // Garis Percobaan Gagal (Tetap Ditampilkan di Layar)
  (o.failedCurves || []).forEach(k => {
    const a = k.from ?? -XR, b = k.to ?? XR;
    const step = a <= b ? 0.05 : -0.05;
    let on = false;
    c.save();
    c.strokeStyle = 'rgba(255, 0, 85, 0.85)'; c.lineWidth = 2.5;
    c.setLineDash([7, 5]); c.beginPath();

    for (let x = a; (step > 0 ? x <= b : x >= b); x += step) {
      const y = k.f(x);
      if (!isFinite(y) || Math.abs(y) > 30) { on = false; continue; }
      on ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y));
      on = true;
    }
    c.stroke(); c.restore();
  });

  (o.obs || []).forEach(([a, b, r]) => {
    drawSAMRadar(c, X(a), Y(b), r * u, [a, b]);
  });

  if (o.target) drawTargetLock(c, X(o.target[0]), Y(o.target[1]), o.target);
  if (o.player) drawStealthDrone(c, X(o.player[0]), Y(o.player[1]), o.player);

  (o.curves || []).forEach(k => {
    const a = k.from ?? -XR, b = k.to ?? XR;
    const step = a <= b ? 0.05 : -0.05;
    let on = false;
    c.strokeStyle = k.color || '#00f3ff'; c.lineWidth = 3;
    c.shadowColor = c.strokeStyle; c.shadowBlur = 12; c.beginPath();

    for (let x = a; (step > 0 ? x <= b : x >= b); x += step) {
      const y = k.f(x);
      if (!isFinite(y) || Math.abs(y) > 30) { on = false; continue; }
      on ? c.lineTo(X(x), Y(y)) : c.moveTo(X(x), Y(y));
      on = true;
    }
    c.stroke(); c.shadowBlur = 0;
  });
}

/* ===== 4. MODUL PELATIHAN INTERAKTIF + UJIAN TIAP MODUL (KATEX EQUATION) ===== */
const TRAINING_DATA = {
  linear: {
    title: 'FASE 1: GRADIEN & PERSAMAAN GARIS LURUS',
    steps: [
      {
        id: '1.1',
        type: 'learn',
        name: '1.1 Materi: Konstanta (c)',
        dialog: `Halo Kadet! Pada persamaan ${texSpan('y = mx + c')}, nilai ${texSpan('c')} adalah titik potong garis pada Sumbu-Y (${texSpan('x = 0')}).<br>
                 Geser slider ${texSpan('c')} di bawah ini untuk melihat garis bergeser naik dan turun!`,
        sliders: ['c'],
        init: { m: 1, c: 0 },
        getFeedback: p => {
          if (p.c > 0) return `[POSISI ATAS] Garis memotong Sumbu-Y di titik (0, ${p.c}).`;
          if (p.c < 0) return `[POSISI BAWAH] Garis memotong Sumbu-Y di titik (0, ${p.c}).`;
          return `[TITIK ASAL] Garis melewati titik pusat koordinat (0, 0).`;
        },
        rumus: p => formatCoefLinearTex(1, p.c)
      },
      {
        id: 'Ujian 1.1',
        type: 'exam',
        name: '🎯 Ujian 1.1: Atur Nilai c',
        dialog: `Waktunya uji coba! Gunakan gradien tetap ${texSpan('m = 1')}. Susun persamaan ${texSpan('y = x + c')} agar drone di <b>(-3, 0)</b> menembak target di <b>(2, 5)</b>!`,
        p: [-3, 0], t: [2, 5], o: [], refLines: [],
        scaffold: {
          step1: `<b>📌 Cek Gradien:</b> Soal menetapkan gradien ${texSpan('m = 1')}, sehingga bentuk persamaannya adalah ${texSpan('y = x + c')}.`,
          step2: `<b>🎯 Masukkan Koordinat:</b> Substitusi titik pangkalan (-3, 0) ke persamaan → ${texSpan('0 = -3 + c')}.`,
          step3: `<b>🔧 Hasil Akhir:</b> Diperoleh ${texSpan('c = 3')}. Susun persamaan ${texSpan('y = x + 3')} lalu tekan Tembak!`
        }
      },
      {
        id: '1.2',
        type: 'learn',
        name: '1.2 Materi: Gradien (m)',
        dialog: `Bagus! Sekarang pelajari <b>gradien</b> (${texSpan('m = \\frac{y_2 - y_1}{x_2 - x_1}')}).<br>
                 Geser slider ${texSpan('m')} untuk membandingkan garis naik (${texSpan('m > 0')}), mendatar (${texSpan('m = 0')}), dan turun (${texSpan('m < 0')}).`,
        sliders: ['m', 'c'],
        init: { m: 1, c: 2 },
        getFeedback: p => {
          if (p.m > 0) return `[GRADIEN POSITIF] ${texSpan('m = ' + p.m)} — Garis miring naik ke kanan.`;
          if (p.m === 0) return `[GRADIEN NOL] ${texSpan('m = 0')} — Garis mendatar sejajar Sumbu-X.`;
          return `[GRADIEN NEGATIF] ${texSpan('m = ' + p.m)} — Garis miring turun ke kanan.`;
        },
        rumus: p => formatCoefLinearTex(p.m, p.c)
      },
      {
        id: 'Ujian 1.2',
        type: 'exam',
        name: '🎯 Ujian 1.2: Gradien Negatif',
        dialog: `Ujian kedua! Drone berada di <b>(-4, 6)</b> dan target di <b>(2, 0)</b>. Hitung gradien ${texSpan('m')} dan konstanta ${texSpan('c')}, lalu tembak targetnya!`,
        p: [-4, 6], t: [2, 0], o: [], refLines: [],
        scaffold: {
          step1: `<b>📌 Hitung Gradien:</b> ${texSpan('m = \\frac{0 - 6}{2 - (-4)} = \\frac{-6}{6} = -1')}.`,
          step2: `<b>🎯 Hitung Konstanta:</b> Masukkan titik (2, 0) ke ${texSpan('y = -x + c')} → ${texSpan('0 = -2 + c')} → ${texSpan('c = 2')}.`,
          step3: `<b>🔧 Hasil Akhir:</b> Susun persamaan garis ${texSpan('y = -x + 2')}.`
        }
      },
      {
        id: '1.3',
        type: 'learn',
        name: '1.3 Materi: Garis Dua Titik',
        dialog: `Untuk menghubungkan dua titik sembarang, cari gradien ${texSpan('m')} terlebih dahulu, lalu atur ${texSpan('c')}.<br>
                 Arahkan garis tepat melewati titik <b>(-4, 0)</b> dan <b>(4, 4)</b>!`,
        sliders: ['m', 'c'],
        init: { m: 1, c: 0 },
        waypoints: [[-4, 0], [4, 4]],
        getFeedback: p => {
          if (p.m === 0.5 && p.c === 2) return `[TEPAT] Garis ${texSpan('y = \\frac{1}{2}x + 2')} melewati (-4, 0) dan (4, 4)!`;
          return `[PETUNJUK] Hitung ${texSpan('m = \\frac{4 - 0}{4 - (-4)} = \\frac{1}{2}')}, lalu atur ${texSpan('c = 2')}.`;
        },
        rumus: p => formatCoefLinearTex(p.m, p.c)
      },
      {
        id: 'Ujian 1.3',
        type: 'exam',
        name: '🎯 Ujian 1.3: Sertifikasi Fase 1',
        dialog: `Ujian akhir Fase 1! Hubungkan pangkalan drone di <b>(-3, -2)</b> tepat menuju target di <b>(1, 6)</b> untuk membuka Fase 2!`,
        p: [-3, -2], t: [1, 6], o: [], refLines: [],
        scaffold: {
          step1: `<b>📌 Hitung Gradien:</b> ${texSpan('m = \\frac{6 - (-2)}{1 - (-3)} = \\frac{8}{4} = 2')}.`,
          step2: `<b>🎯 Hitung Konstanta:</b> Masukkan titik (1, 6) ke ${texSpan('y = 2x + c')} → ${texSpan('6 = 2(1) + c')} → ${texSpan('c = 4')}.`,
          step3: `<b>🔧 Hasil Akhir:</b> Susun persamaan garis ${texSpan('y = 2x + 4')}.`
        }
      }
    ],
    func: p => x => p.m * x + p.c
  },
  kedudukan: {
    title: 'FASE 2: KEDUDUKAN DUA GARIS',
    steps: [
      {
        id: '2.1',
        type: 'learn',
        name: '2.1 Materi: Garis Sejajar',
        dialog: `Garis kuning adalah jalur patroli ${texSpan('y = x + 1')} (${texSpan('m_1 = 1')}).<br>
                 Dua garis <b>SEJAJAR</b> jika ${texSpan('m_2 = m_1')} dan nilai ${texSpan('c')} berbeda. Buat garis biru sejajar garis kuning!`,
        sliders: ['m', 'c'],
        init: { m: -0.5, c: -1 },
        refLines: [{ f: x => x + 1, color: '#ffaa00', label: 'Garis Patroli: y = x + 1 (m₁ = 1)' }],
        getFeedback: p => {
          if (p.m === 1 && p.c !== 1) return `[SEJAJAR] ${texSpan('m_1 = m_2 = 1')}! Kedua garis sejajar dan tidak berpotongan.`;
          if (p.m === 1 && p.c === 1) return `[BERIMPIT] Geser slider ${texSpan('c')} agar kedua garis tidak menumpuk.`;
          return `[BERPOTONGAN] ${texSpan('m_1 \\neq m_2')}. Samakan nilai ${texSpan('m = 1')}.`;
        },
        rumus: p => formatCoefLinearTex(p.m, p.c)
      },
      {
        id: 'Ujian 2.1',
        type: 'exam',
        name: '🎯 Ujian 2.1: Uji Garis Sejajar',
        dialog: `Ujian Sejajar! Jalur kuning adalah ${texSpan('y = x - 2')} (${texSpan('m_1 = 1')}). Luncurkan drone dari <b>(-4, -1)</b> sejajar garis kuning menuju target <b>(2, 5)</b>!`,
        p: [-4, -1], t: [2, 5], o: [],
        refLines: [{ f: x => x - 2, color: '#ffaa00', label: 'Garis Acuan: y = x - 2 (m₁ = 1)' }],
        scaffold: {
          step1: `<b>📌 Syarat Sejajar:</b> Gradien sama (${texSpan('m_2 = m_1')}), sehingga ${texSpan('m_2 = 1')}.`,
          step2: `<b>🎯 Hitung Konstanta:</b> Substitusi pangkalan (-4, -1) ke ${texSpan('y = x + c')} → ${texSpan('-1 = -4 + c')} → ${texSpan('c = 3')}.`,
          step3: `<b>🔧 Hasil Akhir:</b> Susun persamaan garis ${texSpan('y = x + 3')}.`
        }
      },
      {
        id: '2.2',
        type: 'learn',
        name: '2.2 Materi: Tegak Lurus',
        dialog: `Garis kuning berada pada ${texSpan('y = 2x - 1')} (${texSpan('m_1 = 2')}).<br>
                 Dua garis saling <b>TEGAK LURUS</b> jika ${texSpan('m_1 \\times m_2 = -1')}. Geser slider ${texSpan('m')} hingga menghasilkan sudut 90°!`,
        sliders: ['m', 'c'],
        init: { m: 0.5, c: 2 },
        refLines: [{ f: x => 2 * x - 1, color: '#ffaa00', label: 'Garis Acuan: y = 2x - 1 (m₁ = 2)' }],
        getFeedback: p => {
          const prod = +(2 * p.m).toFixed(2);
          if (Math.abs(prod + 1) < 0.01) return `[TEGAK LURUS 90°] ${texSpan('2 \\times (-\\frac{1}{2}) = -1')}! Sudut perpotongan 90°.`;
          return `[CEK PERKALIAN] ${texSpan('m_1 \\times m_2 = ' + prod)} (Target hasil kali: ${texSpan('-1')}).`;
        },
        rumus: p => formatCoefLinearTex(p.m, p.c)
      },
      {
        id: 'Ujian 2.2',
        type: 'exam',
        name: '🎯 Ujian 2.2: Sertifikasi Fase 2',
        dialog: `Ujian akhir Kamp Pelatihan! Garis pemindai adalah ${texSpan('y = \\frac{1}{2}x - 2')} (${texSpan('m_1 = \\frac{1}{2}')}). Terbangkan drone dari <b>(-2, 5)</b> tegak lurus garis pemindai menuju target <b>(3, -5)</b>!`,
        p: [-2, 5], t: [3, -5], o: [],
        refLines: [{ f: x => 0.5 * x - 2, color: '#ffaa00', label: 'Garis Pemindai: y = (1/2)x - 2 (m₁ = 1/2)' }],
        scaffold: {
          step1: `<b>📌 Syarat Tegak Lurus:</b> ${texSpan('\\frac{1}{2} \\times m_2 = -1')} → ${texSpan('m_2 = -2')}.`,
          step2: `<b>🎯 Hitung Konstanta:</b> Substitusi (-2, 5) ke ${texSpan('y = -2x + c')} → ${texSpan('5 = -2(-2) + c')} → ${texSpan('c = 1')}.`,
          step3: `<b>🔧 Hasil Akhir:</b> Susun persamaan garis ${texSpan('y = -2x + 1')}.`
        }
      }
    ],
    func: p => x => p.m * x + p.c
  }
};

let currentPhaseKey = 'linear';
let currentStepIdx = 0;
let currentParams = {};
let examBusy = false;
let examFailedCurves = [];

function startMateriPhase(key) {
  loadProgress();
  currentPhaseKey = key;
  const firstUnpassed = trainingPassed[key].findIndex(v => !v);
  currentStepIdx = firstUnpassed !== -1 ? firstUnpassed : 0;
  loadStep();
  go('materi-view');
}

function isStepUnlocked(phaseKey, idx) {
  for (let k = 0; k < idx; k++) {
    if (!trainingPassed[phaseKey][k]) return false;
  }
  return true;
}

function loadStep() {
  const phase = TRAINING_DATA[currentPhaseKey];
  const step = phase.steps[currentStepIdx];
  examBusy = false;
  examFailedCurves = [];

  const stepperContainer = $('#training-steps');
  stepperContainer.innerHTML = phase.steps.map((s, idx) => {
    const unlocked = isStepUnlocked(currentPhaseKey, idx);
    const passed = trainingPassed[currentPhaseKey][idx] && s.type === 'exam';
    const cls = [
      'step-pill',
      s.type === 'exam' ? 'exam-pill' : '',
      passed ? 'passed' : '',
      !unlocked ? 'locked' : '',
      idx === currentStepIdx ? 'active' : ''
    ].filter(Boolean).join(' ');
    return `<div class="${cls}" onclick="selectStep(${idx})">${s.name}${passed ? ' ✓' : ''}</div>`;
  }).join('');

  const dlg = $('#cm-dialog');
  dlg.innerHTML = `<b>[${step.id}]</b> ${step.dialog}`;
  hydrateAllKatex(dlg);

  const btnBackModul = $('#btnBackModul');

  if (step.type === 'learn') {
    $('#learn-area').classList.remove('hidden');
    $('#exam-area').classList.add('hidden');
    if (btnBackModul) btnBackModul.classList.remove('hidden');

    currentParams = { m: 1, c: 0, ...step.init };
    const slidersContainer = $('#sliders');
    slidersContainer.innerHTML = '';

    step.sliders.forEach(paramName => {
      let min = -4, max = 4, st = 0.25;
      if (paramName === 'c') { min = -6; max = 6; st = 0.5; }
      
      const val = currentParams[paramName];
      const lbl = document.createElement('label');
      lbl.innerHTML = `<span>Nilai <b>${paramName}</b>:</span> <input type="range" min="${min}" max="${max}" step="${st}" value="${val}"> <span>${val}</span>`;
      lbl.querySelector('input').oninput = e => {
        currentParams[paramName] = +e.target.value;
        lbl.querySelectorAll('span')[1].textContent = currentParams[paramName];
        updateStatusUI();
      };
      slidersContainer.appendChild(lbl);
    });
    updateStatusUI();
  } else {
    $('#learn-area').classList.add('hidden');
    $('#exam-area').classList.remove('hidden');
    if (btnBackModul) btnBackModul.classList.add('hidden');

    $('#fm-exam').value = '';
    $('#fm-exam').dispatchEvent(new Event('input'));
    $('#exam-msg').textContent = trainingPassed[currentPhaseKey][currentStepIdx]
      ? '[LULUS] Ujian tahap ini sudah selesai. Kamu boleh berlatih lagi atau lanjut tahap.'
      : '[STATUS] Tembak target untuk membuka tahap berikutnya.';
  }

  updateNavButtons();
}

function updateNavButtons() {
  const phase = TRAINING_DATA[currentPhaseKey];
  const step = phase.steps[currentStepIdx];
  const passed = trainingPassed[currentPhaseKey][currentStepIdx];

  $('#btnPrevStep').disabled = currentStepIdx === 0;
  $('#btnNextStep').disabled = step.type === 'exam' && !passed;
  $('#btnNextStep').textContent = currentStepIdx === phase.steps.length - 1
    ? 'SELESAI MODUL ✓'
    : 'LANJUT TAHAP ➔';
}

function selectStep(idx) {
  if (!isStepUnlocked(currentPhaseKey, idx)) {
    playSound('radar_alarm');
    $('#cm-dialog').innerHTML = `<b>[AKSES TERKUNCI]</b> Selesaikan <b>Ujian Modul</b> pada tahap aktif terlebih dahulu sebelum membuka tahap berikutnya!`;
    return;
  }
  playSound('click');
  currentStepIdx = idx;
  loadStep();
}

function updateStatusUI() {
  const phase = TRAINING_DATA[currentPhaseKey];
  const step = phase.steps[currentStepIdx];
  if (step.type !== 'learn') return;
  renderTex($('#mv-rumus'), step.rumus(currentParams), false);
  const fb = $('#mv-feedback');
  fb.innerHTML = step.getFeedback(currentParams);
  hydrateAllKatex(fb);
}

function drawMateri() {
  if (!$('#materi-view').classList.contains('active')) return;
  const phase = TRAINING_DATA[currentPhaseKey];
  const step = phase.steps[currentStepIdx];

  if (step.type === 'learn') {
    draw($('#cv-materi'), {
      curves: [{ f: phase.func(currentParams) }],
      refLines: step.refLines || [],
      waypoints: step.waypoints || []
    });
  } else if (!examBusy) {
    draw($('#cv-materi'), {
      player: step.p,
      target: step.t,
      obs: step.o || [],
      refLines: step.refLines || [],
      failedCurves: examFailedCurves
    });
  }
}

/* Peluncuran Drone pada Ujian Kamp Pelatihan (Tetap tampilkan visual garis walau salah) */
function tembakExam() {
  if (examBusy) return;
  const phase = TRAINING_DATA[currentPhaseKey];
  const step = phase.steps[currentStepIdx];
  if (step.type !== 'exam') return;

  let f;
  try {
    f = compile($('#fm-exam').value);
  } catch (e) {
    playSound('radar_alarm');
    $('#exam-msg').textContent = '[ERROR] Format persamaan salah.';
    return;
  }

  const linearOk = isLinearFunction(f);
  const startOk = isFinite(f(step.p[0])) && Math.abs(f(step.p[0]) - step.p[1]) <= 0.5;

  if (!linearOk || !startOk) {
    playSound('radar_alarm');
    examFailedCurves.push({ f, from: -XR, to: XR });
    drawMateri();
    $('#exam-msg').textContent = !linearOk
      ? '[MELESET] Persamaan bukan garis lurus (y = mx + c), perhatikan visual garis merah pada grafik.'
      : `[MELESET] Garis merah belum melewati titik pangkalan (${step.p[0]}, ${step.p[1]})!`;
    const dlg = $('#cm-dialog');
    dlg.innerHTML = !linearOk
      ? `<b>[EVALUASI]</b> Persamaan yang dimasukkan menghasilkan kurva non-linear (garis merah putus-putus). Gunakan persamaan garis lurus ${texSpan('y = mx + c')}.`
      : `<b>[EVALUASI]</b> Garismu (garis merah putus-putus) tidak melewati pangkalan <b>(${step.p[0]}, ${step.p[1]})</b>. Periksa kembali nilai ${texSpan('m')} dan ${texSpan('c')}.`;
    hydrateAllKatex(dlg);
    return;
  }

  examBusy = true;
  playSound('drone_launch');
  $('#exam-msg').textContent = '[MELUNCUR] Drone mengikuti garis persamaanmu...';

  const dir = step.t[0] >= step.p[0] ? 1 : -1;
  const rStep = 0.02 * dir;
  let end = dir > 0 ? XR : -XR;
  let hasil = 'lewat';

  for (let x = step.p[0]; (dir > 0 ? x <= XR : x >= -XR); x += rStep) {
    const y = f(x);
    if (!isFinite(y) || Math.abs(y) > YR + 2) { end = x; hasil = 'keluar'; break; }
    if ((step.o || []).some(([a, b, r]) => Math.hypot(x - a, y - b) < r)) { end = x; hasil = 'tabrak'; break; }
    if (Math.hypot(x - step.t[0], y - step.t[1]) < 0.6) { end = x; hasil = 'kena'; break; }
  }

  let cur = step.p[0];
  (function anim() {
    cur += 0.3 * dir;
    const reached = dir > 0 ? cur >= end : cur <= end;
    draw($('#cv-materi'), {
      player: step.p,
      target: step.t,
      obs: step.o || [],
      refLines: step.refLines || [],
      failedCurves: examFailedCurves,
      curves: [{ f, from: step.p[0], to: reached ? end : cur }]
    });

    if (!reached) return requestAnimationFrame(anim);

    examBusy = false;
    if (hasil === 'kena') {
      playSound('target_reached');
      trainingPassed[currentPhaseKey][currentStepIdx] = true;
      saveProgress();
      const submittedTex = `y = ${toLatexString($('#fm-exam').value)}`;
      loadStep();
      $('#exam-msg').textContent = '🎯 TEPAT SASARAN! Klik tombol LANJUT TAHAP ➔ di bawah.';
      const dlg = $('#cm-dialog');
      dlg.innerHTML = `<b>[LULUS ${step.id}]</b> Luar biasa, Kadet <b>${user.nama || ''}</b>! Persamaan ${texSpan(submittedTex)} mengenai target dengan akurat. Klik <b>LANJUT TAHAP ➔</b> untuk melanjutkan!`;
      hydrateAllKatex(dlg);
    } else {
      playSound('radar_alarm');
      examFailedCurves.push({ f, from: -XR, to: XR });
      drawMateri();
      $('#exam-msg').textContent = '⚠️ Tembakan meleset! Perhatikan garis merah putus-putus lalu coba lagi.';
      const dlg = $('#cm-dialog');
      dlg.innerHTML = `<b>[EVALUASI]</b> Garismu (garis merah putus-putus) belum mengenai titik target <b>(${step.t[0]}, ${step.t[1]})</b>. Periksa kembali nilai gradien ${texSpan('m')} dan konstanta ${texSpan('c')}, atau klik <b>PETUNJUK RUMUS</b>.`;
      hydrateAllKatex(dlg);
    }
  })();
}

$('#btnTembakExam').onclick = tembakExam;
$('#fm-exam').onkeydown = e => { if (e.key === 'Enter') tembakExam(); };
$('#btnHintExam').onclick = () => {
  playSound('click');
  const step = TRAINING_DATA[currentPhaseKey].steps[currentStepIdx];
  if (step.scaffold) {
    showResultModal(false, 'manual_hint', step.scaffold, true);
  }
};

$('#btnPrevStep').onclick = () => { if (currentStepIdx > 0) selectStep(currentStepIdx - 1); };
$('#btnNextStep').onclick = () => {
  const phase = TRAINING_DATA[currentPhaseKey];
  if (!trainingPassed[currentPhaseKey][currentStepIdx]) {
    playSound('radar_alarm');
    return;
  }
  if (currentStepIdx < phase.steps.length - 1) {
    selectStep(currentStepIdx + 1);
  } else {
    playSound('target_reached');
    alert(`Selamat! Kamu telah menuntaskan seluruh materi dan ujian pada ${phase.title}!`);
    go('materi');
  }
};

$('#m-linear').onclick = () => startMateriPhase('linear');
$('#m-kedudukan').onclick = () => startMateriPhase('kedudukan');

/* ===== 5. MISI TANTANGAN PERSAMAAN GARIS LURUS (LEVEL 1-6 KATEX EQUATION) ===== */
const LV = [
  {
    j: 'MISI 1 · PENERBANGAN LURUS DASAR (GRADIEN POSITIF)',
    i: `Tentukan persamaan garis lurus ${texSpan('y = mx + c')} agar drone dari Pangkalan <b>(-4, -1)</b> tepat mengenai Target <b>(2, 5)</b>.`,
    p: [-4, -1], t: [2, 5], o: [], ref: [],
    scaffold: {
      step1: `<b>📌 Baca Koordinat:</b> Pangkalan di <b>(-4, -1)</b> dan Target di <b>(2, 5)</b>.`,
      step2: `<b>🎯 Hitung Gradien:</b> ${texSpan('m = \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{5 - (-1)}{2 - (-4)} = \\frac{6}{6} = 1')}.`,
      step3: `<b>🔧 Hitung Konstanta:</b> Substitusi (2, 5) ke ${texSpan('y = x + c')} → ${texSpan('5 = 2 + c')} → ${texSpan('c = 3')}. Persamaan: ${texSpan('y = x + 3')}.`
    }
  },
  {
    j: 'MISI 2 · LINTASAN MENURUN (GRADIEN NEGATIF)',
    i: `Arahkan drone menukik dari Pangkalan <b>(-5, 6)</b> menuju Target <b>(3, -2)</b> sambil menghindari Radar SAM di <b>(0, 4)</b>.`,
    p: [-5, 6], t: [3, -2], o: [[0, 4, 1.5]], ref: [],
    scaffold: {
      step1: `<b>📌 Baca Koordinat:</b> Lintasan turun dari Pangkalan <b>(-5, 6)</b> menuju Target <b>(3, -2)</b>.`,
      step2: `<b>🎯 Hitung Gradien:</b> ${texSpan('m = \\frac{-2 - 6}{3 - (-5)} = \\frac{-8}{8} = -1')}.`,
      step3: `<b>🔧 Hitung Konstanta:</b> Substitusi (3, -2) ke ${texSpan('y = -x + c')} → ${texSpan('-2 = -3 + c')} → ${texSpan('c = 1')}. Persamaan: ${texSpan('y = -x + 1')}.`
    }
  },
  {
    j: 'MISI 3 · JALUR MELEWATI TITIK ASAL (0, 0)',
    i: `Hubungkan Pangkalan <b>(-3, -6)</b> menuju Target <b>(3, 6)</b> melewati celah aman di antara dua radar musuh.`,
    p: [-3, -6], t: [3, 6], o: [[-2, 2, 1.5], [2, -2, 1.5]], ref: [],
    scaffold: {
      step1: `<b>📌 Baca Koordinat:</b> Garis lurus dari <b>(-3, -6)</b> menuju <b>(3, 6)</b>.`,
      step2: `<b>🎯 Hitung Gradien:</b> ${texSpan('m = \\frac{6 - (-6)}{3 - (-3)} = \\frac{12}{6} = 2')}.`,
      step3: `<b>🔧 Hitung Konstanta:</b> Substitusi (3, 6) ke ${texSpan('y = 2x + c')} → ${texSpan('6 = 6 + c')} → ${texSpan('c = 0')}. Persamaan: ${texSpan('y = 2x')}.`
    }
  },
  {
    j: 'MISI 4 · DUA GARIS SEJAJAR (m₁ = m₂)',
    i: `Garis kuning adalah jalur patroli ${texSpan('y = \\frac{1}{2}x - 2')}. Terbangkan drone dari <b>(-4, 1)</b> sejajar garis kuning menuju Target <b>(6, 6)</b>!`,
    p: [-4, 1], t: [6, 6], o: [[1, -1.5, 1.2]],
    ref: [{ f: x => 0.5 * x - 2, color: '#ffaa00', label: 'Garis Patroli: y = (1/2)x - 2 (m₁ = 1/2)' }],
    scaffold: {
      step1: `<b>📌 Syarat Garis Sejajar:</b> Gradien sama (${texSpan('m_2 = m_1')}). Karena ${texSpan('m_1 = \\frac{1}{2}')}, maka ${texSpan('m_2 = \\frac{1}{2}')}.`,
      step2: `<b>🎯 Masukkan Titik Pangkalan:</b> Substitusi (-4, 1) ke ${texSpan('y = \\frac{1}{2}x + c')} → ${texSpan('1 = \\frac{1}{2}(-4) + c')}.`,
      step3: `<b>🔧 Hitung Nilai c:</b> ${texSpan('1 = -2 + c')} → ${texSpan('c = 3')}. Persamaan: ${texSpan('y = \\frac{1}{2}x + 3')}.`
    }
  },
  {
    j: 'MISI 5 · DUA GARIS TEGAK LURUS (m₁ × m₂ = -1)',
    i: `Garis pemindai kuning adalah ${texSpan('y = 2x - 2')}. Terbangkan drone dari <b>(-4, 4)</b> tegak lurus garis kuning menuju Target <b>(4, 0)</b>!`,
    p: [-4, 4], t: [4, 0], o: [[2, 4, 1.2], [-2, -1, 1.2]],
    ref: [{ f: x => 2 * x - 2, color: '#ffaa00', label: 'Garis Pemindai: y = 2x - 2 (m₁ = 2)' }],
    scaffold: {
      step1: `<b>📌 Syarat Tegak Lurus:</b> ${texSpan('m_1 \\times m_2 = -1')}. Dengan ${texSpan('m_1 = 2')}, maka ${texSpan('2 \\times m_2 = -1')} → ${texSpan('m_2 = -\\frac{1}{2}')}.`,
      step2: `<b>🎯 Masukkan Titik Pangkalan:</b> Substitusi (-4, 4) ke ${texSpan('y = -\\frac{1}{2}x + c')} → ${texSpan('4 = -\\frac{1}{2}(-4) + c')}.`,
      step3: `<b>🔧 Hitung Nilai c:</b> ${texSpan('4 = 2 + c')} → ${texSpan('c = 2')}. Persamaan: ${texSpan('y = -\\frac{1}{2}x + 2')}.`
    }
  },
  {
    j: 'MISI 6 · TITIK POTONG DUA GARIS',
    i: `Target berada pada titik potong garis ${texSpan('y = -x + 5')} dan ${texSpan('y = -\\frac{1}{2}x + 4')}. Luncurkan drone dari <b>(-2, -1)</b> tepat ke titik potong tersebut!`,
    p: [-2, -1], t: [2, 3], o: [[0, 3, 1.1], [2, 0, 1.2]],
    ref: [
      { f: x => -x + 5, color: '#ffaa00', label: 'Garis A: y = -x + 5' },
      { f: x => -0.5 * x + 4, color: '#00ff66', label: 'Garis B: y = -(1/2)x + 4' }
    ],
    scaffold: {
      step1: `<b>📌 Cari Titik Potong:</b> Samakan kedua persamaan: ${texSpan('-x + 5 = -\\frac{1}{2}x + 4')} → ${texSpan('\\frac{1}{2}x = 1')} → ${texSpan('x = 2')}, lalu ${texSpan('y = -2 + 5 = 3')}. Target di <b>(2, 3)</b>.`,
      step2: `<b>🎯 Hitung Gradien Drone:</b> Dari Pangkalan <b>(-2, -1)</b> ke Target <b>(2, 3)</b> → ${texSpan('m = \\frac{3 - (-1)}{2 - (-2)} = \\frac{4}{4} = 1')}.`,
      step3: `<b>🔧 Hitung Nilai c:</b> Substitusi (2, 3) ke ${texSpan('y = x + c')} → ${texSpan('3 = 2 + c')} → ${texSpan('c = 1')}. Persamaan: ${texSpan('y = x + 1')}.`
    }
  }
];

let lv = 0, tries = 0, previewLeft = 2, previewCurve = null, busy = false;
const scene = () => ({
  player: LV[lv].p,
  target: LV[lv].t,
  obs: LV[lv].o,
  refLines: LV[lv].ref,
  failedCurves,
  previewCurve
});

$('#btnMulaiTantangan').onclick = () => { lv = 0; loadLevel(); };

function updatePreviewButton() {
  const btn = $('#btnPreview');
  if (!btn) return;
  btn.textContent = `👁️ UJI LINTASAN (${previewLeft}x)`;
  btn.disabled = previewLeft <= 0 || busy;
}

function loadLevel() {
  const L = LV[lv];
  tries = 0;
  previewLeft = 2;
  previewCurve = null;
  failedCurves = [];
  $('#g-judul').textContent = L.j;
  $('#g-level-badge').textContent = `MISI ${lv + 1} / 6`;
  const infoEl = $('#g-info');
  infoEl.innerHTML = L.i;
  hydrateAllKatex(infoEl);
  $('#fx').value = '';
  $('#fx').dispatchEvent(new Event('input'));
  $('#g-msg').textContent = '';
  updatePreviewButton();
  go('game');
  draw($('#cv-game'), scene());
}

/* Keypad Equation Builder + Tombol Delete & Backspace di Posisi Kursor */
function insertAtCursor(inp, text) {
  const start = inp.selectionStart ?? inp.value.length;
  const end = inp.selectionEnd ?? inp.value.length;
  inp.value = inp.value.slice(0, start) + text + inp.value.slice(end);
  const newPos = start + text.length;
  inp.focus();
  inp.setSelectionRange(newPos, newPos);
}

function deleteAtCursor(inp) {
  const start = inp.selectionStart ?? inp.value.length;
  const end = inp.selectionEnd ?? inp.value.length;
  if (start !== end) {
    inp.value = inp.value.slice(0, start) + inp.value.slice(end);
    inp.focus();
    inp.setSelectionRange(start, start);
  } else if (start > 0) {
    inp.value = inp.value.slice(0, start - 1) + inp.value.slice(end);
    inp.focus();
    inp.setSelectionRange(start - 1, start - 1);
  } else if (inp.value.length > 0) {
    inp.value = inp.value.slice(0, -1);
    inp.focus();
    inp.setSelectionRange(inp.value.length, inp.value.length);
  }
}

function setupKeypad(kpId, inputId) {
  document.querySelectorAll(`#${kpId} button`).forEach(btn => {
    btn.onmousedown = e => e.preventDefault();
    btn.onclick = () => {
      playSound('click');
      const key = btn.dataset.key;
      const inp = $('#' + inputId);
      if (key === 'DEL') {
        deleteAtCursor(inp);
      } else if (key === 'CLR') {
        inp.value = '';
        inp.focus();
      } else if (key === 'FRAC') {
        const pos = inp.selectionStart ?? inp.value.length;
        const before = inp.value.slice(0, pos);
        const after = inp.value.slice(inp.selectionEnd ?? pos);
        const m = before.match(/(-?\d+)$/);
        if (m) {
          const newBefore = before.slice(0, -m[0].length) + `(${m[0]}/`;
          inp.value = newBefore + after;
          inp.focus();
          inp.setSelectionRange(newBefore.length, newBefore.length);
        } else {
          insertAtCursor(inp, '(1/');
        }
      } else if (key === 'SQ') {
        const pos = inp.selectionStart ?? inp.value.length;
        const before = inp.value.slice(0, pos);
        insertAtCursor(inp, before.endsWith('x') ? '^2' : 'x^2');
      } else {
        insertAtCursor(inp, key);
      }
      inp.dispatchEvent(new Event('input'));
    };
  });
}
setupKeypad('kp-materi', 'fm-exam');
setupKeypad('kp-game', 'fx');
setupKeypad('kp-bebas', 'fb');

bindEquationEditor('fm-exam', 'fm-exam-render', 'fm-exam-box');
bindEquationEditor('fx', 'fx-render', 'fx-box');
bindEquationEditor('fb', 'fb-render', 'fb-box');

// Dukungan tombol Backspace / Delete keyboard meskipun pengguna baru mengklik area layar aktif
document.addEventListener('keydown', e => {
  if (e.key !== 'Backspace' && e.key !== 'Delete') return;
  const activeTag = document.activeElement?.tagName;
  if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') return;

  let targetInp = null;
  if ($('#game').classList.contains('active')) targetInp = $('#fx');
  else if ($('#bebas').classList.contains('active')) targetInp = $('#fb');
  else if ($('#materi-view').classList.contains('active') && !$('#exam-area').classList.contains('hidden')) {
    targetInp = $('#fm-exam');
  }

  if (targetInp) {
    e.preventDefault();
    deleteAtCursor(targetInp);
    targetInp.dispatchEvent(new Event('input'));
  }
});

$('#btnPreview').onclick = () => {
  if (busy || previewLeft <= 0) return;
  let f;
  try {
    f = compile($('#fx').value);
  } catch (e) {
    playSound('radar_alarm');
    $('#g-msg').textContent = '[ERROR] Format persamaan salah.';
    return;
  }
  playSound('click');
  previewLeft--;
  previewCurve = f;
  updatePreviewButton();
  $('#g-msg').textContent = !isLinearFunction(f)
    ? `[UJI LINTASAN] Kurva non-linear ditampilkan. Ingat, misi ini butuh garis lurus (y = mx + c). Sisa: ${previewLeft}x.`
    : `[UJI LINTASAN] Bayangan garis hijau ditampilkan. Sisa uji lintasan: ${previewLeft}x.`;
  draw($('#cv-game'), scene());
};

$('#btnHint').onclick = () => {
  playSound('click');
  showResultModal(false, 'manual_hint', LV[lv].scaffold, false);
};

$('#fx').onkeydown = e => { if (e.key == 'Enter') tembak(); };
$('#btnTembak').onclick = tembak;

/* ===== 6. SIMULASI TEMBAK & POP-UP OVERLAY MODAL TAKTIS (VISUAL GARIS TETAP TAMPIL) ===== */
function tembak() {
  if (busy) return;
  const L = LV[lv]; let f;
  try {
    f = compile($('#fx').value);
  } catch (e) {
    playSound('radar_alarm');
    $('#g-msg').textContent = '[ERROR] Format persamaan salah.';
    return;
  }

  const linearOk = isLinearFunction(f);
  const startOk = isFinite(f(L.p[0])) && Math.abs(f(L.p[0]) - L.p[1]) <= 0.5;

  if (!linearOk || !startOk) {
    tries++;
    previewCurve = null;
    updatePreviewButton();
    playSound('radar_alarm');
    failedCurves.push({ f, from: -XR, to: XR });
    draw($('#cv-game'), scene());
    const reason = !linearOk ? 'not_linear' : 'wrong_origin';
    $('#g-msg').textContent = !linearOk
      ? '[PERINGATAN] Persamaan bukan garis lurus! Visual kurva merah ditampilkan pada radar.'
      : `[PERINGATAN] Garis merah tidak berawal dari pangkalan (${L.p[0]}, ${L.p[1]})!`;
    showResultModal(false, reason, L.scaffold, false);
    return;
  }

  tries++;
  busy = true;
  previewCurve = null;
  updatePreviewButton();
  playSound('drone_launch');
  $('#g-msg').textContent = '[MELUNCUR] Drone sedang terbang mengikuti persamaan garismu...';

  const dir = L.t[0] >= L.p[0] ? 1 : -1;
  const step = 0.02 * dir;
  let end = dir > 0 ? XR : -XR;
  let hasil = 'lewat';

  for (let x = L.p[0]; (dir > 0 ? x <= XR : x >= -XR); x += step) {
    const y = f(x);
    if (!isFinite(y) || Math.abs(y) > YR + 2) { end = x; hasil = 'keluar'; break; }
    if (L.o.some(([a, b, r]) => Math.hypot(x - a, y - b) < r)) { end = x; hasil = 'tabrak'; break; }
    if (Math.hypot(x - L.t[0], y - L.t[1]) < 0.6) { end = x; hasil = 'kena'; break; }
  }

  let cur = L.p[0];
  (function anim() {
    cur += 0.3 * dir;
    const reached = dir > 0 ? cur >= end : cur <= end;
    draw($('#cv-game'), { ...scene(), curves: [{ f, from: L.p[0], to: reached ? end : cur }] });

    if (!reached) return requestAnimationFrame(anim);

    busy = false;
    updatePreviewButton();
    if (hasil == 'kena') {
      playSound('target_reached');
      bintang[lv] = tries == 1 ? 3 : tries == 2 ? 2 : 1;
      saveProgress();
      showResultModal(true, 'kena', null, false);
    } else {
      playSound('radar_alarm');
      failedCurves.push({ f, from: -XR, to: XR });
      draw($('#cv-game'), scene());
      showResultModal(false, hasil, L.scaffold, false);
    }
  })();
}

function showResultModal(isSuccess, reason, scaffoldData = null, isTrainingExam = false) {
  const modal = $('#modal-result');
  const box = $('#modal-box');
  const icon = $('#modal-icon');
  const title = $('#modal-title');
  const desc = $('#modal-desc');
  const starsWrap = $('#modal-stars-wrap');
  const starsDisp = $('#modal-stars');
  const scaffWrap = $('#modal-scaffolding');
  const btnPrimary = $('#modal-btn-primary');
  const btnSecondary = $('#modal-btn-secondary');

  modal.classList.remove('hidden');

  if (isSuccess) {
    box.className = 'modal-hud-box success';
    icon.textContent = '🎯';
    title.textContent = 'TARGET TERCAPAI // MISI BERHASIL';
    const submittedTex = `y = ${toLatexString($('#fx').value)}`;
    desc.innerHTML = `Hebat, <b>${user.nama || 'Pilot'}</b>! Persamaan garis lurus ${texSpan(submittedTex)} berhasil mengantarkan drone tepat ke sasaran dalam <b>${tries}x percobaan</b>.`;
    hydrateAllKatex(desc);
    
    starsWrap.classList.remove('hidden');
    scaffWrap.classList.add('hidden');
    starsDisp.textContent = '⭐'.repeat(bintang[lv]);

    btnPrimary.textContent = lv === 5 ? 'LIHAT LAPORAN SKOR 🏆' : 'MISI BERIKUTNYA ➔';
    btnPrimary.onclick = () => {
      modal.classList.add('hidden');
      lv === 5 ? go('hasil') : (lv++, loadLevel());
    };
    btnSecondary.classList.remove('hidden');
    btnSecondary.textContent = 'ULANGI MISI INI';
    btnSecondary.onclick = () => { modal.classList.add('hidden'); loadLevel(); };

  } else {
    box.className = 'modal-hud-box failed';
    icon.textContent = reason === 'tabrak' ? '💥' : reason === 'manual_hint' ? '💡' : '⚠️';
    title.textContent = reason === 'tabrak'
      ? 'TERKENA RADAR MUSUH'
      : reason === 'manual_hint'
      ? 'PANDUAN PENYELESAIAN'
      : reason === 'not_linear'
      ? 'BUKAN PERSAMAAN GARIS LURUS'
      : reason === 'wrong_origin'
      ? 'GARIS TIDAK MELEWATI PANGKALAN'
      : 'LINTASAN DRONE MELESET';
    
    desc.innerHTML = reason === 'tabrak' 
      ? `Drone melewati zona bahaya radar! Visual garis merah putus-putus tetap ditampilkan pada layar sebagai acuan koreksi:` 
      : reason === 'manual_hint'
      ? `Ikuti tiga langkah berikut untuk menyusun persamaan garis lurusnya:`
      : reason === 'not_linear'
      ? `Persamaan yang kamu masukkan menghasilkan kurva melengkung (terlihat sebagai garis merah putus-putus di grafik). Gunakan persamaan garis lurus ${texSpan('y = mx + c')}:`
      : reason === 'wrong_origin'
      ? `Garismu sudah digambar sebagai garis merah putus-putus pada grafik, tetapi belum melewati titik pangkalan drone <b>(${LV[lv].p[0]}, ${LV[lv].p[1]})</b>:`
      : `Garis lurusmu (garis merah putus-putus pada grafik) belum mengenai titik target. Periksa kembali langkah perhitungannya:`;
    hydrateAllKatex(desc);

    starsWrap.classList.add('hidden');
    scaffWrap.classList.remove('hidden');

    if (scaffoldData) {
      $('#scaff-step1').innerHTML = scaffoldData.step1;
      $('#scaff-step2').innerHTML = scaffoldData.step2;
      $('#scaff-step3').innerHTML = scaffoldData.step3;
      hydrateAllKatex(scaffWrap);
    }

    btnPrimary.textContent = 'COBA LAGI';
    btnPrimary.onclick = () => {
      modal.classList.add('hidden');
      (isTrainingExam ? $('#fm-exam') : $('#fx')).focus();
    };

    if (isTrainingExam || reason === 'manual_hint') {
      btnSecondary.classList.add('hidden');
    } else {
      btnSecondary.classList.remove('hidden');
      btnSecondary.textContent = 'MENU UTAMA';
      btnSecondary.onclick = () => { modal.classList.add('hidden'); go('menu'); };
    }
  }
}

/* ===== 7. HASIL OPERASI MILITER ===== */
function showHasil() {
  loadProgress();
  const total = bintang.reduce((a, b) => a + b, 0);
  $('#h-isi').innerHTML = `
    <p>NAMA SISWA: <b>${user.nama || 'ANONIM'}</b> [KELAS ${user.kelas || '8'}]</p>
    <p style="font-size:2rem; margin: 14px 0; color:#00f3ff; font-family:'Orbitron',sans-serif;">⭐ ${total} / 18 BINTANG</p>
    ${bintang.map((b, i) => `<div style="background:#071b2e; border:1px solid #00f3ff44; padding:10px 16px; margin:6px 0; border-radius:3px;">Misi ${i + 1}: ${b ? '⭐'.repeat(b) : 'BELUM SELESAI'}</div>`).join('')}
    <p style="margin-top:16px; font-family:'Share Tech Mono',monospace; font-size:1.05rem;">${total >= 16 ? '[PREDIKAT] SANGAT BAIK — PENGUASAAN PERSAMAAN GARIS LURUS OPTIMAL!' : total >= 10 ? '[PREDIKAT] BAIK — TERUS BERLATIH UNTUK SKOR MAKSIMAL.' : '[PREDIKAT] CUKUP — SILAKAN ULANGI KAMP PELATIHAN UNTUK MEMPERKUAT KONSEP.'}</p>
  `;
}
$('#btnUlang').onclick = () => { lv = 0; loadLevel(); };

/* ===== 8. MODE BEBAS DENGAN EQUATION KATEX (GARIS & KUADRAT) ===== */
let bebasCurves = [];
const warna = ['#00f3ff', '#ff0055', '#ffaa00', '#00ff66', '#a655ff'];
const drawBebas = () => draw($('#cv-bebas'), { curves: bebasCurves });

function renderBebasLegend() {
  const container = $('#bebas-legend');
  if (!container) return;
  container.innerHTML = bebasCurves.map((item, idx) => `
    <div class="legend-item">
      <div class="legend-left">
        <span class="legend-swatch" style="background:${item.color}; box-shadow:0 0 8px ${item.color};"></span>
        <span class="legend-text">${texSpan('y = ' + item.tex)}</span>
      </div>
      <button class="btn-del-line" onclick="removeBebasLine(${idx})" title="Hapus Grafik">✕</button>
    </div>
  `).join('');
  hydrateAllKatex(container);
}

function removeBebasLine(idx) {
  playSound('click');
  bebasCurves.splice(idx, 1);
  bebasCurves.forEach((c, i) => { c.color = warna[i]; });
  renderBebasLegend();
  drawBebas();
}

$('#btnGambar').onclick = () => {
  playSound('click');
  const rawInput = $('#fb').value.trim();
  try {
    if (bebasCurves.length >= 5) {
      $('#b-msg').textContent = '[INFO] Maksimal 5 grafik persamaan pada radar.';
      return;
    }
    const f = compile(rawInput);
    bebasCurves.push({
      tex: toLatexString(rawInput),
      f,
      color: warna[bebasCurves.length]
    });
    $('#b-msg').textContent = '';
    $('#fb').value = '';
    $('#fb').dispatchEvent(new Event('input'));
    renderBebasLegend();
    drawBebas();
  } catch (e) {
    playSound('radar_alarm');
    $('#b-msg').textContent = '[ERROR] Format persamaan tidak valid.';
  }
};
$('#fb').onkeydown = e => { if (e.key == 'Enter') $('#btnGambar').click(); };
$('#btnHapus').onclick = () => {
  playSound('click');
  bebasCurves = [];
  renderBebasLegend();
  drawBebas();
  $('#b-msg').textContent = '';
};

// Continuous Radar Sweep Loop (60 FPS)
function startRadarLoop() {
  radarAngle += 0.015;
  if (radarAngle > Math.PI * 2) radarAngle = 0;

  if (!busy) {
    if ($('#game').classList.contains('active')) {
      draw($('#cv-game'), scene());
    } else if ($('#bebas').classList.contains('active')) {
      drawBebas();
    } else if ($('#materi-view').classList.contains('active')) {
      drawMateri();
    }
  }
  requestAnimationFrame(startRadarLoop);
}

window.addEventListener('DOMContentLoaded', () => {
  hydrateAllKatex(document);
  ['fm-exam', 'fx', 'fb'].forEach(id => {
    const el = $('#' + id);
    if (el) el.dispatchEvent(new Event('input'));
  });
});

loadProgress();
initAudioControls();
playBgmForScreen('mulai');
startRadarLoop();