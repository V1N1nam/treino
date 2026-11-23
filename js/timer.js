// Timer de descanso global. Usa timestamp de término, então continua
// certo mesmo se o iPhone bloquear a tela ou o app for pro fundo.
import { h, fmtDuration } from './ui.js';

let endAt = 0;
let total = 0;
let tick = null;
let audio = null;

const el = () => document.getElementById('rest-timer');

export function startRest(seconds) {
  if (!seconds) return;
  unlockAudio();
  total = seconds;
  endAt = Date.now() + seconds * 1000;
  clearInterval(tick);
  tick = setInterval(draw, 250);
  draw();
}

export function stopRest() {
  clearInterval(tick);
  endAt = 0;
  el().hidden = true;
}

function adjust(delta) {
  endAt += delta * 1000;
  total = Math.max(total + delta, 1);
  draw();
}

function draw() {
  const left = endAt - Date.now();
  if (left <= 0) {
    beep();
    stopRest();
    return;
  }
  const pct = Math.min(100, (left / (total * 1000)) * 100);
  el().hidden = false;
  el().replaceChildren(
    h('div', { class: 'rest-bar', style: `width:${pct}%` }),
    h('button', { class: 'chip', onClick: () => adjust(-15) }, '−15'),
    h('div', { class: 'rest-time' }, h('small', {}, 'Descanso'), fmtDuration(left)),
    h('button', { class: 'chip', onClick: () => adjust(15) }, '+15'),
    h('button', { class: 'chip', onClick: stopRest }, 'Pular'),
  );
}

// iOS só libera áudio depois de um toque do usuário; startRest é chamado num toque.
function unlockAudio() {
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
  } catch {}
}

function beep() {
  navigator.vibrate?.([200, 100, 200]);
  if (!audio) return;
  const t = audio.currentTime;
  [0, 0.25, 0.5].forEach((offset) => {
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.3, t + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, t + offset + 0.2);
    osc.connect(gain).connect(audio.destination);
    osc.start(t + offset);
    osc.stop(t + offset + 0.2);
  });
}
