// game.js — Mission 8: Satellite

const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// === Состояние ===
let W, H, CX, CY, ORBIT_R, SHIELD_R, SAT_SCALE;
let running = false, score = 0, hp = 3, maxHp = 3, wave = 1;
let satAngle = -Math.PI / 2, shdAngle = Math.PI / 2;
let satSpeed = 0, shdSpeed = 0;
const ROT_SPEED = 2.8, DAMPING = 0.88;
let meteors = [], collectibles = [], particles = [], signals = [], floatingTexts = [];
let shieldFlash = 0, damageFlash = 0, spawnTimer = 0, collectSpawnTimer = 0;
let time = 0, lastTime = 0, stars = [], waveTimer = 0;
const WAVE_DURATION = 25;

const VICTORY_SCORE = 100;

let shieldHp = 100;
const SHIELD_MAX_HP = 100, SHIELD_DECAY_RATE = 1.2, SHIELD_BLOCK_DAMAGE = 8, SHIELD_REPAIR_AMOUNT = 30;

// Балансировка очков (1 балл за любой собранный элемент, без комбо)
const SCORE_VALUES = { crystal: 1, data: 1, satellite: 1, repair: 1 };

const inputState = { 'sat-ccw': false, 'sat-cw': false, 'shd-ccw': false, 'shd-cw': false };

// === Resize / canvas ===
function resize() {
  const dpr = window.devicePixelRatio || 1;
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  CX = W / 2; CY = H * 0.38;
  SAT_SCALE = Math.min(W, H) * 0.007;
  ORBIT_R = Math.min(W, H) * 0.22;
  SHIELD_R = ORBIT_R + 18;
  generateStars();
}

function generateStars() {
  stars = [];
  for (let i = 0; i < 120; i++) stars.push({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() * 1.5 + 0.3,
    a: Math.random(),
    speed: Math.random() * 0.3 + 0.1,
    // Скорость дрейфа снизу вверх (px/sec). Маленькие звёзды двигаются медленнее,
    // крупные — быстрее, для эффекта параллакса
    vy: 8 + Math.random() * 18
  });
}

function drawStar(x, y, r, alpha) {
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = `rgba(200,220,255,${alpha})`; ctx.fill();
}

// === Рендер игры ===
function drawCenter() {
  const glowR = 18 * SAT_SCALE;
  const g = ctx.createRadialGradient(CX, CY, 0, CX, CY, glowR);
  g.addColorStop(0, 'rgba(100,180,255,0.3)'); g.addColorStop(0.5, 'rgba(60,120,200,0.1)'); g.addColorStop(1, 'rgba(0,0,40,0)');
  ctx.beginPath(); ctx.arc(CX, CY, glowR, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill();
  ctx.beginPath(); ctx.arc(CX, CY, SHIELD_R, 0, Math.PI * 2); ctx.strokeStyle = 'rgba(255,102,68,0.05)'; ctx.lineWidth = 1; ctx.stroke();
}

function drawSatellite() {
  const s = SAT_SCALE;
  ctx.save(); ctx.translate(CX, CY); ctx.rotate(satAngle + Math.PI / 2); ctx.scale(s, s);
  ctx.fillStyle = '#1155aa'; ctx.strokeStyle = '#2288dd'; ctx.lineWidth = 1 / s;
  ctx.fillRect(-14, -4, 10, 8); ctx.strokeRect(-14, -4, 10, 8);
  ctx.fillRect(4, -4, 10, 8); ctx.strokeRect(4, -4, 10, 8);
  ctx.strokeStyle = '#3399ee55'; ctx.lineWidth = 0.5 / s;
  for (let i = -12; i <= -6; i += 2) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i, 4); ctx.stroke(); }
  for (let i = 6; i <= 12; i += 2) { ctx.beginPath(); ctx.moveTo(i, -4); ctx.lineTo(i, 4); ctx.stroke(); }
  ctx.beginPath(); ctx.moveTo(-14, 0); ctx.lineTo(-4, 0); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(4, 0); ctx.lineTo(14, 0); ctx.stroke();
  ctx.fillStyle = '#556688'; ctx.fillRect(-4, -1.5, 1, 3); ctx.fillRect(3, -1.5, 1, 3);
  ctx.fillStyle = '#334466'; ctx.fillRect(-4, -6, 8, 12);
  ctx.strokeStyle = '#5588bb'; ctx.lineWidth = 0.8 / s; ctx.strokeRect(-4, -6, 8, 12);
  ctx.fillStyle = '#224455'; ctx.fillRect(-2, -4, 4, 3);
  ctx.fillStyle = '#66aacc44'; ctx.fillRect(-1.5, -3.5, 3, 2);
  ctx.fillStyle = '#445566'; ctx.fillRect(-2, 1, 4, 3);
  ctx.strokeStyle = '#88bbee'; ctx.lineWidth = 1.5 / s;
  ctx.beginPath(); ctx.moveTo(0, -6); ctx.lineTo(0, -14); ctx.stroke();
  ctx.beginPath(); ctx.arc(0, -14, 3, Math.PI * 0.7, Math.PI * 1.3);
  ctx.strokeStyle = '#aaddff'; ctx.lineWidth = 1 / s; ctx.stroke();
  const tipGlow = ctx.createRadialGradient(0, -14, 0, 0, -14, 6);
  tipGlow.addColorStop(0, 'rgba(0,204,255,0.9)'); tipGlow.addColorStop(1, 'rgba(0,204,255,0)');
  ctx.beginPath(); ctx.arc(0, -14, 6, 0, Math.PI * 2); ctx.fillStyle = tipGlow; ctx.fill();
  ctx.beginPath(); ctx.arc(0, -14, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#00ccff'; ctx.fill();
  ctx.restore();
}

