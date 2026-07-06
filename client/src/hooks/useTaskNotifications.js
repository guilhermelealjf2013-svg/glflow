import { useEffect, useRef, useCallback } from 'react';

// ── Audio helpers ─────────────────────────────────────────────────────────────
function playSound(type = 'warning') {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();

    const playTone = (freq, startAt, duration) => {
      const osc  = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.25, ctx.currentTime + startAt);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration);
      osc.start(ctx.currentTime + startAt);
      osc.stop(ctx.currentTime + startAt + duration + 0.05);
    };

    if (type === 'start') {
      // Three ascending tones — task is starting
      playTone(523, 0,    0.18);
      playTone(659, 0.22, 0.18);
      playTone(784, 0.44, 0.35);
    } else {
      // Single soft ping — upcoming reminder
      playTone(660, 0, 0.35);
    }
  } catch {
    // AudioContext blocked (requires user gesture first time) — silently ignore
  }
}

// ── Time helpers ──────────────────────────────────────────────────────────────
function timeToMinutes(hhmm) {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

// ── Hook ──────────────────────────────────────────────────────────────────────
const DEFAULT_SETTINGS = {
  warningMsg: 'Atenção! A tarefa "{tarefa}" começa em {minutos} minuto{s}.',
  startMsg:   'A tarefa "{tarefa}" está começando agora!',
};

export function loadNotifSettings() {
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(localStorage.getItem('glflow_notif_settings') || '{}') };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export function saveNotifSettings(settings) {
  localStorage.setItem('glflow_notif_settings', JSON.stringify(settings));
}

export function useTaskNotifications(tasks, onNotify) {
  // Track which (taskId, minutesBefore) pairs already fired this day
  const fired = useRef(new Set());

  const check = useCallback(() => {
    const settings = loadNotifSettings();
    const now = nowMinutes();
    const today = new Date().toISOString().slice(0, 10);

    tasks.forEach(task => {
      if (task.status === 'COMPLETED') return;
      const taskDate = task.date;
      if (taskDate !== today) return;

      const startMin = timeToMinutes(task.startTime);
      const diff = startMin - now; // minutes until start (negative = already started)

      // Warning: 1 to 5 minutes before
      if (diff >= 1 && diff <= 5) {
        const key = `${task.id}:warn:${diff}`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const plural = diff === 1 ? '' : 's';
          const msg = settings.warningMsg
            .replace('{tarefa}', task.title)
            .replace('{minutos}', diff)
            .replace('{s}', plural);
          onNotify({ type: 'warning', message: msg, task, minutesBefore: diff });
          playSound('warning');
        }
      }

      // Start: within the same minute (diff == 0)
      if (diff === 0) {
        const key = `${task.id}:start`;
        if (!fired.current.has(key)) {
          fired.current.add(key);
          const msg = settings.startMsg.replace('{tarefa}', task.title);
          onNotify({ type: 'start', message: msg, task });
          playSound('start');
        }
      }
    });
  }, [tasks, onNotify]);

  useEffect(() => {
    // Reset fired set each new day
    fired.current = new Set();
  }, [tasks]);

  useEffect(() => {
    check(); // immediate check on mount / task update
    const id = setInterval(check, 30_000); // re-check every 30s
    return () => clearInterval(id);
  }, [check]);
}
