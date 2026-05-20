// firebase-bridge.js — мост к платформе STTM
// Игра не пишет в Firebase напрямую. Платформа сама обрабатывает scoring.
// Игра только отправляет результат через postMessage в parent окно.

// Парсим никнейм из URL: ?nickname=Noah
function getNickname() {
  const params = new URLSearchParams(window.location.search);
  const nick = params.get('nickname');
  return nick ? decodeURIComponent(nick) : null;
}

// Отправляем финальный счёт на платформу.
// Платформа сама решает, обновлять ли best score в Firestore (логика max).
function submitScore(score) {
  try {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'SUBMIT_SCORE',
        score: score
      }, '*');
      console.log('[STTM] Score submitted:', score);
    } else {
      // Standalone mode (не в iframe) — для локальной отладки
      console.log('[STTM standalone] Score would be submitted:', score);
    }
  } catch (e) {
    console.error('[STTM] Failed to submit score:', e);
  }
}