function drawSignalBeam() {
  const dirX = Math.cos(satAngle), dirY = Math.sin(satAngle);
  const spread = 0.12;
  const perpX = -dirY, perpY = dirX;
  const blocked = isBeamBlockedByShield(satAngle);
  const beamMaxDist = blocked ? SHIELD_R : Math.max(W, H);
  const ex = CX + dirX * beamMaxDist, ey = CY + dirY * beamMaxDist;

  ctx.save(); ctx.globalAlpha = 0.15 + Math.sin(time * 8) * 0.05;
  ctx.beginPath(); ctx.moveTo(CX, CY);
  ctx.lineTo(ex + perpX * beamMaxDist * spread, ey + perpY * beamMaxDist * spread);
  ctx.lineTo(ex - perpX * beamMaxDist * spread, ey - perpY * beamMaxDist * spread);
  ctx.closePath();
  const gradDist = blocked ? SHIELD_R : 300;
  const bg = ctx.createLinearGradient(CX, CY, CX + dirX * gradDist, CY + dirY * gradDist);
  bg.addColorStop(0, 'rgba(0,204,255,0.6)'); bg.addColorStop(0.3, 'rgba(0,204,255,0.15)'); bg.addColorStop(1, 'rgba(0,204,255,0)');
  ctx.fillStyle = bg; ctx.fill(); ctx.restore();

  ctx.save(); ctx.globalAlpha = 0.4 + Math.sin(time * 12) * 0.1;
  ctx.beginPath(); ctx.moveTo(CX, CY);
  const lineLen = blocked ? SHIELD_R : 300;
  ctx.lineTo(CX + dirX * lineLen, CY + dirY * lineLen);
  ctx.strokeStyle = '#00ccff'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.restore();

  if (blocked) {
    const hitX = CX + dirX * SHIELD_R, hitY = CY + dirY * SHIELD_R;
    ctx.save();
    const impactGlow = ctx.createRadialGradient(hitX, hitY, 0, hitX, hitY, 12);
    impactGlow.addColorStop(0, `rgba(0,180,255,${0.3 + Math.sin(time * 10) * 0.15})`);
    impactGlow.addColorStop(1, 'rgba(0,180,255,0)');
    ctx.beginPath(); ctx.arc(hitX, hitY, 12, 0, Math.PI * 2);
    ctx.fillStyle = impactGlow; ctx.fill();
    ctx.restore();
    if (Math.random() < 0.15) emitParticles(hitX, hitY, '0,180,255', 2, 30);
  }

  if (!blocked && Math.random() < 0.4) {
    const dist = Math.random() * 200 + 20, off = (Math.random() - 0.5) * dist * spread * 2;
    signals.push({ x: CX + dirX * dist + perpX * off, y: CY + dirY * dist + perpY * off, life: 1, r: Math.random() * 2 + 1 });
  }
}

