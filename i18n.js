// i18n.js — словарь переводов RU/UZ для Mission 8: Satellite

const DICT = {
  ru: {
    // Меню
    gameTitle: 'СПУТНИК',
    greetingPrefix: 'Привет,',
    startBtn: 'СТАРТ',

    // Игровой UI
    scoreLabel: 'ОЧКИ',
    waveLabel: 'ВОЛНА',
    goalLabel: 'ЦЕЛЬ',
    satCtrl: 'СПУТНИК',
    shdCtrl: 'ЩИТ',

    // Финал
    victoryTitle: 'ПОБЕДА',
    victorySubtitle: 'Миссия выполнена!',
    gameOverTitle: 'GAME OVER',
    gameOverSubtitle: 'Спутник уничтожен',
    finalWaveLabel: 'Волна',
    retryBtn: 'ЗАНОВО',
    menuBtn: 'МЕНЮ',

    // Floating text в игре
    blocked: 'БЛОК',
    shieldBroken: '🛡 СЛОМАН!',
    waveStart: 'ВОЛНА',
    damageText: '-1 ❤️',
    shieldWarning: '⚠ ЩИТ ПОВРЕЖДЁН',
    shieldDestroyed: '🛡 ЩИТ УНИЧТОЖЕН',
  },
  uz: {
    // Menyu
    gameTitle: "YO'LDOSH",
    greetingPrefix: 'Salom,',
    startBtn: 'START',

    // O'yin UI
    scoreLabel: 'OCHKO',
    waveLabel: "TO'LQIN",
    goalLabel: 'MAQSAD',
    satCtrl: "YO'LDOSH",
    shdCtrl: 'QALQON',

    // Final
    victoryTitle: "G'ALABA",
    victorySubtitle: 'Missiya bajarildi!',
    gameOverTitle: 'GAME OVER',
    gameOverSubtitle: "Yo'ldosh yo'q qilindi",
    finalWaveLabel: "To'lqin",
    retryBtn: 'QAYTA',
    menuBtn: 'MENYU',

    // Floating text
    blocked: "TO'SILDI",
    shieldBroken: '🛡 SINDI!',
    waveStart: "TO'LQIN",
    damageText: '-1 ❤️',
    shieldWarning: '⚠ QALQON SHIKASTLANDI',
    shieldDestroyed: "🛡 QALQON YO'Q QILINDI",
  }
};

let currentLang = 'ru';

function setLang(lang) {
  if (lang === 'ru' || lang === 'uz') {
    currentLang = lang;
    try { localStorage.setItem('sttm_lang', lang); } catch (e) {}
  }
}

function getLang() { return currentLang; }

function loadLang() {
  try {
    const saved = localStorage.getItem('sttm_lang');
    if (saved === 'ru' || saved === 'uz') { currentLang = saved; return; }
  } catch (e) {}
  const urlLang = new URLSearchParams(window.location.search).get('lang');
  if (urlLang === 'ru' || urlLang === 'uz') currentLang = urlLang;
}

function t(key) { return DICT[currentLang][key] || DICT.ru[key] || key; }

function applyTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    el.textContent = t(key);
  });
}

loadLang();