function drawShield() {
  const hpRatio = shieldHp / SHIELD_MAX_HP;
  if (hpRatio <= 0) return;
  const arcSpan = 0.8, startA = shdAngle - arcSpan / 2, endA = shdAngle + arcSpan / 2;
  const baseAlpha = 0.15 + hpRatio * 0.55;

  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, SHIELD_R + 6, startA, endA);
  ctx.strokeStyle = `rgba(255,102,68,${hpRatio * 0.08 + shieldFlash * 0.3})`; ctx.lineWidth = 18; ctx.stroke(); ctx.restore();

  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, SHIELD_R, startA, endA);
  const cr = 255, cg = Math.floor(60 + hpRatio * 42), cb = Math.floor(20 + hpRatio * 48);
  const fa = shieldFlash > 0 ? Math.min(1, baseAlpha + shieldFlash * 0.3) : baseAlpha;
  const fR = shieldFlash > 0 ? 255 : cr, fG = shieldFlash > 0 ? 200 : cg, fB = shieldFlash > 0 ? 100 : cb;
  ctx.strokeStyle = `rgba(${fR},${fG},${fB},${fa})`;
  ctx.lineWidth = 5; ctx.lineCap = 'round';
  ctx.shadowColor = `rgb(${cr},${cg},${cb})`; ctx.shadowBlur = shieldFlash > 0 ? 20 : 8 * hpRatio;
  ctx.stroke(); ctx.restore();

  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, SHIELD_R - 2, startA, endA);
  ctx.strokeStyle = `rgba(255,200,150,${(0.15 + Math.sin(time * 6) * 0.08) * hpRatio})`; ctx.lineWidth = 2; ctx.stroke(); ctx.restore();

  if (hpRatio < 0.4) {
    ctx.save();
    const n = Math.floor((1 - hpRatio) * 6);
    for (let i = 0; i < n; i++) {
      const ca = startA + (arcSpan / (n + 1)) * (i + 1);
      ctx.beginPath();
      ctx.moveTo(CX + Math.cos(ca) * (SHIELD_R - 4), CY + Math.sin(ca) * (SHIELD_R - 4));
      ctx.lineTo(CX + Math.cos(ca + 0.03) * (SHIELD_R + 4), CY + Math.sin(ca + 0.03) * (SHIELD_R + 4));
      ctx.strokeStyle = `rgba(255,50,20,${(0.3 + Math.sin(time * 8 + i) * 0.2) * (1 - hpRatio)})`; ctx.lineWidth = 1.5; ctx.stroke();
    }
    ctx.restore();
  }
  if (hpRatio < 0.25 && Math.random() < 0.1) {
    const sa = startA + Math.random() * arcSpan;
    emitParticles(CX + Math.cos(sa) * SHIELD_R, CY + Math.sin(sa) * SHIELD_R, '255,100,30', 3, 40);
  }
  for (const a of [startA, endA]) {
    ctx.beginPath(); ctx.arc(CX + Math.cos(a) * SHIELD_R, CY + Math.sin(a) * SHIELD_R, 3, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255,170,100,${baseAlpha})`; ctx.fill();
  }
}

function drawMeteor(m) {
  ctx.save(); ctx.translate(m.x, m.y); ctx.rotate(m.rot);
  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, m.r * 2.5);
  glow.addColorStop(0, `rgba(255,80,30,${0.3 * m.alpha})`); glow.addColorStop(1, 'rgba(255,40,10,0)');
  ctx.beginPath(); ctx.arc(0, 0, m.r * 2.5, 0, Math.PI * 2); ctx.fillStyle = glow; ctx.fill();
  ctx.beginPath(); ctx.moveTo(m.shape[0].x, m.shape[0].y);
  for (let i = 1; i < m.shape.length; i++) ctx.lineTo(m.shape[i].x, m.shape[i].y); ctx.closePath();
  const mg = ctx.createRadialGradient(0, 0, 0, 0, 0, m.r);
  mg.addColorStop(0, `rgba(180,70,40,${m.alpha})`); mg.addColorStop(0.6, `rgba(120,40,20,${m.alpha})`); mg.addColorStop(1, `rgba(60,20,10,${m.alpha})`);
  ctx.fillStyle = mg; ctx.fill();
  ctx.strokeStyle = `rgba(255,150,80,${m.alpha * 0.6})`; ctx.lineWidth = 1; ctx.stroke();
  ctx.restore();
}

function drawCollectible(c) {
  if (c.collected) return;
  ctx.save(); ctx.translate(c.x, c.y); ctx.globalAlpha = c.alpha;
  const pulse = 1 + Math.sin(time * 4 + c.phase) * 0.1;
  if (c.type === 'crystal') {
    ctx.scale(pulse, pulse); ctx.rotate(time * 0.5 + c.phase);
    ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, -3); ctx.lineTo(5, 8); ctx.lineTo(-5, 8); ctx.lineTo(-7, -3); ctx.closePath();
    const cg = ctx.createLinearGradient(0, -10, 0, 10); cg.addColorStop(0, '#ee99ff'); cg.addColorStop(1, '#aa44dd');
    ctx.fillStyle = cg; ctx.fill();
    ctx.strokeStyle = '#ffaaff'; ctx.lineWidth = 1; ctx.stroke();
    const sg = ctx.createRadialGradient(0, 0, 0, 0, 0, 15); sg.addColorStop(0, 'rgba(220,150,255,0.4)'); sg.addColorStop(1, 'rgba(170,68,221,0)');
    ctx.beginPath(); ctx.arc(0, 0, 15, 0, Math.PI * 2); ctx.fillStyle = sg; ctx.fill();
  } else if (c.type === 'data') {
    ctx.scale(pulse, pulse); ctx.rotate(time * 0.3);
    ctx.fillStyle = '#22cc66'; ctx.fillRect(-7, -7, 14, 14);
    ctx.strokeStyle = '#88ffaa'; ctx.lineWidth = 1; ctx.strokeRect(-7, -7, 14, 14);
    ctx.fillStyle = '#44ee88'; for (let i = 0; i < 3; i++) ctx.fillRect(-5, -4 + i * 3, 10, 1.5);
    const dg = ctx.createRadialGradient(0, 0, 0, 0, 0, 14); dg.addColorStop(0, 'rgba(80,255,130,0.3)'); dg.addColorStop(1, 'rgba(34,204,102,0)');
    ctx.beginPath(); ctx.arc(0, 0, 14, 0, Math.PI * 2); ctx.fillStyle = dg; ctx.fill();
  } else if (c.type === 'repair') {
    ctx.scale(pulse, pulse); ctx.rotate(time * 0.4 + c.phase);
    ctx.strokeStyle = '#ffaa33'; ctx.lineWidth = 3; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 6); ctx.lineTo(4, -4); ctx.stroke();
    ctx.beginPath(); ctx.arc(5, -5, 4, -0.5, 2); ctx.strokeStyle = '#ffcc66'; ctx.lineWidth = 2.5; ctx.stroke();
    ctx.beginPath(); ctx.arc(-7, 7, 2.5, 0, Math.PI * 2); ctx.fillStyle = '#ff8822'; ctx.fill();
    const rg = ctx.createRadialGradient(0, 0, 0, 0, 0, 12); rg.addColorStop(0, 'rgba(255,170,50,0.4)'); rg.addColorStop(1, 'rgba(255,170,50,0)');
    ctx.beginPath(); ctx.arc(0, 0, 12, 0, Math.PI * 2); ctx.fillStyle = rg; ctx.fill();
  } else if (c.type === 'satellite') {
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffcc00'; ctx.fillRect(-3, -8, 6, 16);
    ctx.fillStyle = '#ffaa00'; ctx.fillRect(-10, -3, 7, 6); ctx.fillRect(3, -3, 7, 6);
    ctx.strokeStyle = '#ffdd66'; ctx.lineWidth = 0.5; ctx.strokeRect(-10, -3, 7, 6); ctx.strokeRect(3, -3, 7, 6);
  }
  ctx.beginPath(); ctx.arc(0, 0, 16 * pulse, 0, Math.PI * 2);
  const cols = { crystal: '170,100,255', data: '50,220,100', satellite: '255,200,0', repair: '255,170,50' };
  ctx.strokeStyle = `rgba(${cols[c.type]},${0.15 + Math.sin(time * 3) * 0.05})`; ctx.lineWidth = 1; ctx.stroke();

  if (!c.collected && c.maxLife) {
    const lifeRatio = Math.max(0, c.life / c.maxLife);
    const timerR = 18 * pulse;
    const timerStart = -Math.PI / 2;
    const timerEnd = timerStart + lifeRatio * Math.PI * 2;
    ctx.beginPath(); ctx.arc(0, 0, timerR, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'; ctx.lineWidth = 2; ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, timerR, timerStart, timerEnd);
    const urgentColor = lifeRatio < 0.3 ? `rgba(255,60,30,${0.6 + Math.sin(time * 8) * 0.3})` : `rgba(${cols[c.type]},${0.4 + lifeRatio * 0.3})`;
    ctx.strokeStyle = urgentColor;
    ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.stroke();
  }
  ctx.restore();
}

function drawParticles() {
  for (const p of particles) { ctx.beginPath(); ctx.arc(p.x, p.y, p.r * p.life, 0, Math.PI * 2); ctx.fillStyle = `rgba(${p.color},${p.life * p.alpha})`; ctx.fill(); }
  for (const s of signals) { ctx.beginPath(); ctx.arc(s.x, s.y, s.r * s.life, 0, Math.PI * 2); ctx.fillStyle = `rgba(0,204,255,${s.life * 0.5})`; ctx.fill(); }
}

function drawFloatingTexts() {
  for (const ft of floatingTexts) {
    ctx.save(); ctx.globalAlpha = ft.life;
    ctx.font = `bold ${ft.size}px Orbitron, monospace`;
    ctx.fillStyle = ft.color; ctx.textAlign = 'center';
    ctx.shadowColor = ft.color; ctx.shadowBlur = 8;
    ctx.fillText(ft.text, ft.x, ft.y);
    ctx.restore();
  }
}

function drawDamageOverlay() {
  if (damageFlash > 0) {
    ctx.save(); ctx.fillStyle = `rgba(255,30,30,${damageFlash * 0.3})`;
    ctx.fillRect(0, 0, W, H); ctx.restore();
  }
}

function drawShieldWarning() {
  const hpRatio = shieldHp / SHIELD_MAX_HP;
  if (hpRatio < 0.3 && hpRatio > 0) {
    if (Math.sin(time * 6) > 0) {
      ctx.save(); ctx.font = 'bold 12px Orbitron, monospace';
      ctx.fillStyle = `rgba(255,80,30,${0.6 + Math.sin(time * 8) * 0.3})`;
      ctx.textAlign = 'center'; ctx.fillText(t('shieldWarning'), CX, CY + SHIELD_R + 30); ctx.restore();
    }
  } else if (hpRatio <= 0) {
    ctx.save(); ctx.font = 'bold 12px Orbitron, monospace';
    ctx.fillStyle = `rgba(255,30,20,${0.5 + Math.sin(time * 4) * 0.3})`;
    ctx.textAlign = 'center'; ctx.fillText(t('shieldDestroyed'), CX, CY + SHIELD_R + 30); ctx.restore();
  }
}

// === Game Logic ===
function spawnMeteor() {
  // Угол спавна равномерно по всему кругу — метеориты прилетают со всех сторон
  const angle = Math.random() * Math.PI * 2;
  // Спавн на эллипсе, который чуть больше экрана. Это даёт примерно одинаковое
  // время полёта для метеоритов со всех направлений (а не только сверху/снизу).
  // Радиусы — половина ширины/высоты + запас.
  const rx = W / 2 + 80;
  const ry = H / 2 + 80;
  const x = CX + Math.cos(angle) * rx;
  const y = CY + Math.sin(angle) * ry;
  // Точное прицеливание в спутник с очень малым разбросом — метеориты летят прямо в цель
  const aimAngle = Math.atan2(CY - y, CX - x) + (Math.random() - 0.5) * 0.15;
  // Скорость растёт плавно по игровому времени: 70 → 130 за первые 60 сек
  // + бонус при счёте >= 90 (финальный челлендж)
  const speedT = Math.min(1, time / 60);
  let speed = 70 + speedT * 60 + Math.random() * 25;
  if (score >= 90) speed *= 1.15;
  const r = 8 + Math.random() * 6;
  const shape = [], verts = 6 + Math.floor(Math.random() * 4);
  for (let i = 0; i < verts; i++) {
    const a = (i / verts) * Math.PI * 2, d = r * (0.7 + Math.random() * 0.3);
    shape.push({ x: Math.cos(a) * d, y: Math.sin(a) * d });
  }
  meteors.push({ x, y, dx: Math.cos(aimAngle) * speed, dy: Math.sin(aimAngle) * speed, r, rot: Math.random() * Math.PI * 2, rotSpeed: (Math.random() - 0.5) * 3, shape, alpha: 1 });
}

function spawnCollectible() {
  const types = ['crystal', 'data', 'satellite', 'repair'];
  const repairW = shieldHp < 50 ? 0.3 : 0.15;
  const weights = [0.4, 0.25, 0.07, repairW];
  const totalW = weights.reduce((a, b) => a + b, 0);
  let rnd = Math.random() * totalW, type = types[0], cum = 0;
  for (let i = 0; i < types.length; i++) { cum += weights[i]; if (rnd < cum) { type = types[i]; break; } }
  const pad = 30, ctrlH = 130, topH = 70;
  const minX = pad, maxX = W - pad, minY = topH + pad, maxY = H - ctrlH - pad;
  const satBodyR = 14 * SAT_SCALE + 20;
  let cx, cy, attempts = 0;
  do {
    cx = minX + Math.random() * (maxX - minX);
    cy = minY + Math.random() * (maxY - minY);
    attempts++;
  } while (Math.sqrt((cx - CX) ** 2 + (cy - CY) ** 2) < satBodyR && attempts < 20);
  const maxLife = 6 + Math.random() * 3;
  collectibles.push({ x: cx, y: cy, type, r: 14, alpha: 1, phase: Math.random() * Math.PI * 2, life: maxLife, maxLife: maxLife, collected: false, collectAnim: 0 });
}

function emitParticles(x, y, color, count, speed) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * Math.PI * 2, s = Math.random() * speed;
    particles.push({ x, y, dx: Math.cos(a) * s, dy: Math.sin(a) * s, r: Math.random() * 3 + 1, life: 1, decay: 0.5 + Math.random() * 1.5, color, alpha: 0.8 + Math.random() * 0.2 });
  }
}

function addFloatingText(x, y, text, color, size) {
  floatingTexts.push({ x, y, text, color, size: size || 16, life: 1, dy: -40 });
}

function angleDiff(a, b) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function checkShieldBlock(m) {
  if (shieldHp <= 0) return false;
  const meteorAngle = Math.atan2(m.y - CY, m.x - CX);
  const dist = Math.sqrt((m.x - CX) ** 2 + (m.y - CY) ** 2);
  if (dist < SHIELD_R + m.r + 5 && dist > SHIELD_R - m.r - 20) {
    if (Math.abs(angleDiff(meteorAngle, shdAngle)) < 0.5) return true;
  }
  return false;
}

function isBeamBlockedByShield(targetAngle) {
  if (shieldHp <= 0) return false;
  const arcSpan = 0.8;
  const diff = Math.abs(angleDiff(targetAngle, shdAngle));
  return diff < arcSpan / 2;
}

function checkSignalHit(c) {
  const dx = c.x - CX, dy = c.y - CY, dist = Math.sqrt(dx * dx + dy * dy);
  if (dist < 30) return false;
  const objAngle = Math.atan2(dy, dx);
  if (Math.abs(angleDiff(objAngle, satAngle)) >= 0.15) return false;
  if (isBeamBlockedByShield(satAngle) && dist > SHIELD_R - 10) return false;
  return true;
}

function updateHP() {
  const bar = document.getElementById('hpBar'); bar.innerHTML = '';
  for (let i = 0; i < maxHp; i++) {
    const s = document.createElement('span');
    s.className = 'hp-heart' + (i >= hp ? ' lost' : '');
    s.textContent = '❤️';
    bar.appendChild(s);
  }
}

function updateShieldHPBar() {
  const fill = document.getElementById('shieldHpFill');
  const pct = Math.max(0, Math.min(100, (shieldHp / SHIELD_MAX_HP) * 100));
  fill.style.width = pct + '%';
  if (pct > 50) fill.style.background = 'linear-gradient(90deg,#ff6644,#ff8844)';
  else if (pct > 25) fill.style.background = 'linear-gradient(90deg,#ff4422,#ff6633)';
  else fill.style.background = 'linear-gradient(90deg,#ff2200,#ff4411)';
}

function update(dt) {
  time += dt; waveTimer += dt;
  if (waveTimer > WAVE_DURATION) {
    waveTimer = 0; wave++;
    document.getElementById('waveValue').textContent = wave;
    addFloatingText(CX, CY - 60, `${t('waveStart')} ${wave}`, '#aa88ff', 22);
    Audio.waveStart();
  }

  if (inputState['sat-ccw']) satSpeed = -ROT_SPEED;
  else if (inputState['sat-cw']) satSpeed = ROT_SPEED;
  else satSpeed *= DAMPING;
  if (inputState['shd-ccw']) shdSpeed = -ROT_SPEED;
  else if (inputState['shd-cw']) shdSpeed = ROT_SPEED;
  else shdSpeed *= DAMPING;
  satAngle += satSpeed * dt; shdAngle += shdSpeed * dt;

  shieldHp = Math.max(0, shieldHp - SHIELD_DECAY_RATE * dt);
  updateShieldHPBar();

  // Кривая сложности по игровому времени:
  //   0-10 сек:  тишина — игрок осваивается, собирает очки
  //   10-20 сек: редкие метеориты (интервал ~2.5 сек, одиночные)
  //   20-40 сек: постепенное уплотнение
  //   40+ сек:   полноценный темп, добавляются пачки
  //   score>=90: финальный челлендж — максимальная сложность
  spawnTimer += dt;
  if (time >= 10) {
    // Базовый интервал плавно сокращается с 2.5 сек до 0.5 сек на 40-й секунде
    const t40 = Math.min(1, (time - 10) / 30); // 0 на 10-й сек, 1 на 40-й сек
    let baseInterval = 2.5 - t40 * 2.0; // 2.5 → 0.5
    // Финальный челлендж при счёте >= 90: ещё на 30% быстрее
    if (score >= 90) baseInterval *= 0.7;
    baseInterval = Math.max(0.35, baseInterval);

    if (spawnTimer > baseInterval) {
      spawnTimer = 0;
      spawnMeteor();
      // Пачки метеоритов появляются только после 30 сек, шанс растёт со временем
      const packT = Math.min(1, Math.max(0, (time - 30) / 30)); // 0 на 30 сек, 1 на 60 сек
      if (time >= 30 && Math.random() < 0.3 * packT) spawnMeteor();
      if (time >= 50 && Math.random() < 0.4 * packT) spawnMeteor();
      // Финальный челлендж: гарантированная пачка
      if (score >= 90 && Math.random() < 0.6) spawnMeteor();
    }
  } else {
    // В первые 10 сек таймер сбрасывается, чтобы первый метеор пришёл сразу после 10 сек
    spawnTimer = 0;
  }

  // Collectibles: чаще в первые 10 сек (обучающая фаза), потом стандартный темп
  let collectInterval;
  if (time < 10) {
    collectInterval = 1.5; // быстрый поток, игрок учится собирать
  } else {
    collectInterval = Math.max(1.8, 3.0 - wave * 0.1);
  }
  collectSpawnTimer += dt;
  if (collectSpawnTimer > collectInterval) { collectSpawnTimer = 0; spawnCollectible(); }

  // Meteors
  for (let i = meteors.length - 1; i >= 0; i--) {
    const m = meteors[i]; m.x += m.dx * dt; m.y += m.dy * dt; m.rot += m.rotSpeed * dt;
    const dist = Math.sqrt((m.x - CX) ** 2 + (m.y - CY) ** 2);
    if (checkShieldBlock(m)) {
      shieldFlash = 1;
      shieldHp = Math.max(0, shieldHp - SHIELD_BLOCK_DAMAGE);
      emitParticles(m.x, m.y, '255,150,50', 15, 120);
      emitParticles(m.x, m.y, '255,220,100', 8, 80);
      if (shieldHp <= 0) {
        addFloatingText(m.x, m.y - 20, t('shieldBroken'), '#ff3322', 16);
        Audio.shieldBroken();
      } else {
        addFloatingText(m.x, m.y - 20, t('blocked'), '#ffaa44', 14);
        Audio.shieldBlock();
      }
      meteors.splice(i, 1); continue;
    }
    const hitR = 14 * SAT_SCALE;
    if (dist < hitR) {
      hp--; damageFlash = 1;
      emitParticles(CX, CY, '255,50,30', 25, 150);
      addFloatingText(CX, CY - 30, t('damageText'), '#ff4466', 18);
      updateHP();
      Audio.damage();
      meteors.splice(i, 1);
      if (hp <= 0) { gameOver(); return; }
      continue;
    }
    if (m.x < -100 || m.x > W + 100 || m.y < -100 || m.y > H + 100) meteors.splice(i, 1);
  }

  // Collectibles
  for (let i = collectibles.length - 1; i >= 0; i--) {
    const c = collectibles[i];
    if (c.collected) {
      c.collectAnim += dt * 3;
      c.alpha = Math.max(0, 1 - c.collectAnim);
      if (c.alpha <= 0) collectibles.splice(i, 1);
      continue;
    }
    c.life -= dt;
    if (c.life < 1.5) c.alpha = c.life / 1.5;
    if (c.life <= 0) { collectibles.splice(i, 1); continue; }
    if (checkSignalHit(c)) {
      c.collected = true;
      const colors = { crystal: '#dd88ff', data: '#44ff88', satellite: '#ffcc00', repair: '#ffaa33' };
      const names = { crystal: '💎', data: '📦', satellite: '🛰', repair: '🔧' };
      const pts = SCORE_VALUES[c.type];
      score += pts;

      if (c.type === 'repair') {
        shieldHp = Math.min(SHIELD_MAX_HP, shieldHp + SHIELD_REPAIR_AMOUNT);
        addFloatingText(c.x, c.y - 35, `🛡+${SHIELD_REPAIR_AMOUNT}`, '#ffaa33', 14);
        Audio.repair();
      } else if (c.type === 'satellite') {
        Audio.collectBig();
      } else {
        Audio.collect();
      }

      const pc = c.type === 'crystal' ? '200,130,255' : c.type === 'data' ? '80,255,130' : c.type === 'repair' ? '255,170,50' : '255,200,50';
      emitParticles(c.x, c.y, pc, 12, 80);
      addFloatingText(c.x, c.y - 20, `+${pts} ${names[c.type]}`, colors[c.type], 16);

      // Победа
      if (score >= VICTORY_SCORE) {
        score = VICTORY_SCORE;
        victory();
        return;
      }
    }
  }

  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]; p.x += p.dx * dt; p.y += p.dy * dt;
    p.life -= p.decay * dt; if (p.life <= 0) particles.splice(i, 1);
  }
  for (let i = signals.length - 1; i >= 0; i--) {
    signals[i].life -= dt * 2;
    if (signals[i].life <= 0) signals.splice(i, 1);
  }
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    const ft = floatingTexts[i]; ft.y += ft.dy * dt; ft.life -= dt * 0.8;
    if (ft.life <= 0) floatingTexts.splice(i, 1);
  }

  shieldFlash = Math.max(0, shieldFlash - dt * 4);
  damageFlash = Math.max(0, damageFlash - dt * 2);
  document.getElementById('scoreValue').textContent = score;
  // Звёзды: мерцание + медленный дрейф снизу вверх (эффект движения)
  for (const s of stars) {
    s.a = 0.3 + Math.sin(time * s.speed + s.x) * 0.3;
    s.y -= s.vy * dt;
    if (s.y < -5) {
      // Респавн снизу с новой случайной X-позицией
      s.y = H + 5;
      s.x = Math.random() * W;
    }
  }
}

function draw() {
  ctx.clearRect(0, 0, W, H);
  const bg = ctx.createRadialGradient(CX, CY, 0, CX, CY, Math.max(W, H) * 0.7);
  bg.addColorStop(0, '#0a0a1a'); bg.addColorStop(0.5, '#050510'); bg.addColorStop(1, '#000005');
  ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
  for (const s of stars) drawStar(s.x, s.y, s.r, s.a);
  for (const c of collectibles) drawCollectible(c);
  drawSignalBeam(); drawCenter(); drawSatellite(); drawShield(); drawShieldWarning();
  for (const m of meteors) drawMeteor(m);
  drawParticles(); drawFloatingTexts(); drawDamageOverlay();
}

function gameLoop(ts) {
  if (!running) return;
  const dt = Math.min((ts - lastTime) / 1000, 0.05);
  lastTime = ts;
  update(dt); draw();
  requestAnimationFrame(gameLoop);
}

// === Экраны ===
function showScreen(id) {
  ['startScreen', 'victoryScreen', 'gameOverScreen'].forEach(s => {
    document.getElementById(s).classList.add('hidden');
  });
  if (id) document.getElementById(id).classList.remove('hidden');
}

function startGame() {
  score = 0; hp = maxHp; wave = 1; waveTimer = 0;
  satAngle = -Math.PI / 2; shdAngle = Math.PI / 2; satSpeed = 0; shdSpeed = 0;
  meteors = []; collectibles = []; particles = []; signals = []; floatingTexts = [];
  spawnTimer = 0; collectSpawnTimer = 0; shieldFlash = 0; damageFlash = 0; time = 0;
  shieldHp = SHIELD_MAX_HP;
  updateHP(); updateShieldHPBar();
  document.getElementById('scoreValue').textContent = '0';
  document.getElementById('waveValue').textContent = '1';
  showScreen(null);
  running = true;
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

function gameOver() {
  running = false;
  document.getElementById('finalScore').textContent = score;
  document.getElementById('finalWave').textContent = wave;
  showScreen('gameOverScreen');
  Audio.gameOver();
  submitScore(score);
}

function victory() {
  running = false;
  document.getElementById('victoryScore').textContent = score;
  document.getElementById('victoryWave').textContent = wave;
  showScreen('victoryScreen');
  Audio.victory();
  submitScore(score);
}

function backToMenu() {
  running = false;
  showScreen('startScreen');
  applyTranslations();
  updateGreeting();
  updateLangButtons();
}

// === Mute кнопка ===
function updateMuteBtn() {
  const btn = document.getElementById('muteBtn');
  if (Audio.isEnabled()) {
    btn.textContent = '🔊';
    btn.classList.remove('muted');
  } else {
    btn.textContent = '🔇';
    btn.classList.add('muted');
  }
}

// === Меню: приветствие, язык ===
function updateGreeting() {
  const nick = getNickname();
  const greetEl = document.getElementById('greetingText');
  if (nick) {
    greetEl.textContent = `${t('greetingPrefix')} ${nick}`;
    greetEl.style.display = '';
  } else {
    greetEl.style.display = 'none';
  }
}

function updateLangButtons() {
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === getLang());
  });
}

// === Управление ===
function handleInput(el, pressed) {
  const dir = el.dataset.dir;
  if (dir) {
    inputState[dir] = pressed;
    if (pressed) el.classList.add('pressed');
    else el.classList.remove('pressed');
  }
}

document.querySelectorAll('.ctrl-btn').forEach(btn => {
  btn.addEventListener('touchstart', e => { e.preventDefault(); handleInput(btn, true); });
  btn.addEventListener('touchend', e => { e.preventDefault(); handleInput(btn, false); });
  btn.addEventListener('touchcancel', e => { handleInput(btn, false); });
  btn.addEventListener('mousedown', e => { e.preventDefault(); handleInput(btn, true); });
  btn.addEventListener('mouseup', e => { handleInput(btn, false); });
  btn.addEventListener('mouseleave', e => { handleInput(btn, false); });
});

document.addEventListener('keydown', e => {
  if (e.key === 'a' || e.key === 'A') inputState['sat-ccw'] = true;
  if (e.key === 'd' || e.key === 'D') inputState['sat-cw'] = true;
  if (e.key === 'ArrowLeft') inputState['shd-ccw'] = true;
  if (e.key === 'ArrowRight') inputState['shd-cw'] = true;
});
document.addEventListener('keyup', e => {
  if (e.key === 'a' || e.key === 'A') inputState['sat-ccw'] = false;
  if (e.key === 'd' || e.key === 'D') inputState['sat-cw'] = false;
  if (e.key === 'ArrowLeft') inputState['shd-ccw'] = false;
  if (e.key === 'ArrowRight') inputState['shd-cw'] = false;
});

// === Кнопки UI ===
document.getElementById('startBtn').addEventListener('click', () => {
  Audio.click();
  Audio.ensureCtx();
  startGame();
});

document.getElementById('restartBtn').addEventListener('click', () => { Audio.click(); startGame(); });
document.getElementById('victoryRetryBtn').addEventListener('click', () => { Audio.click(); startGame(); });
document.getElementById('gameOverMenuBtn').addEventListener('click', () => { Audio.click(); backToMenu(); });
document.getElementById('victoryMenuBtn').addEventListener('click', () => { Audio.click(); backToMenu(); });

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    Audio.click();
    setLang(btn.dataset.lang);
    applyTranslations();
    updateGreeting();
    updateLangButtons();
  });
});

document.getElementById('muteBtn').addEventListener('click', e => {
  e.stopPropagation();
  Audio.toggle();
  updateMuteBtn();
});

window.addEventListener('resize', resize);

// === Preloader ===
// Загружаем фоновую картинку меню через fetch с отслеживанием прогресса.
// Обновляем оранжевую полосу loader'а. Fallback на indeterminate анимацию,
// если сервер не отдал Content-Length.
const MENU_BG_PATH = 'menu-bg.jpg';
const PRELOAD_TIMEOUT_MS = 15000;

function setLoaderProgress(percent) {
  const fill = document.getElementById('loaderBarFill');
  if (fill) fill.style.width = Math.max(0, Math.min(100, percent)) + '%';
}

function setLoaderIndeterminate(on) {
  const bar = document.getElementById('loaderBar');
  if (!bar) return;
  if (on) bar.classList.add('indeterminate');
  else bar.classList.remove('indeterminate');
}

async function preloadMenuBg() {
  // Таймаут как safety net
  const timeoutPromise = new Promise(resolve => setTimeout(() => resolve({ ok: false, reason: 'timeout' }), PRELOAD_TIMEOUT_MS));

  const fetchPromise = (async () => {
    try {
      const response = await fetch(MENU_BG_PATH);
      if (!response.ok) return { ok: false, reason: 'http ' + response.status };

      const contentLength = response.headers.get('Content-Length');
      const total = contentLength ? parseInt(contentLength, 10) : 0;

      if (!total || !response.body || !response.body.getReader) {
        // Не можем отслеживать прогресс — показываем indeterminate
        setLoaderIndeterminate(true);
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        return { ok: true, url };
      }

      // Streaming с прогрессом
      const reader = response.body.getReader();
      const chunks = [];
      let received = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        received += value.length;
        setLoaderProgress((received / total) * 100);
      }
      const blob = new Blob(chunks, { type: 'image/jpeg' });
      const url = URL.createObjectURL(blob);
      setLoaderProgress(100);
      return { ok: true, url };
    } catch (e) {
      return { ok: false, reason: 'fetch error: ' + e.message };
    }
  })();

  return Promise.race([fetchPromise, timeoutPromise]);
}

function hideLoader() {
  const loader = document.getElementById('loaderScreen');
  loader.classList.add('fade-out');
  setTimeout(() => loader.classList.add('hidden'), 450);
}

function showMenu() {
  document.getElementById('startScreen').classList.remove('hidden');
}

async function bootstrap() {
  // Initial draw + UI setup сразу
  resize();
  draw();
  updateHP();
  applyTranslations();
  updateGreeting();
  updateLangButtons();
  updateMuteBtn();

  // Загружаем фоновую картинку
  const result = await preloadMenuBg();

  if (result.ok && result.url) {
    // Подставляем загруженный blob как фон, чтобы избежать повторного запроса
    document.getElementById('startScreen').style.backgroundImage = `url('${result.url}')`;
  } else {
    console.warn('[Mission8] Menu background failed:', result.reason);
    document.getElementById('startScreen').style.backgroundImage = 'none';
  }

  // Небольшая пауза для плавности — чтобы полоска успела дойти до 100%
  await new Promise(r => setTimeout(r, 200));

  hideLoader();
  showMenu();
}

bootstrap();
